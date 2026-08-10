import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient.js';

export default function TabPolitica({ productoActivo, paisesDestino, paisOrigen, onDatosActualizados }) {
  const [poliOverrides, setPoliOverrides] = useState([]);

  // Estados de datos de Supabase
  const [listaPaises, setListaPaises] = useState([]);
  const [datosFSI, setDatosFSI] = useState([]);
  const [datosINRI, setDatosINRI] = useState([]);
  const [datosDEIN, setDatosDEIN] = useState([]);

  const [datosPoliConsolidados, setDatosPoliConsolidados] = useState([]);
  const [datosPoliNormalizados, setDatosPoliNormalizados] = useState([]);
  const [cargando, setCargando] = useState(false);
  const [errorNotif, setErrorNotif] = useState(null);

  // 1. Cargar tablas independientes desde Supabase
  useEffect(() => {
    async function cargarDatosPolitica() {
      setCargando(true);
      try {
        const [resPaises, resFSI, resINRI, resDEIN] = await Promise.all([
          supabase.from("paises").select("*").order("nombre"),
          supabase.from("estadosfragiles").select("*"),
          supabase.from("informeriesgo").select("*"),
          supabase.from("indicedemocracia").select("*")
        ]);

        if (resPaises.error) throw resPaises.error;
        if (resFSI.error) throw resFSI.error;
        if (resINRI.error) throw resINRI.error;
        if (resDEIN.error) throw resDEIN.error;

        setListaPaises(resPaises.data || []);
        setDatosFSI(resFSI.data || []);
        setDatosINRI(resINRI.data || []);
        setDatosDEIN(resDEIN.data || []);
        setErrorNotif(null);
      } catch (err) {
        console.error("Error al cargar datos de Supabase:", err);
        setErrorNotif(err.message);
      } finally {
        setCargando(false);
      }
    }

    cargarDatosPolitica();
  }, []);

  // Procesamiento unificado combinando tabla paises + tablas de índices específicos
  useEffect(() => {
    if (listaPaises.length === 0) return;

    setCargando(true);
    try {
      const listaPaisesBase = paisesDestino.length > 0
        ? paisesDestino
        : listaPaises.map(p => p.nombre);

      const dfPoli = listaPaisesBase.map((pais) => {
        const pLower = pais.toLowerCase().trim();

        const matchFSI = datosFSI.find(item => (item.pais || '').toLowerCase().trim() === pLower);
        const matchINRI = datosINRI.find(item => (item.pais || '').toLowerCase().trim() === pLower);
        const matchDEIN = datosDEIN.find(item => (item.pais || '').toLowerCase().trim() === pLower);

        return {
          Paises: pais,
          FSI: matchFSI ? Number(matchFSI.indice_de_estados_fragiles) : null,
          INRI: matchINRI ? Number(matchINRI.riesgo) : null,
          DEIN: matchDEIN ? Number(matchDEIN.indice_democracia) : null
        };
      });

      // Aplicar Overrides del usuario (CRUD local)
      poliOverrides.forEach(ovr => {
        const index = dfPoli.findIndex(item => item.Paises.toLowerCase() === ovr.Paises.toLowerCase());
        if (index !== -1) {
          dfPoli[index].FSI = ovr.FSI;
          dfPoli[index].INRI = ovr.INRI;
          dfPoli[index].DEIN = ovr.DEIN;
        } else {
          dfPoli.push({
            Paises: ovr.Paises,
            FSI: ovr.FSI,
            INRI: ovr.INRI,
            DEIN: ovr.DEIN
          });
        }
      });

      // Evaluar faltantes
      dfPoli.forEach(item => {
        const faltantes = [item.FSI, item.INRI, item.DEIN].filter(v => v === null || v === undefined).length;
        item._faltantes = faltantes;
      });

      dfPoli.sort((a, b) => a._faltantes - b._faltantes);
      setDatosPoliConsolidados(dfPoli);

      // ================= NORMALIZACIÓN Y CÁLCULO DIRECTO AL 13.00% =================
      const A3 = 10;
      const FSI_min = 19.6;  
      const INRI_min = 1.7;  
      const DEIN_max = 8.85; 

      const P_FSI = 0.355;
      const P_INRI = 0.350;
      const P_DEIN = 0.295;
      const PESO_FACTOR_POLITICA = 0.13; // 13.00% peso global aplicado directamente al puntaje

      const dfNorm = dfPoli.map(item => {
        const fsiNorm = item.FSI !== null && item.FSI > 0 ? Number(((A3 * FSI_min) / item.FSI).toFixed(2)) : null;
        const inriNorm = item.INRI !== null && item.INRI > 0 ? Number(((A3 * INRI_min) / item.INRI).toFixed(2)) : null;
        const deinNorm = item.DEIN !== null && DEIN_max > 0 ? Number(((A3 * item.DEIN) / DEIN_max).toFixed(2)) : null;

        // Puntaje POLI Normalizado ya multiplicado directamente por el 13.00%
        const puntajePoli = Number((
          (
            (fsiNorm !== null ? fsiNorm : 0) * P_FSI +
            (inriNorm !== null ? inriNorm : 0) * P_INRI +
            (deinNorm !== null ? deinNorm : 0) * P_DEIN
          ) * PESO_FACTOR_POLITICA
        ).toFixed(2));

        const faltantesNorm = [fsiNorm, inriNorm, deinNorm].filter(v => v === null).length;

        return {
          Paises: item.Paises,
          FSI_norm: fsiNorm,
          INRI_norm: inriNorm,
          DEIN_norm: deinNorm,
          Puntaje_POLI_Normalizado: puntajePoli,
          _faltantes: faltantesNorm
        };
      });

      dfNorm.sort((a, b) => {
        if (a._faltantes !== b._faltantes) return a._faltantes - b._faltantes;
        return b.Puntaje_POLI_Normalizado - a.Puntaje_POLI_Normalizado;
      });

      setDatosPoliNormalizados(dfNorm);
      if (onDatosActualizados) {
        onDatosActualizados(dfNorm);
      }
    } catch (err) {
      console.error("Error al procesar datos políticos:", err);
      setErrorNotif(err.message);
    } finally {
      setCargando(false);
    }
  }, [poliOverrides, paisesDestino, listaPaises, datosFSI, datosINRI, datosDEIN]);

  return (
    <div className="space-y-8 text-slate-100 font-sans">
      
      {/* HEADER */}
      <div className="border-b border-[#222634] pb-3">
        <h2 className="text-xl font-bold text-white">5. Política (POLI)</h2>
        <p className="text-xs text-slate-400 mt-1">
          Origen actual: <span className="text-[#3b82f6] font-semibold">{paisOrigen}</span> | Datos integrados desde las tablas <code className="text-slate-200">paises</code>, <code className="text-slate-200">estadosfragiles</code>, <code className="text-slate-200">informeriesgo</code> e <code className="text-slate-200">indicedemocracia</code>.
        </p>
      </div>

      {errorNotif && (
        <div className="bg-red-950/40 border border-red-900/50 p-3 rounded text-xs text-red-400">
          {errorNotif}
        </div>
      )}

      {/* ================= TABLA POLÍTICA DATOS ORIGINALES ================= */}
      <div className="space-y-2">
        <h3 className="text-base font-bold text-white">Tabla Política (POLI) — Datos originales</h3>
        
        {cargando ? (
          <div className="p-4 text-xs text-slate-400 italic">Cargando información desde Supabase...</div>
        ) : (
          <div className="overflow-x-auto max-h-[420px] overflow-y-auto border border-[#222634] rounded-lg shadow-xl">
            <table className="w-full text-left text-xs text-slate-300 relative border-collapse">
              <thead className="bg-[#141824] text-slate-400 uppercase text-[10px] tracking-wider border-b border-[#222634] sticky top-0 z-10 shadow-sm">
                <tr>
                  <th className="p-3 w-12 bg-[#141824]">#</th>
                  <th className="p-3 bg-[#141824]">País</th>
                  <th className="p-3 bg-[#141824]">Índice de Estados Frágiles (IEF)</th>
                  <th className="p-3 bg-[#141824]">Índice de Riesgo (IDR)</th>
                  <th className="p-3 bg-[#141824]">Índice de Democracia (IDE)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#222634]/60 bg-[#0c0f17]">
                {datosPoliConsolidados.map((row, index) => (
                  <tr key={index} className="hover:bg-[#141824]/60 transition-colors">
                    <td className="p-3 text-slate-500">{index + 1}</td>
                    <td className="p-3 font-medium text-white">{row.Paises}</td>
                    <td className="p-3">{row.FSI !== null ? row.FSI : '-'}</td>
                    <td className="p-3">{row.INRI !== null ? row.INRI : '-'}</td>
                    <td className="p-3">{row.DEIN !== null ? row.DEIN : '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ================= TABLA DE NORMALIZACIÓN POLÍTICA ================= */}
      <div className="space-y-2 pt-2">
        <h3 className="text-base font-bold text-white">Tabla Política Normalizada (POLI)</h3>
        <p className="text-xs text-slate-400">Ponderaciones: IEF = 35.50% | IDR = 35.00% | IDE = 29.50% — (Puntaje global afectado al 13.00%)</p>

        <div className="overflow-x-auto max-h-[420px] overflow-y-auto border border-[#222634] rounded-lg shadow-xl">
          <table className="w-full text-left text-xs text-slate-300 relative border-collapse">
            <thead className="bg-[#141824] text-slate-400 uppercase text-[10px] tracking-wider border-b border-[#222634] sticky top-0 z-10 shadow-sm">
              <tr>
                <th className="p-3 w-12 bg-[#141824]">#</th>
                <th className="p-3 bg-[#141824]">País</th>
                <th className="p-3 bg-[#141824]">IEF Norm (35.50%)</th>
                <th className="p-3 bg-[#141824]">IDR Norm (35.00%)</th>
                <th className="p-3 bg-[#141824]">IDE Norm (29.50%)</th>
                <th className="p-3 bg-[#141824]">Puntaje POLI Norm. (13.00%)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#222634]/60 bg-[#0c0f17]">
              {datosPoliNormalizados.map((row, index) => (
                <tr key={index} className="hover:bg-[#141824]/60 transition-colors">
                  <td className="p-3 text-slate-500">{index + 1}</td>
                  <td className="p-3 font-medium text-white">{row.Paises}</td>
                  <td className="p-3">{row.FSI_norm !== null ? row.FSI_norm : '-'}</td>
                  <td className="p-3">{row.INRI_norm !== null ? row.INRI_norm : '-'}</td>
                  <td className="p-3">{row.DEIN_norm !== null ? row.DEIN_norm : '-'}</td>
                  <td className="p-3 font-bold text-[#3b82f6]">{row.Puntaje_POLI_Normalizado}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
}
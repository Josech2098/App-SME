import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { renderPaisConBandera } from './banderas.jsx'; // 👈 Importación de banderas

export default function TabCultura({ productoActivo, paisesDestino, paisOrigen, onDatosActualizados }) {
  const [listaPaises, setListaPaises] = useState([]);
  const [datosGLIN, setDatosGLIN] = useState([]);
  const [datosCPCI, setDatosCPCI] = useState([]);
  const [datosHofstede, setDatosHofstede] = useState([]);
  
  const [cultOverrides, setCultOverrides] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [errorNotif, setErrorNotif] = useState(null);

  // Estados de datos consolidados y normalizados
  const [datosCulturaConsolidados, setDatosCulturaConsolidados] = useState([]);
  const [datosCulturaNormalizados, setDatosCulturaNormalizados] = useState([]);

  // 1. Cargar tablas independientes desde Supabase
  useEffect(() => {
    async function cargarTablasCultura() {
      setCargando(true);
      try {
       const [resPaises, resGLIN, resCPCI, resHofstede] = await Promise.all([
          supabase.from("paises").select("*").order("nombre"),
          supabase.from("indiceglobalizacion").select("*"),
          supabase.from("indiceCorrupcion").select("*"),
          supabase.from("cultura").select("*")
      ]);

        if (resPaises.error) throw resPaises.error;
        if (resGLIN.error) throw resGLIN.error;
        if (resCPCI.error) throw resCPCI.error;
        if (resHofstede.error) throw resHofstede.error;

        setListaPaises(resPaises.data || []);
        setDatosGLIN(resGLIN.data || []);
        setDatosCPCI(resCPCI.data || []);
        setDatosHofstede(resHofstede.data || []);
        setErrorNotif(null);
      } catch (err) {
        console.error("Error al cargar datos de Supabase:", err);
        setErrorNotif(err.message);
      } finally {
        setCargando(false);
      }
    }

    cargarTablasCultura();
  }, []);

  // Procesamiento unificado combinando las tablas
  useEffect(() => {
    if (listaPaises.length === 0) return;

    setCargando(true);
    try {
      const nombresDestino = (paisesDestino || []).map(p => typeof p === 'string' ? p : p.nombre);

      const listaPaisesBase = nombresDestino.length > 0
        ? nombresDestino
        : listaPaises.map(p => p.nombre);

      const dfCultura = listaPaisesBase.map((pais) => {
        const pLower = pais.toLowerCase().trim();

        const matchGLIN = datosGLIN.find(item => (item.pais || '').toLowerCase().trim() === pLower);
        const matchCPCI = datosCPCI.find(item => (item.pais || '').toLowerCase().trim() === pLower);

        return {
          Paises: pais,
          GLIN: matchGLIN ? Number(matchGLIN.indice_globalizacion) : null,
          CPCI: matchCPCI ? Number(matchCPCI.indice_percepcion_corrupcion) : null,
          CUDI: (() => {
            const hof = datosHofstede.find(
              h =>
                (h.pais || '')
                  .toLowerCase()
                  .trim() === pLower
            );

            if (!hof) return null;

            return (
              Number(hof.pdi || 0) +
              Number(hof.idv || 0) +
              Number(hof.mas || 0) +
              Number(hof.uai || 0) +
              Number(hof.lto || 0) +
              Number(hof.ivr || 0)
            );
          })()
        };
      });

      // Aplicar Overrides del usuario
      cultOverrides.forEach(ovr => {
        const index = dfCultura.findIndex(item => item.Paises.toLowerCase() === ovr.Paises.toLowerCase());
        if (index !== -1) {
          dfCultura[index].GLIN = ovr.GLIN;
          dfCultura[index].CPCI = ovr.CPCI;
          dfCultura[index].CUDI = ovr.CUDI;
        } else {
          dfCultura.push({
            Paises: ovr.Paises,
            GLIN: ovr.GLIN,
            CPCI: ovr.CPCI,
            CUDI: ovr.CUDI
          });
        }
      });

      // Evaluar faltantes
      dfCultura.forEach(item => {
        const faltantes = [item.GLIN, item.CPCI, item.CUDI].filter(v => v === null || v === undefined).length;
        item._faltantes = faltantes;
      });

      dfCultura.sort((a, b) => a._faltantes - b._faltantes);
      setDatosCulturaConsolidados(dfCultura);

      // ================= NORMALIZACIÓN Y PONDERACIONES =================
      const A3 = 10;
      
      const glinValidos = dfCultura.map(d => d.GLIN).filter(v => v !== null && v > 0);
      const maxGLIN = glinValidos.length > 0 ? Math.max(...glinValidos) : 100;

      const cpciValidos = dfCultura.map(d => d.CPCI).filter(v => v !== null && v > 0);
      const maxCPCI = cpciValidos.length > 0 ? Math.max(...cpciValidos) : 100;

      const cudiValidos = dfCultura.map(d => d.CUDI).filter(v => v !== null && v > 0);
      const minCUDI = cudiValidos.length > 0 ? Math.min(...cudiValidos) : 0;

      // Ponderaciones actualizadas según requerimiento (Suman 100%)
      const P_GLIN = 0.30; // 30%
      const P_CPCI = 0.32; // 32%
      const P_CUDI = 0.38; // 38%

      const dfNorm = dfCultura.map(item => {
        const glinNorm = item.GLIN !== null && maxGLIN > 0 ? Number(((A3 * item.GLIN) / maxGLIN).toFixed(2)) : null;
        const cpciNorm = item.CPCI !== null && maxCPCI > 0 ? Number(((A3 * item.CPCI) / maxCPCI).toFixed(2)) : null;
        const cudiNorm = item.CUDI !== null && item.CUDI > 0 && minCUDI > 0 ? Number(((A3 * minCUDI) / item.CUDI).toFixed(2)) : null;

        const tieneTodosLosDatos = item.GLIN !== null && item.CPCI !== null && item.CUDI !== null;

        let puntajeCult = null;
        if (tieneTodosLosDatos) {
          puntajeCult = Number((
            (glinNorm * P_GLIN) +
            (cpciNorm * P_CPCI) +
            (cudiNorm * P_CUDI)
          ).toFixed(2));
        }

        const faltantesNorm = [glinNorm, cpciNorm, cudiNorm].filter(v => v === null).length;

        return {
          Paises: item.Paises,
          GLIN_norm: glinNorm,
          CPCI_norm: cpciNorm,
          CUDI_norm: cudiNorm,
          Puntaje_CULT_Normalizado: puntajeCult,
          _faltantes: faltantesNorm
        };
      });

      dfNorm.sort((a, b) => {
        if (a._faltantes !== b._faltantes) return a._faltantes - b._faltantes;
        return (b.Puntaje_CULT_Normalizado || 0) - (a.Puntaje_CULT_Normalizado || 0);
      });

      setDatosCulturaNormalizados(dfNorm);
      if (onDatosActualizados) {
        onDatosActualizados(dfNorm);
      }
    } catch (err) {
      console.error("Error al procesar datos culturales:", err);
      setErrorNotif(err.message);
    } finally {
      setCargando(false);
    }
  }, [
    cultOverrides,
    paisesDestino,
    listaPaises,
    datosGLIN,
    datosCPCI,
    datosHofstede
  ]);

  return (
    <div className="space-y-8 text-slate-100 font-sans">
      
      {/* HEADER */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-[#121620] border border-[#1b2230] p-6 rounded-xl shadow-sm">
        <div>
          <span className="text-xs uppercase tracking-wider text-sky-400 font-semibold">Módulo de Análisis</span>
          <h2 className="text-2xl font-bold text-white mt-1">6. Cultura (CULT)</h2>
          <p className="text-xs text-slate-400 mt-1">
            Origen actual: <span className="text-white font-medium">{paisOrigen}</span> | Datos integrados desde <code className="text-slate-200">paises</code>, <code className="text-slate-200">indiceglobalizacion</code> e <code className="text-slate-200">indiceCorrupcion</code>.
          </p>
        </div>
      </div>

      {errorNotif && (
        <div className="bg-red-950/40 border border-red-900/50 p-3 rounded text-xs text-red-400">
          {errorNotif}
        </div>
      )}

      {/* TABLA 1: DATOS ORIGINALES COMBINADOS */}
      <div className="bg-[#121620] border border-[#1b2230] rounded-xl p-6 space-y-4 shadow-sm">
        <h3 className="text-lg font-bold text-white">Tabla Cultural (CULT) — Datos originales combinados</h3>
        {cargando ? (
          <p className="text-xs text-slate-400">Cargando datos culturales desde Supabase...</p>
        ) : (
          <div className="overflow-x-auto max-h-[420px] overflow-y-auto">
            <table className="w-full text-left text-xs text-slate-300 border-collapse">
              <thead className="bg-[#0d1017] text-slate-200 uppercase text-[10px] tracking-wider border-b border-[#1b2230] sticky top-0 z-10">
                <tr>
                  <th className="p-3">#</th>
                  <th className="p-3">Países</th>
                  <th className="p-3">Índice de globalización (GLIN)</th>
                  <th className="p-3">Índice de Percepción de la Corrupción (CPCI)</th>
                  <th className="p-3">Diferencia cultural (CUDI)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#1b2230]">
                {datosCulturaConsolidados.map((item, index) => (
                  <tr key={index} className="hover:bg-[#181f2d] transition-colors">
                    <td className="p-3 text-slate-500">{index + 1}</td>
                    <td className="p-3 font-medium text-white flex items-center gap-2">
                      {renderPaisConBandera ? renderPaisConBandera(item.Paises) : item.Paises}
                    </td>
                    <td className="p-3">{item.GLIN !== null ? item.GLIN : '-'}</td>
                    <td className="p-3">{item.CPCI !== null ? item.CPCI : '-'}</td>
                    <td className="p-3">{item.CUDI !== null ? item.CUDI : '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* TABLA 2: TABLA CULTURAL NORMALIZADA */}
      <div className="bg-[#121620] border border-[#1b2230] rounded-xl p-6 space-y-4 shadow-sm">
        <div>
          <h3 className="text-lg font-bold text-white">Tabla Cultural Normalizada (CULT)</h3>
          <p className="text-xs text-slate-400 mt-1">Ponderaciones: GLIN = 30% | CPCI = 32% | CUDI = 38%</p>
        </div>

        <div className="overflow-x-auto max-h-[420px] overflow-y-auto">
          <table className="w-full text-left text-xs text-slate-300 border-collapse">
            <thead className="bg-[#0d1017] text-slate-200 uppercase text-[10px] tracking-wider border-b border-[#1b2230] sticky top-0 z-10">
              <tr>
                <th className="p-3">#</th>
                <th className="p-3">Paises</th>
                <th className="p-3">GLIN_norm (30%)</th>
                <th className="p-3">CPCI_norm (32%)</th>
                <th className="p-3">CUDI_norm (38%)</th>
                <th className="p-3 font-bold text-sky-400">Puntaje_CULT_Normalizado</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#1b2230]">
              {datosCulturaNormalizados.map((item, index) => (
                <tr key={index} className="hover:bg-[#181f2d] transition-colors">
                  <td className="p-3 text-slate-500">{index + 1}</td>
                  <td className="p-3 font-medium text-white flex items-center gap-2">
                    {renderPaisConBandera ? renderPaisConBandera(item.Paises) : item.Paises}
                  </td>
                  <td className="p-3">{item.GLIN_norm !== null ? item.GLIN_norm : '-'}</td>
                  <td className="p-3">{item.CPCI_norm !== null ? item.CPCI_norm : '-'}</td>
                  <td className="p-3">{item.CUDI_norm !== null ? item.CUDI_norm : '-'}</td>
                  <td className="p-3 font-bold text-sky-400">
                    {item.Puntaje_CULT_Normalizado !== null ? item.Puntaje_CULT_Normalizado : '-'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
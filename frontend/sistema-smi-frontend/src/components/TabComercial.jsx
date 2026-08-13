import React, { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';
import { renderPaisConBandera } from './banderas';

export default function TabComercial({
  productoActivo,
  paisesDestino = [],
  productos = [],
  paisOrigen,
  archivoExcelBytes,
  datosIndicePenetracion = [],
  datosLibertadEconomica = [],
  onDatosActualizados
}) {
  const [dbPaises, setDbPaises] = useState([]);
  const [dbPenetracion, setDbPenetracion] = useState(datosIndicePenetracion);
  const [dbLibertad, setDbLibertad] = useState(datosLibertadEconomica);
  const [cargandoSupabase, setCargandoSupabase] = useState(false);

  const normalizarTexto = (texto) => {
    if (!texto || typeof texto !== 'string') return '';
    return texto
      .trim()
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '');
  };

  const getSupabaseClient = () => {
    const supabaseUrl = import.meta.env?.VITE_SUPABASE_URL || process.env.REACT_APP_SUPABASE_URL;
    const supabaseKey = import.meta.env?.VITE_SUPABASE_ANON_KEY || process.env.REACT_APP_SUPABASE_ANON_KEY;
    if (supabaseUrl && supabaseKey) {
      return createClient(supabaseUrl, supabaseKey);
    }
    return null;
  };

  const fetchDataFromSupabase = async () => {
    setCargandoSupabase(true);
    try {
      const supabase = getSupabaseClient();
      if (supabase) {
        let { data: paisesData } = await supabase.from('paises').select('*');
        if (!paisesData || paisesData.length === 0) {
          const resAlt = await supabase.from('Paises').select('*');
          if (resAlt.data) paisesData = resAlt.data;
        }
        if (paisesData) setDbPaises(paisesData);

        if (!datosIndicePenetracion || datosIndicePenetracion.length === 0) {
          const { data: penData } = await supabase.from('indicepenetracion').select('*');
          if (penData) setDbPenetracion(penData);
        }

        if (!datosLibertadEconomica || datosLibertadEconomica.length === 0) {
          const { data: libData } = await supabase.from('libertadeconomica').select('*');
          if (libData) setDbLibertad(libData);
        }
      }
    } catch (e) {
      console.error("Excepción al conectar con Supabase:", e);
    } finally {
      setCargandoSupabase(false);
    }
  };

  useEffect(() => {
    fetchDataFromSupabase();
  }, [datosIndicePenetracion, datosLibertadEconomica]);

  const effectivePenetracion = (datosIndicePenetracion && datosIndicePenetracion.length > 0) ? datosIndicePenetracion : dbPenetracion;
  const effectiveLibertad = (datosLibertadEconomica && datosLibertadEconomica.length > 0) ? datosLibertadEconomica : dbLibertad;

  const [commOverrides, setCommOverrides] = useState([]);
  const [datosCommConsolidados, setDatosCommConsolidados] = useState([]);
  const [datosCommNormalizados, setDatosCommNormalizados] = useState([]);
  const [errorProceso, setErrorProceso] = useState(null);

  useEffect(() => {
    try {
      let listaPaisesFuente = dbPaises;
      
      if (!listaPaisesFuente || listaPaisesFuente.length === 0) {
        const mapaFallback = new Set();
        if (Array.isArray(paisesDestino)) {
          paisesDestino.forEach(p => {
            const nombre = typeof p === 'string' ? p : (p.nombre || p.pais || p.Paises || p.Nombre);
            if (nombre) mapaFallback.add(nombre);
          });
        }
        if (Array.isArray(effectivePenetracion)) {
          effectivePenetracion.forEach(item => {
            const nombre = item.nombre || item.pais || item.Paises || item.Nombre || Object.values(item)[0];
            if (typeof nombre === 'string') mapaFallback.add(nombre);
          });
        }
        listaPaisesFuente = Array.from(mapaFallback).map(nombre => ({ nombre }));
      }

      if (!listaPaisesFuente || listaPaisesFuente.length === 0) {
        setDatosCommConsolidados([]);
        setDatosCommNormalizados([]);
        return;
      }

      const dfComm = listaPaisesFuente.map((itemPais, idx) => {
        const nombreOriginal = typeof itemPais === 'string' ? itemPais : (itemPais.nombre || itemPais.pais || itemPais.Paises || itemPais.Nombre || Object.values(itemPais)[0]);
        const paisNorm = normalizarTexto(nombreOriginal);

        const matchIemp = effectivePenetracion.find(item => {
          const valPais = item.nombre || item.pais || item.Paises || item.Nombre || Object.values(item)[0];
          return typeof valPais === 'string' && normalizarTexto(valPais) === paisNorm;
        });

        const matchIoef = effectiveLibertad.find(item => {
          const valPais = item.pais || item.nombre || item.Paises || item.Nombre || Object.values(item)[0];
          return typeof valPais === 'string' && normalizarTexto(valPais) === paisNorm;
        });

        const overrideMatch = commOverrides.find(ovr => normalizarTexto(ovr.Paises) === paisNorm);

        const extraerValorFlexible = (obj) => {
          if (!obj) return null;
          for (const key of Object.keys(obj)) {
            const kNorm = normalizarTexto(key);
            if (kNorm !== 'id' && kNorm !== 'pais' && kNorm !== 'nombre' && kNorm !== 'created_at') {
              const val = Number(obj[key]);
              if (!isNaN(val) && val !== 0) return val;
            }
          }
          const valNum = Object.values(obj).find(v => typeof v === 'number' && !isNaN(v));
          return valNum !== undefined ? Number(valNum) : null;
        };

        const calculoArancelCTCO = Number((2.0 + (idx * 0.1)).toFixed(2));

        const valCtco = overrideMatch && overrideMatch['Aranceles aduaneros por país de origen (CTCO)'] !== undefined
          ? overrideMatch['Aranceles aduaneros por país de origen (CTCO)']
          : (itemPais.ctco !== undefined ? itemPais.ctco : calculoArancelCTCO);

        const valIemp = overrideMatch && overrideMatch['Índice de penetración en el mercado de exportación (IEMP)'] !== undefined
          ? overrideMatch['Índice de penetración en el mercado de exportación (IEMP)'] 
          : (matchIemp ? extraerValorFlexible(matchIemp) ?? 4.0 : 4.0);

        const valIoef = overrideMatch && overrideMatch['Índice de Libertad Económica (IOEF)'] !== undefined
          ? overrideMatch['Índice de Libertad Económica (IOEF)'] 
          : (matchIoef ? extraerValorFlexible(matchIoef) ?? 60.0 : 60.0);

        return {
          Paises: nombreOriginal,
          'Aranceles aduaneros por país de origen (CTCO)': Number(valCtco) || 0,
          'Índice de penetración en el mercado de exportación (IEMP)': Number(valIemp) || 0,
          'Índice de Libertad Económica (IOEF)': Number(valIoef) || 0
        };
      });

      setDatosCommConsolidados(dfComm);

      const A3 = 10;
      const getMinMax = (arr, key) => {
        const values = arr.map(item => item[key]).filter(v => v !== null && !isNaN(v));
        return values.length > 0 ? [Math.min(...values), Math.max(...values)] : [0, 1];
      };

      const [ctcoMin, ctcoMax] = getMinMax(dfComm, 'Aranceles aduaneros por país de origen (CTCO)');
      const [iempMin, iempMax] = getMinMax(dfComm, 'Índice de penetración en el mercado de exportación (IEMP)');
      const [ioefMin, ioefMax] = getMinMax(dfComm, 'Índice de Libertad Económica (IOEF)');

      const dfNorm = dfComm.map(item => {
        const ctcoVal = item['Aranceles aduaneros por país de origen (CTCO)'];
        const iempVal = item['Índice de penetración en el mercado de exportación (IEMP)'];
        const ioefVal = item['Índice de Libertad Económica (IOEF)'];

        const ctcoNorm = (ctcoMax !== ctcoMin) ? Number((A3 * (ctcoMax - ctcoVal) / (ctcoMax - ctcoMin)).toFixed(2)) : A3;
        const iempNorm = (iempMax !== iempMin) ? Number((A3 * (iempVal - iempMin) / (iempMax - iempMin)).toFixed(2)) : 0;
        const ioefNorm = (ioefMax !== ioefMin) ? Number((A3 * (ioefVal - ioefMin) / (ioefMax - ioefMin)).toFixed(2)) : 0;

        // CÁLCULO CORREGIDO: Suma ponderada de variables (46.5%, 25%, 28.5%)
        const commTotal = Number((ctcoNorm * 0.4650 + iempNorm * 0.2500 + ioefNorm * 0.2850).toFixed(2));

        return {
          Paises: item.Paises,
          CTCO_norm: ctcoNorm,
          IEMP_norm: iempNorm,
          IOEF_norm: ioefNorm,
          COMM_total: commTotal
        };
      });

      dfNorm.sort((a, b) => b.COMM_total - a.COMM_total);
      setDatosCommNormalizados(dfNorm);
      if (onDatosActualizados) {
        onDatosActualizados(dfNorm);
      }
      setErrorProceso(null);
    } catch (err) {
      console.error("Error al procesar la sincronización:", err);
      setErrorProceso(err.message);
    }
  }, [dbPaises, effectivePenetracion, effectiveLibertad, commOverrides, paisesDestino]);

  return (
    <div className="space-y-8 text-slate-100 font-sans">
      <div className="border-b border-[#1b1f2e] pb-3 flex flex-col md:flex-row justify-between items-start md:items-center gap-2">
        <div>
          <h2 className="text-xl font-bold text-white">3. Comercial (COMM)</h2>
          <p className="text-xs text-slate-400 mt-1">
            Cruce y normalización ponderada de variables internas (46.50% Aranceles, 25.00% Penetración, 28.50% Libertad Económica).
          </p>
        </div>
      </div>

      <div className="bg-[#12141f] border border-[#1b1f2e] rounded-lg p-3 text-xs flex items-center justify-between shadow-lg">
        <div>
          <span className="text-slate-400">Países procesados:</span> <strong className="text-emerald-400">{datosCommConsolidados.length}</strong>
        </div>
        <div>
          {cargandoSupabase && <span className="text-amber-400 animate-pulse">Cargando datos de Supabase...</span>}
        </div>
      </div>

      {errorProceso && <div className="bg-red-950 p-3 rounded text-xs text-red-400 border border-red-800">{errorProceso}</div>}

      <div className="space-y-2">
        <h3 className="text-base font-bold text-white">Tabla Comercial Consolidada (COMM)</h3>
        <div className="overflow-x-auto max-h-[380px] overflow-y-auto border border-[#1b1f2e] rounded-lg shadow-lg">
          <table className="w-full text-left text-xs text-slate-300 relative">
            <thead className="bg-[#151824] text-slate-400 uppercase text-[10px] tracking-wider border-b border-[#1b1f2e] sticky top-0 z-10">
              <tr>
                <th className="p-3 w-12 bg-[#151824]">#</th>
                <th className="p-3 bg-[#151824]">País</th>
                <th className="p-3 bg-[#151824]">Aranceles (CTCO)</th>
                <th className="p-3 bg-[#151824]">Penetración (IEMP)</th>
                <th className="p-3 bg-[#151824]">Libertad Económica (IOEF)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#1b1f2e]/60 bg-[#10121b]">
              {datosCommConsolidados.length > 0 ? (
                datosCommConsolidados.map((row, index) => (
                  <tr key={index} className="hover:bg-[#151824] transition-colors">
                    <td className="p-3 text-slate-500">{index + 1}</td>
                    <td className="p-3 font-medium text-white">{renderPaisConBandera(row.Paises)}</td>
                    <td className="p-3">{row['Aranceles aduaneros por país de origen (CTCO)']}</td>
                    <td className="p-3 font-semibold text-emerald-400">{row['Índice de penetración en el mercado de exportación (IEMP)']}</td>
                    <td className="p-3 font-semibold text-emerald-400">{row['Índice de Libertad Económica (IOEF)']}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="5" className="p-6 text-center text-slate-500 italic">No hay países disponibles para procesar.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="space-y-2 pt-2">
        <h3 className="text-base font-bold text-white">Tabla Comercial Normalizada (COMM)</h3>
        <div className="overflow-x-auto max-h-[380px] overflow-y-auto border border-[#1b1f2e] rounded-lg shadow-lg">
          <table className="w-full text-left text-xs text-slate-300 relative">
            <thead className="bg-[#151824] text-slate-400 uppercase text-[10px] tracking-wider border-b border-[#1b1f2e] sticky top-0 z-10">
              <tr>
                <th className="p-3 w-12 bg-[#151824]">#</th>
                <th className="p-3 bg-[#151824]">País</th>
                <th className="p-3 bg-[#151824]">CTCO Norm (46.50%)</th>
                <th className="p-3 bg-[#151824]">IEMP Norm (25.00%)</th>
                <th className="p-3 bg-[#151824]">IOEF Norm (28.50%)</th>
                <th className="p-3 bg-[#151824]">COMM Total (Base 10)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#1b1f2e]/60 bg-[#10121b]">
              {datosCommNormalizados.length > 0 ? (
                datosCommNormalizados.map((row, index) => (
                  <tr key={index} className="hover:bg-[#151824] transition-colors">
                    <td className="p-3 text-slate-500">{index + 1}</td>
                    <td className="p-3 font-medium text-white">{renderPaisConBandera(row.Paises)}</td>
                    <td className="p-3">{row.CTCO_norm}</td>
                    <td className="p-3">{row.IEMP_norm}</td>
                    <td className="p-3">{row.IOEF_norm}</td>
                    <td className="p-3 font-bold text-emerald-400">{row.COMM_total}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="6" className="p-4 text-center text-slate-500 italic">No hay registros normalizados disponibles.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
import React, { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';

export default function TabComercial({ 
  productoActivo, 
  paisesDestino = [], 
  productos = [], 
  paisOrigen, 
  archivoExcelBytes,
  datosIndicePenetracion = [], 
  datosLibertadEconomica = [],
  datosAranceles = [] 
}) {
  const [dbPaises, setDbPaises] = useState([]);
  const [dbPenetracion, setDbPenetracion] = useState(datosIndicePenetracion);
  const [dbLibertad, setDbLibertad] = useState(datosLibertadEconomica);
  const [dbAranceles, setDbAranceles] = useState(datosAranceles);
  const [cargandoSupabase, setCargandoSupabase] = useState(false);

  // Carga robusta desde Supabase con respaldo en props
  useEffect(() => {
    async function fetchDataFromSupabase() {
      setCargandoSupabase(true);
      try {
        const supabaseUrl = import.meta.env?.VITE_SUPABASE_URL || process.env.REACT_APP_SUPABASE_URL;
        const supabaseKey = import.meta.env?.VITE_SUPABASE_ANON_KEY || process.env.REACT_APP_SUPABASE_ANON_KEY;
        
        if (supabaseUrl && supabaseKey) {
          const supabase = createClient(supabaseUrl, supabaseKey);
          
          // 1. Intentar consultar la tabla 'paises' (o 'Paises')
          let { data: paisesData } = await supabase.from('paises').select('*');
          if (!paisesData || paisesData.length === 0) {
            const resAlt = await supabase.from('Paises').select('*');
            if (resAlt.data) paisesData = resAlt.data;
          }
          if (paisesData && paisesData.length > 0) {
            setDbPaises(paisesData);
          }

          // 2. Consultar índices de penetración si no vienen por props
          if (!datosIndicePenetracion || datosIndicePenetracion.length === 0) {
            const { data: penData } = await supabase.from('indicepenetracion').select('*');
            if (penData) setDbPenetracion(penData);
          }

          // 3. Consultar libertad económica si no vienen por props
          if (!datosLibertadEconomica || datosLibertadEconomica.length === 0) {
            const { data: libData } = await supabase.from('libertadeconomica').select('*');
            if (libData) setDbLibertad(libData);
          }

          // 4. Consultar aranceles aduaneros desde la tabla 'aranceles_paises'
          if (!datosAranceles || datosAranceles.length === 0) {
            const { data: aranData } = await supabase.from('aranceles_paises').select('*');
            if (aranData) setDbAranceles(aranData);
          }
        }
      } catch (e) {
        console.error("Excepción al conectar con Supabase:", e);
      } finally {
        setCargandoSupabase(false);
      }
    }
    fetchDataFromSupabase();
  }, []);

  const effectivePenetracion = (datosIndicePenetracion && datosIndicePenetracion.length > 0) ? datosIndicePenetracion : dbPenetracion;
  const effectiveLibertad = (datosLibertadEconomica && datosLibertadEconomica.length > 0) ? datosLibertadEconomica : dbLibertad;
  const effectiveAranceles = (datosAranceles && datosAranceles.length > 0) ? datosAranceles : dbAranceles;

  const [commOverrides, setCommOverrides] = useState([]);
  const [datosCommConsolidados, setDatosCommConsolidados] = useState([]);
  const [datosCommNormalizados, setDatosCommNormalizados] = useState([]);
  const [errorProceso, setErrorProceso] = useState(null);

  // Función robusta para normalizar (quita tildes, pasa a minúsculas y limpia espacios)
  const normalizarTexto = (texto) => {
    if (!texto || typeof texto !== 'string') return '';
    return texto
      .trim()
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '');
  };

  useEffect(() => {
    try {
      let listaPaisesFuente = dbPaises;
      
      if (!listaPaisesFuente || listaPaisesFuente.length === 0) {
        const mapaFallback = new Set();
        
        // Extraer de paisesDestino prop
        if (Array.isArray(paisesDestino)) {
          paisesDestino.forEach(p => {
            const nombre = typeof p === 'string' ? p : (p.nombre || p.pais || p.Paises || p.Nombre);
            if (nombre) mapaFallback.add(nombre);
          });
        }
        
        // Extraer de effectivePenetracion
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

        // Buscar coincidencia en Aranceles reales desde Supabase
        const matchArancel = effectiveAranceles.find(item => {
          const valPais = item.pais || item.nombre || item.Paises || item.Nombre;
          return typeof valPais === 'string' && normalizarTexto(valPais) === paisNorm;
        });

        // Buscar coincidencia normalizada en Penetración
        const matchIemp = effectivePenetracion.find(item => {
          const valPais = item.nombre || item.pais || item.Paises || item.Nombre || Object.values(item)[0];
          return typeof valPais === 'string' && normalizarTexto(valPais) === paisNorm;
        });

        // Buscar coincidencia normalizada en Libertad Económica
        const matchIoef = effectiveLibertad.find(item => {
          const valPais = item.pais || item.nombre || item.Paises || item.Nombre || Object.values(item)[0];
          return typeof valPais === 'string' && normalizarTexto(valPais) === paisNorm;
        });

        const overrideMatch = commOverrides.find(ovr => normalizarTexto(ovr.Paises) === paisNorm);

        const extraerNumero = (obj, clavesPosibles) => {
          if (!obj) return null;
          for (const clave of clavesPosibles) {
            if (obj[clave] !== undefined && obj[clave] !== null && !isNaN(obj[clave])) {
              return Number(obj[clave]);
            }
          }
          const valNum = Object.values(obj).find(v => typeof v === 'number' && !isNaN(v));
          return valNum !== undefined ? Number(valNum) : null;
        };

        // Obtener arancel real de Supabase o aplicar respaldo por defecto (5.0%) si no existe
        const valorArancelReal = matchArancel 
          ? extraerNumero(matchArancel, ['porcentaje_arancel', 'arancel', 'ctco', 'valor']) ?? 5.0 
          : 5.0;

        const valIemp = overrideMatch && overrideMatch['Índice de penetración en el mercado de exportación (IEMP)'] !== undefined
          ? overrideMatch['Índice de penetración en el mercado de exportación (IEMP)'] 
          : (matchIemp ? extraerNumero(matchIemp, ['indice_penetracion', 'Indice_penetracion', 'IEMP', 'indice', 'valor']) ?? 5.0 : 5.0);

        const valIoef = overrideMatch && overrideMatch['Índice de Libertad Económica (IOEF)'] !== undefined
          ? overrideMatch['Índice de Libertad Económica (IOEF)'] 
          : (matchIoef ? extraerNumero(matchIoef, ['indice_de_libertad_economica', 'Indice_de_libertad_economica', 'IOEF', 'indice', 'valor']) ?? 6.0 : 6.0);

        return {
          Paises: nombreOriginal,
          'Aranceles aduaneros por país de origen (CTCO)': Number(valorArancelReal),
          'Índice de penetración en el mercado de exportación (IEMP)': Number(valIemp) || 0,
          'Índice de Libertad Económica (IOEF)': Number(valIoef) || 0
        };
      });

      dfComm.sort((a, b) => {
        if (a['Aranceles aduaneros por país de origen (CTCO)'] !== b['Aranceles aduaneros por país de origen (CTCO)']) {
          return a['Aranceles aduaneros por país de origen (CTCO)'] - b['Aranceles aduaneros por país de origen (CTCO)'];
        }
        return b['Índice de penetración en el mercado de exportación (IEMP)'] - a['Índice de penetración en el mercado de exportación (IEMP)'];
      });

      setDatosCommConsolidados(dfComm);

      // Normalización matemática
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

        const ctcoNorm = (ctcoMax !== ctcoMin) ? Number((A3 * (ctcoMax - ctcoVal) / (ctcoMax - ctcoMin)).toFixed(2)) : 0;
        const iempNorm = (iempMax !== iempMin) ? Number((A3 * (iempVal - iempMin) / (iempMax - iempMin)).toFixed(2)) : 0;
        const ioefNorm = (ioefMax !== ioefMin) ? Number((A3 * (ioefVal - ioefMin) / (ioefMax - ioefMin)).toFixed(2)) : 0;

        const commTotal = Number((ctcoNorm * 0.5 + iempNorm * 0.3 + ioefNorm * 0.2).toFixed(2));

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
      setErrorProceso(null);
    } catch (err) {
      console.error("Error al procesar la sincronización:", err);
      setErrorProceso(err.message);
    }
  }, [dbPaises, effectivePenetracion, effectiveLibertad, effectiveAranceles, commOverrides, paisesDestino]);

  return (
    <div className="space-y-6 text-slate-100 font-sans p-2">
      <div className="border-b border-slate-800 pb-3">
        <h2 className="text-xl font-bold text-white">3. Comercial (COMM)</h2>
        <p className="text-xs text-slate-400 mt-1">
          Cruce inteligente con aranceles aduaneros reales desde Supabase y tablas de índices.
        </p>
      </div>

      <div className="bg-slate-900 border border-slate-800 rounded-lg p-3 text-xs flex items-center justify-between">
        <div>
          <span className="text-slate-400">Países en BD:</span> <strong className="text-white">{dbPaises.length}</strong> | 
          <span className="text-slate-400 ml-2">Aranceles cargados:</span> <strong className="text-blue-400">{effectiveAranceles.length}</strong> | 
          <span className="text-slate-400 ml-2">Registros procesados:</span> <strong className="text-emerald-400">{datosCommConsolidados.length}</strong>
        </div>
        <div>
          {cargandoSupabase && <span className="text-amber-400 animate-pulse">Cargando datos de Supabase...</span>}
        </div>
      </div>

      {errorProceso && <div className="bg-red-950 p-3 rounded text-xs text-red-400">{errorProceso}</div>}

      <div className="space-y-2">
        <h3 className="text-base font-bold text-white">Tabla Comercial Consolidada (COMM)</h3>
        <div className="overflow-x-auto max-h-[380px] overflow-y-auto border border-slate-800 rounded-lg">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="bg-[#181a20] text-slate-400 uppercase text-[10px] sticky top-0 border-b border-slate-800">
              <tr>
                <th className="p-3 w-12">#</th>
                <th className="p-3">País</th>
                <th className="p-3">Aranceles (CTCO) %</th>
                <th className="p-3">Penetración (IEMP)</th>
                <th className="p-3">Libertad Económica (IOEF)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 bg-[#0e1117]">
              {datosCommConsolidados.length > 0 ? (
                datosCommConsolidados.map((row, index) => (
                  <tr key={index} className="hover:bg-[#16181d]">
                    <td className="p-3 text-slate-500">{index + 1}</td>
                    <td className="p-3 font-medium text-white">{row.Paises}</td>
                    <td className="p-3">{row['Aranceles aduaneros por país de origen (CTCO)']} %</td>
                    <td className="p-3">{row['Índice de penetración en el mercado de exportación (IEMP)']}</td>
                    <td className="p-3">{row['Índice de Libertad Económica (IOEF)']}</td>
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
        <div className="overflow-x-auto max-h-[380px] overflow-y-auto border border-slate-800 rounded-lg">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="bg-[#181a20] text-slate-400 uppercase text-[10px] sticky top-0 border-b border-slate-800">
              <tr>
                <th className="p-3 w-12">#</th>
                <th className="p-3">País</th>
                <th className="p-3">CTCO Norm</th>
                <th className="p-3">IEMP Norm</th>
                <th className="p-3">IOEF Norm</th>
                <th className="p-3">COMM Total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 bg-[#0e1117]">
              {datosCommNormalizados.length > 0 ? (
                datosCommNormalizados.map((row, index) => (
                  <tr key={index} className="hover:bg-[#16181d]">
                    <td className="p-3 text-slate-500">{index + 1}</td>
                    <td className="p-3 font-medium text-white">{row.Paises}</td>
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
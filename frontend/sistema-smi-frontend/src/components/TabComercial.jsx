import React, { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';

export default function TabComercial({ 
  productoActivo, 
  paisesDestino = [], 
  productos = [], 
  paisOrigen, 
  archivoExcelBytes,
  datosAranceles = [], 
  datosBarreras = [],
  datosLibertadEconomica = []   
}) {
  const [dbPaises, setDbPaises] = useState([]);
  const [dbAranceles, setDbAranceles] = useState(datosAranceles);
  const [dbBarreras, setDbBarreras] = useState(datosBarreras);
  const [dbLibertad, setDbLibertad] = useState(datosLibertadEconomica);
  const [cargandoSupabase, setCargandoSupabase] = useState(false);

  useEffect(() => {
    async function fetchDataFromSupabase() {
      setCargandoSupabase(true);
      try {
        const supabaseUrl = import.meta.env?.VITE_SUPABASE_URL || process.env.REACT_APP_SUPABASE_URL;
        const supabaseKey = import.meta.env?.VITE_SUPABASE_ANON_KEY || process.env.REACT_APP_SUPABASE_ANON_KEY;
        
        if (supabaseUrl && supabaseKey) {
          const supabase = createClient(supabaseUrl, supabaseKey);
          
          let { data: paisesData } = await supabase.from('paises').select('*');
          if (!paisesData || paisesData.length === 0) {
            const resAlt = await supabase.from('Paises').select('*');
            if (resAlt.data) paisesData = resAlt.data;
          }
          if (paisesData) setDbPaises(paisesData);

          if (!datosAranceles || datosAranceles.length === 0) {
            const { data: araData } = await supabase.from('aranceles').select('*');
            if (araData) setDbAranceles(araData);
          }

          if (!datosBarreras || datosBarreras.length === 0) {
            const { data: ibcData } = await supabase.from('barrerascomercio').select('*');
            if (ibcData) setDbBarreras(ibcData);
          }

          if (!datosLibertadEconomica || datosLibertadEconomica.length === 0) {
            const { data: ileData } = await supabase.from('libertadeconomica').select('*');
            if (ileData) setDbLibertad(ileData);
          }
        }
      } catch (e) {
        console.error("Excepción al conectar con Supabase:", e);
      } finally {
        setCargandoSupabase(false);
      }
    }
    fetchDataFromSupabase();
  }, [datosAranceles, datosBarreras, datosLibertadEconomica]);

  const effectiveAranceles = (datosAranceles && datosAranceles.length > 0) ? datosAranceles : dbAranceles;
  const effectiveBarreras = (datosBarreras && datosBarreras.length > 0) ? datosBarreras : dbBarreras;
  const effectiveLibertad = (datosLibertadEconomica && datosLibertadEconomica.length > 0) ? datosLibertadEconomica : dbLibertad;

  const [commOverrides, setCommOverrides] = useState([]);
  const [datosCommConsolidados, setDatosCommConsolidados] = useState([]);
  const [datosCommNormalizados, setDatosCommNormalizados] = useState([]);
  const [errorProceso, setErrorProceso] = useState(null);

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
        if (Array.isArray(paisesDestino)) {
          paisesDestino.forEach(p => {
            const nombre = typeof p === 'string' ? p : (p.nombre || p.pais || p.Paises || p.Nombre);
            if (nombre) mapaFallback.add(nombre);
          });
        }
        if (Array.isArray(effectiveAranceles)) {
          effectiveAranceles.forEach(item => {
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

        const matchAra = effectiveAranceles.find(item => {
          const valPais = item.nombre || item.pais || item.Paises || item.Nombre || Object.values(item)[0];
          return typeof valPais === 'string' && normalizarTexto(valPais) === paisNorm;
        });

        const matchIbc = effectiveBarreras.find(item => {
          const valPais = item.nombre || item.pais || item.Paises || item.Nombre || Object.values(item)[0];
          return typeof valPais === 'string' && normalizarTexto(valPais) === paisNorm;
        });

        const matchIle = effectiveLibertad.find(item => {
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
              if (!isNaN(val)) return val;
            }
          }
          const valNum = Object.values(obj).find(v => typeof v === 'number' && !isNaN(v));
          return valNum !== undefined ? Number(valNum) : null;
        };

        const valAra = overrideMatch && overrideMatch['Aranceles Aduaneros (ARA)'] !== undefined
          ? overrideMatch['Aranceles Aduaneros (ARA)'] 
          : (matchAra ? extraerValorFlexible(matchAra) ?? 0.10 : 0.10);

        const valIbc = overrideMatch && overrideMatch['Índice de Barreras al Comercio Internacional (IBC)'] !== undefined
          ? overrideMatch['Índice de Barreras al Comercio Internacional (IBC)'] 
          : (matchIbc ? extraerValorFlexible(matchIbc) ?? 7.0 : 7.0);

        const valIle = overrideMatch && overrideMatch['Índice de Libertad Económica (ILE)'] !== undefined
          ? overrideMatch['Índice de Libertad Económica (ILE)'] 
          : (matchIle ? extraerValorFlexible(matchIle) ?? 7.0 : 7.0);

        return {
          Paises: nombreOriginal,
          'Aranceles Aduaneros (ARA)': Number(valAra) || 0,
          'Índice de Barreras al Comercio Internacional (IBC)': Number(valIbc) || 0,
          'Índice de Libertad Económica (ILE)': Number(valIle) || 0
        };
      });

      setDatosCommConsolidados(dfComm);

      const A3 = 10;
      const getMinMax = (arr, key) => {
        const values = arr.map(item => item[key]).filter(v => v !== null && !isNaN(v));
        return values.length > 0 ? [Math.min(...values), Math.max(...values)] : [0, 1];
      };

      const [araMin, araMax] = getMinMax(dfComm, 'Aranceles Aduaneros (ARA)');
      const [ibcMin, ibcMax] = getMinMax(dfComm, 'Índice de Barreras al Comercio Internacional (IBC)');
      const [ileMin, ileMax] = getMinMax(dfComm, 'Índice de Libertad Económica (ILE)');

      const dfNorm = dfComm.map(item => {
        const araVal = item['Aranceles Aduaneros (ARA)'];
        const ibcVal = item['Índice de Barreras al Comercio Internacional (IBC)'];
        const ileVal = item['Índice de Libertad Económica (ILE)'];

        // ARA (Inverso: menor arancel es mejor)
        const araNorm = (araMax !== araMin) ? Number((A3 * (araMax - araVal) / (araMax - araMin)).toFixed(4)) : A3;
        
        // IBC e ILE (Directo: mayor índice es mejor)
        const ibcNorm = (ibcMax !== ibcMin) ? Number((A3 * (ibcVal - ibcMin) / (ibcMax - ibcMin)).toFixed(4)) : 0;
        const ileNorm = (ileMax !== ileMin) ? Number((A3 * (ileVal - ileMin) / (ileMax - ileMin)).toFixed(4)) : 0;

        // Ponderación exacta de la imagen: 46.50% ARA, 25.00% IBC, 28.50% ILE
        const commTotal = Number((araNorm * 0.4650 + ibcNorm * 0.2500 + ileNorm * 0.2850).toFixed(4));

        return {
          Paises: item.Paises,
          ARA_norm: araNorm,
          IBC_norm: ibcNorm,
          ILE_norm: ileNorm,
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
  }, [dbPaises, effectiveAranceles, effectiveBarreras, effectiveLibertad, commOverrides, paisesDestino]);

  return (
    <div className="space-y-6 text-slate-100 font-sans p-2">
      <div className="border-b border-slate-800 pb-3">
        <h2 className="text-xl font-bold text-white">3. Comercial (COMM)</h2>
        <p className="text-xs text-slate-400 mt-1">
          Cruce y normalización ponderada (46.50% Aranceles Aduaneros, 25.00% Barreras al Comercio, 28.50% Libertad Económica).
        </p>
      </div>

      <div className="bg-slate-900 border border-slate-800 rounded-lg p-3 text-xs flex items-center justify-between">
        <div>
          <span className="text-slate-400">Países procesados:</span> <strong className="text-emerald-400">{datosCommConsolidados.length}</strong>
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
                <th className="p-3">Aranceles Aduaneros (ARA)</th>
                <th className="p-3">Barreras al Comercio (IBC)</th>
                <th className="p-3">Libertad Económica (ILE)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 bg-[#0e1117]">
              {datosCommConsolidados.length > 0 ? (
                datosCommConsolidados.map((row, index) => (
                  <tr key={index} className="hover:bg-[#16181d]">
                    <td className="p-3 text-slate-500">{index + 1}</td>
                    <td className="p-3 font-medium text-white">{row.Paises}</td>
                    <td className="p-3 font-semibold text-emerald-400">{row['Aranceles Aduaneros (ARA)']}</td>
                    <td className="p-3 font-semibold text-sky-400">{row['Índice de Barreras al Comercio Internacional (IBC)']}</td>
                    <td className="p-3 font-semibold text-indigo-400">{row['Índice de Libertad Económica (ILE)']}</td>
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
                <th className="p-3">ARA Norm (46.50%)</th>
                <th className="p-3">IBC Norm (25.00%)</th>
                <th className="p-3">ILE Norm (28.50%)</th>
                <th className="p-3">COMM Total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 bg-[#0e1117]">
              {datosCommNormalizados.length > 0 ? (
                datosCommNormalizados.map((row, index) => (
                  <tr key={index} className="hover:bg-[#16181d]">
                    <td className="p-3 text-slate-500">{index + 1}</td>
                    <td className="p-3 font-medium text-white">{row.Paises}</td>
                    <td className="p-3">{row.ARA_norm}</td>
                    <td className="p-3">{row.IBC_norm}</td>
                    <td className="p-3">{row.ILE_norm}</td>
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
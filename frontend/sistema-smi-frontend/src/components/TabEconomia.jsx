import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient.js';
import { renderPaisConBandera } from './banderas.jsx'; // 👈 Importación de banderas

export default function TabEconomia({ productoActivo, paisesDestino, paisOrigen, datosCostoDeVida = [], onDatosActualizados}) {
  const [econOverrides, setEconOverrides] = useState([]);

  // Estados procesados
  const [datosEconConsolidados, setDatosEconConsolidados] = useState([]);
  const [datosEconNormalizados, setDatosEconNormalizados] = useState([]);
  const [cargando, setCargando] = useState(false);
  const [errorEco, setErrorEco] = useState(null);

  // Estados locales para las tablas de Supabase
  const [listaPaisesDB, setListaPaisesDB] = useState([]);
  const [listaCostoVidaDB, setListaCostoVidaDB] = useState(datosCostoDeVida);
  const [listaDesempleoDB, setListaDesempleoDB] = useState([]);
  const [listaInflacionDB, setListaInflacionDB] = useState([]);

  useEffect(() => {
    async function fetchDataDB() {
      try {
        setCargando(true);
        
        // 1. Consultar tabla de países oficial
        const { data: paisesData, error: paisesError } = await supabase.from('paises').select('*').range(0, 999);
        if (paisesError) {
          console.error("Error en Supabase paises:", paisesError.message);
        } else if (paisesData) {
          setListaPaisesDB(paisesData);
        }

        // 2. Consultar costo de vida
        const { data: cvData, error: cvError } = await supabase.from('costodevida').select('*').range(0, 999);
        if (cvError) {
          console.error("Error en Supabase costodevida:", cvError.message);
        } else if (cvData) {
          setListaCostoVidaDB(cvData);
        }

        // 3. Consultar desempleo
        const { data: desData, error: desError } = await supabase.from('desempleo').select('*').range(0, 999);
        if (desError) {
          console.error("Error en Supabase desempleo:", desError.message);
        } else if (desData) {
          setListaDesempleoDB(desData);
        }

        // 4. Consultar inflación (si aplica tabla independiente)
        const { data: infData, error: infError } = await supabase.from('inflacionanual').select('*').range(0, 999);
        if (!infError && infData) {
          setListaInflacionDB(infData);
        }

      } catch (err) {
        console.error("Error cargando datos de Supabase:", err.message);
      } finally {
        setCargando(false);
      }
    }
    fetchDataDB();
  }, []);

  // Procesamiento y cruce de tablas utilizando la tabla oficial de países
  useEffect(() => {
    setCargando(true);
    try {
      const limpiarTexto = (str) => {
        if (!str && str !== 0) return '';
        return str
          .toString()
          .toLowerCase()
          .normalize("NFD")
          .replace(/[\u0300-\u036f]/g, "")
          .trim();
      };

      // Si la tabla de países de Supabase tiene datos, úsela como base maestra
      let listaBasePaises = listaPaisesDB.length > 0 ? listaPaisesDB : (listaCostoVidaDB.length > 0 ? listaCostoVidaDB : datosCostoDeVida);

      // Crear mapas rápidos para cruce de datos
      const mapaCostoVida = {};
      listaCostoVidaDB.forEach(item => {
        const nombre = item.pais || item.País || item.PAIS || item.paises || item.Paises || item.nombre;
        const val = item.costo_de_vida ?? item.Costo_de_Vida ?? item.icv ?? item.ICV ?? item.costovida;
        if (nombre) mapaCostoVida[limpiarTexto(nombre)] = val !== null && !isNaN(Number(val)) ? Number(val) : null;
      });

      const mapaDesempleo = {};
      listaDesempleoDB.forEach(item => {
        const nombre = item.pais || item.País || item.PAIS || item.paises || item.Paises || item.nombre;
        const val = item.tasadesempleo ?? item.tasa_desempleo ?? item.Tasa_de_Desempleo ?? item.desempleo ?? item.tad;
        if (nombre) mapaDesempleo[limpiarTexto(nombre)] = val !== null && !isNaN(Number(val)) ? Number(val) : null;
      });

      const mapaInflacion = {};
      listaInflacionDB.forEach(item => {
        const nombre = item.pais || item.País || item.PAIS || item.paises || item.Paises || item.nombre;
        const val = item.inflacionanual ?? item.inflacion_anual ?? item.Inflacion_Anual ?? item.inflacion ??item.inan ?? item.INAN;
        if (nombre) mapaInflacion[limpiarTexto(nombre)] = val !== null && !isNaN(Number(val)) ? Number(val) : null;
      });

      let dfEcon = listaBasePaises.map((item, idx) => {
        const nombrePais = 
          item.pais || item.País || item.PAIS || 
          item.nombre || item.Nombre || item.NOMBRE || 
          item.paises || item.Paises || item.PAISES || 
          item.country || item.Country || `País ${idx + 1}`;
        
        const paisKey = limpiarTexto(nombrePais);

        const valorICV = mapaCostoVida[paisKey] !== undefined ? mapaCostoVida[paisKey] : (item.costo_de_vida ?? item.icv ?? item.ICV ?? null);
        const valorIAN = mapaInflacion[paisKey] !== undefined ? mapaInflacion[paisKey] : (item.inflacionanual ?? item.inflacion_anual?? item.ina ?? item.INAN ?? item.inflacion ?? null);
        const valorTAD = mapaDesempleo[paisKey] !== undefined ? mapaDesempleo[paisKey] : (item.tasadesempleo ?? item.tasa_desempleo ?? item.tad ?? null);

        return {
          Paises: nombrePais,
          ICV: valorICV !== null && !isNaN(Number(valorICV)) ? Number(valorICV) : null,
          INAN: valorIAN !== null && !isNaN(Number(valorIAN)) ? Number(valorIAN) : null,
          TAD: valorTAD !== null && !isNaN(Number(valorTAD)) ? Number(valorTAD) : null
        };
      });

      // Filtrar por paisesDestino opcionalmente si se encuentra definido
      if (paisesDestino && paisesDestino.length > 0) {
        const nombresDestino = paisesDestino.map(p => typeof p === 'string' ? p : p.nombre);
        dfEcon = dfEcon.filter(item => 
          nombresDestino.some(nd => limpiarTexto(nd) === limpiarTexto(item.Paises))
        );
      }

      // Aplicar Overrides del usuario
      econOverrides.forEach(ovr => {
        const index = dfEcon.findIndex(item => limpiarTexto(item.Paises) === limpiarTexto(ovr.Paises));
        if (index !== -1) {
          dfEcon[index].ICV = ovr.ICV;
          dfEcon[index].INAN = ovr.INAN;
          dfEcon[index].TAD = ovr.TAD;
        } else {
          dfEcon.push({
            Paises: ovr.Paises,
            ICV: ovr.ICV,
            INAN: ovr.INAN,
            TAD: ovr.TAD
          });
        }
      });

      dfEcon.forEach(item => {
        item.completos = item.ICV !== null && item.INAN !== null && item.TAD !== null;
      });
      dfEcon.sort((a, b) => (b.completos === a.completos ? 0 : b.completos ? 1 : -1));

      setDatosEconConsolidados(dfEcon);

      // ================= NORMALIZACIÓN CON PONDERACIONES EXACTAS =================
      const valoresIcvPositivos = dfEcon.map(i => i.ICV).filter(v => v !== null && v > 0);
      const valoresInanPositivos = dfEcon.map(i => i.INAN).filter(v => v !== null && v > 0);
      const valoresTadPositivos = dfEcon.map(i => i.TAD).filter(v => v !== null && v > 0);

      const minIcv = valoresIcvPositivos.length > 0 ? Math.min(...valoresIcvPositivos) : null;
      const minInan = valoresInanPositivos.length > 0 ? Math.min(...valoresInanPositivos) : null;
      const minTad = valoresTadPositivos.length > 0 ? Math.min(...valoresTadPositivos) : null;

      const normInversa = (valor, minimo) => {
        if (valor === null || valor === undefined || minimo === null || valor <= 0) return null;
        const num = Number(valor);
        if (isNaN(num) || num <= 0) return null;
        return Number(((10 * minimo) / num).toFixed(4));
      };

      // Porcentajes de ponderación oficiales solicitados: ICV 30%, IAN 30%, TAD 40%
      const P_ICV = 0.30;
      const P_INAN = 0.30;
      const P_TAD = 0.40;

      const dfNorm = dfEcon.map(item => {
        const icvNorm = normInversa(item.ICV, minIcv);
        const inanNorm = normInversa(item.INAN, minInan);
        const tadNorm = normInversa(item.TAD, minTad);

        const puntajeEcon = Number((
          (icvNorm !== null ? icvNorm : 0) * P_ICV +
          (inanNorm !== null ? inanNorm : 0) * P_INAN +
          (tadNorm !== null ? tadNorm : 0) * P_TAD
        ).toFixed(4));

        const completosNorm = icvNorm !== null && inanNorm !== null && tadNorm !== null;

        return {
          Paises: item.Paises,
          ICV_norm: icvNorm,
          INAN_norm: inanNorm,
          TAD_norm: tadNorm,
          Puntaje_ECON_Normalizado: puntajeEcon,
          completos: completosNorm
        };
      });

      dfNorm.sort((a, b) => {
        if (b.completos !== a.completos) return b.completos ? 1 : -1;
        return b.Puntaje_ECON_Normalizado - a.Puntaje_ECON_Normalizado;
      });

      setDatosEconNormalizados(dfNorm);
      if (onDatosActualizados) {
        onDatosActualizados(dfNorm);
      }
      setErrorEco(null);
    } catch (err) {
      console.error("Error al procesar datos económicos:", err);
      setErrorEco(err.message);
    } finally {
      setCargando(false);
    }
  }, [econOverrides, paisesDestino, listaPaisesDB, listaCostoVidaDB, listaDesempleoDB, listaInflacionDB, datosCostoDeVida]);

  return (
    <div className="space-y-8 text-slate-100 font-sans">
      
      {/* HEADER */}
      <div className="border-b border-[#1b1f2e] pb-3">
        <h2 className="text-xl font-bold text-white">4. Economía (ECON)</h2>
        <p className="text-xs text-slate-400 mt-1">
          Gestión y normalización de indicadores macroeconómicos obtenidos de las tablas de Supabase.
        </p>
      </div>

      {errorEco && (
        <div className="bg-red-950/40 border border-red-900/50 p-3 rounded text-xs text-red-400 shadow">
          {errorEco}
        </div>
      )}

      {/* ================= TABLA ECONÓMICA DATOS ORIGINALES ================= */}
      <div className="space-y-2">
        <h3 className="text-base font-bold text-white">Tabla Económica (ECON) — Datos originales</h3>
        <p className="text-xs text-slate-400">Índice del Costo de Vida (ICV), Inflación Anual (IAN) y Tasa de Desempleo (TAD) cruzados desde Supabase.</p>
        
        {cargando ? (
          <div className="p-4 text-xs text-slate-400 italic">Procesando datos económicos...</div>
        ) : (
          <div className="overflow-x-auto max-h-[380px] overflow-y-auto border border-[#1b1f2e] rounded-lg shadow-lg">
            <table className="w-full text-left text-xs text-slate-300 relative">
              <thead className="bg-[#151824] text-slate-400 uppercase text-[10px] tracking-wider border-b border-[#1b1f2e] sticky top-0 z-10">
                <tr>
                  <th className="p-3 w-12 bg-[#151824]">#</th>
                  <th className="p-3 bg-[#151824]">País</th>
                  <th className="p-3 bg-[#151824]">Índice del Costo de Vida (ICV)</th>
                  <th className="p-3 bg-[#151824]">Inflación Anual (IAN)</th>
                  <th className="p-3 bg-[#151824]">Tasa de Desempleo (TAD)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#1b1f2e]/60 bg-[#10121b]">
                {datosEconConsolidados.map((row, index) => (
                  <tr key={index} className="hover:bg-[#151824] transition-colors">
                    <td className="p-3 text-slate-500">{index + 1}</td>
                    <td className="p-3 font-medium text-white flex items-center gap-2">
                      {renderPaisConBandera ? renderPaisConBandera(row.Paises) : row.Paises}
                    </td>
                    <td className="p-3 text-emerald-400 font-semibold">{row.ICV !== null ? row.ICV : '-'}</td>
                    <td className="p-3">{row.INAN !== null ? row.INAN : <span className="text-slate-600 italic">sin datos</span>}</td>
                    <td className="p-3 text-emerald-400 font-semibold">{row.TAD !== null ? row.TAD : <span className="text-slate-600 italic">sin datos</span>}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ================= TABLA DE NORMALIZACIÓN ECONÓMICA ================= */}
      <div className="space-y-2 pt-2">
        <h3 className="text-base font-bold text-white">Tabla de Normalización Económica (ECON)</h3>
        <p className="text-xs text-slate-400">Ponderaciones: ICV = 30% | IAN = 30% | TAD = 40% (Normalización Inversa)</p>

        <div className="overflow-x-auto max-h-[380px] overflow-y-auto border border-[#1b1f2e] rounded-lg shadow-lg">
          <table className="w-full text-left text-xs text-slate-300 relative">
            <thead className="bg-[#151824] text-slate-400 uppercase text-[10px] tracking-wider border-b border-[#1b1f2e] sticky top-0 z-10">
              <tr>
                <th className="p-3 w-12 bg-[#151824]">#</th>
                <th className="p-3 bg-[#151824]">País</th>
                <th className="p-3 bg-[#151824]">ICV Norm (30%)</th>
                <th className="p-3 bg-[#151824]">IAN Norm (30%)</th>
                <th className="p-3 bg-[#151824]">TAD Norm (40%)</th>
                <th className="p-3 bg-[#151824]">Puntaje ECON Normalizado</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#1b1f2e]/60 bg-[#10121b]">
              {datosEconNormalizados.map((row, index) => (
                <tr key={index} className="hover:bg-[#151824] transition-colors">
                  <td className="p-3 text-slate-500">{index + 1}</td>
                  <td className="p-3 font-medium text-white flex items-center gap-2">
                    {renderPaisConBandera ? renderPaisConBandera(row.Paises) : row.Paises}
                  </td>
                  <td className="p-3">{row.ICV_norm !== null ? row.ICV_norm : '-'}</td>
                  <td className="p-3">{row.INAN_norm !== null ? row.INAN_norm : '-'}</td>
                  <td className="p-3">{row.TAD_norm !== null ? row.TAD_norm : '-'}</td>
                  <td className="p-3 font-bold text-emerald-400">{row.Puntaje_ECON_Normalizado}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
}
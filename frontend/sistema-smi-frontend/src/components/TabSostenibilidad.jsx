import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient.js';

// Función auxiliar para limpiar tildes, espacios y estandarizar textos
const limpiarTexto = (texto) => 
  String(texto || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .toLowerCase();

export default function TabSostenibilidad({ productoActivo, categoria, subcategoria, busqueda, paisOrigen, onDatosActualizados }) {
  const [paisBase, setPaisBase] = useState(paisOrigen || 'España');
  const [datosProductos, setDatosProductos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [errorLog, setErrorLog] = useState(null);

  useEffect(() => {
    if (paisOrigen) setPaisBase(paisOrigen);
  }, [paisOrigen]);

  useEffect(() => {
    cargarYCalcularMatriz();
  }, [productoActivo, categoria, subcategoria, busqueda, paisBase]);

  async function cargarYCalcularMatriz() {
    setLoading(true);
    setErrorLog(null);

    try {
      const { data: dbPaises, error: errPaises } = await supabase
        .from('paises')
        .select('*')
        .range(0, 999)
        .order('nombre');

      if (errPaises) throw errPaises;

      const { data: dbEmisiones, error: errEmis } = await supabase
        .from('emisiones_carbono')
        .select('*')
        .range(0, 999);

      if (errEmis) console.warn('Aviso emisiones_carbono:', errEmis);

      const { data: dbRpg, error: errRpg } = await supabase
        .from('riesgo_pais_global')
        .select('*')
        .range(0, 999);

      if (errRpg) throw errRpg;

      const { data: dbIsg, error: errIsg } = await supabase
        .from('indice_sostenibilidad_global')
        .select('*')
        .range(0, 999);

      if (errIsg) throw errIsg;

      const datosConsolidados = (dbPaises || []).map((p) => {
        const nombrePaisLimpio = limpiarTexto(p.nombre);

        const emisMatch = (dbEmisiones || []).find((c) => limpiarTexto(c.pais) === nombrePaisLimpio);
        let edcVal = emisMatch ? Number(emisMatch.emisionescarbono ?? emisMatch.edc ?? 0) : null;
        if (isNaN(edcVal) || edcVal === 0) edcVal = null;

        const rpgMatch = (dbRpg || []).find((c) => limpiarTexto(c.pais) === nombrePaisLimpio);
        let rpgVal = rpgMatch ? Number(rpgMatch.riesgo_pais_global ?? 0) : null;
        if (isNaN(rpgVal) || rpgVal === 0) rpgVal = null;

        const isgMatch = (dbIsg || []).find((c) => limpiarTexto(c.pais) === nombrePaisLimpio);
        let isgVal = isgMatch ? Number(isgMatch.indicesostenibilidadglobal ?? 0) : null;
        if (isNaN(isgVal) || isgVal === 0) isgVal = null;

        return {
          id: p.id,
          pais_nombre: p.nombre,
          edc: edcVal,
          rpg: rpgVal,
          isg: isgVal
        };
      });

      setDatosProductos(datosConsolidados);
    } catch (err) {
      console.error('Error al consolidar sostenibilidad:', err);
      setErrorLog(err.message || 'Error al conectar con Supabase');
    } finally {
      setLoading(false);
    }
  }

  const PESO_FACTOR_SOST = 0.055; 
  const PESO_EDC = 0.30; 
  const PESO_RPG = 0.30; 
  const PESO_ISG = 0.40; 
  const PUNTAJE_MAXIMO = 10;

  const edcVals = datosProductos.map(d => d.edc).filter(v => v !== null && v !== undefined && v > 0);
  const rpgVals = datosProductos.map(d => d.rpg).filter(v => v !== null && v !== undefined && v > 0);
  const isgVals = datosProductos.map(d => d.isg).filter(v => v !== null && v !== undefined && v > 0);

  const minEdc = edcVals.length > 0 ? Math.min(...edcVals) : null; 
  const minRpg = rpgVals.length > 0 ? Math.min(...rpgVals) : null; 
  const maxIsg = isgVals.length > 0 ? Math.max(...isgVals) : null;
  
  const calcularNormalizadoInverso = (val, minVal) => {
    if (val === null || val === undefined || val <= 0 || minVal === null || minVal <= 0) return null;
    return Number(((PUNTAJE_MAXIMO * minVal) / val).toFixed(2));
  };

  const calcularNormalizadoDirecto = (val, maxVal) => {
    if (val === null || val === undefined || val <= 0 || !maxVal) return null;
    return Number(((PUNTAJE_MAXIMO * val) / maxVal).toFixed(2));
  };

  const datosSustNormalizados = datosProductos.map(row => {
    const edcNorm = calcularNormalizadoInverso(row.edc, minEdc);
    const rpgNorm = calcularNormalizadoInverso(row.rpg, minRpg);
    const isgNorm = calcularNormalizadoDirecto(row.isg, maxIsg);

    const hasAnyMetric = edcNorm !== null || rpgNorm !== null || isgNorm !== null;
    const aporteFactorSostenibilidad = hasAnyMetric ? Number(
      (((PESO_EDC * (edcNorm || 0)) + (PESO_RPG * (rpgNorm || 0)) + (PESO_ISG * (isgNorm || 0))) * PESO_FACTOR_SOST).toFixed(2)
    ) : 0;

    return {
      Paises: row.pais_nombre,
      aporteFactorSostenibilidad
    };
  });

  useEffect(() => {
    if (onDatosActualizados) {
      onDatosActualizados(datosSustNormalizados);
    }
  }, [datosSustNormalizados, onDatosActualizados]);

  const nombreProductoMostrado = 
    (typeof productoActivo === 'string' ? productoActivo : (productoActivo?.nombre ?? productoActivo?.producto ?? productoActivo?.titulo)) || 
    busqueda || 
    'Botella de vino (Calidad media)';

  return (
    <div className="space-y-6 text-slate-100 font-sans">
      
      {/* 1. BARRA SUPERIOR */}
      <div className="bg-[#121620] border border-[#1b2230] rounded-xl p-4 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 shadow-sm">
        <div>
          <h2 className="text-sm font-bold text-white tracking-wide">
            6. SOSTENIBILIDAD (SUST) — ESTANDARIZACIÓN DE CRITERIOS
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Ponderación del Factor: <span className="text-sky-400 font-semibold">5.50%</span> | Producto: <span className="text-slate-200 font-medium">{nombreProductoMostrado}</span>
          </p>
        </div>
      </div>

      {errorLog && (
        <div className="bg-red-950/40 border border-red-900/50 p-3 rounded text-xs text-red-400">
          ⚠️ <strong>Error BD:</strong> {errorLog}
        </div>
      )}

      {/* 3. TABLA DE SOSTENIBILIDAD BASE */}
      <div className="bg-[#121620] border border-[#1b2230] rounded-xl overflow-hidden shadow-sm">
        <div className="p-4 border-b border-[#1b2230] flex justify-between items-center">
          <h3 className="text-xs font-bold text-slate-200 uppercase tracking-wide">
            Listado de Sostenibilidad Base
          </h3>
          <span className="text-xs text-slate-400">Mostrando {datosProductos.length} de {datosProductos.length} registros</span>
        </div>

        <div className="max-h-[450px] overflow-y-auto custom-scrollbar">
          <table className="w-full text-left text-xs border-collapse">
            <thead className="sticky top-0 bg-[#0d1017] z-10 text-slate-400 uppercase text-[10px] tracking-wider border-b border-[#1b2230]">
              <tr>
                <th className="p-3 w-16 text-right pr-6 font-normal">#</th>
                <th className="p-3 font-medium text-slate-300">País</th>
                <th className="p-3 text-right font-medium text-slate-300">Emisiones de Dióxido de Carbono (EDC)</th>
                <th className="p-3 text-right font-medium text-slate-300">Riesgo País Global (RPG)</th>
                <th className="p-3 text-right pr-6 font-medium text-slate-300">Índice de Sostenibilidad Global (ISG)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#1b2230] font-mono text-slate-300">
              {loading ? (
                <tr>
                  <td colSpan="5" className="p-6 text-center text-slate-500 font-sans">Cargando datos...</td>
                </tr>
              ) : datosProductos.length > 0 ? (
                datosProductos.map((row, idx) => (
                  <tr key={row.id} className="hover:bg-[#181f2d] transition-colors">
                    <td className="p-3 text-right pr-6 text-slate-500 font-sans">{idx + 1}</td>
                    <td className="p-3 font-sans font-medium text-white">{row.pais_nombre}</td>
                    <td className="p-3 text-right text-emerald-400">{row.edc !== null ? row.edc : <span className="text-slate-600">-</span>}</td>
                    <td className="p-3 text-right text-slate-300">{row.rpg !== null ? row.rpg : <span className="text-slate-600">-</span>}</td>
                    <td className="p-3 text-right pr-6 text-slate-300">{row.isg !== null ? row.isg : <span className="text-slate-600">-</span>}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="5" className="p-6 text-center text-slate-500 font-sans">No hay registros de sostenibilidad disponibles.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* 4. TABLA DE NORMALIZACIÓN Y PONDERACIÓN FINAL */}
      <div className="bg-[#121620] border border-[#1b2230] rounded-xl overflow-hidden shadow-sm">
        <div className="p-4 border-b border-[#1b2230] flex justify-between items-center">
          <h3 className="text-xs font-bold text-slate-200 uppercase tracking-wide">
            Normalización y Ponderación Final <span className="text-slate-500 font-normal normal-case">(EDC: 30% | RPG: 30% | ISG: 40%)</span>
          </h3>
        </div>

        <div className="max-h-[450px] overflow-y-auto custom-scrollbar">
          <table className="w-full text-left text-xs border-collapse">
            <thead className="sticky top-0 bg-[#0d1017] z-10 text-slate-400 uppercase text-[10px] tracking-wider border-b border-[#1b2230]">
              <tr>
                <th className="p-3 w-16 text-right pr-6 font-normal">#</th>
                <th className="p-3 font-medium text-slate-300">País</th>
                <th className="p-3 text-right font-medium text-slate-300">EDC Norm (30.00%)</th>
                <th className="p-3 text-right font-medium text-slate-300">RPG Norm (30.00%)</th>
                <th className="p-3 text-right font-medium text-slate-300">ISG Norm (40.00%)</th>
                <th className="p-3 text-right pr-6 font-bold text-sky-400">Total Factor (5.50%)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#1b2230] font-mono text-slate-300">
              {loading ? (
                <tr>
                  <td colSpan="6" className="p-6 text-center text-slate-500 font-sans">Calculando...</td>
                </tr>
              ) : datosProductos.length > 0 ? (
                datosProductos.map((row, idx) => {
                  const edcNorm = calcularNormalizadoInverso(row.edc, minEdc);
                  const rpgNorm = calcularNormalizadoInverso(row.rpg, minRpg);
                  const isgNorm = calcularNormalizadoDirecto(row.isg, maxIsg);

                  const hasAnyMetric = edcNorm !== null || rpgNorm !== null || isgNorm !== null;
                  const aporteFactorSostenibilidad = hasAnyMetric ? Number((((PESO_EDC * (edcNorm || 0)) + (PESO_RPG * (rpgNorm || 0)) + (PESO_ISG * (isgNorm || 0))) * PESO_FACTOR_SOST).toFixed(2)) : '-';

                  return (
                    <tr key={row.id} className="hover:bg-[#181f2d] transition-colors">
                      <td className="p-3 text-right pr-6 text-slate-500 font-sans">{idx + 1}</td>
                      <td className="p-3 font-sans font-medium text-white">{row.pais_nombre}</td>
                      <td className="p-3 text-right text-slate-300">{edcNorm ?? '-'}</td>
                      <td className="p-3 text-right text-slate-300">{rpgNorm ?? '-'}</td>
                      <td className="p-3 text-right text-slate-300">{isgNorm ?? '-'}</td>
                      <td className="p-3 text-right pr-6 font-bold text-sky-400">{aporteFactorSostenibilidad}</td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan="6" className="p-6 text-center text-slate-500 font-sans">Sin registros para calcular.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
}
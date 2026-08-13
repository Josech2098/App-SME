import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient.js';
import { renderPaisConBandera } from './banderas.jsx';

// Función auxiliar para limpiar tildes, espacios y estandarizar nombres de países
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
      const [resPaises, resEmis, resRpg, resIsg] = await Promise.all([
        supabase.from('paises').select('*').range(0, 999).order('nombre'),
        supabase.from('emisiones_carbono').select('*').range(0, 999),
        supabase.from('riesgo_pais_global').select('*').range(0, 999),
        supabase.from('indice_sostenibilidad_global').select('*').range(0, 999)
      ]);

      if (resPaises.error) throw resPaises.error;

      const dbPaises = resPaises.data || [];
      const dbEmisiones = resEmis.data || [];
      const dbRpg = resRpg.data || [];
      const dbIsg = resIsg.data || [];

      const datosConsolidados = dbPaises.map((p) => {
        const nombrePaisLimpio = limpiarTexto(p.nombre);

        const emisMatch = dbEmisiones.find((c) => limpiarTexto(c.pais ?? c.nombre ?? c.nombre_pais) === nombrePaisLimpio);
        let edcVal = emisMatch ? Number(emisMatch.emisionescarbono ?? emisMatch.edc ?? emisMatch.emisiones ?? 0) : null;
        if (isNaN(edcVal) || edcVal === 0) edcVal = null;

        const rpgMatch = dbRpg.find((c) => limpiarTexto(c.pais ?? c.nombre ?? c.nombre_pais) === nombrePaisLimpio);
        let rpgVal = rpgMatch ? Number(rpgMatch.riesgo_pais_global ?? rpgMatch.rpg ?? 0) : null;
        if (isNaN(rpgVal) || rpgVal === 0) rpgVal = null;

        const isgMatch = dbIsg.find((c) => limpiarTexto(c.pais ?? c.nombre ?? c.nombre_pais) === nombrePaisLimpio);
        let isgVal = isgMatch ? Number(isgMatch.indicesostenibilidadglobal ?? isgMatch.isg ?? 0) : null;
        if (isNaN(isgVal) || isgVal === 0) isgVal = null;

        return {
          id: p.id,
          pais_nombre: p.nombre,
          edc: edcVal,
          rpg: rpgVal,
          isg: isgVal,
          tieneDatos: edcVal !== null && rpgVal !== null && isgVal !== null
        };
      });

      datosConsolidados.sort((a, b) => {
        if (a.tieneDatos === b.tieneDatos) return a.pais_nombre.localeCompare(b.pais_nombre);
        return a.tieneDatos ? -1 : 1;
      });

      setDatosProductos(datosConsolidados);
    } catch (err) {
      console.error('Error al consolidar sostenibilidad:', err);
      setErrorLog(err.message || 'Error al conectar con Supabase');
    } finally {
      setLoading(false);
    }
  }

  // Ponderaciones internas de las variables (Suman 100%)
  const PESO_EDC = 0.30; 
  const PESO_RPG = 0.30; 
  const PESO_ISG = 0.40; 
  const PUNTAJE_MAXIMO = 10;

  const edcVals = datosProductos.map(d => d.edc).filter(v => v !== null && v > 0);
  const rpgVals = datosProductos.map(d => d.rpg).filter(v => v !== null && v > 0);
  const isgVals = datosProductos.map(d => d.isg).filter(v => v !== null && v > 0);

  const maxEdc = edcVals.length > 0 ? Math.max(...edcVals) : null; 
  const minRpg = rpgVals.length > 0 ? Math.min(...rpgVals) : null; 
  const maxIsg = isgVals.length > 0 ? Math.max(...isgVals) : null;
  
  const calcularNormalizadoDirecto = (val, maxVal) => (val === null || val <= 0 || !maxVal) ? null : Number(((PUNTAJE_MAXIMO * val) / maxVal).toFixed(2));
  const calcularNormalizadoInverso = (val, minVal) => (val === null || val <= 0 || !minVal) ? null : Number(((PUNTAJE_MAXIMO * minVal) / val).toFixed(2));

  const datosSustNormalizados = datosProductos.map(row => {
    const edcNorm = calcularNormalizadoDirecto(row.edc, maxEdc);
    const rpgNorm = calcularNormalizadoInverso(row.rpg, minRpg);
    const isgNorm = calcularNormalizadoDirecto(row.isg, maxIsg);

    // Puntaje TOTAL en base 10 utilizando exclusivamente la ponderación interna de sus variables
    const aporte = (row.tieneDatos) ? Number((
      (PESO_EDC * (edcNorm || 0)) + 
      (PESO_RPG * (rpgNorm || 0)) + 
      (PESO_ISG * (isgNorm || 0))
    ).toFixed(2)) : 0;
    
    return { Paises: row.pais_nombre, aporteFactorSostenibilidad: aporte };
  });

  useEffect(() => {
    if (onDatosActualizados) onDatosActualizados(datosSustNormalizados);
  }, [datosProductos, onDatosActualizados]);

  const nombreProductoMostrado = (typeof productoActivo === 'string' ? productoActivo : (productoActivo?.nombre ?? productoActivo?.producto ?? productoActivo?.titulo)) || busqueda || 'Botella de vino (Calidad media)';

  return (
    <div className="space-y-6 text-slate-100 font-sans">
      <div className="bg-[#121620] border border-[#1b2230] rounded-xl p-4">
        <h2 className="text-sm font-bold text-white tracking-wide">6. SOSTENIBILIDAD (SUST) — ESTANDARIZACIÓN DE CRITERIOS</h2>
        <p className="text-xs text-slate-400 mt-1">Producto: {nombreProductoMostrado}</p>
      </div>

      {errorLog && <div className="bg-red-950/40 p-3 rounded text-xs text-red-400">⚠️ {errorLog}</div>}

      {/* TABLA 1: BASE */}
      <div className="bg-[#121620] border border-[#1b2230] rounded-xl overflow-hidden">
        <div className="p-4 border-b border-[#1b2230]"><h3 className="text-xs font-bold text-slate-200">Listado de Sostenibilidad Base</h3></div>
        <div className="max-h-[300px] overflow-y-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead className="sticky top-0 bg-[#0d1017] text-slate-400 uppercase text-[10px] border-b border-[#1b2230]">
              <tr><th className="p-3">#</th><th className="p-3">País</th><th className="p-3 text-right">EDC</th><th className="p-3 text-right">RPG</th><th className="p-3 text-right">ISG</th></tr>
            </thead>
            <tbody className="divide-y divide-[#1b2230] font-mono text-slate-300">
              {datosProductos.map((row, idx) => (
                <tr key={row.id} className="hover:bg-[#181f2d]">
                  <td className="p-3 text-slate-500">{idx + 1}</td>
                  <td className="p-3 font-medium text-white flex items-center gap-2">
                    {renderPaisConBandera ? renderPaisConBandera(row.pais_nombre) : row.pais_nombre}
                  </td>
                  <td className="p-3 text-right text-emerald-400">{row.edc ?? '-'}</td>
                  <td className="p-3 text-right">{row.rpg ?? '-'}</td>
                  <td className="p-3 text-right">{row.isg ?? '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* TABLA 2: NORMALIZADA */}
      <div className="bg-[#121620] border border-[#1b2230] rounded-xl overflow-hidden">
        <div className="p-4 border-b border-[#1b2230]">
          <h3 className="text-xs font-bold text-slate-200">Normalización y Ponderación Final (Base 10)</h3>
          <p className="text-[10px] text-slate-400 mt-0.5">Ponderaciones: EDC = 30.00% | RPG = 30.00% | ISG = 40.00%</p>
        </div>
        <div className="max-h-[300px] overflow-y-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead className="sticky top-0 bg-[#0d1017] text-slate-400 uppercase text-[10px] border-b border-[#1b2230]">
              <tr>
                <th className="p-3">#</th>
                <th className="p-3">País</th>
                <th className="p-3 text-right">EDC Norm (30%)</th>
                <th className="p-3 text-right">RPG Norm (30%)</th>
                <th className="p-3 text-right">ISG Norm (40%)</th>
                <th className="p-3 text-right">TOTAL (Base 10)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#1b2230] font-mono text-slate-300">
              {datosProductos.map((row, idx) => {
                const edcNorm = calcularNormalizadoDirecto(row.edc, maxEdc);
                const rpgNorm = calcularNormalizadoInverso(row.rpg, minRpg);
                const isgNorm = calcularNormalizadoDirecto(row.isg, maxIsg);
                const total = row.tieneDatos ? Number((
                  (PESO_EDC * (edcNorm || 0)) + 
                  (PESO_RPG * (rpgNorm || 0)) + 
                  (PESO_ISG * (isgNorm || 0))
                ).toFixed(2)) : '-';
                return (
                  <tr key={row.id} className="hover:bg-[#181f2d]">
                    <td className="p-3 text-slate-500">{idx + 1}</td>
                    <td className="p-3 text-white flex items-center gap-2">
                        {renderPaisConBandera ? renderPaisConBandera(row.pais_nombre) : row.pais_nombre}
                    </td>
                    <td className="p-3 text-right">{edcNorm ?? '-'}</td>
                    <td className="p-3 text-right">{rpgNorm ?? '-'}</td>
                    <td className="p-3 text-right">{isgNorm ?? '-'}</td>
                    <td className="p-3 text-right font-bold text-sky-400">{total}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
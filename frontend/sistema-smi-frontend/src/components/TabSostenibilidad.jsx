import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient.js';

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
          // Propiedad para identificar si el país tiene todos los datos necesarios
          tieneDatos: edcVal !== null && rpgVal !== null && isgVal !== null
        };
      });

      // ORDENAR: Los que tienen datos (true) van primero alfabéticamente, los que no (false) al final
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

  const PESO_FACTOR_SOST = 0.055; 
  const PESO_EDC = 0.30; 
  const PESO_RPG = 0.30; 
  const PESO_ISG = 0.40; 
  const PUNTAJE_MAXIMO = 10;

  const edcVals = datosProductos.map(d => d.edc).filter(v => v !== null && v > 0);
  const rpgVals = datosProductos.map(d => d.rpg).filter(v => v !== null && v > 0);
  const isgVals = datosProductos.map(d => d.isg).filter(v => v !== null && v > 0);

  const minEdc = edcVals.length > 0 ? Math.min(...edcVals) : null; 
  const minRpg = rpgVals.length > 0 ? Math.min(...rpgVals) : null; 
  const maxIsg = isgVals.length > 0 ? Math.max(...isgVals) : null;
  
  const calcularNormalizadoInverso = (val, minVal) => (val === null || val <= 0 || !minVal) ? null : Number(((PUNTAJE_MAXIMO * minVal) / val).toFixed(2));
  const calcularNormalizadoDirecto = (val, maxVal) => (val === null || val <= 0 || !maxVal) ? null : Number(((PUNTAJE_MAXIMO * val) / maxVal).toFixed(2));

  const datosSustNormalizados = datosProductos.map(row => {
    const edcNorm = calcularNormalizadoInverso(row.edc, minEdc);
    const rpgNorm = calcularNormalizadoInverso(row.rpg, minRpg);
    const isgNorm = calcularNormalizadoDirecto(row.isg, maxIsg);

    const aporte = (row.tieneDatos) ? Number((((PESO_EDC * (edcNorm || 0)) + (PESO_RPG * (rpgNorm || 0)) + (PESO_ISG * (isgNorm || 0))) * PESO_FACTOR_SOST).toFixed(2)) : 0;
    
    return { Paises: row.pais_nombre, aporteFactorSostenibilidad: aporte };
  });

  useEffect(() => {
    if (onDatosActualizados) onDatosActualizados(datosSustNormalizados);
  }, [datosProductos, onDatosActualizados]);

  const nombreProductoMostrado = (typeof productoActivo === 'string' ? productoActivo : (productoActivo?.nombre ?? productoActivo?.producto ?? productoActivo?.titulo)) || busqueda || 'Producto';

  return (
    <div className="space-y-6 text-slate-100 font-sans">
      <div className="bg-[#121620] border border-[#1b2230] rounded-xl p-4 flex justify-between items-center">
        <div>
          <h2 className="text-sm font-bold text-white">6. SOSTENIBILIDAD (SUST) — ESTANDARIZACIÓN DE CRITERIOS</h2>
          <p className="text-xs text-slate-400 mt-1">Producto: {nombreProductoMostrado}</p>
        </div>
      </div>

      {errorLog && <div className="bg-red-950/40 p-3 rounded text-xs text-red-400">⚠️ Error: {errorLog}</div>}

      <div className="bg-[#121620] border border-[#1b2230] rounded-xl overflow-hidden">
        <table className="w-full text-left text-xs border-collapse">
          <thead className="bg-[#0d1017] text-slate-400 uppercase text-[10px] border-b border-[#1b2230]">
            <tr>
              <th className="p-3 w-16 text-right">#</th>
              <th className="p-3">País</th>
              <th className="p-3 text-right">EDC</th>
              <th className="p-3 text-right">RPG</th>
              <th className="p-3 text-right">ISG</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#1b2230] font-mono text-slate-300">
            {loading ? <tr><td colSpan="5" className="p-6 text-center">Cargando...</td></tr> : datosProductos.map((row, idx) => (
              <tr key={row.id} className="hover:bg-[#181f2d]">
                <td className="p-3 text-right text-slate-500">{idx + 1}</td>
                <td className="p-3 font-medium text-white">{row.pais_nombre}</td>
                <td className="p-3 text-right text-emerald-400">{row.edc ?? '-'}</td>
                <td className="p-3 text-right">{row.rpg ?? '-'}</td>
                <td className="p-3 text-right">{row.isg ?? '-'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
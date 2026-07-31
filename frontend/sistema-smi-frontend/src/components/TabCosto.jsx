import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient.js';

export default function TabCosto({ productoSeleccionado, paisesDestino }) {
  const [costos, setCostos] = useState([]);
  const [loading, setLoading] = useState(true);

  // Control de Formularios / Acordeones
  const [activeAccordion, setActiveAccordion] = useState(null);

  // Estados Formulario Editar
  const [selectedCostId, setSelectedCostId] = useState('');
  const [ppaoEdit, setPpaoEdit] = useState('');
  const [intcEdit, setIntcEdit] = useState('');
  const [cebcEdit, setCebcEdit] = useState('');

  // ----------------------------------------------------
  // 1. CARGA DE PAÍSES Y COSTOS DESDE LA PESTAÑA 1 / SUPABASE
  // ----------------------------------------------------
  useEffect(() => {
    cargarCostosDesdePestana1();
  }, [productoSeleccionado, paisesDestino]);

  async function cargarCostosDesdePestana1() {
    setLoading(true);

    try {
      let dataCostos = [];

      // Si vienen países de destino seleccionados desde la Pestaña 1 (vía props)
      if (paisesDestino && paisesDestino.length > 0) {
        const idsPaises = paisesDestino.map(p => p.id || p);

        const { data, error } = await supabase
          .from('producto_pais_costos')
          .select('id, precio_origen, impuesto_importación, costo_embalaje, pais_id, paises(id, nombre)')
          .in('pais_id', idsPaises);

        if (!error && data) dataCostos = data;
      } else {
        // Si no hay filtro activo de países en la Pestaña 1, carga TODOS los países registrados
        const { data, error } = await supabase
          .from('producto_pais_costos')
          .select('id, precio_origen, impuesto_importación, costo_embalaje, pais_id, paises(id, nombre)');

        if (!error && data) dataCostos = data;
      }

      setCostos(dataCostos);
    } catch (err) {
      console.error("Error al cargar datos en TabCosto:", err);
    } finally {
      setLoading(false);
    }
  }

  // ----------------------------------------------------
  // 2. LÓGICA DE NORMALIZACIÓN Y CÁLCULOS AUTOMÁTICOS
  // ----------------------------------------------------
  const PESO_PPAO = 0.44; // 44.00%
  const PESO_INTC = 0.34; // 34.00%
  const PESO_CEBC = 0.22; // 22.00%
  const A3 = 10;

  // Si el producto seleccionado en Pestaña 1 trae un precio base (Origen España)
  const precioBaseEspana = productoSeleccionado?.precio ? parseFloat(productoSeleccionado.precio) : null;

  // Extraer arreglos para calcular los valores mínimos (para la fórmula A3 * min / val)
  const ppaoVals = costos.map(c => precioBaseEspana || Number(c.precio_origen)).filter(v => v > 0);
  const intcVals = costos.map(c => Number(c.impuesto_importación)).filter(v => v > 0);
  const cebcVals = costos.map(c => Number(c.costo_embalaje)).filter(v => v > 0);

  const minPpao = ppaoVals.length > 0 ? Math.min(...ppaoVals) : null;
  const minIntc = intcVals.length > 0 ? Math.min(...intcVals) : null;
  const minCebc = cebcVals.length > 0 ? Math.min(...cebcVals) : null;

  const calcularNormalizado = (val, minVal) => {
    if (!val || !minVal || val <= 0 || minVal <= 0) return null;
    return Number((A3 * (minVal / val)).toFixed(2));
  };

  // Mapeo y cálculo automático de la matriz
  const costosNormalizados = costos.map(row => {
    const ppao = precioBaseEspana || Number(row.precio_origen) || null;
    const intc = Number(row.impuesto_importación) || null;
    const cebc = Number(row.costo_embalaje) || null;

    const ppaoNorm = calcularNormalizado(ppao, minPpao);
    const intcNorm = calcularNormalizado(intc, minIntc);
    const cebcNorm = calcularNormalizado(cebc, minCebc);

    const p1 = ppaoNorm ?? 0;
    const p2 = intcNorm ?? 0;
    const p3 = cebcNorm ?? 0;

    const costoTotalNorm = Number(((PESO_PPAO * p1) + (PESO_INTC * p2) + (PESO_CEBC * p3)).toFixed(2));

    return {
      ...row,
      ppaoEfectivo: ppao,
      ppaoNorm,
      intcNorm,
      cebcNorm,
      costoTotalNorm
    };
  });

  // Ordenar de mejor costo (menor índice) a mayor costo
  costosNormalizados.sort((a, b) => a.costoTotalNorm - b.costoTotalNorm);

  // ----------------------------------------------------
  // 3. ACTUALIZACIÓN / EDICIÓN RÁPIDA (SUPABASE)
  // ----------------------------------------------------
  const toggleAccordion = (section) => {
    setActiveAccordion(activeAccordion === section ? null : section);
  };

  const handleSelectEdit = (id) => {
    setSelectedCostId(id);
    const target = costos.find(c => c.id === parseInt(id));
    if (target) {
      setPpaoEdit(target.precio_origen || '');
      setIntcEdit(target.impuesto_importación || '');
      setCebcEdit(target.costo_embalaje || '');
    }
  };

  async function handleActualizar() {
    if (!selectedCostId) return alert("Selecciona un país para editar.");

    const { error } = await supabase
      .from('producto_pais_costos')
      .update({
        precio_origen: parseFloat(ppaoEdit) || 0,
        impuesto_importación: parseFloat(intcEdit) || 0,
        costo_embalaje: parseFloat(cebcEdit) || 0
      })
      .eq('id', selectedCostId);

    if (error) return alert("Error al actualizar: " + error.message);

    setSelectedCostId(''); setPpaoEdit(''); setIntcEdit(''); setCebcEdit('');
    setActiveAccordion(null);
    cargarCostosDesdePestana1();
  }

  return (
    <div className="space-y-6 text-slate-100">
      
      {/* Banner informativo con origen España y producto de Pestaña 1 */}
      <div className="bg-[#181a20] border border-red-500/30 p-4 rounded-lg flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <span className="text-xs font-semibold text-red-400 uppercase tracking-wider">
            Origen de Exportación: España 🇪🇸
          </span>
          <h3 className="text-lg font-bold text-white">
            {productoSeleccionado ? productoSeleccionado.nombre : 'Todos los productos (Vista General)'}
          </h3>
          <p className="text-xs text-slate-400 mt-0.5">
            Mostrando costos para <strong className="text-slate-200">{costos.length}</strong> país(es) registrados en la Pestaña 1.
          </p>
        </div>

        {precioBaseEspana && (
          <div className="bg-[#0e1117] px-4 py-2 rounded border border-slate-800 text-right">
            <span className="text-[10px] text-slate-400 uppercase block">Precio Base Origen</span>
            <span className="text-lg font-mono font-bold text-emerald-400">${precioBaseEspana}</span>
          </div>
        )}
      </div>

      <h2 className="text-xl font-bold text-white tracking-tight">
        1. Costo (COST) — Estandarización de criterios
      </h2>

      {/* Botón para desplegar ajuste rápido de variables por país */}
      <div className="space-y-3">
        <button
          onClick={() => toggleAccordion('edit')}
          className={`px-3 py-2 rounded-lg border text-xs font-medium transition-all cursor-pointer ${
            activeAccordion === 'edit'
              ? 'bg-slate-800 border-red-500 text-white'
              : 'bg-[#1e2028] border-slate-700/80 text-slate-300 hover:border-slate-500'
          }`}
        >
          <span>{activeAccordion === 'edit' ? '▼' : '❯'}</span> Ajustar variables de costo por país
        </button>

        {activeAccordion === 'edit' && (
          <div className="bg-[#181a20] p-4 rounded-lg border border-slate-800 space-y-3">
            <h4 className="text-xs font-bold text-amber-400 uppercase">Editar valores de la Base de Datos</h4>
            <div className="space-y-3">
              <select
                onChange={(e) => handleSelectEdit(e.target.value)}
                value={selectedCostId}
                className="w-full bg-[#0e1117] border border-slate-700 p-2 rounded text-xs text-white"
              >
                <option value="">-- Selecciona un país de la lista --</option>
                {costos.map(c => (
                  <option key={c.id} value={c.id}>{c.paises?.nombre}</option>
                ))}
              </select>

              {selectedCostId && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
                  <div>
                    <label className="text-slate-400 block mb-1">Precio Origen (PPAO)</label>
                    <input
                      type="number"
                      value={ppaoEdit}
                      onChange={(e) => setPpaoEdit(e.target.value)}
                      className="w-full bg-[#0e1117] border border-slate-700 p-2 rounded text-white"
                    />
                  </div>
                  <div>
                    <label className="text-slate-400 block mb-1">Costo Transporte (INTC)</label>
                    <input
                      type="number"
                      value={intcEdit}
                      onChange={(e) => setIntcEdit(e.target.value)}
                      className="w-full bg-[#0e1117] border border-slate-700 p-2 rounded text-white"
                    />
                  </div>
                  <div>
                    <label className="text-slate-400 block mb-1">Costo Cumplimiento (CEBC)</label>
                    <input
                      type="number"
                      value={cebcEdit}
                      onChange={(e) => setCebcEdit(e.target.value)}
                      className="w-full bg-[#0e1117] border border-slate-700 p-2 rounded text-white"
                    />
                  </div>
                </div>
              )}
            </div>
            <button 
              onClick={handleActualizar}
              className="bg-amber-600 hover:bg-amber-500 text-white text-xs px-4 py-2 rounded font-medium cursor-pointer transition-colors"
            >
              Guardar Cambios
            </button>
          </div>
        )}
      </div>

      {/* Tabla 1: Lista de Países de la Pestaña 1 y sus Costos Base */}
      <div className="space-y-3">
        <h3 className="text-base font-bold text-slate-200">
          Tabla 1: Países de destino y variables de costo base
        </h3>

        <div className="overflow-x-auto rounded-lg border border-slate-800 bg-[#16181e]">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="bg-[#1e2028] text-slate-400 border-b border-slate-800">
              <tr>
                <th className="p-3 font-semibold">País Destino</th>
                <th className="p-3 font-semibold">Precio Origen (PPAO)</th>
                <th className="p-3 font-semibold">Costo Transporte (INTC)</th>
                <th className="p-3 font-semibold">Cumplimiento Fronterizo (CEBC)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {loading ? (
                <tr>
                  <td colSpan="4" className="p-4 text-center text-slate-500 animate-pulse">
                    Consultando lista de países desde Supabase...
                  </td>
                </tr>
              ) : costosNormalizados.length > 0 ? (
                costosNormalizados.map((row) => (
                  <tr key={row.id} className="hover:bg-[#1f222d]/50 transition-colors">
                    <td className="p-3 font-medium text-white">{row.paises?.nombre || 'N/A'}</td>
                    <td className="p-3 font-mono">{row.ppaoEfectivo ?? '—'}</td>
                    <td className="p-3 font-mono">{row.impuesto_importación ?? '—'}</td>
                    <td className="p-3 font-mono">{row.costo_embalaje ?? '—'}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="4" className="p-4 text-center text-slate-500">
                    No se encontraron países configurados en la base de datos de la Pestaña 1.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Tabla 2: Resultados Calculados Automáticamente */}
      <div className="space-y-3 pt-2 border-t border-slate-800">
        <h3 className="text-base font-bold text-slate-200">
          Tabla 2: Ponderación y Costo Total Normalizado
        </h3>

        <div className="overflow-x-auto rounded-lg border border-slate-800 bg-[#16181e]">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="bg-[#1e2028] text-slate-400 border-b border-slate-800">
              <tr>
                <th className="p-3 font-semibold">País Destino</th>
                <th className="p-3 font-semibold">PPAO Norm (44.00%)</th>
                <th className="p-3 font-semibold">INTC Norm (34.00%)</th>
                <th className="p-3 font-semibold">CEBC Norm (22.00%)</th>
                <th className="p-3 font-semibold text-red-400">Costo Total Normalizado</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {loading ? (
                <tr>
                  <td colSpan="5" className="p-4 text-center text-slate-500 animate-pulse">
                    Calculando ponderaciones...
                  </td>
                </tr>
              ) : costosNormalizados.length > 0 ? (
                costosNormalizados.map((row) => (
                  <tr key={row.id} className="hover:bg-[#1f222d]/50 transition-colors">
                    <td className="p-3 font-medium text-white">{row.paises?.nombre || 'N/A'}</td>
                    <td className="p-3 font-mono">{row.ppaoNorm ?? '—'}</td>
                    <td className="p-3 font-mono">{row.intcNorm ?? '—'}</td>
                    <td className="p-3 font-mono">{row.cebcNorm ?? '—'}</td>
                    <td className="p-3 font-mono font-bold text-red-400">{row.costoTotalNorm ?? '—'}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="5" className="p-4 text-center text-slate-500">
                    Sin datos para realizar los cálculos.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
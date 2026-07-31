import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient.js';

export default function TabCosto() {
  const [datosCostos, setDatosCostos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [errorLog, setErrorLog] = useState(null);

  // Formularios de edición rápida
  const [activeAccordion, setActiveAccordion] = useState(null);
  const [selectedCostId, setSelectedCostId] = useState('');
  const [ppaoEdit, setPpaoEdit] = useState('');
  const [intcEdit, setIntcEdit] = useState('');
  const [cebcEdit, setCebcEdit] = useState('');

  // ----------------------------------------------------
  // 1. CONSULTA DIRECTA Y RESILIENTE A SUPABASE
  // ----------------------------------------------------
  useEffect(() => {
    cargarDatosAutomaticos();
  }, []);

  async function cargarDatosAutomaticos() {
    setLoading(true);
    setErrorLog(null);

    try {
      // Intento 1: Traer la tabla de costos
      const { data: costos, error: errCostos } = await supabase
        .from('producto_pais_costos')
        .select('*');

      if (errCostos) throw errCostos;

      if (!costos || costos.length === 0) {
        setDatosCostos([]);
        setLoading(false);
        return;
      }

      // Traer Productos y Países de forma independiente para evitar fallos de Foreign Keys
      const { data: productos } = await supabase.from('productos').select('id, nombre, codigo');
      const { data: paises } = await supabase.from('paises').select('id, nombre');

      // Crear Mapas de búsqueda rápida
      const mapProductos = new Map((productos || []).map(p => [p.id, p]));
      const mapPaises = new Map((p => [p.id, p])((paises || [])));

      // Combinar la información
      const combinados = costos.map(c => ({
        ...c,
        producto_nombre: mapProductos.get(c.producto_id)?.nombre || `Producto #${c.producto_id || 'N/A'}`,
        pais_nombre: mapPaises.get(c.pais_id)?.nombre || `País #${c.pais_id || 'N/A'}`
      }));

      setDatosCostos(combinados);
    } catch (err) {
      console.error("Error al cargar en TabCosto:", err);
      setErrorLog(err.message || "Error al conectar con la base de datos");
    } finally {
      setLoading(false);
    }
  }

  // ----------------------------------------------------
  // 2. FÓRMULAS Y PONDERACIONES AUTOMÁTICAS
  // ----------------------------------------------------
  const PESO_PPAO = 0.44;
  const PESO_INTC = 0.34;
  const PESO_CEBC = 0.22;
  const A3 = 10;

  const ppaoVals = datosCostos.map(c => Number(c.precio_origen)).filter(v => v > 0);
  const intcVals = datosCostos.map(c => Number(c.impuesto_importación || c.costo_transporte)).filter(v => v > 0);
  const cebcVals = datosCostos.map(c => Number(c.costo_embalaje || c.cumplimiento)).filter(v => v > 0);

  const minPpao = ppaoVals.length > 0 ? Math.min(...ppaoVals) : null;
  const minIntc = intcVals.length > 0 ? Math.min(...intcVals) : null;
  const minCebc = cebcVals.length > 0 ? Math.min(...cebcVals) : null;

  const calcularNormalizado = (val, minVal) => {
    if (!val || !minVal || val <= 0 || minVal <= 0) return null;
    return Number((A3 * (minVal / val)).toFixed(2));
  };

  const matrizCalculada = datosCostos.map(row => {
    const ppao = Number(row.precio_origen) || null;
    const intc = Number(row.impuesto_importación || row.costo_transporte) || null;
    const cebc = Number(row.costo_embalaje || row.cumplimiento) || null;

    const ppaoNorm = calcularNormalizado(ppao, minPpao);
    const intcNorm = calcularNormalizado(intc, minIntc);
    const cebcNorm = calcularNormalizado(cebc, minCebc);

    const p1 = ppaoNorm ?? 0;
    const p2 = intcNorm ?? 0;
    const p3 = cebcNorm ?? 0;

    const costoTotalNorm = Number(((PESO_PPAO * p1) + (PESO_INTC * p2) + (PESO_CEBC * p3)).toFixed(2));

    return {
      ...row,
      ppao,
      intc,
      cebc,
      ppaoNorm,
      intcNorm,
      cebcNorm,
      costoTotalNorm
    };
  });

  matrizCalculada.sort((a, b) => a.costoTotalNorm - b.costoTotalNorm);

  // ----------------------------------------------------
  // 3. EDICIÓN / GUARDADO EN SUPABASE
  // ----------------------------------------------------
  const handleSelectEdit = (id) => {
    setSelectedCostId(id);
    const target = datosCostos.find(c => c.id === parseInt(id));
    if (target) {
      setPpaoEdit(target.precio_origen || '');
      setIntcEdit(target.impuesto_importación || target.costo_transporte || '');
      setCebcEdit(target.costo_embalaje || target.cumplimiento || '');
    }
  };

  async function handleGuardarCambios() {
    if (!selectedCostId) return alert("Selecciona un registro para editar.");

    const { error } = await supabase
      .from('producto_pais_costos')
      .update({
        precio_origen: parseFloat(ppaoEdit) || 0,
        impuesto_importación: parseFloat(intcEdit) || 0,
        costo_embalaje: parseFloat(cebcEdit) || 0
      })
      .eq('id', selectedCostId);

    if (error) {
      alert("Error al actualizar: " + error.message);
    } else {
      setSelectedCostId(''); setPpaoEdit(''); setIntcEdit(''); setCebcEdit('');
      setActiveAccordion(null);
      cargarDatosAutomaticos();
    }
  }

  return (
    <div className="space-y-6 text-slate-100">
      
      {/* Banner de estado */}
      <div className="bg-[#181a20] border border-red-500/30 p-4 rounded-lg flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <span className="text-xs font-semibold text-red-400 uppercase tracking-wider">
            Origen de Exportación: España 🇪🇸
          </span>
          <h3 className="text-lg font-bold text-white">
            Detección Automática de Productos y Países
          </h3>
          <p className="text-xs text-slate-400 mt-0.5">
            Procesando automáticamente <strong className="text-emerald-400">{datosCostos.length}</strong> registro(s) en la base de datos.
          </p>
        </div>
      </div>

      {errorLog && (
        <div className="bg-red-500/10 border border-red-500 text-red-400 p-3 rounded-lg text-xs">
          ⚠️ <strong>Error detectado:</strong> {errorLog}
        </div>
      )}

      <h2 className="text-xl font-bold text-white tracking-tight">
        1. Costo (COST) — Estandarización y Cálculo Automático
      </h2>

      {/* Accordion Edición */}
      <div className="space-y-3">
        <button
          onClick={() => setActiveAccordion(activeAccordion === 'edit' ? null : 'edit')}
          className={`px-3 py-2 rounded-lg border text-xs font-medium transition-all cursor-pointer ${
            activeAccordion === 'edit'
              ? 'bg-slate-800 border-red-500 text-white'
              : 'bg-[#1e2028] border-slate-700/80 text-slate-300 hover:border-slate-500'
          }`}
        >
          <span>{activeAccordion === 'edit' ? '▼' : '❯'}</span> Editar valores de origen en la Base de Datos
        </button>

        {activeAccordion === 'edit' && (
          <div className="bg-[#181a20] p-4 rounded-lg border border-slate-800 space-y-3">
            <h4 className="text-xs font-bold text-amber-400 uppercase">Modificar Valores</h4>
            <div className="space-y-3">
              <select
                onChange={(e) => handleSelectEdit(e.target.value)}
                value={selectedCostId}
                className="w-full bg-[#0e1117] border border-slate-700 p-2 rounded text-xs text-white"
              >
                <option value="">-- Selecciona un registro --</option>
                {datosCostos.map(c => (
                  <option key={c.id} value={c.id}>
                    {c.producto_nombre} ➔ {c.pais_nombre}
                  </option>
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
              onClick={handleGuardarCambios}
              className="bg-amber-600 hover:bg-amber-500 text-white text-xs px-4 py-2 rounded font-medium cursor-pointer transition-colors"
            >
              Guardar Cambios
            </button>
          </div>
        )}
      </div>

      {/* Tabla 1 */}
      <div className="space-y-3">
        <h3 className="text-base font-bold text-slate-200">
          Tabla 1: Productos, Países de Destino y Costos Detectados
        </h3>

        <div className="overflow-x-auto rounded-lg border border-slate-800 bg-[#16181e]">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="bg-[#1e2028] text-slate-400 border-b border-slate-800">
              <tr>
                <th className="p-3 font-semibold">Producto Detectado</th>
                <th className="p-3 font-semibold">País Destino</th>
                <th className="p-3 font-semibold">Precio Origen (PPAO)</th>
                <th className="p-3 font-semibold">Costo Transporte (INTC)</th>
                <th className="p-3 font-semibold">Cumplimiento (CEBC)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {loading ? (
                <tr>
                  <td colSpan="5" className="p-4 text-center text-slate-500 animate-pulse">
                    Detectando datos en Supabase...
                  </td>
                </tr>
              ) : matrizCalculada.length > 0 ? (
                matrizCalculada.map((row) => (
                  <tr key={row.id} className="hover:bg-[#1f222d]/50 transition-colors">
                    <td className="p-3 font-medium text-amber-300">{row.producto_nombre}</td>
                    <td className="p-3 font-medium text-white">{row.pais_nombre}</td>
                    <td className="p-3 font-mono">{row.ppao ?? '—'}</td>
                    <td className="p-3 font-mono">{row.intc ?? '—'}</td>
                    <td className="p-3 font-mono">{row.cebc ?? '—'}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="5" className="p-4 text-center text-slate-500">
                    No se encontraron registros en la tabla <code className="text-red-400">producto_pais_costos</code>. Verifica que la tabla tenga filas creadas en Supabase.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Tabla 2 */}
      <div className="space-y-3 pt-2 border-t border-slate-800">
        <h3 className="text-base font-bold text-slate-200">
          Tabla 2: Normalización y Ponderación Final
        </h3>

        <div className="overflow-x-auto rounded-lg border border-slate-800 bg-[#16181e]">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="bg-[#1e2028] text-slate-400 border-b border-slate-800">
              <tr>
                <th className="p-3 font-semibold">Producto</th>
                <th className="p-3 font-semibold">País Destino</th>
                <th className="p-3 font-semibold">PPAO Norm (44%)</th>
                <th className="p-3 font-semibold">INTC Norm (34%)</th>
                <th className="p-3 font-semibold">CEBC Norm (22%)</th>
                <th className="p-3 font-semibold text-red-400">Costo Total Normalizado</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {loading ? (
                <tr>
                  <td colSpan="6" className="p-4 text-center text-slate-500 animate-pulse">
                    Calculando matriz...
                  </td>
                </tr>
              ) : matrizCalculada.length > 0 ? (
                matrizCalculada.map((row) => (
                  <tr key={row.id} className="hover:bg-[#1f222d]/50 transition-colors">
                    <td className="p-3 font-medium text-amber-300">{row.producto_nombre}</td>
                    <td className="p-3 font-medium text-white">{row.pais_nombre}</td>
                    <td className="p-3 font-mono">{row.ppaoNorm ?? '—'}</td>
                    <td className="p-3 font-mono">{row.intcNorm ?? '—'}</td>
                    <td className="p-3 font-mono">{row.cebcNorm ?? '—'}</td>
                    <td className="p-3 font-mono font-bold text-red-400">{row.costoTotalNorm ?? '—'}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="6" className="p-4 text-center text-slate-500">
                    Sin registros para calcular.
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
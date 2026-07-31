import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient.js';

export default function TabCosto({ productoActivo, categoria, subcategoria, busqueda, paisOrigen }) {
  const [datosProductos, setDatosProductos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [errorLog, setErrorLog] = useState(null);

  // Estados para la sección de edición rápida
  const [activeAccordion, setActiveAccordion] = useState(null);
  const [selectedProductId, setSelectedProductId] = useState('');
  const [ppaoEdit, setPpaoEdit] = useState('');
  const [intcEdit, setIntcEdit] = useState('');
  const [cebcEdit, setCebcEdit] = useState('');

  // Reejecutar consulta al cambiar cualquier filtro del Sidebar
  useEffect(() => {
    cargarProductosDesdeBD();
  }, [productoActivo, categoria, subcategoria, busqueda, paisOrigen]);

  async function cargarProductosDesdeBD() {
    setLoading(true);
    setErrorLog(null);

    try {
      // Consulta directa a la tabla "productos"
      let query = supabase.from('productos').select('*');

      // 1. Si hay un producto específico seleccionado en el sidebar
      if (productoActivo && productoActivo.id) {
        query = query.eq('id', productoActivo.id);
      }

      const { data, error } = await query;

      if (error) throw error;

      if (data) {
        let filtrados = data;

        // 2. Si el sidebar está en "Todos", aplicamos filtros adicionales si corresponden
        if (!productoActivo || !productoActivo.id) {
          if (categoria && categoria !== 'Todos') {
            filtrados = filtrados.filter(item => item.categoria_codigo === categoria || item.categoria_id === categoria);
          }
          if (subcategoria && subcategoria !== 'Todos') {
            filtrados = filtrados.filter(item => item.subcategoria_codigo === subcategoria || item.subcategoria_id === subcategoria);
          }
          if (busqueda && busqueda.trim() !== '') {
            const q = busqueda.toLowerCase();
            filtrados = filtrados.filter(item =>
              (item.nombre && item.nombre.toLowerCase().includes(q)) ||
              (item.codigo && String(item.codigo).toLowerCase().includes(q)) ||
              (item.pais || item.pais_destino || '').toLowerCase().includes(q)
            );
          }
        }

        setDatosProductos(filtrados);
      }
    } catch (err) {
      console.error("Error al cargar productos:", err);
      setErrorLog(err.message || "Error al conectar con la tabla productos");
    } finally {
      setLoading(false);
    }
  }

  // ----------------------------------------------------
  // FÓRMULAS Y NORMALIZACIÓN AUTOMÁTICA
  // ----------------------------------------------------
  const PESO_PPAO = 0.44;
  const PESO_INTC = 0.34;
  const PESO_CEBC = 0.22;
  const A3 = 10;

  // Extraer valores numéricos flexibles identificando los nombres de columnas habituales
  const getPpao = (row) => Number(row.precio_origen || row.ppao || row.precio) || null;
  const getIntc = (row) => Number(row.costo_transporte || row.impuesto_importacion || row.intc) || null;
  const getCebc = (row) => Number(row.cumplimiento || row.costo_embalaje || row.cebc) || null;
  const getPaisNombre = (row) => row.pais_destino || row.pais || row.destino || 'No especificado';

  const ppaoVals = datosProductos.map(getPpao).filter(v => v > 0);
  const intcVals = datosProductos.map(getIntc).filter(v => v > 0);
  const cebcVals = datosProductos.map(getCebc).filter(v => v > 0);

  const minPpao = ppaoVals.length > 0 ? Math.min(...ppaoVals) : null;
  const minIntc = intcVals.length > 0 ? Math.min(...intcVals) : null;
  const minCebc = cebcVals.length > 0 ? Math.min(...cebcVals) : null;

  const calcularNormalizado = (val, minVal) => {
    if (!val || !minVal || val <= 0 || minVal <= 0) return null;
    return Number((A3 * (minVal / val)).toFixed(2));
  };

  const matrizCalculada = datosProductos.map(row => {
    const ppao = getPpao(row);
    const intc = getIntc(row);
    const cebc = getCebc(row);

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
      costoTotalNorm,
      pais_nombre: getPaisNombre(row)
    };
  });

  matrizCalculada.sort((a, b) => a.costoTotalNorm - b.costoTotalNorm);

  // ----------------------------------------------------
  // GUARDAR EDICIONES EN LA TABLA PRODUCTOS
  // ----------------------------------------------------
  const handleSelectEdit = (id) => {
    setSelectedProductId(id);
    const target = datosProductos.find(p => p.id === parseInt(id) || p.id === id);
    if (target) {
      setPpaoEdit(getPpao(target) || '');
      setIntcEdit(getIntc(target) || '');
      setCebcEdit(getCebc(target) || '');
    }
  };

  async function handleGuardarCambios() {
    if (!selectedProductId) return alert("Selecciona un registro para editar.");

    // Detectar qué nombres de columna existen para actualizar correctamente
    const sample = datosProductos[0] || {};
    const colPpao = 'precio_origen' in sample ? 'precio_origen' : ('ppao' in sample ? 'ppao' : 'precio');
    const colIntc = 'costo_transporte' in sample ? 'costo_transporte' : ('intc' in sample ? 'intc' : 'impuesto_importacion');
    const colCebc = 'cumplimiento' in sample ? 'cumplimiento' : ('cebc' in sample ? 'cebc' : 'costo_embalaje');

    const updateData = {
      [colPpao]: parseFloat(ppaoEdit) || 0,
      [colIntc]: parseFloat(intcEdit) || 0,
      [colCebc]: parseFloat(cebcEdit) || 0
    };

    const { error } = await supabase
      .from('productos')
      .update(updateData)
      .eq('id', selectedProductId);

    if (error) {
      alert("Error al actualizar: " + error.message);
    } else {
      setSelectedProductId(''); setPpaoEdit(''); setIntcEdit(''); setCebcEdit('');
      setActiveAccordion(null);
      cargarProductosDesdeBD();
    }
  }

  const modoTodos = !productoActivo || !productoActivo.id;

  return (
    <div className="space-y-6 text-slate-100">
      
      {/* Banner de Estado */}
      <div className="bg-[#181a20] border border-red-500/30 p-4 rounded-lg flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <span className="text-xs font-semibold text-red-400 uppercase tracking-wider">
            Origen de Exportación: {paisOrigen || 'España'} 🇪🇸
          </span>
          <h3 className="text-lg font-bold text-white">
            {modoTodos 
              ? 'Detección Global (Modo: Todos los Productos)' 
              : `Producto Filtrado: ${productoActivo.nombre}`}
          </h3>
          <p className="text-xs text-slate-400 mt-0.5">
            Procesando automáticamente <strong className="text-emerald-400">{datosProductos.length}</strong> registro(s) desde la tabla <code className="text-amber-400">productos</code>.
          </p>
        </div>
      </div>

      {errorLog && (
        <div className="bg-red-500/10 border border-red-500 text-red-400 p-3 rounded-lg text-xs">
          ⚠️ <strong>Error en BD:</strong> {errorLog}
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
            <h4 className="text-xs font-bold text-amber-400 uppercase">Modificar Valores del Producto</h4>
            <div className="space-y-3">
              <select
                onChange={(e) => handleSelectEdit(e.target.value)}
                value={selectedProductId}
                className="w-full bg-[#0e1117] border border-slate-700 p-2 rounded text-xs text-white"
              >
                <option value="">-- Selecciona un registro --</option>
                {datosProductos.map(p => (
                  <option key={p.id} value={p.id}>
                    {p.nombre || `Producto #${p.id}`} (País: {getPaisNombre(p)})
                  </option>
                ))}
              </select>

              {selectedProductId && (
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
                    Consultando tabla productos en Supabase...
                  </td>
                </tr>
              ) : matrizCalculada.length > 0 ? (
                matrizCalculada.map((row) => (
                  <tr key={row.id} className="hover:bg-[#1f222d]/50 transition-colors">
                    <td className="p-3 font-medium text-amber-300">{row.nombre || `Producto #${row.id}`}</td>
                    <td className="p-3 font-medium text-white">{row.pais_nombre}</td>
                    <td className="p-3 font-mono">{row.ppao ?? '—'}</td>
                    <td className="p-3 font-mono">{row.intc ?? '—'}</td>
                    <td className="p-3 font-mono">{row.cebc ?? '—'}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="5" className="p-4 text-center text-slate-500">
                    No se encontraron registros en la tabla <code className="text-amber-400">productos</code>.
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
                    <td className="p-3 font-medium text-amber-300">{row.nombre || `Producto #${row.id}`}</td>
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
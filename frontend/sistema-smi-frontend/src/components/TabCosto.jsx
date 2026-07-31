import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient.js';

export default function TabCosto({ productoActivo, categoria, subcategoria, busqueda, paisOrigen }) {
  const [paisBase, setPaisBase] = useState(paisOrigen || 'Colombia');
  const [datosProductos, setDatosProductos] = useState([]);
  const [listaPaises, setListaPaises] = useState([]);
  const [loading, setLoading] = useState(true);
  const [errorLog, setErrorLog] = useState(null);

  // Control de acordeones para "Gestión de Datos"
  const [activeAccordion, setActiveAccordion] = useState(null); // 'add' | 'edit' | 'delete' | null

  // Estados para CRUD
  const [selectedProductId, setSelectedProductId] = useState('');
  const [ppaoEdit, setPpaoEdit] = useState('');
  const [intcEdit, setIntcEdit] = useState('');
  const [cebcEdit, setCebcEdit] = useState('');

  // Sincronizar país base si cambia la prop
  useEffect(() => {
    if (paisOrigen) setPaisBase(paisOrigen);
  }, [paisOrigen]);

  // Cargar lista de países para el selector dinámico
  useEffect(() => {
    async function fetchPaises() {
      const { data } = await supabase.from('paises').select('*').order('nombre');
      if (data) setListaPaises(data);
    }
    fetchPaises();
  }, []);

  // Consultar base de datos
  useEffect(() => {
    cargarProductosDesdeBD();
  }, [productoActivo, categoria, subcategoria, busqueda, paisBase]);

  async function cargarProductosDesdeBD() {
    setLoading(true);
    setErrorLog(null);

    try {
      let query = supabase.from('productos').select('*');

      if (productoActivo && productoActivo.id) {
        query = query.eq('id', productoActivo.id);
      }

      const { data, error } = await query;

      if (error) throw error;

      if (data) {
        let filtrados = data;

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

  // Helper para extraer campos flexibles
  const getPpao = (row) => Number(row.precio_origen || row.ppao || row.precio) || null;
  const getIntc = (row) => Number(row.costo_transporte || row.impuesto_importacion || row.intc) || null;
  const getCebc = (row) => Number(row.cumplimiento || row.costo_embalaje || row.cebc) || null;
  const getPaisNombre = (row) => row.pais_destino || row.pais || row.destino || 'Desconocido';

  // ----------------------------------------------------
  // FÓRMULAS Y CÁLCULOS AUTOMÁTICOS DE MATRIZ
  // ----------------------------------------------------
  const PESO_PPAO = 0.44;
  const PESO_INTC = 0.34;
  const PESO_CEBC = 0.22;
  const A3 = 10;

  const ppaoVals = datosProductos.map(getPpao).filter(v => v !== null && v > 0);
  const intcVals = datosProductos.map(getIntc).filter(v => v !== null && v > 0);
  const cebcVals = datosProductos.map(getCebc).filter(v => v !== null && v > 0);

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

    const costoTotalNorm = (ppaoNorm !== null || intcNorm !== null || cebcNorm !== null)
      ? Number(((PESO_PPAO * p1) + (PESO_INTC * p2) + (PESO_CEBC * p3)).toFixed(2))
      : null;

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

  matrizCalculada.sort((a, b) => (a.costoTotalNorm ?? 999) - (b.costoTotalNorm ?? 999));

  // Manejo de acordeones
  const toggleAccordion = (tab) => {
    setActiveAccordion(activeAccordion === tab ? null : tab);
  };

  // Edición rápida
  const handleSelectEdit = (id) => {
    setSelectedProductId(id);
    const target = datosProductos.find(p => p.id === parseInt(id) || p.id === id);
    if (target) {
      setPpaoEdit(getPpao(target) ?? '');
      setIntcEdit(getIntc(target) ?? '');
      setCebcEdit(getCebc(target) ?? '');
    }
  };

  async function handleGuardarCambios() {
    if (!selectedProductId) return alert("Selecciona un registro para editar.");

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

  return (
    <div className="space-y-8 text-slate-100 font-sans">
      
      {/* ---------------- 1. TÍTULO PRINCIPAL ---------------- */}
      <h1 className="text-3xl font-bold text-white tracking-tight">
        1.Costo (COST) — Estandarización de criterios
      </h1>

      {/* ---------------- 2. SELECTOR DE PAÍS BASE ---------------- */}
      <div className="space-y-2">
        <label className="block text-xl font-bold text-white">
          Selecciona el país base (origen-Costo Transporte)
        </label>
        <span className="block text-xs text-slate-400">
          Selecciona el país base (origen)
        </span>
        <div className="relative">
          <select
            value={paisBase}
            onChange={(e) => setPaisBase(e.target.value)}
            className="w-full bg-[#1e2028] border border-slate-700/80 rounded-lg px-4 py-3 text-sm text-slate-200 focus:outline-none focus:border-slate-500 appearance-none cursor-pointer"
          >
            <option value="Colombia">Colombia</option>
            <option value="España">España</option>
            {listaPaises.map((p) => (
              <option key={p.id || p.nombre} value={p.nombre}>
                {p.nombre}
              </option>
            ))}
          </select>
          <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-4 text-slate-400">
            ▼
          </div>
        </div>
      </div>

      {/* ---------------- 3. GESTIÓN DE DATOS (TABLA COST) ---------------- */}
      <div className="space-y-4 pt-2">
        <h2 className="text-xl font-bold text-white flex items-center gap-2">
          <span>🔧</span> Gestión de Datos (Tabla COST)
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          
          {/* Añadir */}
          <div className="bg-[#0e1117] border border-slate-800 rounded-lg overflow-hidden">
            <button
              onClick={() => toggleAccordion('add')}
              className="w-full px-4 py-3 text-left text-sm font-medium text-slate-200 hover:bg-[#181a20] transition-colors flex items-center gap-2"
            >
              <span>{activeAccordion === 'add' ? '˅' : '❯'}</span> Añadir país y valores
            </button>
            {activeAccordion === 'add' && (
              <div className="p-4 border-t border-slate-800 space-y-3 bg-[#16181e] text-xs">
                <div>
                  <label className="block text-slate-400 mb-1">Nombre del País</label>
                  <input type="text" className="w-full bg-[#0e1117] border border-slate-700 rounded p-2 text-white" />
                </div>
                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <label className="block text-slate-400 mb-1">PPAO</label>
                    <input type="number" className="w-full bg-[#0e1117] border border-slate-700 rounded p-2 text-white" />
                  </div>
                  <div>
                    <label className="block text-slate-400 mb-1">INTC</label>
                    <input type="number" className="w-full bg-[#0e1117] border border-slate-700 rounded p-2 text-white" />
                  </div>
                  <div>
                    <label className="block text-slate-400 mb-1">CEBC</label>
                    <input type="number" className="w-full bg-[#0e1117] border border-slate-700 rounded p-2 text-white" />
                  </div>
                </div>
                <button className="bg-slate-700 hover:bg-slate-600 text-white px-3 py-1.5 rounded text-xs cursor-pointer">
                  Guardar
                </button>
              </div>
            )}
          </div>

          {/* Editar */}
          <div className="bg-[#0e1117] border border-slate-800 rounded-lg overflow-hidden">
            <button
              onClick={() => toggleAccordion('edit')}
              className="w-full px-4 py-3 text-left text-sm font-medium text-slate-200 hover:bg-[#181a20] transition-colors flex items-center gap-2"
            >
              <span>{activeAccordion === 'edit' ? '˅' : '❯'}</span> Editar país existente
            </button>
            {activeAccordion === 'edit' && (
              <div className="p-4 border-t border-slate-800 space-y-3 bg-[#16181e] text-xs">
                <select
                  onChange={(e) => handleSelectEdit(e.target.value)}
                  value={selectedProductId}
                  className="w-full bg-[#0e1117] border border-slate-700 p-2 rounded text-xs text-white"
                >
                  <option value="">-- Selecciona un registro --</option>
                  {datosProductos.map(p => (
                    <option key={p.id} value={p.id}>
                      {getPaisNombre(p)} (ID: {p.id})
                    </option>
                  ))}
                </select>

                {selectedProductId && (
                  <>
                    <div className="grid grid-cols-3 gap-2">
                      <div>
                        <label className="text-slate-400 block mb-1">PPAO</label>
                        <input
                          type="number"
                          value={ppaoEdit}
                          onChange={(e) => setPpaoEdit(e.target.value)}
                          className="w-full bg-[#0e1117] border border-slate-700 p-2 rounded text-white"
                        />
                      </div>
                      <div>
                        <label className="text-slate-400 block mb-1">INTC</label>
                        <input
                          type="number"
                          value={intcEdit}
                          onChange={(e) => setIntcEdit(e.target.value)}
                          className="w-full bg-[#0e1117] border border-slate-700 p-2 rounded text-white"
                        />
                      </div>
                      <div>
                        <label className="text-slate-400 block mb-1">CEBC</label>
                        <input
                          type="number"
                          value={cebcEdit}
                          onChange={(e) => setCebcEdit(e.target.value)}
                          className="w-full bg-[#0e1117] border border-slate-700 p-2 rounded text-white"
                        />
                      </div>
                    </div>
                    <button 
                      onClick={handleGuardarCambios}
                      className="bg-amber-600 hover:bg-amber-500 text-white text-xs px-3 py-1.5 rounded font-medium cursor-pointer"
                    >
                      Actualizar
                    </button>
                  </>
                )}
              </div>
            )}
          </div>

          {/* Eliminar */}
          <div className="bg-[#0e1117] border border-slate-800 rounded-lg overflow-hidden">
            <button
              onClick={() => toggleAccordion('delete')}
              className="w-full px-4 py-3 text-left text-sm font-medium text-slate-200 hover:bg-[#181a20] transition-colors flex items-center gap-2"
            >
              <span>{activeAccordion === 'delete' ? '˅' : '❯'}</span> Eliminar país existente
            </button>
            {activeAccordion === 'delete' && (
              <div className="p-4 border-t border-slate-800 space-y-3 bg-[#16181e] text-xs">
                <p className="text-slate-400">Selecciona el registro que deseas remover.</p>
              </div>
            )}
          </div>

        </div>

        <div>
          <button className="px-4 py-2 bg-[#1e2028] hover:bg-[#262730] border border-slate-700/80 rounded-lg text-xs font-medium text-slate-200 transition-colors cursor-pointer">
            Descargar Excel actualizado
          </button>
        </div>
      </div>

      {errorLog && (
        <div className="bg-red-500/10 border border-red-500 text-red-400 p-3 rounded-lg text-xs">
          ⚠️ <strong>Error BD:</strong> {errorLog}
        </div>
      )}

      {/* ---------------- 4. TABLA DE COSTOS BASE ---------------- */}
      <div className="space-y-4 pt-2">
        <h2 className="text-2xl font-bold text-white">
          Tabla de costos base
        </h2>

        <div className="overflow-x-auto rounded-lg border border-slate-800/80 bg-[#0e1117]">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-slate-800 text-slate-400 bg-[#16181e]">
                <th className="p-3 w-16 text-right pr-6 font-normal"></th>
                <th className="p-3 font-medium text-slate-300">Países</th>
                <th className="p-3 text-right font-medium text-slate-300">Precio del producto en origen (PPAO)</th>
                <th className="p-3 text-right font-medium text-slate-300">Costos de transporte internacional (INTC)</th>
                <th className="p-3 text-right pr-6 font-medium text-slate-300">Costo de exportación del cumplimiento fronterizo (CEBC)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/50 font-mono text-slate-200">
              {loading ? (
                <tr>
                  <td colSpan="5" className="p-6 text-center text-slate-500 font-sans">
                    Cargando datos de costos...
                  </td>
                </tr>
              ) : matrizCalculada.length > 0 ? (
                matrizCalculada.map((row) => (
                  <tr key={row.id} className="hover:bg-[#16181e]/60 transition-colors">
                    <td className="p-3 text-right pr-6 text-slate-500 font-sans">{row.id}</td>
                    <td className="p-3 font-sans font-medium text-slate-100">{row.pais_nombre}</td>
                    <td className="p-3 text-right">{row.ppao ?? 'None'}</td>
                    <td className="p-3 text-right">{row.intc ?? 'None'}</td>
                    <td className="p-3 text-right pr-6">{row.cebc ?? 'None'}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="5" className="p-6 text-center text-slate-500 font-sans">
                    No hay registros en la tabla de costos base.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ---------------- 5. TABLA DE NORMALIZACIÓN Y CÁLCULOS ---------------- */}
      <div className="space-y-4 pt-4 border-t border-slate-800/80">
        <h2 className="text-xl font-bold text-white">
          Normalización y Ponderación Final
        </h2>

        <div className="overflow-x-auto rounded-lg border border-slate-800/80 bg-[#0e1117]">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-slate-800 text-slate-400 bg-[#16181e]">
                <th className="p-3 font-medium text-slate-300">Países</th>
                <th className="p-3 text-right font-medium text-slate-300">PPAO Norm (44%)</th>
                <th className="p-3 text-right font-medium text-slate-300">INTC Norm (34%)</th>
                <th className="p-3 text-right font-medium text-slate-300">CEBC Norm (22%)</th>
                <th className="p-3 text-right pr-6 font-bold text-red-400">Costo Total Normalizado</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/50 font-mono text-slate-200">
              {loading ? (
                <tr>
                  <td colSpan="5" className="p-6 text-center text-slate-500 font-sans">
                    Calculando ponderaciones...
                  </td>
                </tr>
              ) : matrizCalculada.length > 0 ? (
                matrizCalculada.map((row) => (
                  <tr key={row.id} className="hover:bg-[#16181e]/60 transition-colors">
                    <td className="p-3 font-sans font-medium text-slate-100">{row.pais_nombre}</td>
                    <td className="p-3 text-right">{row.ppaoNorm ?? 'None'}</td>
                    <td className="p-3 text-right">{row.intcNorm ?? 'None'}</td>
                    <td className="p-3 text-right">{row.cebcNorm ?? 'None'}</td>
                    <td className="p-3 text-right pr-6 font-bold text-red-400">{row.costoTotalNorm ?? 'None'}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="5" className="p-6 text-center text-slate-500 font-sans">
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
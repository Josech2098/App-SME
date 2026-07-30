import React, { useState, useEffect } from 'react';
import { supabase } from "../supabaseClient.js";

export default function TabCosto() {
  const [paises, setPaises] = useState([]);
  const [costos, setCostos] = useState([]);
  const [paisBase, setPaisBase] = useState('Colombia');
  const [loading, setLoading] = useState(true);

  // Control de Formularios / Acordeones
  const [activeAccordion, setActiveAccordion] = useState(null); // 'add', 'edit', 'delete'

  // Estados Formulario Añadir
  const [nuevoPais, setNuevoPais] = useState('');
  const [ppaoAdd, setPpaoAdd] = useState('');
  const [intcAdd, setIntcAdd] = useState('');
  const [cebcAdd, setCebcAdd] = useState('');

  // Estados Formulario Editar
  const [selectedCostId, setSelectedCostId] = useState('');
  const [ppaoEdit, setPpaoEdit] = useState('');
  const [intcEdit, setIntcEdit] = useState('');
  const [cebcEdit, setCebcEdit] = useState('');

  // Estado Formulario Eliminar
  const [costToDelete, setCostToDelete] = useState('');

  useEffect(() => {
    cargarDatos();
  }, []);

  // ----------------------------------------------------
  // 1. CARGA DE DATOS DESDE SUPABASE
  // ----------------------------------------------------
  async function cargarDatos() {
    setLoading(true);

    const { data: dataPaises } = await supabase.from('paises').select('*').order('nombre');
    if (dataPaises) setPaises(dataPaises);

    const { data: dataCostos } = await supabase
      .from('producto_pais_costos')
      .select('id, precio_origen, impuesto_importación, costo_embalaje, paises(id, nombre)');
    if (dataCostos) setCostos(dataCostos);

    setLoading(false);
  }

  // ----------------------------------------------------
  // 2. LÓGICA DE CÁLCULO Y NORMALIZACIÓN (EXPORTACIÓN)
  // ----------------------------------------------------
  // Nuevos Pesos de Exportación según tabla:
  const PESO_PPAO = 0.44; // 44.00%
  const PESO_INTC = 0.34; // 34.00%
  const PESO_CEBC = 0.22; // 22.00%
  const A3 = 10;

  // Extraer valores válidos para encontrar mínimos
  const ppaoVals = costos.map(c => Number(c.precio_origen)).filter(v => v > 0);
  const intcVals = costos.map(c => Number(c.impuesto_importación)).filter(v => v > 0);
  const cebcVals = costos.map(c => Number(c.costo_embalaje)).filter(v => v > 0);

  const minPpao = ppaoVals.length > 0 ? Math.min(...ppaoVals) : null;
  const minIntc = intcVals.length > 0 ? Math.min(...intcVals) : null;
  const minCebc = cebcVals.length > 0 ? Math.min(...cebcVals) : null;

  const calcularNormalizado = (val, minVal) => {
    if (!val || !minVal || val <= 0 || minVal <= 0) return null;
    return Number((A3 * (minVal / val)).toFixed(2));
  };

  const costosNormalizados = costos.map(row => {
    const ppao = Number(row.precio_origen) || null;
    const intc = Number(row.impuesto_importación) || null;
    const cebc = Number(row.costo_embalaje) || null;

    const ppaoNorm = calcularNormalizado(ppao, minPpao);
    const intcNorm = calcularNormalizado(intc, minIntc);
    const cebcNorm = calcularNormalizado(cebc, minCebc);

    // Suma ponderada de factores
    const p1 = ppaoNorm ?? 0;
    const p2 = intcNorm ?? 0;
    const p3 = cebcNorm ?? 0;

    const costoTotalNorm = Number(((PESO_PPAO * p1) + (PESO_INTC * p2) + (PESO_CEBC * p3)).toFixed(2));

    return {
      ...row,
      ppaoNorm,
      intcNorm,
      cebcNorm,
      costoTotalNorm
    };
  });

  // Ordenar de menor a mayor costo total normalizado
  costosNormalizados.sort((a, b) => a.costoTotalNorm - b.costoTotalNorm);

  // ----------------------------------------------------
  // 3. OPERACIONES CRUD (SUPABASE)
  // ----------------------------------------------------
  const toggleAccordion = (section) => {
    setActiveAccordion(activeAccordion === section ? null : section);
  };

  // Guardar Nuevo
  async function handleAgregar() {
    if (!nuevoPais || !ppaoAdd) return alert("Ingresa al menos el nombre del país y el PPAO.");

    let paisId;
    const paisExistente = paises.find(p => p.nombre.toLowerCase().trim() === nuevoPais.toLowerCase().trim());

    if (paisExistente) {
      paisId = paisExistente.id;
    } else {
      const { data: newPais, error } = await supabase.from('paises').insert([{ nombre: nuevoPais }]).select();
      if (error) return alert("Error al crear país: " + error.message);
      paisId = newPais[0].id;
    }

    const { error: costError } = await supabase.from('producto_pais_costos').insert([{
      pais_id: paisId,
      precio_origen: parseFloat(ppaoAdd) || 0,
      impuesto_importación: parseFloat(intcAdd) || 0,
      costo_embalaje: parseFloat(cebcAdd) || 0
    }]);

    if (costError) return alert("Error al guardar costos: " + costError.message);

    setNuevoPais(''); setPpaoAdd(''); setIntcAdd(''); setCebcAdd('');
    setActiveAccordion(null);
    cargarDatos();
  }

  // Editar Existente
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
    if (!selectedCostId) return alert("Selecciona un registro para editar.");

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
    cargarDatos();
  }

  // Eliminar Existente
  async function handleEliminar() {
    if (!costToDelete) return alert("Selecciona un registro para eliminar.");

    const { error } = await supabase
      .from('producto_pais_costos')
      .delete()
      .eq('id', costToDelete);

    if (error) return alert("Error al eliminar: " + error.message);

    setCostToDelete('');
    setActiveAccordion(null);
    cargarDatos();
  }

  return (
    <div className="space-y-6 text-slate-100">
      <h2 className="text-2xl font-bold text-white tracking-tight">
        1.Costo (COST) — Estandarización de criterios
      </h2>

      {/* Selector de País Base */}
      <div className="space-y-2">
        <label className="block text-sm font-semibold text-slate-200">
          Selecciona el país base (origen-Costo Transporte)
        </label>
        <select
          value={paisBase}
          onChange={(e) => setPaisBase(e.target.value)}
          className="w-full bg-[#1e2028] border border-slate-700/80 rounded-lg px-4 py-2.5 text-sm text-slate-100 focus:outline-none focus:border-red-500"
        >
          {paises.length > 0 ? (
            paises.map((p) => (
              <option key={p.id} value={p.nombre}>{p.nombre}</option>
            ))
          ) : (
            <option value="Colombia">Colombia</option>
          )}
        </select>
      </div>

      {/* 🛠️ Sección: Gestión de Datos (Tabla COST) */}
      <div className="space-y-3 pt-2">
        <h3 className="text-sm font-semibold text-slate-300 flex items-center gap-2">
          <span>🛠️</span> Gestión de Datos (Tabla COST)
        </h3>

        {/* Botones de Acordeón */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <button
            onClick={() => toggleAccordion('add')}
            className={`p-3 rounded-lg border text-xs font-medium text-left flex items-center gap-2 transition-all cursor-pointer ${
              activeAccordion === 'add'
                ? 'bg-slate-800 border-red-500 text-white'
                : 'bg-[#1e2028] border-slate-800 text-slate-300 hover:border-slate-700'
            }`}
          >
            <span>{activeAccordion === 'add' ? '▼' : '❯'}</span> Añadir país y valores
          </button>

          <button
            onClick={() => toggleAccordion('edit')}
            className={`p-3 rounded-lg border text-xs font-medium text-left flex items-center gap-2 transition-all cursor-pointer ${
              activeAccordion === 'edit'
                ? 'bg-slate-800 border-red-500 text-white'
                : 'bg-[#1e2028] border-slate-800 text-slate-300 hover:border-slate-700'
            }`}
          >
            <span>{activeAccordion === 'edit' ? '▼' : '❯'}</span> Editar país existente
          </button>

          <button
            onClick={() => toggleAccordion('delete')}
            className={`p-3 rounded-lg border text-xs font-medium text-left flex items-center gap-2 transition-all cursor-pointer ${
              activeAccordion === 'delete'
                ? 'bg-slate-800 border-red-500 text-white'
                : 'bg-[#1e2028] border-slate-800 text-slate-300 hover:border-slate-700'
            }`}
          >
            <span>{activeAccordion === 'delete' ? '▼' : '❯'}</span> Eliminar país existente
          </button>
        </div>

        {/* Formulario Desplegable: Añadir País */}
        {activeAccordion === 'add' && (
          <div className="bg-[#181a20] p-4 rounded-lg border border-slate-800 space-y-4">
            <h4 className="text-xs font-bold text-red-400 uppercase">Añadir Nuevo Registro de Costos</h4>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-3 text-xs">
              <input
                type="text"
                placeholder="Nombre del País"
                value={nuevoPais}
                onChange={(e) => setNuevoPais(e.target.value)}
                className="bg-[#0e1117] border border-slate-700 p-2 rounded text-white"
              />
              <input
                type="number"
                placeholder="Precio Origen (PPAO)"
                value={ppaoAdd}
                onChange={(e) => setPpaoAdd(e.target.value)}
                className="bg-[#0e1117] border border-slate-700 p-2 rounded text-white"
              />
              <input
                type="number"
                placeholder="Costo Transporte (INTC)"
                value={intcAdd}
                onChange={(e) => setIntcAdd(e.target.value)}
                className="bg-[#0e1117] border border-slate-700 p-2 rounded text-white"
              />
              <input
                type="number"
                placeholder="Costo Cumplimiento (CEBC)"
                value={cebcAdd}
                onChange={(e) => setCebcAdd(e.target.value)}
                className="bg-[#0e1117] border border-slate-700 p-2 rounded text-white"
              />
            </div>
            <button 
              onClick={handleAgregar}
              className="bg-red-600 hover:bg-red-500 text-white text-xs px-4 py-2 rounded font-medium cursor-pointer transition-colors"
            >
              Guardar Registro
            </button>
          </div>
        )}

        {/* Formulario Desplegable: Editar País */}
        {activeAccordion === 'edit' && (
          <div className="bg-[#181a20] p-4 rounded-lg border border-slate-800 space-y-4">
            <h4 className="text-xs font-bold text-amber-400 uppercase">Editar Registro Existente</h4>
            <div className="space-y-3">
              <select
                onChange={(e) => handleSelectEdit(e.target.value)}
                value={selectedCostId}
                className="w-full bg-[#0e1117] border border-slate-700 p-2 rounded text-xs text-white"
              >
                <option value="">-- Selecciona un país --</option>
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
              Actualizar Costos
            </button>
          </div>
        )}

        {/* Formulario Desplegable: Eliminar País */}
        {activeAccordion === 'delete' && (
          <div className="bg-[#181a20] p-4 rounded-lg border border-slate-800 space-y-4">
            <h4 className="text-xs font-bold text-red-500 uppercase">Eliminar Registro</h4>
            <div className="space-y-3">
              <select
                onChange={(e) => setCostToDelete(e.target.value)}
                value={costToDelete}
                className="w-full bg-[#0e1117] border border-slate-700 p-2 rounded text-xs text-white"
              >
                <option value="">-- Selecciona un país a eliminar --</option>
                {costos.map(c => (
                  <option key={c.id} value={c.id}>{c.paises?.nombre}</option>
                ))}
              </select>
            </div>
            <button 
              onClick={handleEliminar}
              className="bg-red-700 hover:bg-red-600 text-white text-xs px-4 py-2 rounded font-medium cursor-pointer transition-colors"
            >
              Confirmar Eliminación
            </button>
          </div>
        )}
      </div>

      {/* Tabla de Costos Base */}
      <div className="space-y-3 pt-4">
        <h3 className="text-lg font-bold text-white">Tabla de costos base</h3>

        <div className="overflow-x-auto rounded-lg border border-slate-800 bg-[#16181e]">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="bg-[#1e2028] text-slate-400 border-b border-slate-800">
              <tr>
                <th className="p-3 font-semibold">Países</th>
                <th className="p-3 font-semibold">Precio del producto en origen (PPAO)</th>
                <th className="p-3 font-semibold">Costos de transporte internacional (INTC)</th>
                <th className="p-3 font-semibold">Costo de exportación del cumplimiento fronterizo (CEBC)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {loading ? (
                <tr>
                  <td colSpan="4" className="p-4 text-center text-slate-500 animate-pulse">
                    Cargando costos base desde Supabase...
                  </td>
                </tr>
              ) : costos.length > 0 ? (
                costos.map((row) => (
                  <tr key={row.id} className="hover:bg-[#1f222d]/50 transition-colors">
                    <td className="p-3 font-medium text-white">{row.paises?.nombre || 'N/A'}</td>
                    <td className="p-3 font-mono">{row.precio_origen ?? '—'}</td>
                    <td className="p-3 font-mono">{row.impuesto_importación ?? '—'}</td>
                    <td className="p-3 font-mono">{row.costo_embalaje ?? '—'}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="4" className="p-4 text-center text-slate-500">
                    No hay registros de costos cargados.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Tabla de Costos Normalizados */}
      <div className="space-y-3 pt-4 border-t border-slate-800">
        <h3 className="text-lg font-bold text-white">Costos normalizados</h3>

        <div className="overflow-x-auto rounded-lg border border-slate-800 bg-[#16181e]">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="bg-[#1e2028] text-slate-400 border-b border-slate-800">
              <tr>
                <th className="p-3 font-semibold">Países</th>
                <th className="p-3 font-semibold">PPAO Norm ({PESO_PPAO * 100}%)</th>
                <th className="p-3 font-semibold">INTC Norm ({PESO_INTC * 100}%)</th>
                <th className="p-3 font-semibold">CEBC Norm ({PESO_CEBC * 100}%)</th>
                <th className="p-3 font-semibold text-red-400">Costo Total Normalizado</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {loading ? (
                <tr>
                  <td colSpan="5" className="p-4 text-center text-slate-500 animate-pulse">
                    Calculando normalizaciones...
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
                    No hay datos para calcular.
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
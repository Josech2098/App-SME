import React, { useState, useEffect } from 'react';
import { supabase } from "../supabaseClient.js";

export default function TabCosto() {
  const [paises, setPaises] = useState([]);
  const [costos, setCostos] = useState([]);
  const [paisBase, setPaisBase] = useState('Colombia');
  const [loading, setLoading] = useState(true);

  // Estados para Acordeones / Paneles
  const [activeAccordion, setActiveAccordion] = useState(null); // 'add', 'edit', 'delete'

  // Formulario Añadir
  const [nuevoPais, setNuevoPais] = useState('');
  const [ppao, setPpao] = useState('');
  const [intc, setIntc] = useState('');
  const [cebc, setCebc] = useState('');

  useEffect(() => {
    cargarDatos();
  }, []);

  async function cargarDatos() {
    setLoading(true);
    // Cargar Países
    const { data: dataPaises } = await supabase.from('paises').select('*').order('nombre');
    if (dataPaises) setPaises(dataPaises);

    // Cargar Costos cruzados
    const { data: dataCostos } = await supabase
      .from('producto_pais_costos')
      .select('id, precio_origen, impuesto_importación, costo_embalaje, paises(id, nombre)');
    if (dataCostos) setCostos(dataCostos);

    setLoading(false);
  }

  const toggleAccordion = (section) => {
    setActiveAccordion(activeAccordion === section ? null : section);
  };

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
          <div className="bg-[#181a20] p-4 rounded-lg border border-slate-800 space-y-4 animate-fadeIn">
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
                value={ppao}
                onChange={(e) => setPpao(e.target.value)}
                className="bg-[#0e1117] border border-slate-700 p-2 rounded text-white"
              />
              <input
                type="number"
                placeholder="Costo Transporte (INTC)"
                value={intc}
                onChange={(e) => setIntc(e.target.value)}
                className="bg-[#0e1117] border border-slate-700 p-2 rounded text-white"
              />
              <input
                type="number"
                placeholder="Costo Cumplimiento (CEBC)"
                value={cebc}
                onChange={(e) => setCebc(e.target.value)}
                className="bg-[#0e1117] border border-slate-700 p-2 rounded text-white"
              />
            </div>
            <button className="bg-red-600 hover:bg-red-500 text-white text-xs px-4 py-2 rounded font-medium cursor-pointer">
              Guardar Registro
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
                costos.map((row, index) => (
                  <tr key={index} className="hover:bg-[#1f222d]/50 transition-colors">
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
    </div>
  );
}
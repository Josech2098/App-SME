import React, { useState } from 'react';
import TablaProductos from './components/TablaProductos.jsx';

export default function App() {
  // Pestaña Activa
  const [activeTab, setActiveTab] = useState('Productos');

  // Estados de Filtros para la Barra Lateral (Sidebar)
  const [categoria, setCategoria] = useState('Todos');
  const [subcategoria, setSubcategoria] = useState('Todos');
  const [searchNombre, setSearchNombre] = useState('');
  const [searchCodigo, setSearchCodigo] = useState('');
  const [searchSubcodigo, setSearchSubcodigo] = useState('');
  const [paisDestino, setPaisDestino] = useState('Costa Rica');

  const tabs = [
    { id: 'Productos', label: 'Productos' },
    { id: 'COST', label: 'Costo (COST)' },
    { id: 'LOGI', label: 'Logística (LOGI)' },
    { id: 'COMM', label: 'Comercial (COMM)' },
    { id: 'ECON', label: 'Economía (ECON)' },
    { id: 'POLI', label: 'Política (POLI)' },
    { id: 'CULT', label: 'Cultura (CULT)' },
    { id: 'Totales', label: 'Visualización de Tablas Totales' },
    { id: 'Graficos', label: 'Gráficos' }
  ];

  return (
    <div className="flex min-h-screen bg-[#0e1117] text-slate-100 font-sans">
      
      {/* 1. BARRA LATERAL (SIDEBAR STREAMLIT) */}
      <aside className="w-80 bg-[#181a20]/90 border-r border-slate-800 p-5 flex flex-col gap-5 shrink-0 min-h-screen">
        
        {/* Banner de Usuario Logueado */}
        <div className="bg-[#1f3a2b] border border-emerald-600/40 rounded-lg p-3 flex flex-col gap-2">
          <span className="text-xs text-emerald-300 font-medium">
            Usuario: <strong className="text-white">admin (admin)</strong>
          </span>
          <button 
            onClick={() => alert('Sesión cerrada')}
            className="self-start text-xs bg-[#262730] hover:bg-slate-700 text-slate-200 border border-slate-700 px-3 py-1 rounded transition-colors cursor-pointer"
          >
            Cerrar sesión
          </button>
        </div>

        {/* Filtros de Búsqueda */}
        <div className="space-y-4">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 border-b border-slate-800 pb-2">
            Filtros de búsqueda
          </h3>

          <div className="space-y-1">
            <label className="text-xs text-slate-300">Selecciona una categoría</label>
            <select
              value={categoria}
              onChange={(e) => setCategoria(e.target.value)}
              className="w-full bg-[#0e1117] border border-slate-700/80 rounded px-3 py-2 text-xs text-white focus:outline-none focus:border-red-500"
            >
              <option value="Todos">Todos</option>
              <option value="Agricola">Agroindustria / Agrícola</option>
              <option value="Alimentos">Alimentos Procesados</option>
              <option value="Manufactura">Manufactura</option>
            </select>
          </div>

          <div className="space-y-1">
            <label className="text-xs text-slate-300">Selecciona una subcategoría</label>
            <select
              value={subcategoria}
              onChange={(e) => setSubcategoria(e.target.value)}
              className="w-full bg-[#0e1117] border border-slate-700/80 rounded px-3 py-2 text-xs text-white focus:outline-none focus:border-red-500"
            >
              <option value="Todos">Todos</option>
              <option value="Granos">Granos y Cereales</option>
              <option value="Bebidas">Bebidas</option>
            </select>
          </div>

          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 border-b border-slate-800 pb-2 pt-2">
            Búsquedas personalizadas
          </h3>

          <div className="space-y-1">
            <label className="text-xs text-slate-300">Buscar por nombre (producto o subproducto)</label>
            <input
              type="text"
              placeholder="Ej. Café"
              value={searchNombre}
              onChange={(e) => setSearchNombre(e.target.value)}
              className="w-full bg-[#0e1117] border border-slate-700/80 rounded px-3 py-2 text-xs text-white focus:outline-none focus:border-red-500"
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs text-slate-300">Buscar por código de producto (2 dígitos)</label>
            <input
              type="text"
              placeholder="Ej. 09"
              value={searchCodigo}
              onChange={(e) => setSearchCodigo(e.target.value)}
              className="w-full bg-[#0e1117] border border-slate-700/80 rounded px-3 py-2 text-xs text-white focus:outline-none focus:border-red-500"
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs text-slate-300">Buscar por subcódigo de subproducto (2 dígitos)</label>
            <input
              type="text"
              placeholder="Ej. 01"
              value={searchSubcodigo}
              onChange={(e) => setSearchSubcodigo(e.target.value)}
              className="w-full bg-[#0e1117] border border-slate-700/80 rounded px-3 py-2 text-xs text-white focus:outline-none focus:border-red-500"
            />
          </div>
        </div>
      </aside>

      {/* 2. CONTENIDO PRINCIPAL */}
      <main className="flex-1 p-8 overflow-y-auto">
        
        {/* Título Superior */}
        <div className="flex justify-between items-center mb-6 border-b border-slate-800 pb-4">
          <h1 className="text-2xl font-extrabold text-white tracking-tight">
            Aplicativo Selección de Mercados Internacionales
          </h1>
          <span className="text-xs text-slate-400 font-mono">Deploy activo</span>
        </div>

        {/* NAVEGACIÓN DE PESTAÑAS (TABS) */}
        <nav className="flex gap-6 border-b border-slate-800 mb-6 overflow-x-auto pb-1">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`pb-3 text-xs font-semibold relative transition-colors cursor-pointer whitespace-nowrap ${
                activeTab === tab.id
                  ? 'text-red-500'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              {tab.label}
              {activeTab === tab.id && (
                <span className="absolute bottom-0 left-0 w-full h-[2px] bg-red-500" />
              )}
            </button>
          ))}
        </nav>

        {/* RENDERIZADO SEGÚN PESTAÑA */}
        {activeTab === 'Productos' && (
          <TablaProductos
            paisDestino={paisDestino}
            setPaisDestino={setPaisDestino}
            categoria={categoria}
            subcategoria={subcategoria}
            searchNombre={searchNombre}
            searchCodigo={searchCodigo}
            searchSubcodigo={searchSubcodigo}
          />
        )}

        {activeTab !== 'Productos' && (
          <div className="bg-[#181a20] border border-slate-800 rounded-xl p-8 text-center text-slate-400 text-sm">
            Módulo <strong className="text-white">{activeTab}</strong> en desarrollo para conexión con Supabase.
          </div>
        )}
      </main>
    </div>
  );
}
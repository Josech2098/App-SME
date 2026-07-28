import React, { useState } from 'react';
import TablaProductos from "./components/TabProductos.jsx";
import TabCosto from './components/TabCosto,jsx';

export default function App() {
  const [activeTab, setActiveTab] = useState(0); // 0 = Productos por defecto

  // Estado global para el país de destino (compartido con TabCosto)
  const [paisDestino, setPaisDestino] = useState('Colombia');

  // Filtros de la barra lateral
  const [categoria, setCategoria] = useState('Todos');
  const [subcategoria, setSubcategoria] = useState('Todos');
  const [searchNombre, setSearchNombre] = useState('');
  const [searchCodigo, setSearchCodigo] = useState('');
  const [searchSubcodigo, setSearchSubcodigo] = useState('');

  const tabList = [
    "Productos",
    "Costo (COST)",
    "Logística (LOGI)",
    "Comercial (COMM)",
    "Economía (ECON)",
    "Política (POLI)",
    "Cultura (CULT)",
    "Visualización de Tablas Totales",
    "Gráficos"
  ];

  return (
    <div className="flex min-h-screen bg-[#0e1117] text-slate-100 font-sans antialiased">
      
      {/* ---------------- BARRA LATERAL (SIDEBAR) ---------------- */}
      <aside className="w-80 bg-[#262730]/40 border-r border-[#262730] p-6 flex flex-col gap-6 shrink-0">
        
        {/* Banner de Usuario */}
        <div className="bg-[#2e4d3a] border border-[#3e6b4f] text-[#a1e8bc] px-4 py-2.5 rounded-lg text-sm font-medium shadow-sm">
          Usuario: admin (admin)
        </div>

        {/* Botón Cerrar Sesión */}
        <button className="self-start px-3 py-1.5 bg-[#262730] hover:bg-[#31333f] text-xs font-medium text-slate-200 border border-slate-700/60 rounded cursor-pointer transition-colors">
          Cerrar sesión
        </button>

        {/* Sección: Filtros de búsqueda */}
        <div className="space-y-4 pt-2">
          <h2 className="text-base font-bold text-slate-100">Filtros de búsqueda</h2>

          <div className="space-y-1.5">
            <label className="block text-xs text-slate-300">Selecciona una categoría</label>
            <select 
              value={categoria}
              onChange={(e) => setCategoria(e.target.value)}
              className="w-full bg-[#0e1117] border border-slate-700/80 rounded px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-red-500"
            >
              <option value="Todos">Todos</option>
              {/* Puedes iterar aquí tus categorías o dinámicamente si vienen de Supabase */}
            </select>
          </div>

          <div className="space-y-1.5">
            <label className="block text-xs text-slate-300">Selecciona una subcategoría</label>
            <select 
              value={subcategoria}
              onChange={(e) => setSubcategoria(e.target.value)}
              className="w-full bg-[#0e1117] border border-slate-700/80 rounded px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-red-500"
            >
              <option value="Todos">Todos</option>
            </select>
          </div>
        </div>

        {/* Sección: Búsquedas personalizadas */}
        <div className="space-y-4 pt-2">
          <h2 className="text-base font-bold text-slate-100">Búsquedas personalizadas</h2>

          <div className="space-y-1.5">
            <label className="block text-xs text-slate-300">Buscar por nombre (producto o subproducto)</label>
            <input
              type="text"
              value={searchNombre}
              onChange={(e) => setSearchNombre(e.target.value)}
              className="w-full bg-[#0e1117] border border-slate-700/80 rounded px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-red-500"
            />
          </div>

          <div className="space-y-1.5">
            <label className="block text-xs text-slate-300">Buscar por código de producto (2 dígitos)</label>
            <input
              type="text"
              value={searchCodigo}
              onChange={(e) => setSearchCodigo(e.target.value)}
              className="w-full bg-[#0e1117] border border-slate-700/80 rounded px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-red-500"
            />
          </div>

          <div className="space-y-1.5">
            <label className="block text-xs text-slate-300">Buscar por subcódigo de subproducto (2 dígitos)</label>
            <input
              type="text"
              value={searchSubcodigo}
              onChange={(e) => setSearchSubcodigo(e.target.value)}
              className="w-full bg-[#0e1117] border border-slate-700/80 rounded px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-red-500"
            />
          </div>
        </div>
      </aside>

      {/* ---------------- ÁREA PRINCIPAL ---------------- */}
      <main className="flex-1 p-8 overflow-y-auto">
        
        {/* Título Principal */}
        <h1 className="text-3xl font-bold text-white mb-6 tracking-tight">
          Aplicativo Selección de Mercados Internacionales
        </h1>

        {/* Pestañas (Tabs) Estilo Streamlit */}
        <div className="border-b border-slate-800 flex gap-6 overflow-x-auto mb-8 no-scrollbar">
          {tabList.map((tabName, index) => (
            <button
              key={index}
              onClick={() => setActiveTab(index)}
              className={`pb-2 text-sm font-normal whitespace-nowrap transition-all cursor-pointer relative ${
                activeTab === index
                  ? 'text-red-500 font-medium'
                  : 'text-slate-300 hover:text-white'
              }`}
            >
              {tabName}
              {/* Indicador de pestaña activa */}
              {activeTab === index && (
                <span className="absolute bottom-0 left-0 w-full h-[2px] bg-red-500"></span>
              )}
            </button>
          ))}
        </div>

        {/* Contenido Dinámico de la Pestaña Seleccionada */}
        <div>
          {/* 📦 TAB 0: PRODUCTOS */}
          {activeTab === 0 && (
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

          {/* 💵 TAB 1: COSTO (COST) */}
          {activeTab === 1 && (
            <div className="space-y-6">
              <h2 className="text-2xl font-bold text-white">
                1. Costo (COST) — Estandarización de criterios
              </h2>
              <p className="text-xs text-emerald-400 font-medium">
                País destino seleccionado: <span className="font-bold">{paisDestino}</span>
              </p>
              <TabCosto paisDestino={paisDestino} />
            </div>
          )}

          {/* ⚙️ DEMÁS TABS EN DESARROLLO */}
          {activeTab > 1 && (
            <div className="space-y-6">
              <h2 className="text-2xl font-bold text-white">
                {tabList[activeTab]}
              </h2>
              <div className="bg-[#1c2c3d] border border-[#2b4259] text-[#71b1ea] px-4 py-3 rounded flex items-center gap-2 text-sm">
                <span>ℹ️</span>
                <span>Sección en desarrollo...</span>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
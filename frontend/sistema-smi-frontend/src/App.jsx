import React, { useState, useEffect } from 'react';
import { supabase } from './supabaseClient.js';
import TablaProductos from './components/TabProductos';
import TabCosto from './components/TabCosto';
import TabLogistica from './components/TabLogistica';
import TabComercial from './components/TabComercial'; // <--- 1. Importar la pestaña comercial

export default function App() {
  const [activeTab, setActiveTab] = useState(0);

  // ----------------------------------------------------
  // ESTADOS GLOBALES DE PRODUCTO, PAÍSES Y ORIGEN
  // ----------------------------------------------------
  const [productoSeleccionado, setProductoSeleccionado] = useState(null);
  const [paisesDestino, setPaisesDestino] = useState([]);
  const [paisOrigen, setPaisOrigen] = useState('España'); // Por defecto

  // Filtros de la barra lateral
  const [categoria, setCategoria] = useState('Todos');
  const [subcategoria, setSubcategoria] = useState('Todos');
  const [searchNombre, setSearchNombre] = useState('');
  const [searchCodigo, setSearchCodigo] = useState('');
  const [searchSubcodigo, setSearchSubcodigo] = useState('');

  // Listas desde Supabase
  const [listaCategorias, setListaCategorias] = useState([]);
  const [listaSubcategorias, setListaSubcategorias] = useState([]);
  const [listaPaisesOrigen, setListaPaisesOrigen] = useState([]);

  // 1. Cargar Categorías y Países para el Origen
  useEffect(() => {
    async function fetchIniciales() {
      // Categorías
      const { data: catData } = await supabase
        .from('categorias')
        .select('*')
        .order('codigo');
      if (catData) setListaCategorias(catData);

      // Países para el origen
      const { data: paisesData } = await supabase
        .from('paises')
        .select('*')
        .order('nombre');
      if (paisesData) setListaPaisesOrigen(paisesData);
    }
    fetchIniciales();
  }, []);

  // 2. Cargar Subcategorías
  useEffect(() => {
    async function fetchSubcategorias() {
      if (categoria === 'Todos') {
        setListaSubcategorias([]);
        setSubcategoria('Todos');
        return;
      }

      const { data } = await supabase
        .from('subcategorias')
        .select('*')
        .eq('categoria_codigo', categoria)
        .order('codigo');

      if (data) setListaSubcategorias(data);
      else setListaSubcategorias([]);
      
      setSubcategoria('Todos');
    }

    fetchSubcategorias();
  }, [categoria]);

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
        
        {/* Banner de Usuario y Selector de Origen */}
        <div className="space-y-2">
          <div className="bg-[#2e4d3a] border border-[#3e6b4f] text-[#a1e8bc] px-4 py-2.5 rounded-lg text-sm font-medium shadow-sm">
            Usuario: admin (admin)
          </div>

          {/* SELECTOR DINÁMICO DE PAÍS DE ORIGEN */}
          <div className="bg-[#1e2028] border border-red-500/30 p-2.5 rounded-lg text-xs space-y-1">
            <label className="text-red-400 font-semibold block">
              🌐 Origen de Exportación:
            </label>
            <select
              value={paisOrigen}
              onChange={(e) => setPaisOrigen(e.target.value)}
              className="w-full bg-[#0e1117] border border-slate-700/80 rounded px-2 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-red-500"
            >
              <option value="España">🇪🇸 España</option>
              {listaPaisesOrigen.filter(p => p.nombre !== 'España').map((p) => (
                <option key={p.id || p.nombre} value={p.nombre}>
                  {p.nombre}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Botón Cerrar Sesión */}
        <button className="self-start px-3 py-1.5 bg-[#262730] hover:bg-[#31333f] text-xs font-medium text-slate-200 border border-slate-700/60 rounded cursor-pointer transition-colors">
          Cerrar sesión
        </button>

        {/* Resumen del Producto Seleccionado */}
        <div className="bg-[#181a20] border border-slate-800 p-3 rounded-lg space-y-1">
          <span className="text-[10px] uppercase font-bold text-slate-400">Producto activo</span>
          <p className="text-xs font-semibold text-white truncate">
            {productoSeleccionado ? productoSeleccionado.nombre : 'Ninguno seleccionado'}
          </p>
          <span className="text-[10px] text-emerald-400 block">
            {paisesDestino.length} país(es) de destino seleccionados
          </span>
        </div>

        {/* Sección: Filtros de búsqueda */}
        <div className="space-y-4 pt-2">
          <h2 className="text-base font-bold text-slate-100">Filtros de búsqueda</h2>

          <div className="space-y-1.5">
            <label className="block text-xs text-slate-300">Selecciona una categoría</label>
            <select 
              value={categoria}
              onChange={(e) => setCategoria(e.target.value)}
              className="w-full bg-[#0e1117] border border-slate-700/80 rounded px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-red-500 transition-colors"
            >
              <option value="Todos">Todos</option>
              {listaCategorias.map((cat) => (
                <option key={cat.id || cat.codigo} value={cat.codigo}>
                  {cat.codigo} - {cat.nombre.length > 35 ? `${cat.nombre.substring(0, 35)}...` : cat.nombre}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-1.5">
            <label className="block text-xs text-slate-300">Selecciona una subcategoría</label>
            <select 
              value={subcategoria}
              onChange={(e) => setSubcategoria(e.target.value)}
              disabled={categoria === 'Todos' || listaSubcategorias.length === 0}
              className="w-full bg-[#0e1117] border border-slate-700/80 rounded px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-red-500 disabled:opacity-40 transition-colors"
            >
              <option value="Todos">Todos</option>
              {listaSubcategorias.map((sub) => (
                <option key={sub.id || sub.codigo} value={sub.codigo}>
                  {sub.codigo} - {sub.nombre.length > 35 ? `${sub.nombre.substring(0, 35)}...` : sub.nombre}
                </option>
              ))}
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
            <label className="block text-xs text-slate-300">Buscar por código de producto</label>
            <input
              type="text"
              value={searchCodigo}
              onChange={(e) => setSearchCodigo(e.target.value)}
              placeholder="Ej. 2204"
              className="w-full bg-[#0e1117] border border-slate-700/80 rounded px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-red-500"
            />
          </div>

          <div className="space-y-1.5">
            <label className="block text-xs text-slate-300">Buscar por subcódigo de subproducto</label>
            <input
              type="text"
              value={searchSubcodigo}
              onChange={(e) => setSearchSubcodigo(e.target.value)}
              placeholder="Ej. 220410"
              className="w-full bg-[#0e1117] border border-slate-700/80 rounded px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-red-500"
            />
          </div>
        </div>
      </aside>

      {/* ---------------- ÁREA PRINCIPAL ---------------- */}
      <main className="flex-1 p-8 overflow-y-auto">
        
        <h1 className="text-3xl font-bold text-white mb-6 tracking-tight">
          Aplicativo Selección de Mercados Internacionales
        </h1>

        {/* Pestañas (Tabs) */}
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
              {activeTab === index && (
                <span className="absolute bottom-0 left-0 w-full h-[2px] bg-red-500"></span>
              )}
            </button>
          ))}
        </div>

        {/* Contenido Dinámico */}
        <div>
          {activeTab === 0 && (
            <TablaProductos 
              productoSeleccionado={productoSeleccionado}
              setProductoSeleccionado={setProductoSeleccionado}
              paisesDestino={paisesDestino}
              setPaisesDestino={setPaisesDestino}
              categoria={categoria}
              subcategoria={subcategoria}
              searchNombre={searchNombre}
              searchCodigo={searchCodigo}
              searchSubcodigo={searchSubcodigo}
            />
          )}

          {activeTab === 1 && (
            <TabCosto 
              productoActivo={productoSeleccionado}
              paisesDestino={paisesDestino}
              categoria={categoria}
              subcategoria={subcategoria}
              busqueda={searchNombre || searchCodigo || searchSubcodigo}
              paisOrigen={paisOrigen}
            />
          )}

          {activeTab === 2 && (
            <TabLogistica 
              productoActivo={productoSeleccionado}
              paisesDestino={paisesDestino}
              paisOrigen={paisOrigen}
            />
          )}

          {/* --- 2. RENDERIZAR LA PESTAÑA COMERCIAL (COMM) --- */}
          {activeTab === 3 && (
            <TabComercial 
              productoActivo={productoSeleccionado}
              paisesDestino={paisesDestino}
              paisOrigen={paisOrigen}
            />
          )}

          {activeTab > 3 && (
            <div className="space-y-6">
              <h2 className="text-2xl font-bold text-white">
                {tabList[activeTab]}
              </h2>
              <div className="bg-[#1c2c3d] border border-[#2b4259] text-[#71b1ea] px-4 py-3 rounded flex items-center gap-2 text-sm">
                <span>ℹ️</span>
                <span>
                  Sección en desarrollo. Evaluando datos exportables desde {paisOrigen} para{' '}
                  <strong className="text-white">
                    {productoSeleccionado ? productoSeleccionado.nombre : 'Producto sin seleccionar'}
                  </strong>.
                </span>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
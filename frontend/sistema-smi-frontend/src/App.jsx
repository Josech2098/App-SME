import React, { useState, useEffect } from 'react';
import { supabase } from './supabaseClient.js';
import TablaProductos from './components/TabProductos';
import TabCosto from './components/TabCosto';
import TabLogistica from './components/TabLogistica';
import TabComercial from './components/TabComercial';
import TabEconomia from './components/TabEconomia';
import TabPolitica from './components/TabPolitica';
import TabCultura from './components/TabCultura';
import TabSostenibilidad from './components/TabSostenibilidad';
import TabTablaTotal from './components/TabTablaTotal';
import TabGraficosComparativos from './components/TabGraficos';
import SplashScreen from "./components/SplashScreen";
import { SpeedInsights } from '@vercel/speed-insights/react';

export default function App() {
  const [activeTab, setActiveTab] = useState(0);
  const [mostrarSplash, setMostrarSplash] = useState(true);

  // ----------------------------------------------------
  // ESTADOS GLOBALES DE PRODUCTO, PAÍSES Y ORIGEN
  // ----------------------------------------------------
  const [productoSeleccionado, setProductoSeleccionado] = useState(null);
  const [paisesDestino, setPaisesDestino] = useState([]);
  const [paisOrigen, setPaisOrigen] = useState('España'); // Por defecto

  // Estado global compartido para almacenar la información total procesada y pasársela a gráficos si es necesario
  const [datosTablaTotal, setDatosTablaTotal] = useState([]);
  const [datosCosto, setDatosCosto] = useState([]);
  const [datosLogi, setDatosLogi] = useState([]);
  const [datosComm, setDatosComm] = useState([]);
  const [datosEcon, setDatosEcon] = useState([]);
  const [datosPoli, setDatosPoli] = useState([]);
  const [datosCult, setDatosCult] = useState([]);
  const [datosSust, setDatosSust] = useState([]);

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

  // ESTADOS GLOBALES ADICIONALES PARA TABS (Supabase)
  const [datosIndicePenetracion, setDatosIndicePenetracion] = useState([]);
  const [datosLibertadEconomica, setDatosLibertadEconomica] = useState([]);
  const [datosCostoDeVida, setDatosCostoDeVida] = useState([]);
  const [datosSostenibilidad, setDatosSostenibilidad] = useState([]);

  // 1. Cargar Categorías, Países de Origen y Datos Iniciales de Supabase
  useEffect(() => {
    async function fetchIniciales() {
      // Categorías
      const { data: catData, error: catError } = await supabase
        .from('categorias')
        .select('*')
        .order('codigo');
      if (catData) setListaCategorias(catData);
      if (catError) console.error('Error cargando categorías:', catError);

      // Países para el origen
      const { data: paisesData, error: paisesError } = await supabase
        .from('paises')
        .select('*')
        .order('nombre');
      if (paisesData) setListaPaisesOrigen(paisesData);
      if (paisesError) console.error('Error cargando países:', paisesError);

      // Índice de Penetración
      const { data: penData } = await supabase
        .from('indicepenetracion')
        .select('*');
      if (penData) setDatosIndicePenetracion(penData);

      // Libertad Económica
      const { data: libData } = await supabase
        .from('libertadeconomica')
        .select('*');
      if (libData) setDatosLibertadEconomica(libData);

      // Costo de Vida (ECON) - Rango ampliado para traer todos los registros
      const { data: costoData } = await supabase
        .from('costodevida')
        .select('*')
        .range(0, 999);
      if (costoData) setDatosCostoDeVida(costoData);

      // Sostenibilidad (SUST)
      const { data: sostData } = await supabase
        .from('sostenibilidad')
        .select('*');
      if (sostData) setDatosSostenibilidad(sostData);
    }
    fetchIniciales();
  }, []);

  // 2. Cargar Subcategorías basadas en la categoría seleccionada
  useEffect(() => {
    async function fetchSubcategorias() {
      if (categoria === 'Todos') {
        setListaSubcategorias([]);
        setSubcategoria('Todos');
        return;
      }

      const { data, error } = await supabase
        .from('subcategorias')
        .select('*')
        .eq('categoria_codigo', categoria)
        .order('codigo');

      if (data) setListaSubcategorias(data);
      else {
        setListaSubcategorias([]);
        if (error) console.error('Error cargando subcategorías:', error);
      }
      
      setSubcategoria('Todos');
    }

    fetchSubcategorias();
  }, [categoria]);

  const handleCategoriaChange = (codigo) => {
    setCategoria(codigo);
  };

  const tabList = [
    "Productos",
    "Costo (COST)",
    "Logística (LOGI)",
    "Comercial (COMM)",
    "Economía (ECON)",
    "Política (POLI)",
    "Cultura (CULT)",
    "Sostenibilidad (SUST)",
    "Visualización de Tablas Totales",
    "Gráficos"
  ];

  if (mostrarSplash) {
    return (
      <SplashScreen
        onFinish={() => setMostrarSplash(false)}
      />
    );
  }
  
  return (
    <div className="flex min-h-screen bg-[#0e1117] text-slate-100 font-sans antialiased">
      
      {/* ---------------- BARRA LATERAL (SIDEBAR) ---------------- */}
      <aside className="w-80 bg-[#262730]/40 border-r border-[#262730] p-6 flex flex-col gap-6 shrink-0 overflow-y-auto max-h-screen">
        
        {/* Banner de Usuario y Selector de Origen */}
        <div className="space-y-2">
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

        {/* Sección: Filtros de búsqueda */}
        <div className="space-y-4 pt-2">
          <h2 className="text-base font-bold text-slate-100">Filtros de búsqueda</h2>

          <div className="space-y-1.5">
            <label className="block text-xs text-slate-300">Selecciona una categoría</label>
            <select
              value={categoria}
              onChange={(e) => handleCategoriaChange(e.target.value)}
              className="w-full bg-[#0e1117] border border-slate-700/80 rounded px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-red-500 transition-colors"
            >
              <option value="Todos">Todos</option>
              {listaCategorias.map((cat) => (
                <option key={cat.id || cat.codigo} value={cat.codigo}>
                  {cat.codigo} - {cat.nombre && cat.nombre.length > 35 ? `${cat.nombre.substring(0, 35)}...` : cat.nombre}
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
                  {sub.codigo} - {sub.nombre && sub.nombre.length > 35 ? `${sub.nombre.substring(0, 35)}...` : sub.nombre}
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

          <div className="mt-6 pt-4 border-t border-slate-700/50 text-slate-400">
            <p className="text-sm">
              Creador: Jose Jaime Baena Rojas
            </p>
            <p className="text-sm mt-1">
              Programador: Jose Wanner Chavarria Villagra
            </p>
            <p className="text-xs mt-4 text-slate-500">
              Copyright © 2026
            </p>
          </div>
        </div>
      </aside>

      {/* ---------------- ÁREA PRINCIPAL ---------------- */}
      <main className="flex-1 p-8 overflow-y-auto">
        
        <h1 className="text-3xl font-bold text-white mb-6 tracking-tight">
          Aplicativo Selección de Mercados Internacionales
        </h1>

        {/* Pestañas (Tabs) */}
        <div className="border-b border-slate-800 flex gap-6 overflow-x-auto mb-8 pb-2 no-scrollbar">
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

        {/* Contenido Dinámico (Montados permanentemente mediante display CSS para precargar los datos) */}
        <div>
          <div className={activeTab === 0 ? 'block' : 'hidden'}>
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
          </div>

          <div className={activeTab === 1 ? 'block' : 'hidden'}>
            <TabCosto
              productoActivo={productoSeleccionado}
              paisesDestino={paisesDestino}
              categoria={categoria}
              subcategoria={subcategoria}
              busqueda={searchNombre || searchCodigo || searchSubcodigo}
              paisOrigen={paisOrigen}
              onDatosActualizados={setDatosCosto}
            />
          </div>

          <div className={activeTab === 2 ? 'block' : 'hidden'}>
            <TabLogistica
              productoActivo={productoSeleccionado}
              paisesDestino={paisesDestino}
              paisOrigen={paisOrigen}
              onDatosActualizados={setDatosLogi}
            />
          </div>

          <div className={activeTab === 3 ? 'block' : 'hidden'}>
            <TabComercial
              productoActivo={productoSeleccionado}
              paisesDestino={paisesDestino}
              productos={paisesDestino}
              paisOrigen={paisOrigen}
              datosIndicePenetracion={datosIndicePenetracion}
              datosLibertadEconomica={datosLibertadEconomica}
              onDatosActualizados={setDatosComm}
            />
          </div>

          <div className={activeTab === 4 ? 'block' : 'hidden'}>
            <TabEconomia
              productoActivo={productoSeleccionado}
              paisesDestino={paisesDestino}
              paisOrigen={paisOrigen}
              datosCostoDeVida={datosCostoDeVida}
              onDatosActualizados={setDatosEcon}
            />
          </div>

          <div className={activeTab === 5 ? 'block' : 'hidden'}>
            <TabPolitica
              productoActivo={productoSeleccionado}
              paisesDestino={paisesDestino}
              paisOrigen={paisOrigen}
              onDatosActualizados={setDatosPoli}
            />
          </div>

          <div className={activeTab === 6 ? 'block' : 'hidden'}>
            <TabCultura
              productoActivo={productoSeleccionado}
              paisesDestino={paisesDestino}
              paisOrigen={paisOrigen}
              onDatosActualizados={setDatosCult}
            />
          </div>

          <div className={activeTab === 7 ? 'block' : 'hidden'}>
            <TabSostenibilidad
              productoActivo={productoSeleccionado}
              paisesDestino={paisesDestino}
              paisOrigen={paisOrigen}
              datosSostenibilidad={datosSostenibilidad}
              onDatosActualizados={setDatosSust}
            />
          </div>

          <div className={activeTab === 8 ? 'block' : 'hidden'}>
            <TabTablaTotal
              datosCosto={datosCosto}
              datosLogi={datosLogi}
              datosComm={datosComm}
              datosEcon={datosEcon}
              datosPoli={datosPoli}
              datosCult={datosCult}
              datosSust={datosSust}
              onDatosActualizados={setDatosTablaTotal}
            />
          </div>

          <div className={activeTab === 9 ? 'block' : 'hidden'}>
            <TabGraficosComparativos 
              datosTotales={datosTablaTotal} 
            />
          </div>
        </div>
      </main>
      <SpeedInsights />
    </div>
  );
}

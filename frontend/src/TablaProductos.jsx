import React, { useState, useEffect } from 'react';
import { supabase } from './supabaseClient';

export default function TablaProductos() {
  const [productos, setProductos] = useState([]);
  const [selectedProd, setSelectedProd] = useState('');
  const [loading, setLoading] = useState(true);

  // Campos del formulario alineados a la tabla 'productos'
  const [codigoHs, setCodigoHs] = useState('');
  const [nombre, setNombre] = useState('');
  const [categoria, setCategoria] = useState('');
  const [descripcion, setDescripcion] = useState('');

  useEffect(() => {
    fetchProductos();
  }, []);

  // 1. Cargar productos desde Supabase
  async function fetchProductos() {
    setLoading(true);
    const { data, error } = await supabase
      .from('productos')
      .select('*')
      .order('id', { ascending: true });

    if (error) {
      console.error('Error al cargar productos:', error.message);
    } else {
      setProductos(data || []);
    }
    setLoading(false);
  }

  // 2. Guardar nuevo producto en la tabla 'productos'
  async function handleGuardar(e) {
    e.preventDefault();

    if (!codigoHs.trim() || !nombre.trim()) {
      return alert('El Código HS y el Nombre son obligatorios.');
    }

    const { data, error } = await supabase
      .from('productos')
      .insert([
        {
          codigo_hs: codigoHs.trim(),
          nombre: nombre.trim(),
          categoria: categoria.trim() || null,
          descripcion: descripcion.trim() || null,
        },
      ])
      .select();

    if (error) {
      console.error('Error al insertar:', error);
      if (error.code === '23505') {
        alert(' Error: El Código HS ya existe en la base de datos.');
      } else {
        alert(`Error al guardar: ${error.message}`);
      }
    } else {
      alert('¡Producto guardado correctamente en Supabase!');
      // Limpiar formulario
      setCodigoHs('');
      setNombre('');
      setCategoria('');
      setDescripcion('');
      // Recargar lista
      fetchProductos();
    }
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
      {/* Columna Izquierda: Selector de Producto para Análisis */}
      <div className="lg:col-span-2 space-y-6">
        <div>
          <h2 className="text-base font-semibold text-slate-100 flex items-center gap-2">
            <span className="text-blue-400">📊</span> Selección de Producto
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Selecciona un producto para cargar sus costos y métricas asociadas.
          </p>
        </div>

        <div className="bg-slate-950/60 p-5 rounded-xl border border-slate-800/80 shadow-inner space-y-3">
          <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider">
            Producto Activo ({productos.length} registrados)
          </label>
          
          {loading ? (
            <div className="text-xs text-slate-500 animate-pulse py-2">
              Cargando catálogo desde PostgreSQL...
            </div>
          ) : (
            <select
              value={selectedProd}
              onChange={(e) => setSelectedProd(e.target.value)}
              className="w-full bg-slate-900 border border-slate-700/80 rounded-lg px-4 py-3 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500/80 transition-all cursor-pointer"
            >
              <option value="">-- Selecciona un producto para la matriz --</option>
              {productos.map((prod) => (
                <option key={prod.id} value={prod.id}>
                  [{prod.codigo_hs}] {prod.nombre} {prod.categoria ? `— (${prod.categoria})` : ''}
                </option>
              ))}
            </select>
          )}
        </div>

        {/* Resumen del producto seleccionado */}
        {selectedProd && (
          <div className="bg-slate-900/80 p-5 rounded-xl border border-blue-900/40 text-xs space-y-2">
            <span className="text-blue-400 font-semibold uppercase">Detalle del Producto Selección:</span>
            {(() => {
              const prod = productos.find((p) => p.id === parseInt(selectedProd));
              return prod ? (
                <div className="text-slate-300 space-y-1 pt-1">
                  <p><strong className="text-slate-400">Código HS:</strong> {prod.codigo_hs}</p>
                  <p><strong className="text-slate-400">Nombre:</strong> {prod.nombre}</p>
                  <p><strong className="text-slate-400">Categoría:</strong> {prod.categoria || 'Sin categoría'}</p>
                  <p><strong className="text-slate-400">Descripción:</strong> {prod.descripcion || 'Sin descripción'}</p>
                </div>
              ) : null;
            })()}
          </div>
        )}
      </div>

      {/* Columna Derecha: Formulario de Registro */}
      <div className="bg-slate-950/80 p-6 rounded-xl border border-slate-800/80 shadow-xl space-y-4">
        <h3 className="text-sm font-semibold text-slate-200 flex items-center gap-2 border-b border-slate-800 pb-3">
          <span className="text-blue-400">➕</span> Registrar Producto
        </h3>

        <form onSubmit={handleGuardar} className="space-y-3.5">
          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1">
              Código Arancelario (HS) <span className="text-red-400">*</span>
            </label>
            <input
              type="text"
              placeholder="Ej: 0901.11"
              value={codigoHs}
              onChange={(e) => setCodigoHs(e.target.value)}
              className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-100 placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-blue-500/80"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1">
              Nombre del Producto <span className="text-red-400">*</span>
            </label>
            <input
              type="text"
              placeholder="Ej: Café Orgánico en Grano"
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-100 placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-blue-500/80"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1">Categoría</label>
            <input
              type="text"
              placeholder="Ej: Agroindustria"
              value={categoria}
              onChange={(e) => setCategoria(e.target.value)}
              className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-100 placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-blue-500/80"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1">Descripción</label>
            <textarea
              rows="2"
              placeholder="Detalles adicionales..."
              value={descripcion}
              onChange={(e) => setDescripcion(e.target.value)}
              className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-100 placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-blue-500/80 resize-none"
            />
          </div>

          <button
            type="submit"
            className="w-full bg-blue-600 hover:bg-blue-500 active:bg-blue-700 text-white font-medium py-2.5 rounded-lg transition-all duration-200 shadow-lg shadow-blue-600/20 text-xs mt-2 cursor-pointer"
          >
            Guardar en Base de Datos
          </button>
        </form>
      </div>
    </div>
  );
}
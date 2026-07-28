import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient.js';

export default function TabProductos({ 
  categoria, 
  subcategoria, 
  searchNombre, 
  searchCodigo, 
  searchSubcodigo 
}) {
  const [productos, setProductos] = useState([]);
  const [cargando, setCargando] = useState(true);

  // Estados para los acordeones/desplegables
  const [openAcc, setOpenAcc] = useState(null); // 'add', 'edit', 'delete' o null

  // Estado para un nuevo producto (Añadir)
  const [nuevoProducto, setNuevoProducto] = useState({ producto: '', pais: '', precio: '' });

  // Cargar datos desde Supabase
  useEffect(() => {
    fetchProductos();
  }, [categoria, subcategoria, searchNombre, searchCodigo, searchSubcodigo]);

  const fetchProductos = async () => {
    setCargando(true);
    let query = supabase.from('productos').select('*');

    // Aplicar filtros provenientes del sidebar
    if (categoria && categoria !== 'Todos') query = query.eq('categoria', categoria);
    if (subcategoria && subcategoria !== 'Todos') query = query.eq('subcategoria', subcategoria);
    if (searchNombre) query = query.ilike('producto', `%${searchNombre}%`);
    if (searchCodigo) query = query.eq('codigo', searchCodigo);
    if (searchSubcodigo) query = query.eq('subcodigo', searchSubcodigo);

    const { data, error } = await query;
    if (error) console.error("Error cargando productos:", error);
    else setProductos(data || []);
    setCargando(false);
  };

  const handleGuardarProducto = async (e) => {
    e.preventDefault();
    const { error } = await supabase.from('productos').insert([nuevoProducto]);
    if (!error) {
      setNuevoProducto({ producto: '', pais: '', precio: '' });
      setOpenAcc(null);
      fetchProductos();
    }
  };

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-white">Productos por categoría y subcategoría</h2>

      <h3 className="text-xl font-bold text-white pt-2">Resultados de búsqueda</h3>

      {/* --- SECCIÓN: GESTIÓN DE DATOS (ACORDEONES) --- */}
      <div className="space-y-3">
        <h4 className="text-base font-semibold text-slate-200">Gestión de Datos (Productos filtrados)</h4>

        {/* 1. Añadir Producto */}
        <div className="border border-slate-700/80 rounded-lg overflow-hidden bg-[#1e293b]/30">
          <button 
            onClick={() => setOpenAcc(openAcc === 'add' ? null : 'add')}
            className="w-full text-left px-4 py-3 bg-[#1e293b]/60 hover:bg-[#1e293b] text-sm font-medium text-slate-200 flex items-center gap-2 cursor-pointer transition-colors"
          >
            <span>{openAcc === 'add' ? '˅' : '>'}</span>
            <span>Añadir producto</span>
          </button>
          
          {openAcc === 'add' && (
            <form onSubmit={handleGuardarProducto} className="p-4 grid grid-cols-1 md:grid-cols-3 gap-4 bg-[#0e1117]/50 border-t border-slate-800">
              <input 
                type="text" 
                placeholder="Nombre del producto" 
                value={nuevoProducto.producto}
                onChange={(e) => setNuevoProducto({...nuevoProducto, producto: e.target.value})}
                className="bg-[#0e1117] border border-slate-700 rounded px-3 py-2 text-sm text-white"
                required
              />
              <input 
                type="text" 
                placeholder="País" 
                value={nuevoProducto.pais}
                onChange={(e) => setNuevoProducto({...nuevoProducto, pais: e.target.value})}
                className="bg-[#0e1117] border border-slate-700 rounded px-3 py-2 text-sm text-white"
                required
              />
              <input 
                type="number" 
                step="0.01"
                placeholder="Precio ($)" 
                value={nuevoProducto.precio}
                onChange={(e) => setNuevoProducto({...nuevoProducto, precio: e.target.value})}
                className="bg-[#0e1117] border border-slate-700 rounded px-3 py-2 text-sm text-white"
                required
              />
              <button type="submit" className="md:col-span-3 bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 rounded text-sm transition-colors">
                Guardar en Supabase
              </button>
            </form>
          )}
        </div>

        {/* 2. Editar Producto */}
        <div className="border border-slate-700/80 rounded-lg overflow-hidden bg-[#1e293b]/30">
          <button 
            onClick={() => setOpenAcc(openAcc === 'edit' ? null : 'edit')}
            className="w-full text-left px-4 py-3 bg-[#1e293b]/60 hover:bg-[#1e293b] text-sm font-medium text-slate-200 flex items-center gap-2 cursor-pointer transition-colors"
          >
            <span>{openAcc === 'edit' ? '˅' : '>'}</span>
            <span>Editar producto existente</span>
          </button>
          {openAcc === 'edit' && (
            <div className="p-4 text-sm text-slate-400 bg-[#0e1117]/50 border-t border-slate-800">
              Selecciona un producto de la tabla para modificar sus valores.
            </div>
          )}
        </div>

        {/* 3. Eliminar Producto */}
        <div className="border border-slate-700/80 rounded-lg overflow-hidden bg-[#1e293b]/30">
          <button 
            onClick={() => setOpenAcc(openAcc === 'delete' ? null : 'delete')}
            className="w-full text-left px-4 py-3 bg-[#1e293b]/60 hover:bg-[#1e293b] text-sm font-medium text-slate-200 flex items-center gap-2 cursor-pointer transition-colors"
          >
            <span>{openAcc === 'delete' ? '˅' : '>'}</span>
            <span>Eliminar producto existente</span>
          </button>
          {openAcc === 'delete' && (
            <div className="p-4 text-sm text-slate-400 bg-[#0e1117]/50 border-t border-slate-800">
              Selecciona el registro que deseas remover de la base de datos.
            </div>
          )}
        </div>
      </div>

      {/* --- SECCIÓN: TABLA DE PRODUCTOS --- */}
      <div className="border border-slate-800 rounded-lg overflow-hidden bg-[#1e293b]/20">
        {cargando ? (
          <div className="p-6 text-center text-sm text-slate-400">
            Cargando productos desde base de datos Supabase...
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-300">
              <thead className="bg-[#1e293b]/80 text-xs uppercase text-slate-400 border-b border-slate-700">
                <tr>
                  <th className="px-4 py-3">#</th>
                  <th className="px-4 py-3">País</th>
                  <th className="px-4 py-3">Producto</th>
                  <th className="px-4 py-3">Precio ($)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {productos.length > 0 ? (
                  productos.map((item, index) => (
                    <tr key={item.id || index} className="hover:bg-[#1e293b]/50 transition-colors">
                      <td className="px-4 py-3 text-slate-500 font-mono">{index}</td>
                      <td className="px-4 py-3 font-medium text-slate-200">{item.pais || '-'}</td>
                      <td className="px-4 py-3">{item.producto || '-'}</td>
                      <td className="px-4 py-3 font-mono text-slate-200">{item.precio ?? '-'}</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="4" className="px-4 py-6 text-center text-slate-500">
                      No se encontraron registros en la base de datos.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
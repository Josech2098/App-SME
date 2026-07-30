import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient.js';

export default function TablaProductos({
  paisDestino,
  setPaisDestino,
  categoria,
  subcategoria,
  searchNombre,
  searchCodigo,
  searchSubcodigo
}) {
  // Estados para datos de Supabase
  const [paises, setPaises] = useState([]);
  const [productos, setProductos] = useState([]);
  const [loading, setLoading] = useState(true);

  // Estados para Acordeones CRUD
  const [activeAccordion, setActiveAccordion] = useState(null); // 'add' | 'edit' | 'delete'

  // Form Añadir
  const [addPais, setAddPais] = useState('');
  const [addNombre, setAddNombre] = useState('');
  const [addPrecio, setAddPrecio] = useState('');
  const [addCategoria, setAddCategoria] = useState('');
  const [addCodigo, setAddCodigo] = useState('');

  // Form Editar
  const [editId, setEditId] = useState('');
  const [editPais, setEditPais] = useState('');
  const [editNombre, setEditNombre] = useState('');
  const [editPrecio, setEditPrecio] = useState('');

  // Form Eliminar
  const [deleteId, setDeleteId] = useState('');

  // Cargar datos al montar el componente
  useEffect(() => {
    cargarDatosIniciales();
  }, []);

  async function cargarDatosIniciales() {
    setLoading(true);

    // 1. Cargar lista de países para el selector global
    const { data: dataPaises } = await supabase
      .from('paises')
      .select('*')
      .order('nombre');

    if (dataPaises) setPaises(dataPaises);

    // 2. Cargar productos desde Supabase
    const { data: dataProductos } = await supabase
      .from('productos')
      .select('*');

    if (dataProductos) {
      setProductos(dataProductos);
    }

    setLoading(false);
  }

  // 🔍 Lógica de Filtrado Dinámico
  const productosFiltrados = productos.filter((p) => {
    // Filtro por Categoría
    if (categoria && categoria !== 'Todos' && p.categoria !== categoria) {
      return false;
    }
    // Filtro por Subcategoría
    if (subcategoria && subcategoria !== 'Todos' && p.subcategoria !== subcategoria) {
      return false;
    }
    // Filtro por Nombre
    if (searchNombre && !p.nombre?.toLowerCase().includes(searchNombre.toLowerCase())) {
      return false;
    }
    // Filtro por Código de Producto (codigo_hs o codigo)
    const codigoVal = p.codigo_hs || p.codigo;
    if (searchCodigo && (!codigoVal || !codigoVal.toString().startsWith(searchCodigo))) {
      return false;
    }
    // Filtro por Subcódigo
    if (searchSubcodigo && !p.subcodigo?.toString().includes(searchSubcodigo)) {
      return false;
    }

    return true;
  });

  // 📝 HANDLERS PARA OPERACIONES CRUD EN SUPABASE

  const handleGuardarProducto = async (e) => {
    e.preventDefault();
    if (!addNombre) return alert('Por favor ingresa al menos el nombre del producto.');

    const payload = {
      codigo_hs: addCodigo || null,
      nombre: addNombre,
      categoria: addCategoria || (categoria !== 'Todos' ? categoria : 'General')
    };

    if (addPais) payload.pais = addPais;
    if (addPrecio) payload.precio = addPrecio;

    const { error } = await supabase.from('productos').insert([payload]);

    if (error) {
      alert('Error al guardar el producto: ' + error.message);
    } else {
      setAddNombre('');
      setAddPrecio('');
      setAddCategoria('');
      setAddCodigo('');
      setAddPais('');
      setActiveAccordion(null);
      cargarDatosIniciales();
    }
  };

  const handleEditarProducto = async (e) => {
    e.preventDefault();
    if (!editId) return alert('Selecciona un producto para editar.');

    const { error } = await supabase
      .from('productos')
      .update({
        pais: editPais,
        nombre: editNombre,
        precio: editPrecio
      })
      .eq('id', editId);

    if (error) {
      alert('Error al actualizar: ' + error.message);
    } else {
      setActiveAccordion(null);
      cargarDatosIniciales();
    }
  };

  const handleEliminarProducto = async (e) => {
    e.preventDefault();
    if (!deleteId) return alert('Selecciona un producto para eliminar.');

    const { error } = await supabase.from('productos').delete().eq('id', deleteId);

    if (error) {
      alert('Error al eliminar: ' + error.message);
    } else {
      setActiveAccordion(null);
      cargarDatosIniciales();
    }
  };

  return (
    <div className="space-y-6 text-slate-100">
      
      {/* 🌍 SELECTOR UNIVERSAL DEL PAÍS DESTINO */}
      <div className="bg-[#181a20] p-4 rounded-xl border border-slate-800 space-y-2 shadow-sm">
        <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider">
          Selecciona el país destino de importación
        </label>
        <select
          value={paisDestino}
          onChange={(e) => setPaisDestino(e.target.value)}
          className="w-full bg-[#0e1117] border border-slate-700/80 rounded-lg px-4 py-2.5 text-sm text-slate-100 focus:outline-none focus:border-red-500 transition-colors"
        >
          {paises.length > 0 ? (
            paises.map((p) => (
              <option key={p.id} value={p.nombre}>
                {p.nombre}
              </option>
            ))
          ) : (
            <>
              <option value="España">España</option>
              <option value="Colombia">Colombia</option>
              <option value="Costa Rica">Costa Rica</option>
              <option value="México">México</option>
            </>
          )}
        </select>
        <p className="text-xs text-emerald-400 font-medium">
          ✓ País destino activo: <span className="font-bold">{paisDestino}</span>
        </p>
      </div>

      {/* 🛠️ PANELS DE GESTIÓN DE DATOS (CRUD DESPLEGABLES) */}
      <div className="space-y-3">
        <h3 className="text-sm font-semibold text-slate-300 flex items-center gap-2">
          <span>🛠️</span> Gestión de Datos (Productos)
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <button
            type="button"
            onClick={() => setActiveAccordion(activeAccordion === 'add' ? null : 'add')}
            className={`p-3 rounded-lg border text-xs font-medium text-left flex items-center gap-2 transition-all cursor-pointer ${
              activeAccordion === 'add'
                ? 'bg-slate-800 border-red-500 text-white'
                : 'bg-[#181a20] border-slate-800 text-slate-300 hover:border-slate-700'
            }`}
          >
            <span>{activeAccordion === 'add' ? '▼' : '❯'}</span> Añadir producto
          </button>

          <button
            type="button"
            onClick={() => setActiveAccordion(activeAccordion === 'edit' ? null : 'edit')}
            className={`p-3 rounded-lg border text-xs font-medium text-left flex items-center gap-2 transition-all cursor-pointer ${
              activeAccordion === 'edit'
                ? 'bg-slate-800 border-red-500 text-white'
                : 'bg-[#181a20] border-slate-800 text-slate-300 hover:border-slate-700'
            }`}
          >
            <span>{activeAccordion === 'edit' ? '▼' : '❯'}</span> Editar producto existente
          </button>

          <button
            type="button"
            onClick={() => setActiveAccordion(activeAccordion === 'delete' ? null : 'delete')}
            className={`p-3 rounded-lg border text-xs font-medium text-left flex items-center gap-2 transition-all cursor-pointer ${
              activeAccordion === 'delete'
                ? 'bg-slate-800 border-red-500 text-white'
                : 'bg-[#181a20] border-slate-800 text-slate-300 hover:border-slate-700'
            }`}
          >
            <span>{activeAccordion === 'delete' ? '▼' : '❯'}</span> Eliminar producto existente
          </button>
        </div>

        {/* Formulario: Añadir */}
        {activeAccordion === 'add' && (
          <form onSubmit={handleGuardarProducto} className="bg-[#181a20] p-4 rounded-lg border border-slate-800 space-y-3">
            <h4 className="text-xs font-bold text-red-400 uppercase">Añadir Nuevo Producto</h4>
            <div className="grid grid-cols-1 md:grid-cols-5 gap-3 text-xs">
              <input
                type="text"
                placeholder="Código HS (Ej. 2020)"
                value={addCodigo}
                onChange={(e) => setAddCodigo(e.target.value)}
                className="bg-[#0e1117] border border-slate-700 p-2 rounded text-white"
              />
              <input
                type="text"
                placeholder="Nombre del Producto"
                value={addNombre}
                onChange={(e) => setAddNombre(e.target.value)}
                className="bg-[#0e1117] border border-slate-700 p-2 rounded text-white"
                required
              />
              <input
                type="text"
                placeholder="Categoría"
                value={addCategoria}
                onChange={(e) => setAddCategoria(e.target.value)}
                className="bg-[#0e1117] border border-slate-700 p-2 rounded text-white"
                required
              />
              <input
                type="text"
                placeholder="País"
                value={addPais}
                onChange={(e) => setAddPais(e.target.value)}
                className="bg-[#0e1117] border border-slate-700 p-2 rounded text-white"
              />
              <input
                type="text"
                placeholder="Precio (Ej: 12,50 €)"
                value={addPrecio}
                onChange={(e) => setAddPrecio(e.target.value)}
                className="bg-[#0e1117] border border-slate-700 p-2 rounded text-white"
              />
            </div>
            <button type="submit" className="bg-red-600 hover:bg-red-500 text-white text-xs px-4 py-2 rounded font-medium cursor-pointer transition-colors">
              Guardar nuevo producto
            </button>
          </form>
        )}

        {/* Formulario: Editar */}
        {activeAccordion === 'edit' && (
          <form onSubmit={handleEditarProducto} className="bg-[#181a20] p-4 rounded-lg border border-slate-800 space-y-3">
            <h4 className="text-xs font-bold text-amber-400 uppercase">Editar Producto Existente</h4>
            <select
              value={editId}
              onChange={(e) => {
                const sel = productos.find((p) => p.id.toString() === e.target.value);
                setEditId(e.target.value);
                if (sel) {
                  setEditPais(sel.pais || sel.Pais || '');
                  setEditNombre(sel.nombre || '');
                  setEditPrecio(sel.precio || sel.Precio || '');
                }
              }}
              className="w-full bg-[#0e1117] border border-slate-700 p-2 rounded text-xs text-white"
            >
              <option value="">-- Selecciona producto a editar --</option>
              {productos.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.codigo_hs || p.codigo ? `[${p.codigo_hs || p.codigo}] ` : ''}{p.nombre}
                </option>
              ))}
            </select>

            {editId && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs pt-2">
                <input
                  type="text"
                  placeholder="País"
                  value={editPais}
                  onChange={(e) => setEditPais(e.target.value)}
                  className="bg-[#0e1117] border border-slate-700 p-2 rounded text-white"
                />
                <input
                  type="text"
                  placeholder="Nombre"
                  value={editNombre}
                  onChange={(e) => setEditNombre(e.target.value)}
                  className="bg-[#0e1117] border border-slate-700 p-2 rounded text-white"
                />
                <input
                  type="text"
                  placeholder="Precio"
                  value={editPrecio}
                  onChange={(e) => setEditPrecio(e.target.value)}
                  className="bg-[#0e1117] border border-slate-700 p-2 rounded text-white"
                />
              </div>
            )}
            <button type="submit" className="bg-amber-600 hover:bg-amber-500 text-white text-xs px-4 py-2 rounded font-medium cursor-pointer transition-colors">
              Actualizar producto
            </button>
          </form>
        )}

        {/* Formulario: Eliminar */}
        {activeAccordion === 'delete' && (
          <form onSubmit={handleEliminarProducto} className="bg-[#181a20] p-4 rounded-lg border border-slate-800 space-y-3">
            <h4 className="text-xs font-bold text-red-500 uppercase">Eliminar Producto</h4>
            <select
              value={deleteId}
              onChange={(e) => setDeleteId(e.target.value)}
              className="w-full bg-[#0e1117] border border-slate-700 p-2 rounded text-xs text-white"
            >
              <option value="">-- Selecciona producto a eliminar --</option>
              {productos.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.codigo_hs || p.codigo ? `[${p.codigo_hs || p.codigo}] ` : ''}{p.nombre}
                </option>
              ))}
            </select>
            <button type="submit" className="bg-red-700 hover:bg-red-600 text-white text-xs px-4 py-2 rounded font-medium cursor-pointer transition-colors">
              Eliminar producto definitivamente
            </button>
          </form>
        )}
      </div>

      {/* 📊 TABLA DE RESULTADOS DE BÚSQUEDA */}
      <div className="space-y-3 pt-2">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-bold text-white">
            Listado de Productos
          </h3>
          <span className="text-xs text-slate-400 bg-[#181a20] px-3 py-1 rounded-full border border-slate-800">
            Mostrando <strong className="text-white">{productosFiltrados.length}</strong> de {productos.length} registros
          </span>
        </div>

        <div className="overflow-x-auto rounded-lg border border-slate-800 bg-[#16181e] shadow-sm">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="bg-[#1e2028] text-slate-400 border-b border-slate-800">
              <tr>
                <th className="p-3 font-semibold">ID</th>
                <th className="p-3 font-semibold">País</th>
                <th className="p-3 font-semibold text-right">Precio (€)</th>
                <th className="p-3 font-semibold">Producto</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {loading ? (
                <tr>
                  <td colSpan="4" className="p-6 text-center text-slate-500 animate-pulse">
                    Cargando productos desde base de datos...
                  </td>
                </tr>
              ) : productosFiltrados.length > 0 ? (
                productosFiltrados.map((item) => {
                  const idVal = item.id || '—';
                  const paisVal = item.pais || item.Pais || paisDestino || '—';
                  const nombre = item.nombre || item.producto || '—';
                  const precioRaw = item.precio ?? item.Precio;
                  
                  let precioFmt = '—';
                  if (precioRaw !== undefined && precioRaw !== null && precioRaw !== '') {
                    if (typeof precioRaw === 'number') {
                      precioFmt = `${precioRaw.toFixed(2)} €`;
                    } else {
                      // Si el valor de Supabase viene como string tipo "12,50 €" o "12.50 €"
                      const strVal = String(precioRaw).trim();
                      if (strVal.includes('€')) {
                        precioFmt = strVal;
                      } else {
                        // Limpiamos comas por puntos por si es un string numérico tipo "12,50"
                        const num = Number(strVal.replace(',', '.'));
                        precioFmt = !isNaN(num) ? `${num.toFixed(2)} €` : strVal;
                      }
                    }
                  }

                  return (
                    <tr key={item.id} className="hover:bg-[#1f222d]/50 transition-colors">
                      <td className="p-3 font-mono text-slate-400">{idVal}</td>
                      <td className="p-3 font-medium text-slate-300">{paisVal}</td>
                      <td className="p-3 text-right font-mono text-emerald-400 font-semibold">
                        {precioFmt}
                      </td>
                      <td className="p-3 text-white font-medium">{nombre}</td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan="4" className="p-6 text-center text-slate-500">
                    No se encontraron productos que coincidan con los filtros activos.
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
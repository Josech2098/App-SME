import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient.js';

export default function TablaProductos({
  productoSeleccionado,
  setProductoSeleccionado,
  paisDestino,
  setPaisDestino,
  categoria,
  subcategoria,
  searchNombre,
  searchCodigo,
  searchSubcodigo
}) {
  // Estados para datos de Supabase
  const [productos, setProductos] = useState([]);
  const [keywordsCategoria, setKeywordsCategoria] = useState([]);
  const [loading, setLoading] = useState(true);

  // Estados para Acordeones CRUD
  const [activeAccordion, setActiveAccordion] = useState(null); // 'add' | 'edit' | 'delete'

  // Form Añadir (País, Producto y Precio)
  const [addPais, setAddPais] = useState('');
  const [addNombre, setAddNombre] = useState('');
  const [addPrecio, setAddPrecio] = useState('');

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

    const { data: dataProductos, error } = await supabase
      .from('productos')
      .select('*');

    if (error) {
      console.error('Error cargando productos:', error);
    } else if (dataProductos) {
      setProductos(dataProductos);
    }

    const { data: dataKeywords, error: errorKeywords } = await supabase
      .from('productos_categoria')
      .select('*');

    if (errorKeywords) {
      console.error('Error cargando keywords:', errorKeywords);
    } else if (dataKeywords) {
      setKeywordsCategoria(dataKeywords);
    }

    setLoading(false);
  }

  // Helper para obtener la clave primaria en Supabase
  const getProductoId = (p) => p.id ?? p.id_producto ?? p.ID;

  // 🔍 Lógica de Filtrado Dinámico para la Tabla (CON CORRECCIÓN DE TIPOS Y NOMBRES)
  const productosFiltrados = productos.filter((p) => {
    // 1. Filtro Categoría usando productos_categoria

    if (categoria && categoria !== 'Todos') {

      const palabrasCategoriaActual = keywordsCategoria
        .filter(
          k => String(k.categoria_codigo) === String(categoria)
        )
        .map(
          k => k.palabra_clave.toLowerCase()
        );

      const nombreProducto = String(
        p.nombre || p.producto || ''
      ).toLowerCase();

      const coincideCategoria = palabrasCategoriaActual.some(
        palabra => nombreProducto.includes(palabra)
      );

      if (!coincideCategoria) return false;
    }
    
    // 2. Filtro Subcategoría
    if (subcategoria && subcategoria !== 'Todos') {
      const subcatProducto = String(p.subcategoria_codigo || p.subcategoria || p.subcodigo || '').trim();
      const subcatFiltro = String(subcategoria).trim();

      const coincideSubExacto = subcatProducto === subcatFiltro;
      const coincideSubEmpieza = subcatFiltro.startsWith(subcatProducto) || subcatProducto.startsWith(subcatFiltro);

      if (!coincideSubExacto && !coincideSubEmpieza) return false;
    }
    
    // 3. Búsqueda por Nombre (Producto)
    const nombreVal = p.nombre || p.producto || '';
    if (searchNombre && !nombreVal.toLowerCase().includes(searchNombre.toLowerCase())) return false;
    
    // 4. Búsqueda por Código

    if (searchCodigo) {

      const palabrasCodigo = keywordsCategoria
        .filter(
          k => String(k.categoria_codigo).startsWith(searchCodigo)
        )
        .map(
          k => k.palabra_clave.toLowerCase()
        );

      const nombreProducto = String(
        p.nombre || p.producto || ''
      ).toLowerCase();

      const coincideCodigo = palabrasCodigo.some(
        palabra => nombreProducto.includes(palabra)
      );

      if (!coincideCodigo) return false;
    }
    
    // 5. Búsqueda por Subcódigo
    const subcodigoVal = p.subcodigo || p.subcategoria_codigo;
    if (searchSubcodigo && (!subcodigoVal || !subcodigoVal.toString().includes(searchSubcodigo))) return false;

    return true;
  });
  useEffect(() => {
    if (
      productosFiltrados.length > 0 &&
      setProductoSeleccionado
    ) {
      setProductoSeleccionado(productosFiltrados[0]);
    }
  }, [productosFiltrados, setProductoSeleccionado]);


  // 📝 HANDLERS PARA OPERACIONES CRUD

  const handleGuardarProducto = async (e) => {
    e.preventDefault();
    if (!addNombre) return alert('Por favor ingresa al menos el nombre del producto.');

    const payload = {
      nombre: addNombre,
      categoria_codigo: categoria && categoria !== 'Todos' ? categoria : null,
      subcategoria_codigo: subcategoria && subcategoria !== 'Todos' ? subcategoria : null
    };

    if (addPais) payload.pais = addPais;
    if (addPrecio) payload.precio = addPrecio;

    const { error } = await supabase.from('productos').insert([payload]);

    if (error) {
      alert('Error al guardar el producto: ' + error.message);
    } else {
      setAddPais('');
      setAddNombre('');
      setAddPrecio('');
      setActiveAccordion(null);
      cargarDatosIniciales();
    }
  };

  const handleEditarProducto = async (e) => {
    e.preventDefault();
    if (!editId) return alert('Selecciona un registro para editar.');

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
      setEditId('');
      setEditPais('');
      setEditNombre('');
      setEditPrecio('');
      cargarDatosIniciales();
    }
  };

  const handleEliminarProducto = async (e) => {
    e.preventDefault();
    if (!deleteId) return alert('Selecciona un registro para eliminar.');

    const { error } = await supabase
      .from('productos')
      .delete()
      .eq('id', deleteId);

    if (error) {
      alert('Error al eliminar: ' + error.message);
    } else {
      setActiveAccordion(null);
      setDeleteId('');
      cargarDatosIniciales();
    }
  };

  return (
    <div className="space-y-6 text-slate-100">

      {/* 🛠️ PANELS DE GESTIÓN DE DATOS */}
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
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
              <input
                type="text"
                placeholder="País"
                value={addPais}
                onChange={(e) => setAddPais(e.target.value)}
                className="bg-[#0e1117] border border-slate-700 p-2 rounded text-white focus:outline-none focus:border-red-500"
              />
              <input
                type="text"
                placeholder="Nombre del Producto"
                value={addNombre}
                onChange={(e) => setAddNombre(e.target.value)}
                className="bg-[#0e1117] border border-slate-700 p-2 rounded text-white focus:outline-none focus:border-red-500"
                required
              />
              <input
                type="text"
                placeholder="Precio (Ej: 12.50)"
                value={addPrecio}
                onChange={(e) => setAddPrecio(e.target.value)}
                className="bg-[#0e1117] border border-slate-700 p-2 rounded text-white focus:outline-none focus:border-red-500"
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
            
            <div className="space-y-1">
              <label className="text-[11px] text-slate-400 font-medium">Selecciona el registro a modificar:</label>
              <select
                value={editId}
                onChange={(e) => {
                  const selectedVal = e.target.value;
                  setEditId(selectedVal);
                  const sel = productos.find((p) => String(getProductoId(p)) === String(selectedVal));
                  if (sel) {
                    setEditPais(sel.pais || sel.Pais || '');
                    setEditNombre(sel.nombre || sel.producto || '');
                    setEditPrecio(sel.precio || sel.Precio || '');
                  } else {
                    setEditPais('');
                    setEditNombre('');
                    setEditPrecio('');
                  }
                }}
                className="w-full bg-[#0e1117] border border-slate-700 p-2 rounded text-xs text-white focus:outline-none focus:border-amber-500"
              >
                <option value="">-- Selecciona por [País] - Producto - (Precio) --</option>
                {productos.map((p) => {
                  const pId = getProductoId(p);
                  const pPais = p.pais || p.Pais || 'Sin país';
                  const pNombre = p.nombre || p.producto || 'Sin nombre';
                  const pPrecio = p.precio || p.Precio || 'Sin precio';
                  return (
                    <option key={pId} value={pId}>
                      [{pPais}] — {pNombre} — ({pPrecio})
                    </option>
                  );
                })}
              </select>
            </div>

            {editId && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs pt-2 border-t border-slate-800/80">
                <div>
                  <label className="block text-[10px] text-slate-400 uppercase mb-1">País</label>
                  <input
                    type="text"
                    placeholder="País"
                    value={editPais}
                    onChange={(e) => setEditPais(e.target.value)}
                    className="w-full bg-[#0e1117] border border-slate-700 p-2 rounded text-white focus:outline-none focus:border-amber-500"
                  />
                </div>
                <div>
                  <label className="block text-[10px] text-slate-400 uppercase mb-1">Nombre del Producto</label>
                  <input
                    type="text"
                    placeholder="Nombre"
                    value={editNombre}
                    onChange={(e) => setEditNombre(e.target.value)}
                    className="w-full bg-[#0e1117] border border-slate-700 p-2 rounded text-white focus:outline-none focus:border-amber-500"
                  />
                </div>
                <div>
                  <label className="block text-[10px] text-slate-400 uppercase mb-1">Precio</label>
                  <input
                    type="text"
                    placeholder="Precio"
                    value={editPrecio}
                    onChange={(e) => setEditPrecio(e.target.value)}
                    className="w-full bg-[#0e1117] border border-slate-700 p-2 rounded text-white focus:outline-none focus:border-amber-500"
                  />
                </div>
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
            
            <div className="space-y-1">
              <label className="text-[11px] text-slate-400 font-medium">Selecciona el registro a eliminar:</label>
              <select
                value={deleteId}
                onChange={(e) => setDeleteId(e.target.value)}
                className="w-full bg-[#0e1117] border border-slate-700 p-2 rounded text-xs text-white focus:outline-none focus:border-red-500"
              >
                <option value="">-- Selecciona por [País] - Producto - (Precio) --</option>
                {productos.map((p) => {
                  const pId = getProductoId(p);
                  const pPais = p.pais || p.Pais || 'Sin país';
                  const pNombre = p.nombre || p.producto || 'Sin nombre';
                  const pPrecio = p.precio || p.Precio || 'Sin precio';
                  return (
                    <option key={pId} value={pId}>
                      [{pPais}] — {pNombre} — ({pPrecio})
                    </option>
                  );
                })}
              </select>
            </div>

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
                  const idVal = getProductoId(item) || '—';
                  const paisVal = item.pais || item.Pais || '—';
                  const nombre = item.nombre || item.producto || '—';
                  const precioRaw = item.precio ?? item.Precio;
                  
                  let precioFmt = '—';
                  if (precioRaw !== undefined && precioRaw !== null && precioRaw !== '') {
                    if (typeof precioRaw === 'number') {
                      precioFmt = `${precioRaw.toFixed(2)} €`;
                    } else {
                      const strVal = String(precioRaw).trim();
                      if (strVal.includes('€')) {
                        precioFmt = strVal;
                      } else {
                        const num = Number(strVal.replace(',', '.'));
                        precioFmt = !isNaN(num) ? `${num.toFixed(2)} €` : strVal;
                      }
                    }
                  }

                  return (
                    <tr key={idVal} className="hover:bg-[#1f222d]/50 transition-colors">
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
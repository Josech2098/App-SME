import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient.js';

export default function TablaProductos({
  paisDestino,
  setPaisDestino,
  categoria,
  subcategoria,
  searchNombre,
  searchCodigo,
  searchSubcodigo,
  onSeleccionarProducto,
  productoSeleccionadoId
}) {
  const [productos, setProductos] = useState([]);
  const [keywordsCategoria, setKeywordsCategoria] = useState([]);
  const [loading, setLoading] = useState(true);

  const [activeAccordion, setActiveAccordion] = useState(null);

  // Form Añadir
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

  const getProductoId = (p) => p.id ?? p.id_producto ?? p.ID;

  // 🔍 Lógica de Filtrado Dinámico para la Tabla
  const productosFiltrados = productos.filter((p) => {
    if (categoria && categoria !== 'Todos') {
      const palabrasCategoriaActual = keywordsCategoria
        .filter(k => String(k.categoria_codigo) === String(categoria))
        .map(k => String(k.palabra_clave || '').toLowerCase());

      const nombreProducto = String(p.nombre || p.producto || '').toLowerCase();
      const coincideCategoria = palabrasCategoriaActual.some(palabra => nombreProducto.includes(palabra));

      if (!coincideCategoria) return false;
    }
    
    if (subcategoria && subcategoria !== 'Todos') {
      const palabrasSubcategoriaActual = keywordsCategoria
        .filter(k => String(k.subcategoria_codigo) === String(subcategoria))
        .map(k => String(k.palabra_clave || '').toLowerCase());

      const nombreProducto = String(p.nombre || p.producto || '').toLowerCase();
      const subcatProducto = String(p.subcategoria_codigo || p.subcategoria || p.subcodigo || '').trim();
      const subcatFiltro = String(subcategoria).trim();

      const coincideSubExacto = subcatProducto === subcatFiltro;
      const coincideSubEmpieza = subcatFiltro.startsWith(subcatProducto) || subcatProducto.startsWith(subcatFiltro);
      const coincideKeywordSub = palabrasSubcategoriaActual.some(palabra => nombreProducto.includes(palabra));

      if (!coincideSubExacto && !coincideSubEmpieza && !coincideKeywordSub) return false;
    }
    
    const nombreVal = p.nombre || p.producto || '';
    if (searchNombre && !nombreVal.toLowerCase().includes(searchNombre.toLowerCase())) return false;
    
    if (searchCodigo) {
      const palabrasCodigo = keywordsCategoria
        .filter(k => String(k.categoria_codigo).startsWith(searchCodigo))
        .map(k => String(k.palabra_clave || '').toLowerCase());

      const nombreProducto = String(p.nombre || p.producto || '').toLowerCase();
      const coincideCodigo = palabrasCodigo.some(palabra => nombreProducto.includes(palabra));

      if (!coincideCodigo) return false;
    }
    
    const subcodigoVal = p.subcodigo || p.subcategoria_codigo;
    if (searchSubcodigo && (!subcodigoVal || !subcodigoVal.toString().includes(searchSubcodigo))) return false;

    return true;
  });

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
      
      const productoActualizado = {
        id: editId,
        pais: editPais,
        nombre: editNombre,
        precio: editPrecio
      };
      if (onSeleccionarProducto) {
        onSeleccionarProducto(productoActualizado);
      }

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
    <div className="space-y-6 text-[#94a3b8] font-sans antialiased">

      {/* 🛠️ PANEL DE GESTIÓN DE PRODUCTOS */}
      <div className="bg-[#121620] border border-[#1e2536] rounded-xl p-4 shadow-sm space-y-4">
        
        {/* Encabezado del Panel */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-3 border-b border-[#1e2536] pb-3">
          <div className="flex items-center gap-2 text-white font-bold text-base">
            <span>⚙️</span>
            <span>PANEL DE GESTIÓN DE PRODUCTOS</span>
          </div>
          <div className="bg-[#192233] text-[#93c5fd] border border-[#26354a] text-xs px-3 py-1.5 rounded-lg font-medium">
            Módulo Activo
          </div>
        </div>

        {/* Botones Acordeón Superiores */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          
          {/* Añadir */}
          <div className="bg-[#161c29] border border-[#222c40] rounded-lg overflow-hidden transition-all">
            <button
              type="button"
              onClick={() => setActiveAccordion(activeAccordion === 'add' ? null : 'add')}
              className="w-full px-4 py-3 text-left text-xs font-semibold text-slate-200 hover:bg-[#1d2638] transition-colors flex items-center justify-between cursor-pointer"
            >
              <span className="flex items-center gap-2">
                <span className="text-emerald-400 font-bold">+</span> Añadir producto
              </span>
              <span className="text-slate-400 text-xs">{activeAccordion === 'add' ? '▴' : '▾'}</span>
            </button>
            {activeAccordion === 'add' && (
              <form onSubmit={handleGuardarProducto} className="p-4 border-t border-[#222c40] space-y-3 bg-[#131824] text-xs">
                <div>
                  <label className="block text-slate-400 mb-1 font-medium">País</label>
                  <input
                    type="text"
                    value={addPais}
                    onChange={(e) => setAddPais(e.target.value)}
                    placeholder="Ej. España"
                    className="w-full bg-[#0b0e14] border border-[#222c40] rounded p-2 text-white focus:outline-none focus:border-slate-500"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 mb-1 font-medium">Nombre del Producto</label>
                  <input
                    type="text"
                    value={addNombre}
                    onChange={(e) => setAddNombre(e.target.value)}
                    placeholder="Ej. Queso local (1 kg)"
                    className="w-full bg-[#0b0e14] border border-[#222c40] rounded p-2 text-white focus:outline-none focus:border-slate-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-slate-400 mb-1 font-medium">Precio (€)</label>
                  <input
                    type="text"
                    value={addPrecio}
                    onChange={(e) => setAddPrecio(e.target.value)}
                    placeholder="12.50"
                    className="w-full bg-[#0b0e14] border border-[#222c40] rounded p-2 text-white focus:outline-none focus:border-slate-500"
                  />
                </div>
                <button
                  type="submit"
                  className="bg-emerald-600 hover:bg-emerald-500 text-white px-3 py-1.5 rounded text-xs font-medium cursor-pointer transition-colors"
                >
                  Guardar cambios
                </button>
              </form>
            )}
          </div>

          {/* Editar */}
          <div className="bg-[#161c29] border border-[#222c40] rounded-lg overflow-hidden transition-all">
            <button
              type="button"
              onClick={() => setActiveAccordion(activeAccordion === 'edit' ? null : 'edit')}
              className="w-full px-4 py-3 text-left text-xs font-semibold text-slate-200 hover:bg-[#1d2638] transition-colors flex items-center justify-between cursor-pointer"
            >
              <span className="flex items-center gap-2">
                <span>✏️</span> Editar producto
              </span>
              <span className="text-slate-400 text-xs">{activeAccordion === 'edit' ? '▴' : '▾'}</span>
            </button>
            {activeAccordion === 'edit' && (
              <form onSubmit={handleEditarProducto} className="p-4 border-t border-[#222c40] space-y-3 bg-[#131824] text-xs">
                <div>
                  <label className="block text-slate-400 mb-1 font-medium">Seleccionar registro:</label>
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
                    className="w-full bg-[#0b0e14] border border-[#222c40] p-2 rounded text-xs text-white cursor-pointer focus:outline-none"
                  >
                    <option value="">-- Seleccionar producto --</option>
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
                  <div className="space-y-3 pt-1">
                    <div>
                      <label className="block text-slate-400 mb-1 font-medium">País</label>
                      <input
                        type="text"
                        value={editPais}
                        onChange={(e) => setEditPais(e.target.value)}
                        className="w-full bg-[#0b0e14] border border-[#222c40] p-2 rounded text-white focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-slate-400 mb-1 font-medium">Nombre</label>
                      <input
                        type="text"
                        value={editNombre}
                        onChange={(e) => setEditNombre(e.target.value)}
                        className="w-full bg-[#0b0e14] border border-[#222c40] p-2 rounded text-white focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-slate-400 mb-1 font-medium">Precio</label>
                      <input
                        type="text"
                        value={editPrecio}
                        onChange={(e) => setEditPrecio(e.target.value)}
                        className="w-full bg-[#0b0e14] border border-[#222c40] p-2 rounded text-white focus:outline-none"
                      />
                    </div>
                  </div>
                )}

                <button 
                  type="submit"
                  className="bg-amber-600 hover:bg-amber-500 text-white text-xs px-3 py-1.5 rounded font-medium cursor-pointer transition-colors"
                >
                  Actualizar cambios
                </button>
              </form>
            )}
          </div>

          {/* Eliminar */}
          <div className="bg-[#161c29] border border-[#222c40] rounded-lg overflow-hidden transition-all">
            <button
              type="button"
              onClick={() => setActiveAccordion(activeAccordion === 'delete' ? null : 'delete')}
              className="w-full px-4 py-3 text-left text-xs font-semibold text-slate-200 hover:bg-[#1d2638] transition-colors flex items-center justify-between cursor-pointer"
            >
              <span className="flex items-center gap-2">
                <span>🗑️</span> Eliminar producto
              </span>
              <span className="text-slate-400 text-xs">{activeAccordion === 'delete' ? '▴' : '▾'}</span>
            </button>
            {activeAccordion === 'delete' && (
              <form onSubmit={handleEliminarProducto} className="p-4 border-t border-[#222c40] space-y-3 bg-[#131824] text-xs">
                <div>
                  <label className="block text-slate-400 mb-1 font-medium">Selecciona el registro a eliminar:</label>
                  <select
                    value={deleteId}
                    onChange={(e) => setDeleteId(e.target.value)}
                    className="w-full bg-[#0b0e14] border border-[#222c40] p-2 rounded text-xs text-white cursor-pointer focus:outline-none"
                  >
                    <option value="">-- Seleccionar producto a remover --</option>
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
                <button
                  type="submit"
                  className="bg-red-600/80 hover:bg-red-600 text-white px-3 py-1.5 rounded text-xs font-medium cursor-pointer transition-colors"
                >
                  Confirmar eliminación
                </button>
              </form>
            )}
          </div>

        </div>

      </div>

      {/* 📊 TABLA DE RESULTADOS PRINCIPAL */}
      <div className="space-y-2">
        <div className="flex justify-between items-center px-1">
          <h3 className="text-sm font-bold text-white">
            Listado de Productos <span className="text-xs font-normal text-slate-500">(Haz clic en una fila para seleccionarla)</span>
          </h3>
          <span className="text-xs text-slate-400 font-mono">
            Mostrando <strong className="text-slate-200">{productosFiltrados.length}</strong> de <strong className="text-slate-200">{productos.length}</strong> registros
          </span>
        </div>

        <div className="bg-[#121620] border border-[#1e2536] rounded-xl overflow-hidden shadow-sm">
          <div className="max-h-[450px] overflow-y-auto custom-scrollbar">
            <table className="w-full text-left text-xs border-collapse">
              <thead className="sticky top-0 bg-[#161c29] z-10 border-b border-[#1e2536]">
                <tr className="text-slate-400">
                  <th className="py-3 px-4 w-20 font-medium">ID</th>
                  <th className="py-3 px-4 font-medium">País</th>
                  <th className="py-3 px-4 font-medium">Producto</th>
                  <th className="py-3 px-4 text-right font-medium pr-6">Precio (€)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#182030] font-mono text-slate-300">
                {loading ? (
                  <tr>
                    <td colSpan="4" className="py-6 text-center text-slate-500 font-sans">
                      Cargando registros desde base de datos...
                    </td>
                  </tr>
                ) : productosFiltrados.length > 0 ? (
                  productosFiltrados.map((item) => {
                    const idVal = getProductoId(item) || '—';
                    const paisVal = item.pais || item.Pais || '—';
                    const nombre = item.nombre || item.producto || '—';
                    const precioRaw = item.precio ?? item.Precio;
                    const isSelected = String(productoSeleccionadoId) === String(idVal);
                    
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
                      <tr 
                        key={idVal} 
                        onClick={() => {
                          if (onSeleccionarProducto) {
                            onSeleccionarProducto(item);
                          }
                        }}
                        className={`transition-colors cursor-pointer ${
                          isSelected ? 'bg-emerald-500/10 border-l-4 border-emerald-400' : 'hover:bg-[#161c29]/50'
                        }`}
                      >
                        <td className="py-3 px-4 text-slate-400">{idVal}</td>
                        <td className="py-3 px-4 font-sans font-medium text-slate-200">{paisVal}</td>
                        <td className="py-3 px-4 font-sans text-slate-200">{nombre}</td>
                        <td className="py-3 px-4 text-right text-emerald-400 font-semibold pr-6">{precioFmt}</td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan="4" className="py-8 text-center text-slate-500 font-sans">
                      No se encontraron registros que coincidan con los filtros activos.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

    </div>
  );
}
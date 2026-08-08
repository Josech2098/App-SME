import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient.js';
import { THEME } from '../theme';

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
    <div className="space-y-6" style={{ color: THEME.text }}>

      {/* 🛠️ PANELS DE GESTIÓN DE DATOS */}
      <div className="space-y-3">
        <h3 className="text-sm font-semibold flex items-center gap-2" style={{ color: THEME.textSecondary }}>
          <span>🛠️</span> Gestión de Datos (Productos)
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {/* Botón Añadir */}
          <button
            type="button"
            onClick={() => setActiveAccordion(activeAccordion === 'add' ? null : 'add')}
            className="p-3 rounded-lg border text-xs font-medium text-left flex items-center gap-2 transition-all cursor-pointer"
            style={{
              backgroundColor: activeAccordion === 'add' ? THEME.panel : THEME.card,
              borderColor: activeAccordion === 'add' ? THEME.danger : THEME.border,
              color: THEME.text
            }}
          >
            <span>{activeAccordion === 'add' ? '▼' : '❯'}</span> Añadir producto
          </button>

          {/* Botón Editar */}
          <button
            type="button"
            onClick={() => setActiveAccordion(activeAccordion === 'edit' ? null : 'edit')}
            className="p-3 rounded-lg border text-xs font-medium text-left flex items-center gap-2 transition-all cursor-pointer"
            style={{
              backgroundColor: activeAccordion === 'edit' ? THEME.panel : THEME.card,
              borderColor: activeAccordion === 'edit' ? THEME.warning : THEME.border,
              color: THEME.text
            }}
          >
            <span>{activeAccordion === 'edit' ? '▼' : '❯'}</span> Editar producto existente
          </button>

          {/* Botón Eliminar */}
          <button
            type="button"
            onClick={() => setActiveAccordion(activeAccordion === 'delete' ? null : 'delete')}
            className="p-3 rounded-lg border text-xs font-medium text-left flex items-center gap-2 transition-all cursor-pointer"
            style={{
              backgroundColor: activeAccordion === 'delete' ? THEME.panel : THEME.card,
              borderColor: activeAccordion === 'delete' ? THEME.danger : THEME.border,
              color: THEME.text
            }}
          >
            <span>{activeAccordion === 'delete' ? '▼' : '❯'}</span> Eliminar producto existente
          </button>
        </div>

        {/* Formulario: Añadir */}
        {activeAccordion === 'add' && (
          <form onSubmit={handleGuardarProducto} className="p-4 rounded-lg border space-y-3" style={{ backgroundColor: THEME.card, borderColor: THEME.border }}>
            <h4 className="text-xs font-bold uppercase" style={{ color: THEME.danger }}>Añadir Nuevo Producto</h4>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
              <input
                type="text"
                placeholder="País"
                value={addPais}
                onChange={(e) => setAddPais(e.target.value)}
                className="p-2 rounded text-white focus:outline-none"
                style={{ backgroundColor: THEME.background, borderColor: THEME.border, border: '1px solid' }}
              />
              <input
                type="text"
                placeholder="Nombre del Producto"
                value={addNombre}
                onChange={(e) => setAddNombre(e.target.value)}
                className="p-2 rounded text-white focus:outline-none"
                style={{ backgroundColor: THEME.background, borderColor: THEME.border, border: '1px solid' }}
                required
              />
              <input
                type="text"
                placeholder="Precio (Ej: 12.50)"
                value={addPrecio}
                onChange={(e) => setAddPrecio(e.target.value)}
                className="p-2 rounded text-white focus:outline-none"
                style={{ backgroundColor: THEME.background, borderColor: THEME.border, border: '1px solid' }}
              />
            </div>
            <button type="submit" className="text-white text-xs px-4 py-2 rounded font-medium cursor-pointer transition-colors" style={{ backgroundColor: THEME.danger }}>
              Guardar nuevo producto
            </button>
          </form>
        )}

        {/* Formulario: Editar */}
        {activeAccordion === 'edit' && (
          <form onSubmit={handleEditarProducto} className="p-4 rounded-lg border space-y-3" style={{ backgroundColor: THEME.card, borderColor: THEME.border }}>
            <h4 className="text-xs font-bold uppercase" style={{ color: THEME.warning }}>Editar Producto Existente</h4>
            
            <div className="space-y-1">
              <label className="text-[11px] font-medium" style={{ color: THEME.textSecondary }}>Selecciona el registro a modificar:</label>
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
                className="w-full p-2 rounded text-xs text-white focus:outline-none cursor-pointer"
                style={{ backgroundColor: THEME.background, borderColor: THEME.border, border: '1px solid' }}
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
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs pt-2" style={{ borderTop: `1px solid ${THEME.border}` }}>
                <div>
                  <label className="block text-[10px] uppercase mb-1" style={{ color: THEME.textSecondary }}>País</label>
                  <input
                    type="text"
                    placeholder="País"
                    value={editPais}
                    onChange={(e) => setEditPais(e.target.value)}
                    className="w-full p-2 rounded text-white focus:outline-none"
                    style={{ backgroundColor: THEME.background, borderColor: THEME.border, border: '1px solid' }}
                  />
                </div>
                <div>
                  <label className="block text-[10px] uppercase mb-1" style={{ color: THEME.textSecondary }}>Nombre del Producto</label>
                  <input
                    type="text"
                    placeholder="Nombre"
                    value={editNombre}
                    onChange={(e) => setEditNombre(e.target.value)}
                    className="w-full p-2 rounded text-white focus:outline-none"
                    style={{ backgroundColor: THEME.background, borderColor: THEME.border, border: '1px solid' }}
                  />
                </div>
                <div>
                  <label className="block text-[10px] uppercase mb-1" style={{ color: THEME.textSecondary }}>Precio</label>
                  <input
                    type="text"
                    placeholder="Precio"
                    value={editPrecio}
                    onChange={(e) => setEditPrecio(e.target.value)}
                    className="w-full p-2 rounded text-white focus:outline-none"
                    style={{ backgroundColor: THEME.background, borderColor: THEME.border, border: '1px solid' }}
                  />
                </div>
              </div>
            )}
            
            <button type="submit" className="text-white text-xs px-4 py-2 rounded font-medium cursor-pointer transition-colors" style={{ backgroundColor: THEME.warning }}>
              Actualizar producto
            </button>
          </form>
        )}

        {/* Formulario: Eliminar */}
        {activeAccordion === 'delete' && (
          <form onSubmit={handleEliminarProducto} className="p-4 rounded-lg border space-y-3" style={{ backgroundColor: THEME.card, borderColor: THEME.border }}>
            <h4 className="text-xs font-bold uppercase" style={{ color: THEME.danger }}>Eliminar Producto</h4>
            
            <div className="space-y-1">
              <label className="text-[11px] font-medium" style={{ color: THEME.textSecondary }}>Selecciona el registro a eliminar:</label>
              <select
                value={deleteId}
                onChange={(e) => setDeleteId(e.target.value)}
                className="w-full p-2 rounded text-xs text-white focus:outline-none cursor-pointer"
                style={{ backgroundColor: THEME.background, borderColor: THEME.border, border: '1px solid' }}
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

            <button type="submit" className="text-white text-xs px-4 py-2 rounded font-medium cursor-pointer transition-colors" style={{ backgroundColor: THEME.danger }}>
              Eliminar producto definitivamente
            </button>
          </form>
        )}
      </div>

      {/* 📊 TABLA DE RESULTADOS DE BÚSQUEDA */}
      <div className="space-y-3 pt-2">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-bold" style={{ color: THEME.text }}>
            Listado de Productos <span className="text-xs font-normal" style={{ color: THEME.textSecondary }}>(Haz clic en una fila para seleccionarla)</span>
          </h3>
          <span className="text-xs px-3 py-1 rounded-full border" style={{ backgroundColor: THEME.card, borderColor: THEME.border, color: THEME.textSecondary }}>
            Mostrando <strong style={{ color: THEME.text }}>{productosFiltrados.length}</strong> de {productos.length} registros
          </span>
        </div>

        <div className="overflow-x-auto rounded-lg border shadow-sm" style={{ backgroundColor: THEME.card, borderColor: THEME.border }}>
          <table className="w-full text-left text-xs" style={{ color: THEME.textSecondary }}>
            <thead>
              <tr style={{ backgroundColor: THEME.panel, borderBottom: `1px solid ${THEME.border}`, color: THEME.textSecondary }}>
                <th className="p-3 font-semibold">ID</th>
                <th className="p-3 font-semibold">País</th>
                <th className="p-3 font-semibold text-right">Precio (€)</th>
                <th className="p-3 font-semibold">Producto</th>
              </tr>
            </thead>
            <tbody style={{ borderTop: `1px solid ${THEME.border}` }}>
              {loading ? (
                <tr>
                  <td colSpan="4" className="p-6 text-center animate-pulse" style={{ color: THEME.textSecondary }}>
                    Cargando productos desde base de datos...
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
                      className="transition-colors cursor-pointer"
                      style={{
                        backgroundColor: isSelected ? 'rgba(248, 113, 113, 0.15)' : 'transparent',
                        borderLeft: isSelected ? `4px solid ${THEME.danger}` : '4px solid transparent'
                      }}
                    >
                      <td className="p-3 font-mono" style={{ color: THEME.textSecondary }}>{idVal}</td>
                      <td className="p-3 font-medium" style={{ color: THEME.textSecondary }}>{paisVal}</td>
                      <td className="p-3 text-right font-mono font-semibold" style={{ color: THEME.success }}>
                        {precioFmt}
                      </td>
                      <td className="p-3 font-medium" style={{ color: THEME.text }}>{nombre}</td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan="4" className="p-6 text-center" style={{ color: THEME.textSecondary }}>
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
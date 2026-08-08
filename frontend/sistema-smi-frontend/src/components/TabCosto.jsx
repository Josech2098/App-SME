import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient.js';
import { THEME } from '../theme.js';

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

      {/* 🛠️ PANEL DE CONTROL / GESTIÓN (ESTILO TABCOSTO) */}
      <div 
        className="p-5 rounded-xl border shadow-sm space-y-4"
        style={{ backgroundColor: THEME.card, borderColor: THEME.border }}
      >
        <div className="flex items-center justify-between border-b pb-3" style={{ borderColor: THEME.border }}>
          <h3 className="text-sm font-bold flex items-center gap-2 tracking-wide uppercase" style={{ color: THEME.text }}>
            <span>⚙️</span> Panel de Gestión de Productos
          </h3>
          <span className="text-[11px] px-2.5 py-1 rounded-md font-mono" style={{ backgroundColor: THEME.panel, color: THEME.textSecondary, border: `1px solid ${THEME.border}` }}>
            Módulo Activo
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {/* Botón Añadir */}
          <button
            type="button"
            onClick={() => setActiveAccordion(activeAccordion === 'add' ? null : 'add')}
            style={{
              backgroundColor: activeAccordion === 'add' ? THEME.success : THEME.panel,
              borderColor: activeAccordion === 'add' ? THEME.success : THEME.border,
              color: activeAccordion === 'add' ? THEME.background : THEME.text,
              borderWidth: '1px',
              borderStyle: 'solid',
              fontWeight: activeAccordion === 'add' ? 'bold' : 'medium'
            }}
            className="p-3 rounded-lg text-xs text-left flex items-center justify-between transition-all cursor-pointer shadow-sm"
          >
            <span className="flex items-center gap-2"><span>➕</span> Añadir producto</span>
            <span className="text-[10px]">{activeAccordion === 'add' ? '▼' : '❯'}</span>
          </button>

          {/* Botón Editar */}
          <button
            type="button"
            onClick={() => setActiveAccordion(activeAccordion === 'edit' ? null : 'edit')}
            style={{
              backgroundColor: activeAccordion === 'edit' ? THEME.warning : THEME.panel,
              borderColor: activeAccordion === 'edit' ? THEME.warning : THEME.border,
              color: activeAccordion === 'edit' ? THEME.background : THEME.text,
              borderWidth: '1px',
              borderStyle: 'solid',
              fontWeight: activeAccordion === 'edit' ? 'bold' : 'medium'
            }}
            className="p-3 rounded-lg text-xs text-left flex items-center justify-between transition-all cursor-pointer shadow-sm"
          >
            <span className="flex items-center gap-2"><span>✏️</span> Editar producto</span>
            <span className="text-[10px]">{activeAccordion === 'edit' ? '▼' : '❯'}</span>
          </button>

          {/* Botón Eliminar */}
          <button
            type="button"
            onClick={() => setActiveAccordion(activeAccordion === 'delete' ? null : 'delete')}
            style={{
              backgroundColor: activeAccordion === 'delete' ? THEME.danger : THEME.panel,
              borderColor: activeAccordion === 'delete' ? THEME.danger : THEME.border,
              color: activeAccordion === 'delete' ? THEME.background : THEME.text,
              borderWidth: '1px',
              borderStyle: 'solid',
              fontWeight: activeAccordion === 'delete' ? 'bold' : 'medium'
            }}
            className="p-3 rounded-lg text-xs text-left flex items-center justify-between transition-all cursor-pointer shadow-sm"
          >
            <span className="flex items-center gap-2"><span>🗑️</span> Eliminar producto</span>
            <span className="text-[10px]">{activeAccordion === 'delete' ? '▼' : '❯'}</span>
          </button>
        </div>

        {/* Formulario: Añadir */}
        {activeAccordion === 'add' && (
          <form onSubmit={handleGuardarProducto} className="p-4 rounded-lg border space-y-3 shadow-inner mt-3 animate-fadeIn" style={{ backgroundColor: THEME.background, borderColor: THEME.border }}>
            <h4 className="text-xs font-bold uppercase tracking-wider" style={{ color: THEME.success }}>Registrar Nuevo Producto</h4>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
              <input
                type="text"
                placeholder="País"
                value={addPais}
                onChange={(e) => setAddPais(e.target.value)}
                className="p-2.5 rounded-md focus:outline-none"
                style={{ backgroundColor: THEME.card, color: THEME.text, borderColor: THEME.border, border: '1px solid' }}
              />
              <input
                type="text"
                placeholder="Nombre del Producto"
                value={addNombre}
                onChange={(e) => setAddNombre(e.target.value)}
                className="p-2.5 rounded-md focus:outline-none"
                style={{ backgroundColor: THEME.card, color: THEME.text, borderColor: THEME.border, border: '1px solid' }}
                required
              />
              <input
                type="text"
                placeholder="Precio (Ej: 12.50)"
                value={addPrecio}
                onChange={(e) => setAddPrecio(e.target.value)}
                className="p-2.5 rounded-md focus:outline-none"
                style={{ backgroundColor: THEME.card, color: THEME.text, borderColor: THEME.border, border: '1px solid' }}
              />
            </div>
            <div className="flex justify-end pt-2">
              <button type="submit" className="text-xs px-4 py-2 rounded-md font-medium cursor-pointer transition-colors shadow" style={{ backgroundColor: THEME.success, color: THEME.background }}>
                Guardar cambios
              </button>
            </div>
          </form>
        )}

        {/* Formulario: Editar */}
        {activeAccordion === 'edit' && (
          <form onSubmit={handleEditarProducto} className="p-4 rounded-lg border space-y-3 shadow-inner mt-3 animate-fadeIn" style={{ backgroundColor: THEME.background, borderColor: THEME.border }}>
            <h4 className="text-xs font-bold uppercase tracking-wider" style={{ color: THEME.warning }}>Actualizar Registro Existente</h4>
            
            <div className="space-y-1">
              <label className="text-[11px] font-medium" style={{ color: THEME.textSecondary }}>Seleccionar registro:</label>
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
                className="w-full p-2.5 rounded-md text-xs focus:outline-none cursor-pointer"
                style={{ backgroundColor: THEME.card, color: THEME.text, borderColor: THEME.border, border: '1px solid' }}
              >
                <option value="" style={{ backgroundColor: THEME.card, color: THEME.text }}>-- Seleccionar producto --</option>
                {productos.map((p) => {
                  const pId = getProductoId(p);
                  const pPais = p.pais || p.Pais || 'Sin país';
                  const pNombre = p.nombre || p.producto || 'Sin nombre';
                  const pPrecio = p.precio || p.Precio || 'Sin precio';
                  return (
                    <option key={pId} value={pId} style={{ backgroundColor: THEME.card, color: THEME.text }}>
                      [{pPais}] — {pNombre} — ({pPrecio})
                    </option>
                  );
                })}
              </select>
            </div>

            {editId && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs pt-2" style={{ borderTop: `1px solid ${THEME.border}` }}>
                <div>
                  <label className="block text-[10px] uppercase mb-1 font-semibold" style={{ color: THEME.textSecondary }}>País</label>
                  <input
                    type="text"
                    value={editPais}
                    onChange={(e) => setEditPais(e.target.value)}
                    className="w-full p-2.5 rounded-md focus:outline-none"
                    style={{ backgroundColor: THEME.card, color: THEME.text, borderColor: THEME.border, border: '1px solid' }}
                  />
                </div>
                <div>
                  <label className="block text-[10px] uppercase mb-1 font-semibold" style={{ color: THEME.textSecondary }}>Nombre</label>
                  <input
                    type="text"
                    value={editNombre}
                    onChange={(e) => setEditNombre(e.target.value)}
                    className="w-full p-2.5 rounded-md focus:outline-none"
                    style={{ backgroundColor: THEME.card, color: THEME.text, borderColor: THEME.border, border: '1px solid' }}
                  />
                </div>
                <div>
                  <label className="block text-[10px] uppercase mb-1 font-semibold" style={{ color: THEME.textSecondary }}>Precio</label>
                  <input
                    type="text"
                    value={editPrecio}
                    onChange={(e) => setEditPrecio(e.target.value)}
                    className="w-full p-2.5 rounded-md focus:outline-none"
                    style={{ backgroundColor: THEME.card, color: THEME.text, borderColor: THEME.border, border: '1px solid' }}
                  />
                </div>
              </div>
            )}
            
            <div className="flex justify-end pt-2">
              <button type="submit" className="text-xs px-4 py-2 rounded-md font-medium cursor-pointer transition-colors shadow" style={{ backgroundColor: THEME.warning, color: THEME.background }}>
                Actualizar cambios
              </button>
            </div>
          </form>
        )}

        {/* Formulario: Eliminar */}
        {activeAccordion === 'delete' && (
          <form onSubmit={handleEliminarProducto} className="p-4 rounded-lg border space-y-3 shadow-inner mt-3 animate-fadeIn" style={{ backgroundColor: THEME.background, borderColor: THEME.border }}>
            <h4 className="text-xs font-bold uppercase tracking-wider" style={{ color: THEME.danger }}>Eliminar Registro</h4>
            
            <div className="space-y-1">
              <label className="text-[11px] font-medium" style={{ color: THEME.textSecondary }}>Selecciona el registro a eliminar:</label>
              <select
                value={deleteId}
                onChange={(e) => setDeleteId(e.target.value)}
                className="w-full p-2.5 rounded-md text-xs focus:outline-none cursor-pointer"
                style={{ backgroundColor: THEME.card, color: THEME.text, borderColor: THEME.border, border: '1px solid' }}
              >
                <option value="" style={{ backgroundColor: THEME.card, color: THEME.text }}>-- Seleccionar producto a remover --</option>
                {productos.map((p) => {
                  const pId = getProductoId(p);
                  const pPais = p.pais || p.Pais || 'Sin país';
                  const pNombre = p.nombre || p.producto || 'Sin nombre';
                  const pPrecio = p.precio || p.Precio || 'Sin precio';
                  return (
                    <option key={pId} value={pId} style={{ backgroundColor: THEME.card, color: THEME.text }}>
                      [{pPais}] — {pNombre} — ({pPrecio})
                    </option>
                  );
                })}
              </select>
            </div>

            <div className="flex justify-end pt-2">
              <button type="submit" className="text-xs px-4 py-2 rounded-md font-medium cursor-pointer transition-colors shadow" style={{ backgroundColor: THEME.danger, color: THEME.background }}>
                Confirmar eliminación
              </button>
            </div>
          </form>
        )}
      </div>

      {/* 📊 TABLA DE RESULTADOS PRINCIPAL */}
      <div className="space-y-3 pt-2">
        <div className="flex items-center justify-between">
          <h3 className="text-base font-bold" style={{ color: THEME.text }}>
            Listado de Productos <span className="text-xs font-normal" style={{ color: THEME.textSecondary }}>(Haz clic en una fila para seleccionarla)</span>
          </h3>
          <span className="text-xs px-3 py-1 rounded-full border font-mono" style={{ backgroundColor: THEME.card, borderColor: THEME.border, color: THEME.textSecondary }}>
            Mostrando <strong style={{ color: THEME.text }}>{productosFiltrados.length}</strong> de {productos.length} registros
          </span>
        </div>

        <div className="overflow-x-auto rounded-xl border shadow-sm" style={{ backgroundColor: THEME.card, borderColor: THEME.border }}>
          <table className="w-full text-left text-xs" style={{ color: THEME.textSecondary }}>
            <thead>
              <tr style={{ backgroundColor: THEME.panel, borderBottom: `1px solid ${THEME.border}`, color: THEME.textSecondary }}>
                <th className="p-3.5 font-semibold">ID</th>
                <th className="p-3.5 font-semibold">País</th>
                <th className="p-3.5 font-semibold text-right">Precio (€)</th>
                <th className="p-3.5 font-semibold">Producto</th>
              </tr>
            </thead>
            <tbody style={{ borderTop: `1px solid ${THEME.border}` }}>
              {loading ? (
                <tr>
                  <td colSpan="4" className="p-8 text-center animate-pulse" style={{ color: THEME.textSecondary }}>
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
                      className="transition-colors cursor-pointer"
                      style={{
                        backgroundColor: isSelected ? 'rgba(52, 211, 153, 0.15)' : 'transparent',
                        borderLeft: isSelected ? `4px solid ${THEME.success}` : '4px solid transparent'
                      }}
                    >
                      <td className="p-3.5 font-mono" style={{ color: THEME.textSecondary }}>{idVal}</td>
                      <td className="p-3.5 font-medium" style={{ color: THEME.textSecondary }}>{paisVal}</td>
                      <td className="p-3.5 text-right font-mono font-semibold" style={{ color: THEME.success }}>
                        {precioFmt}
                      </td>
                      <td className="p-3.5 font-medium" style={{ color: THEME.text }}>{nombre}</td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan="4" className="p-8 text-center" style={{ color: THEME.textSecondary }}>
                    No se encontraron registros que coincidan con los filtros activos.
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
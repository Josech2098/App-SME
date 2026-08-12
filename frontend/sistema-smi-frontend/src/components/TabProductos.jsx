import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient.js';
import { renderPaisConBandera } from './banderas.jsx';

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
      console.log('Ejemplo de producto cargado de Supabase:', dataProductos[0]); // 👈 Útil para ver las columnas reales
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

  const obtenerPrecioNumerico = (p) => {
    const precioRaw = p.precio ?? p.Precio;
    if (precioRaw === undefined || precioRaw === null || precioRaw === '') return 0;
    if (typeof precioRaw === 'number') return precioRaw;
    const num = Number(String(precioRaw).replace('€', '').trim().replace(',', '.'));
    return isNaN(num) ? 0 : num;
  };

  // 🔍 Lógica de Filtrado Directa por Nombre o Código (Sin depender de keywords erróneas)
  const productosFiltrados = productos.filter((p) => {
    const nombreProducto = String(p.nombre || p.producto || '').toLowerCase();
    
    // 1. Filtro por categoría inteligente
    if (categoria && categoria !== 'Todos') {
      const categoriaFiltroLimpia = String(categoria).toLowerCase();
      // Extraemos los primeros dígitos si el string viene como "0407 - Descripción..."
      const codigoExtraido = categoriaFiltroLimpia.split(' ')[0].trim();

      const catProductoCodigo = String(p.categoria_codigo || p.categoria || '').toLowerCase().trim();
      
      // Verificamos si coincide el código o si el nombre del producto contiene la categoría seleccionada
      const coincideCodigo = catProductoCodigo.includes(codigoExtraido);
      
      // Buscamos si hay keywords válidas en Supabase para este código
      const palabrasClave = keywordsCategoria
        .filter(k => String(k.categoria_codigo).toLowerCase().includes(codigoExtraido))
        .map(k => String(k.palabra_clave || '').toLowerCase().trim())
        .filter(Boolean);

      const coincideKeyword = palabrasClave.some(palabra => nombreProducto.includes(palabra));

      // Si no coincide ni por código de base de datos ni por palabras clave reales, se descarta
      if (!coincideCodigo && palabrasClave.length > 0 && !coincideKeyword) {
        return false;
      }
      
      // Si el producto no tiene código asignado y tampoco hay keywords, filtramos por similitud en el texto del nombre
      if (!catProductoCodigo && palabrasClave.length === 0) {
        const terminosFiltro = categoriaFiltroLimpia.replace(/[^a-z0-9\s]/gi, '').split(' ');
        const matchParcial = terminosFiltro.some(term => term.length > 3 && nombreProducto.includes(term));
        if (!matchParcial) return false;
      }
    }
    
    // 2. Filtro por subcategoría
    if (subcategoria && subcategoria !== 'Todos') {
      const subcatFiltro = String(subcategoria).toLowerCase().trim();
      const subcatProducto = String(p.subcategoria_codigo || p.subcategoria || p.subcodigo || '').toLowerCase().trim();
      
      const palabrasSub = keywordsCategoria
        .filter(k => String(k.subcategoria_codigo).toLowerCase().includes(subcatFiltro))
        .map(k => String(k.palabra_clave || '').toLowerCase().trim())
        .filter(Boolean);

      const coincideSub = subcatProducto.includes(subcatFiltro) || palabrasSub.some(pText => nombreProducto.includes(pText));
      if (!coincideSub && palabrasSub.length > 0) return false;
    }
    
    // 3. Filtro por nombre escrito manualmente
    if (searchNombre && !nombreProducto.includes(searchNombre.toLowerCase())) return false;
    
    // 4. Filtro por código de categoría
    if (searchCodigo) {
      const palabrasCodigo = keywordsCategoria
        .filter(k => String(k.categoria_codigo).startsWith(searchCodigo))
        .map(k => String(k.palabra_clave || '').toLowerCase().trim())
        .filter(Boolean);

      const coincideCodigoSearch = palabrasCodigo.some(palabra => nombreProducto.includes(palabra));
      if (palabrasCodigo.length > 0 && !coincideCodigoSearch) return false;
    }
    
    // 5. Filtro por subcódigo
    const subcodigoVal = p.subcodigo || p.subcategoria_codigo;
    if (searchSubcodigo && (!subcodigoVal || !subcodigoVal.toString().includes(searchSubcodigo))) return false;

    return true;
  }).sort((a, b) => obtenerPrecioNumerico(a) - obtenerPrecioNumerico(b));

  return (
    <div className="space-y-6 text-[#94a3b8] font-sans antialiased">
      <div className="space-y-2">
        <div className="flex justify-between items-center px-1">
          <h3 className="text-sm font-bold text-white">
            Listado de Productos <span className="text-xs font-normal text-slate-500">(Ordenados por precio de menor a mayor)</span>
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
                  <th className="py-3 px-4 text-right font-medium pr-6">Precio (€) ▲</th>
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
                        <td className="py-3 px-4 font-sans font-medium text-slate-200 flex items-center gap-2">
                          {renderPaisConBandera ? renderPaisConBandera(paisVal) : paisVal}
                        </td>
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
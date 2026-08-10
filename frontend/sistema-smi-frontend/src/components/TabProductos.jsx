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

  // Función auxiliar para extraer el valor numérico del precio para el ordenamiento
  const obtenerPrecioNumerico = (p) => {
    const precioRaw = p.precio ?? p.Precio;
    if (precioRaw === undefined || precioRaw === null || precioRaw === '') return 0;
    if (typeof precioRaw === 'number') return precioRaw;
    const num = Number(String(precioRaw).replace('€', '').trim().replace(',', '.'));
    return isNaN(num) ? 0 : num;
  };

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
  }).sort((a, b) => obtenerPrecioNumerico(a) - obtenerPrecioNumerico(b)); // 👈 Ordenamiento de menor a mayor por precio

  return (
    <div className="space-y-6 text-[#94a3b8] font-sans antialiased">

      {/* 📊 TABLA DE RESULTADOS PRINCIPAL */}
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
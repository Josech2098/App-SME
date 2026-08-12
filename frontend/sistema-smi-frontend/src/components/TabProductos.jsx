import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient.js';
import { renderPaisConBandera } from './banderas.jsx';

// 🧠 Diccionario maestro de correspondencia exacta de categorías para el catálogo cerrado
const categoriaProductoMap = {
  // Bebidas
  'Agua (1,5 litros)': 'Bebidas',
  'Botella de Vino (Calidad media)': 'Bebidas',
  'Cerveza nacional (0,5 litros)': 'Bebidas',
  'La cerveza importada (33 cl)': 'Bebidas',
  // Lácteos
  'Leche (1 litro)': 'Lacteos',
  'Queso fresco (1 kg)': 'Lacteos',
  // Verduras
  'Cebollas (1kg)': 'Verduras',
  'Lechuga (1 unidad)': 'Verduras',
  'Patatas (1 kg)': 'Verduras',
  'Tomates (1 kg)': 'Verduras',
  // Frutas
  'Manzanas (1 kg)': 'Frutas',
  'Naranjas (1 kg)': 'Frutas',
  'Plátanos (1kg)': 'Frutas',
  // Carnes
  'Pechugas de pollo (1 kg)': 'Carnes',
  'Ternera (cadera o similar) (1kg)': 'Carnes',
  // Básicos / Otros
  'Una docena de huevos': 'Basicos',
  'Arroz (1kg)': 'Basicos',
  'Un kilo de pan (1 kg)': 'Basicos'
};

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

  // 🔍 Lógica de Filtrado Directa y Confiable basada en el Diccionario Maestro
  const productosFiltrados = productos.filter((p) => {
    const nombre = p.nombre || p.producto || '';
    
    // 1. Filtro por categoría usando el diccionario exacto
    if (categoria && categoria !== 'Todos') {
      const categoriaAsignada = categoriaProductoMap[nombre];
      const categoriaFiltroStr = String(categoria).toLowerCase();
      
      const coincideDiccionario = categoriaAsignada && categoriaFiltroStr.includes(String(categoriaAsignada).toLowerCase());
      const coincideTextoNombre = nombre.toLowerCase().includes(categoriaFiltroStr);

      if (!coincideDiccionario && !coincideTextoNombre) {
        return false;
      }
    }
    
    // 2. Filtro por subcategoría
    const subcatVal = p.subcategoria_codigo || p.subcategoria || p.subcodigo;
    if (subcategoria && subcategoria !== 'Todos') {
      if (!subcatVal || !String(subcatVal).toLowerCase().includes(String(subcategoria).toLowerCase())) {
        return false;
      }
    }
    
    // 3. Filtro por nombre escrito manualmente
    if (searchNombre && !nombre.toLowerCase().includes(searchNombre.toLowerCase())) return false;
    
    // 4. Filtro por código de categoría
    if (searchCodigo) {
      const categoriaAsignada = categoriaProductoMap[nombre] || '';
      if (!categoriaAsignada.toLowerCase().includes(searchCodigo.toLowerCase()) && !nombre.toLowerCase().includes(searchCodigo.toLowerCase())) {
        return false;
      }
    }
    
    // 5. Filtro por subcódigo
    if (searchSubcodigo && (!subcatVal || !subcatVal.toString().includes(searchSubcodigo))) return false;

    return true;
  }).sort((a, b) => obtenerPrecioNumerico(a) - obtenerPrecioNumerico(b)); // 👈 Ordenamiento de menor a mayor por precio

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
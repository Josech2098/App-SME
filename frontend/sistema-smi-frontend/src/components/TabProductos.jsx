import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient.js';
import { renderPaisConBandera } from './banderas.jsx';

const mapaProductosCategoria = {
  'Agua (1,5 litros)': '2202',
  'Agua (botella de 33 cl)': '2202',
  'Botella de Vino (Calidad media)': '2204',
  'Cerveza nacional (0,5 litros)': '2203',
  'La cerveza importada (33 cl)': '2203',
  'Cerveza importada (botella de 33cl)': '2203',
  'Leche (1 litro)': '0401',
  'Queso fresco (1 kg)': '0406',
  'Una docena de huevos': '0407',
  'Arroz (1kg)': '1006',
  'Un kilo de pan (1 kg)': '1905',
  'Café Cappuccino': '0901',
  'Manzanas (1 kg)': '0808',
  'Naranjas (1 kg)': '0805',
  'Plátanos (1kg)': '0803',
  'Patatas (1 kg)': '0701',
  'Cebollas (1kg)': '0703',
  'Lechuga (1 unidad)': '0705',
  'Tomates (1 kg)': '0701',
  'Pechugas de pollo (1 kg)': '0207',
  'Ternera (cadera o similar) (1kg)': '0201'
};

export default function TablaProductos({
  paisDestino,
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
    cargarDatos();
  }, []);

  async function cargarDatos() {
    setLoading(true);
    const { data, error } = await supabase.from('productos').select('*');
    if (error) console.error('Error cargando productos:', error);
    else setProductos(data || []);
    setLoading(false);
  }

  // Función para normalizar textos: quita tildes, convierte a minúsculas y elimina espacios extra
  const limpiar = (str) => String(str).toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();

  const obtenerPrecioNumerico = (p) => {
    const precioRaw = p.precio ?? p.Precio;
    if (!precioRaw) return 0;
    const num = Number(String(precioRaw).replace('€', '').replace(',', '.').trim());
    return isNaN(num) ? 0 : num;
  };

  const productosFiltrados = productos.filter((p) => {
    const nombre = p.nombre || p.producto || '';
    const pais = p.pais || p.Pais || '';
    const subcatVal = p.subcategoria_codigo || p.subcategoria || p.subcodigo || '';

    // 1. Filtro por país (Nuevo para asegurar precisión)
    if (paisDestino && paisDestino !== 'Todos' && limpiar(pais) !== limpiar(paisDestino)) return false;

    // 2. Filtro por categoría (Flexible mediante inclusión en mapa)
    if (categoria && categoria !== 'Todos') {
      const codigoFiltro = String(categoria).split(' ')[0].trim();
      const claveMapa = Object.keys(mapaProductosCategoria).find(key => limpiar(nombre).includes(limpiar(key)));
      const codigoProducto = claveMapa ? mapaProductosCategoria[claveMapa] : null;

      if (!codigoProducto || codigoProducto !== codigoFiltro) return false;
    }

    // 3. Filtro por subcategoría
    if (subcategoria && subcategoria !== 'Todos' && !limpiar(subcatVal).includes(limpiar(subcategoria))) return false;

    // 4. Filtro por nombre
    if (searchNombre && !limpiar(nombre).includes(limpiar(searchNombre))) return false;

    // 5. Filtro por código manual
    if (searchCodigo) {
      const claveMapa = Object.keys(mapaProductosCategoria).find(key => limpiar(nombre).includes(limpiar(key)));
      const cod = claveMapa ? mapaProductosCategoria[claveMapa] : '';
      if (!cod.includes(searchCodigo) && !limpiar(nombre).includes(limpiar(searchCodigo))) return false;
    }

    // 6. Filtro por subcódigo
    if (searchSubcodigo && !limpiar(subcatVal).includes(limpiar(searchSubcodigo))) return false;

    return true;
  }).sort((a, b) => obtenerPrecioNumerico(a) - obtenerPrecioNumerico(b));

  return (
    <div className="space-y-6 text-[#94a3b8] font-sans">
      <div className="flex justify-between items-center px-1">
        <h3 className="text-sm font-bold text-white">Listado de Productos</h3>
        <span className="text-xs text-slate-400 font-mono">
          Mostrando {productosFiltrados.length} registros
        </span>
      </div>

      <div className="bg-[#121620] border border-[#1e2536] rounded-xl overflow-hidden shadow-sm">
        <div className="max-h-[450px] overflow-y-auto custom-scrollbar">
          <table className="w-full text-left text-xs border-collapse">
            <thead className="sticky top-0 bg-[#161c29] z-10 border-b border-[#1e2536]">
              <tr className="text-slate-400">
                <th className="py-3 px-4 w-20">ID</th>
                <th className="py-3 px-4">País</th>
                <th className="py-3 px-4">Producto</th>
                <th className="py-3 px-4 text-right pr-6">Precio (€)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#182030] text-slate-300">
              {loading ? (
                <tr><td colSpan="4" className="py-6 text-center">Cargando datos...</td></tr>
              ) : productosFiltrados.length > 0 ? (
                productosFiltrados.map((item) => {
                  const id = item.id || item.ID;
                  const isSelected = String(productoSeleccionadoId) === String(id);
                  const precioFmt = obtenerPrecioNumerico(item).toFixed(2) + ' €';

                  return (
                    <tr 
                      key={id} 
                      onClick={() => onSeleccionarProducto && onSeleccionarProducto(item)}
                      className={`cursor-pointer transition-colors ${isSelected ? 'bg-emerald-500/10 border-l-4 border-emerald-400' : 'hover:bg-[#161c29]'}`}
                    >
                      <td className="py-3 px-4 text-slate-400">{id}</td>
                      <td className="py-3 px-4 font-medium text-slate-200">{renderPaisConBandera(item.pais || item.Pais)}</td>
                      <td className="py-3 px-4 text-slate-200">{item.nombre || item.producto}</td>
                      <td className="py-3 px-4 text-right text-emerald-400 font-semibold pr-6">{precioFmt}</td>
                    </tr>
                  );
                })
              ) : (
                <tr><td colSpan="4" className="py-8 text-center">No se encontraron productos con estos filtros.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
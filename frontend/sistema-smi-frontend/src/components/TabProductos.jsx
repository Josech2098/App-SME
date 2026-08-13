import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient.js';
import { renderPaisConBandera } from './banderas.jsx';

// 🗺️ Mapa maestro de correspondencia
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

  // Normalizador para ignorar tildes, mayúsculas y espacios al comparar
  const limpiar = (str) => String(str || '').toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();

  useEffect(() => {
    async function cargarTodosLosDatos() {
      setLoading(true);
      let todosLosRegistros = [];
      let offset = 0;
      const limite = 1000;
      let continuar = true;

      // Carga paginada para saltar el límite de 1000 de Supabase
      while (continuar) {
        const { data, error } = await supabase
          .from('productos')
          .select('*')
          .range(offset, offset + limite - 1);

        if (error) {
          console.error('Error cargando bloque de productos:', error);
          break;
        }

        if (data && data.length > 0) {
          todosLosRegistros = [...todosLosRegistros, ...data];
          offset += limite;
          if (data.length < limite) {
            continuar = false; // Ya no hay más registros que consultar
          }
        } else {
          continuar = false;
        }
      }

      setProductos(todosLosRegistros);
      setLoading(false);
    }

    cargarTodosLosDatos();
  }, []);

  const getProductoId = (p) => p.id ?? p.id_producto ?? p.ID;
  const obtenerPrecioNumerico = (p) => {
    const pr = p.precio ?? p.Precio ?? 0;
    const num = Number(String(pr).replace('€', '').trim().replace(',', '.'));
    return isNaN(num) ? 0 : num;
  };

  const productosFiltrados = productos.filter((p) => {
    const nombre = p.nombre || p.producto || '';
    const pais = p.pais || p.Pais || '';
    const subcatVal = p.subcategoria_codigo || p.subcategoria || p.subcodigo || '';

    // 1. FILTRO PAÍS
    if (paisDestino && paisDestino !== 'Todos' && paisDestino !== '') {
      if (limpiar(pais) !== limpiar(paisDestino)) return false;
    }

    // 2. FILTRO CATEGORÍA
    if (categoria && categoria !== 'Todos') {
      const codFiltro = String(categoria).split(' ')[0].trim();
      const claveEncontrada = Object.keys(mapaProductosCategoria).find(key => limpiar(nombre).includes(limpiar(key)));
      if (!claveEncontrada || mapaProductosCategoria[claveEncontrada] !== codFiltro) return false;
    }

    // 3. OTROS FILTROS
    if (subcategoria && subcategoria !== 'Todos' && !limpiar(subcatVal).includes(limpiar(subcategoria))) return false;
    if (searchNombre && !limpiar(nombre).includes(limpiar(searchNombre))) return false;
    if (searchCodigo && !limpiar(nombre).includes(limpiar(searchCodigo))) return false;
    if (searchSubcodigo && !limpiar(subcatVal).includes(limpiar(searchSubcodigo))) return false;

    return true;
  }).sort((a, b) => obtenerPrecioNumerico(a) - obtenerPrecioNumerico(b));

  return (
    <div className="space-y-6 text-[#94a3b8] font-sans antialiased">
      <div className="flex justify-between items-center px-1">
        <h3 className="text-sm font-bold text-white">Listado de Productos</h3>
        <span className="text-xs text-slate-400">Mostrando {productosFiltrados.length} registros (Total cargados: {productos.length})</span>
      </div>

      <div className="bg-[#121620] border border-[#1e2536] rounded-xl overflow-hidden shadow-sm">
        <div className="max-h-[450px] overflow-y-auto custom-scrollbar">
          <table className="w-full text-left text-xs border-collapse">
            <thead className="sticky top-0 bg-[#161c29] z-10 border-b border-[#1e2536]">
              <tr className="text-slate-400">
                <th className="py-3 px-4">ID</th>
                <th className="py-3 px-4">País</th>
                <th className="py-3 px-4">Producto</th>
                <th className="py-3 px-4 text-right pr-6">Precio</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#182030] text-slate-300">
              {loading ? <tr><td colSpan="4" className="py-8 text-center">Cargando todos los registros...</td></tr> : 
               productosFiltrados.map((item) => (
                <tr key={getProductoId(item)} onClick={() => onSeleccionarProducto?.(item)}
                    className={`cursor-pointer hover:bg-[#161c29] ${String(productoSeleccionadoId) === String(getProductoId(item)) ? 'bg-emerald-500/10' : ''}`}>
                  <td className="py-3 px-4">{getProductoId(item)}</td>
                  <td className="py-3 px-4 font-medium">{renderPaisConBandera?.(item.pais || item.Pais) || (item.pais || item.Pais)}</td>
                  <td className="py-3 px-4">{item.nombre || item.producto}</td>
                  <td className="py-3 px-4 text-right text-emerald-400 font-semibold pr-6">{obtenerPrecioNumerico(item).toFixed(2)} €</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
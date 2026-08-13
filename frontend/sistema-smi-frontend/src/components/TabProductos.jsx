import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient.js';
import { renderPaisConBandera } from './banderas.jsx';

// 🗺️ Mapa maestro de correspondencia exacta entre el nombre del producto y su código arancelario de categoría
const mapaProductosCategoria = {
  // Bebidas (2202, 2204, 2203)
  'Agua (1,5 litros)': '2202',
  'Agua (botella de 33 cl)': '2202',
  'Botella de Vino (Calidad media)': '2204',
  'Cerveza nacional (0,5 litros)': '2203',
  'La cerveza importada (33 cl)': '2203',
  'Cerveza importada (botella de 33cl)': '2203',

  // Lácteos y Quesos (0401, 0406)
  'Leche (1 litro)': '0401',
  'Queso fresco (1 kg)': '0406',

  // Huevos y Básicos (0407, 1006, 1905, 0901)
  'Una docena de huevos': '0407',
  'Arroz (1kg)': '1006',
  'Un kilo de pan (1 kg)': '1905',
  'Café Cappuccino': '0901',

  // Frutas (0808, 0805, 0803)
  'Manzanas (1 kg)': '0808',
  'Naranjas (1 kg)': '0805',
  'Plátanos (1kg)': '0803',

  // Verduras (0701, 0703, 0705)
  'Patatas (1 kg)': '0701',
  'Cebollas (1kg)': '0703',
  'Lechuga (1 unidad)': '0705',
  'Tomates (1 kg)': '0701',

  // Carnes (0207, 0201)
  'Pechugas de pollo (1 kg)': '0207',
  'Ternera (cadera o similar) (1kg)': '0201'
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

    // 🔍 Se amplía el rango a 4999 para evitar el límite predeterminado de 1000 filas de Supabase
    const { data: dataProductos, error } = await supabase
      .from('productos')
      .select('*')
      .range(0, 4999);

    if (error) {
      console.error('Error cargando productos:', error);
    } else if (dataProductos) {
      setProductos(dataProductos);
    }

    setLoading(false);
  }

  const getProductoId = (p) => p.id ?? p.id_producto ?? p.ID;

  // Función para normalizar textos: quita tildes, pasa a minúsculas y elimina espacios sobrantes
  const limpiar = (str) => String(str || '').toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();

  // Función auxiliar para extraer el valor numérico del precio para el ordenamiento
  const obtenerPrecioNumerico = (p) => {
    const precioRaw = p.precio ?? p.Precio;
    if (precioRaw === undefined || precioRaw === null || precioRaw === '') return 0;
    if (typeof precioRaw === 'number') return precioRaw;
    const num = Number(String(precioRaw).replace('€', '').trim().replace(',', '.'));
    return isNaN(num) ? 0 : num;
  };

  // 🔍 Lógica de Filtrado Robusta (Con tolerancia a tildes, mayúsculas y filtrado por país)
  const productosFiltrados = productos.filter((p) => {
    const nombre = p.nombre || p.producto || '';
    const pais = p.pais || p.Pais || '';

    // 1. Filtro por país (Tolerante a diferencias tipográficas)
    if (paisDestino && paisDestino !== 'Todos' && paisDestino !== '') {
      if (limpiar(pais) !== limpiar(paisDestino)) {
        return false;
      }
    }
    
    // 2. Filtro por categoría utilizando el código arancelario de forma flexible
    if (categoria && categoria !== 'Todos') {
      const codigoCategoriaFiltro = String(categoria).split(' ')[0].trim();
      const claveMapa = Object.keys(mapaProductosCategoria).find(key => limpiar(nombre).includes(limpiar(key)));
      const codigoAsignadoAlProducto = claveMapa ? mapaProductosCategoria[claveMapa] : null;

      if (!codigoAsignadoAlProducto || codigoAsignadoAlProducto !== codigoCategoriaFiltro) {
        return false;
      }
    }
    
    // 3. Filtro por subcategoría
    const subcatVal = p.subcategoria_codigo || p.subcategoria || p.subcodigo || '';
    if (subcategoria && subcategoria !== 'Todos') {
      if (!limpiar(subcatVal).includes(limpiar(subcategoria))) {
        return false;
      }
    }
    
    // 4. Filtro por nombre escrito manualmente
    if (searchNombre && !limpiar(nombre).includes(limpiar(searchNombre))) return false;
    
    // 5. Filtro por código de categoría manual
    if (searchCodigo) {
      const claveMapa = Object.keys(mapaProductosCategoria).find(key => limpiar(nombre).includes(limpiar(key)));
      const codigoAsignadoAlProducto = claveMapa ? mapaProductosCategoria[claveMapa] : '';
      if (!codigoAsignadoAlProducto.includes(searchCodigo) && !limpiar(nombre).includes(limpiar(searchCodigo))) {
        return false;
      }
    }
    
    // 6. Filtro por subcódigo
    if (searchSubcodigo && (!subcatVal || !limpiar(subcatVal).includes(limpiar(searchSubcodigo)))) return false;

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
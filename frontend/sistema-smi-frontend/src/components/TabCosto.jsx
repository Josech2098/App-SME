import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { supabase } from '../supabaseClient.js';
import { renderPaisConBandera } from './banderas.jsx'; 

// --- Helper: Cálculo de distancia geográfica mediante Haversine ---
function calcularDistanciaKm(lat1, lon1, lat2, lon2) {
  if (!lat1 || !lon1 || !lat2 || !lon2) return 0;
  
  const parseCoord = (val) => parseFloat(String(val).replace(',', '.'));
  
  const l1 = parseCoord(lat1);
  const ln1 = parseCoord(lon1);
  const l2 = parseCoord(lat2);
  const ln2 = parseCoord(lon2);

  if (isNaN(l1) || isNaN(ln1) || isNaN(l2) || isNaN(ln2)) return 0;

  const R = 6371; // Radio de la Tierra en km
  const dLat = (l2 - l1) * (Math.PI / 180);
  const dLon = (ln2 - ln1) * (Math.PI / 180);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(l1 * (Math.PI / 180)) *
    Math.cos(l2 * (Math.PI / 180)) *
    Math.sin(dLon / 2) *
    Math.sin(dLon / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

// --- Helper: Limpiar el formato del precio (ej. "8,97 €" -> 8.97) ---
function limpiarPrecio(val) {
  if (val === null || val === undefined) return 0;
  if (typeof val === 'number') return val > 0 ? val : 0;
  
  const str = String(val).trim();
  if (str.toLowerCase().includes('no encontrado') || str === '' || str === '0' || str === '$0.00') return 0;

  const limpio = str.replace(/[^\d,.-]/g, '').replace(',', '.');
  const numero = parseFloat(limpio);
  return isNaN(numero) || numero <= 0 ? 0 : numero;
}

// --- Helper: Normalizar texto (quitar tildes, minúsculas, códigos numéricos) ---
function normalizarTexto(texto) {
  if (!texto) return '';
  return String(texto)
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/^\d+[\s-]*/, '')
    .trim();
}

// --- Componente Principal ---

export default function TabCosto({ productoActivo, categoria, subcategoria, busqueda, paisOrigen, onDatosActualizados }) {
  const [paisBase, setPaisBase] = useState(paisOrigen || 'España');
  const [datosProductos, setDatosProductos] = useState([]);
  const [listaPaises, setListaPaises] = useState([]);
  const [loading, setLoading] = useState(true);
  const [errorLog, setErrorLog] = useState(null);

  // Referencia para evitar bucles infinitos con onDatosActualizados
  const prevDatosRef = useRef('');

  useEffect(() => {
    if (paisOrigen) setPaisBase(paisOrigen);
  }, [paisOrigen]);

  useEffect(() => {
    async function fetchPaises() {
      const { data } = await supabase.from('paises').select('*').order('nombre');
      if (data) setListaPaises(data);
    }
    fetchPaises();
  }, []);

  const cargarYCalcularMatriz = useCallback(async () => {
    setLoading(true);
    setErrorLog(null);

    try {
      const { data: dbPaises, error: errPaises } = await supabase.from('paises').select('*').order('nombre');
      if (errPaises) throw errPaises;
      if (!dbPaises || dbPaises.length === 0) {
        setDatosProductos([]);
        setLoading(false);
        return;
      }

      const { data: dbCostoImportacion, error: errCIC } = await supabase.from('costo_importacion').select('*');
      if (errCIC) console.warn("Aviso en CIC:", errCIC);

      const { data: dbProds, error: errProds } = await supabase.from('productos').select('*');
      if (errProds) throw errProds;

      const { data: categoriasKeywords, error: errCategorias } = await supabase
        .from('productos_categoria')
        .select('*');

      if (errCategorias) throw errCategorias;

      const palabrasCategoria =
        categoria && categoria !== 'Todos'
          ? (categoriasKeywords || [])
              .filter(k => String(k.categoria_codigo) === String(categoria))
              .map(k => String(k.palabra_clave || '').toLowerCase())
          : [];

      const palabrasSubcategoria =
        subcategoria && subcategoria !== 'Todos'
          ? (categoriasKeywords || [])
              .filter(k => String(k.subcategoria_codigo) === String(subcategoria))
              .map(k => String(k.palabra_clave || '').toLowerCase())
          : [];

      let nombreProductoBuscado = '';
      if (typeof productoActivo === 'string') {
        nombreProductoBuscado = productoActivo;
      } else if (productoActivo && typeof productoActivo === 'object') {
        nombreProductoBuscado = productoActivo.nombre ?? productoActivo.producto ?? productoActivo.titulo ?? '';
      }
      if (!nombreProductoBuscado) {
        nombreProductoBuscado = busqueda ?? '';
      }

      let mapaPreciosTemp = {}; 

      if (dbProds) {
        dbProds.forEach(item => {
          const nombreProd = (
            item.producto ||
            item.nombre ||
            item.titulo ||
            item.descripcion ||
            ''
          ).toLowerCase();

          const coincideCategoria =
            categoria === 'Todos' ||
            palabrasCategoria.length === 0 ||
            palabrasCategoria.some(p => nombreProd.includes(p));

          const coincideSubcategoria =
            subcategoria === 'Todos' ||
            palabrasSubcategoria.length === 0 ||
            palabrasSubcategoria.some(p => nombreProd.includes(p));

          const cumpleFiltroBusqueda = !nombreProductoBuscado || normalizarTexto(nombreProd).includes(normalizarTexto(nombreProductoBuscado));

          if (
            coincideCategoria &&
            coincideSubcategoria &&
            cumpleFiltroBusqueda
          ) {
            const paisItem = item.pais || item.Pais || item.country;

            if (paisItem) {
              const nombrePaisKey = String(paisItem).trim().toLowerCase();
              const precioRaw = item.precio ?? item.price ?? item.costo;
              const precioLim = limpiarPrecio(precioRaw);
              
              if (precioLim > 0) {
                if (!mapaPreciosTemp[nombrePaisKey]) {
                  mapaPreciosTemp[nombrePaisKey] = [];
                }
                mapaPreciosTemp[nombrePaisKey].push(precioLim);
              }
            }
          }
        });
      }

      let mapaPreciosPorPais = {};
      Object.keys(mapaPreciosTemp).forEach(pais => {
        const precios = mapaPreciosTemp[pais];
        const promedio = precios.reduce((acc, curr) => acc + curr, 0) / precios.length;
        mapaPreciosPorPais[pais] = promedio;
      });

      const objetoPaisBase = dbPaises.find(
        (p) => p.nombre.trim().toLowerCase() === paisBase.trim().toLowerCase()
      ) || dbPaises[0];

      const latBase = objetoPaisBase?.latitud;
      const lonBase = objetoPaisBase?.longitud;

      const datosConsolidados = dbPaises
        .map((p) => {
          const nombreKey = p.nombre.trim().toLowerCase();
          const ppdVal = mapaPreciosPorPais[nombreKey] !== undefined ? mapaPreciosPorPais[nombreKey] : 0;

          const cicMatch = (dbCostoImportacion || []).find(
            (c) => String(c.pais || c.pais_nombre || '').trim().toLowerCase() === nombreKey
          );
          
          let cicVal = cicMatch ? Number(cicMatch.valor ?? cicMatch.cic ?? 0) : 0;
          if (isNaN(cicVal)) cicVal = 0;

          const distKm = calcularDistanciaKm(latBase, lonBase, p.latitud, p.longitud);
          const ctiVal = distKm > 0 ? Number((distKm * 0.38).toFixed(2)) : 0;

          return {
            id: p.id,
            pais_nombre: p.nombre,
            latitud: p.latitud,
            longitud: p.longitud,
            ppd: ppdVal,
            cti: ctiVal,
            cic: cicVal
          };
        });

      setDatosProductos(datosConsolidados);
    } catch (err) {
      console.error("❌ Error al consolidar costos:", err);
      setErrorLog(err.message || "Error al conectar con Supabase");
    } finally {
      setLoading(false);
    }
  }, [productoActivo, categoria, subcategoria, busqueda, paisBase]);

  useEffect(() => {
    cargarYCalcularMatriz();
  }, [cargarYCalcularMatriz]);

  const PESO_FACTOR_COSTO = 0.215;
  const PESO_PPD = 0.44;
  const PESO_CTI = 0.34;
  const PESO_CIC = 0.22;
  const PUNTAJE_MAXIMO = 10;

  const { maxPpd, minCti, minCic } = useMemo(() => {
    const ppdVals = datosProductos.map(d => d.ppd).filter(v => v !== null && v !== undefined && v > 0);
    const ctiVals = datosProductos.map(d => d.cti).filter(v => v !== null && v !== undefined && v > 0);
    const cicValsValidos = datosProductos.map(d => d.cic).filter(v => v !== null && v !== undefined);

    return {
      maxPpd: ppdVals.length > 0 ? Math.max(...ppdVals) : null,
      minCti: ctiVals.length > 0 ? Math.min(...ctiVals) : null,
      minCic: cicValsValidos.length > 0 ? Math.min(...cicValsValidos) : 0
    };
  }, [datosProductos]);

  const calcularNormalizadoDirecto = (val, maxVal) => {
    if (val === null || val === undefined || val <= 0 || !maxVal) return null;
    const resultado = (PUNTAJE_MAXIMO * val) / maxVal;
    return Number(resultado.toFixed(2));
  };

  const calcularNormalizadoInverso = (val, minVal) => {
    if (val === null || val === undefined) return null;
    if (val === 0) return PUNTAJE_MAXIMO;
    if (minVal === null || minVal <= 0) {
      const valoresValidos = datosProductos.map(d => d.cic).filter(v => v > 0);
      minVal = valoresValidos.length > 0 ? Math.min(...valoresValidos) : val;
    }
    const resultado = (PUNTAJE_MAXIMO * minVal) / val;
    return Number(resultado.toFixed(2));
  };

  const matrizCalculadaCompleta = useMemo(() => {
    const calculada = datosProductos.map(row => {
      const valPpd = row.ppd ?? row.PPD ?? 0;
      const valCti = row.cti ?? row.CTI ?? row.transport_cost ?? 0; 
      const valCic = row.cic ?? row.CIC ?? row.cumplimiento ?? 0;

      const ppdNorm = calcularNormalizadoDirecto(valPpd, maxPpd);
      const ctiNorm = calcularNormalizadoInverso(valCti, minCti);
      const cicNorm = calcularNormalizadoInverso(valCic, minCic);

      const p1 = ppdNorm ?? 0;
      const p2 = ctiNorm ?? 0;
      const p3 = cicNorm ?? 0;

      const aporteFactorCosto = Number((((PESO_PPD * p1) + (PESO_CTI * p2) + (PESO_CIC * p3)) * PESO_FACTOR_COSTO).toFixed(2));
      const faltantes = [ppdNorm, ctiNorm, cicNorm].filter(v => v === null).length;
      const noTieneDatos = valPpd === 0;

      return {
        ...row,
        ppdNorm,
        ctiNorm,
        cicNorm,
        aporteFactorCosto,
        __faltantes: faltantes,
        __noTieneDatos: noTieneDatos
      };
    });

    calculada.sort((a, b) => {
      if (a.__noTieneDatos !== b.__noTieneDatos) {
        return a.__noTieneDatos ? 1 : -1;
      }
      if (a.__faltantes !== b.__faltantes) {
        return a.__faltantes - b.__faltantes;
      }
      return b.aporteFactorCosto - a.aporteFactorCosto; 
    });

    return calculada;
  }, [datosProductos, maxPpd, minCti, minCic]);

  const matrizFiltrada = matrizCalculadaCompleta;

  useEffect(() => {
    if (onDatosActualizados && matrizCalculadaCompleta.length > 0) {
      const datosString = JSON.stringify(matrizCalculadaCompleta);
      if (datosString !== prevDatosRef.current) {
        prevDatosRef.current = datosString;
        onDatosActualizados(matrizCalculadaCompleta);
      }
    }
  }, [matrizCalculadaCompleta, onDatosActualizados]);

  const extraerNombreLegible = (val) => {
    if (!val) return '';
    if (typeof val === 'string') return val;
    if (typeof val === 'object') return val.nombre ?? val.label ?? val.categoria ?? val.subcategoria ?? val.codigo ?? '';
    return String(val);
  };

  const nombreProductoMostrado = 
    extraerNombreLegible(productoActivo) || 
    busqueda || 
    (categoria && extraerNombreLegible(categoria) !== 'Todos' ? `Categoría: ${extraerNombreLegible(categoria)}` : 'Todos los productos');

  // --- REEMPLAZO EN LA TABLA ---
  // AQUI DEBES BUSCAR DONDE USAS {row.pais_nombre} EN TU RENDERIZADO Y CAMBIARLO POR:
  // {renderPaisConBandera(row.pais_nombre)}

  return (
    <div className="space-y-6 text-[#94a3b8] font-sans antialiased">
      
      {/* Selector de país base y descripción */}
      <div className="bg-[#121620] border border-[#1e2536] rounded-xl p-4 space-y-3">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-3">
          <div>
            <h2 className="text-sm font-bold text-white tracking-wide uppercase">
              1. Costo (COSTO) — Estandarización de Criterios
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Ponderación del Factor: <span className="text-emerald-400 font-bold">21.50%</span> | Filtro Activo: <strong className="text-sky-400">{nombreProductoMostrado}</strong>
            </p>
          </div>
        </div>

        <div className="pt-2">
          <label className="block text-xs font-bold text-slate-300 mb-1.5 uppercase">
            Selecciona el país base (Origen para transporte CTI)
          </label>
          <div className="relative">
            <select
              value={paisBase}
              onChange={(e) => setPaisBase(e.target.value)}
              className="w-full bg-[#0b0e14] border border-[#1e2536] rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-slate-500 appearance-none cursor-pointer"
            >
              {listaPaises.map((p) => (
                <option key={p.id || p.nombre} value={p.nombre}>{p.nombre}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* TABLA PRINCIPAL */}
      <div className="overflow-x-auto border border-[#1e2536] rounded-xl bg-[#0b0e14]">
        <table className="w-full text-xs text-left">
          <thead className="bg-[#121620] text-slate-300">
            <tr>
              <th className="px-4 py-3 uppercase">País</th>
              <th className="px-4 py-3 uppercase text-center">PPD</th>
              <th className="px-4 py-3 uppercase text-center">CTI</th>
              <th className="px-4 py-3 uppercase text-center">CIC</th>
              <th className="px-4 py-3 uppercase text-center">Aporte Final</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#1e2536]">
            {matrizFiltrada.map((row) => (
              <tr key={row.id} className="hover:bg-[#161c28]">
                <td className="px-4 py-3 text-white font-medium">
                  {renderPaisConBandera(row.pais_nombre)}
                </td>
                <td className="px-4 py-3 text-center text-slate-400">{row.ppd?.toFixed(2) || '0.00'}</td>
                <td className="px-4 py-3 text-center text-slate-400">{row.cti?.toFixed(2) || '0.00'}</td>
                <td className="px-4 py-3 text-center text-slate-400">{row.cic?.toFixed(2) || '0.00'}</td>
                <td className="px-4 py-3 text-center font-bold text-emerald-400">{row.aporteFactorCosto}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Aquí continúa el resto de tu estructura original hasta la línea 484 */}
      
    </div>
  );
}
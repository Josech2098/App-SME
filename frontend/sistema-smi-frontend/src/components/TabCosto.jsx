import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { supabase } from '../supabaseClient.js';
import { renderPaisConBandera } from './banderas.jsx'; // 👈 Importación de banderas

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
  
  const [filaSeleccionada, setFilaSeleccionada] = useState(null);
  const prevDatosRef = useRef('');

  useEffect(() => {
    if (paisOrigen) {
      setPaisBase(paisOrigen);
    }
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

      // 🔹 Consultar la tabla puertos para obtener latitud y longitud marítima real
      const { data: dbPuertos, error: errPuertos } = await supabase.from('puertos').select('*');
      if (errPuertos) console.warn("Aviso en Puertos:", errPuertos);

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

      // 🔹 Buscar el puerto principal (o el primero disponible) del país base de origen
      const puertoBaseObj = (dbPuertos || []).find(
        (p) => String(p.pais).trim().toLowerCase() === paisBase.trim().toLowerCase()
      ) || (dbPuertos || [])[0];

      const latBase = puertoBaseObj?.latitud;
      const lonBase = puertoBaseObj?.longitud;

      const datosConsolidados = dbPaises
        .map((p) => {
          const nombreKey = p.nombre.trim().toLowerCase();
          // Si no hay precio registrado, asignar null en lugar de 0 para evitar falsos positivos
          const ppdVal = mapaPreciosPorPais[nombreKey] !== undefined ? mapaPreciosPorPais[nombreKey] : null;

          const cicMatch = (dbCostoImportacion || []).find(
            (c) => String(c.pais || c.pais_nombre || '').trim().toLowerCase() === nombreKey
          );
          
          let cicVal = cicMatch ? Number(cicMatch.valor ?? cicMatch.cic ?? 0) : null;
          if (cicVal !== null && isNaN(cicVal)) cicVal = null;

          // 🔹 Buscar el puerto correspondiente al país de destino actual en el bucle
          const puertoDestinoObj = (dbPuertos || []).find(
            (pt) => String(pt.pais).trim().toLowerCase() === nombreKey
          );

          let ctiVal = null;
          if (latBase && lonBase && puertoDestinoObj?.latitud && puertoDestinoObj?.longitud) {
            const distKm = calcularDistanciaKm(latBase, lonBase, puertoDestinoObj.latitud, puertoDestinoObj.longitud);
            const distanciaMaritima = distKm * 1.6;
            ctiVal = distanciaMaritima > 0 ? Number((distanciaMaritima * 0.38).toFixed(2)) : null;
          }

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
    const cicValsValidos = datosProductos.map(d => d.cic).filter(v => v !== null && v !== undefined && v > 0);

    return {
      maxPpd: ppdVals.length > 0 ? Math.max(...ppdVals) : null,
      minCti: ctiVals.length > 0 ? Math.min(...ctiVals) : null,
      minCic: cicValsValidos.length > 0 ? Math.min(...cicValsValidos) : null
    };
  }, [datosProductos]);

  const calcularNormalizadoDirecto = (val, maxVal) => {
    if (val === null || val === undefined || val <= 0 || !maxVal) return null;
    const resultado = (PUNTAJE_MAXIMO * val) / maxVal;
    return Number(resultado.toFixed(2));
  };

  const calcularNormalizadoInverso = (val, minVal) => {
    if (val === null || val === undefined || val <= 0 || !minVal || minVal <= 0) return null;
    const resultado = (PUNTAJE_MAXIMO * minVal) / val;
    return Number(resultado.toFixed(2));
  };

  const matrizCalculadaCompleta = useMemo(() => {
    const calculada = datosProductos.map(row => {
      const valPpd = row.ppd ?? null;
      const valCti = row.cti ?? null; 
      const valCic = row.cic ?? null;

      const ppdNorm = calcularNormalizadoDirecto(valPpd, maxPpd);
      const ctiNorm = calcularNormalizadoInverso(valCti, minCti);
      const cicNorm = calcularNormalizadoInverso(valCic, minCic);

      // Si alguna métrica clave es null, determinamos que tiene datos incompletos
      const tieneNulos = ppdNorm === null || ctiNorm === null || cicNorm === null;

      const p1 = ppdNorm ?? 0;
      const p2 = ctiNorm ?? 0;
      const p3 = cicNorm ?? 0;

      const aporteFactorCosto = tieneNulos ? 0 : Number((((PESO_PPD * p1) + (PESO_CTI * p2) + (PESO_CIC * p3)) * PESO_FACTOR_COSTO).toFixed(2));
      const faltantes = [ppdNorm, ctiNorm, cicNorm].filter(v => v === null).length;

      return {
        ...row,
        ppdNorm,
        ctiNorm,
        cicNorm,
        aporteFactorCosto,
        __faltantes: faltantes,
        __tieneNulos: tieneNulos
      };
    });

    // 🔹 Ordenamiento estricto: Primero los que NO tienen nulos y mayor puntaje
    calculada.sort((a, b) => {
      if (a.__tieneNulos !== b.__tieneNulos) {
        return a.__tieneNulos ? 1 : -1; // Los que tienen nulos van al final
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

  return (
    <div className="space-y-6 text-[#94a3b8] font-sans antialiased">
      
      {/* SELECTOR DE PAÍS BASE Y DESCRIPCIÓN */}
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
                <option key={p.id || p.nombre} value={p.nombre}>
                  {p.nombre}
                </option>
              ))}
            </select>
            <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-slate-400 text-xs">
              ▼
            </div>
          </div>
        </div>
      </div>

      {errorLog && (
        <div className="bg-red-500/10 border border-red-500 text-red-400 p-3 rounded-lg text-xs">
          ⚠️ <strong>Error BD:</strong> {errorLog}
        </div>
      )}

      {/* 2. TABLA DE COSTOS BASE */}
      <div className="space-y-2">
        <div className="flex justify-between items-center px-1">
          <h3 className="text-sm font-bold text-white">
            Listado de Costos Base <span className="text-xs font-normal text-slate-500">(Haz clic en una fila para seleccionarla)</span>
          </h3>
          <span className="text-xs text-slate-400 font-mono">
            Mostrando <strong className="text-slate-200">{matrizFiltrada.length}</strong> registros
          </span>
        </div>

        <div className="bg-[#121620] border border-[#1e2536] rounded-xl overflow-hidden shadow-sm">
          <div className="max-h-[450px] overflow-y-auto custom-scrollbar">
            <table className="w-full text-left text-xs border-collapse">
              <thead className="sticky top-0 bg-[#161c29] z-10 border-b border-[#1e2536]">
                <tr className="text-slate-400">
                  <th className="py-3 px-4 w-20 font-medium">ID</th>
                  <th className="py-3 px-4 font-medium">País</th>
                  <th className="py-3 px-4 text-right font-medium">Precio (PPD)</th>
                  <th className="py-3 px-4 text-right font-medium">Transporte (CTI)</th>
                  <th className="py-3 px-4 text-right font-medium pr-6">Cumplimiento (CIC)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#182030] font-mono text-slate-300">
                {loading ? (
                  <tr>
                    <td colSpan="5" className="py-6 text-center text-slate-500 font-sans">Cargando datos...</td>
                  </tr>
                ) : matrizFiltrada.length > 0 ? (
                  matrizFiltrada.map((row) => (
                    <tr 
                      key={row.id} 
                      onClick={() => setFilaSeleccionada(row.id)}
                      className={`cursor-pointer transition-colors ${filaSeleccionada === row.id ? 'bg-[#1e293b]' : 'hover:bg-[#161c29]/50'}`}
                    >
                      <td className="py-3 px-4 text-slate-400">{row.id}</td>
                      <td className="py-3 px-4 font-sans font-medium text-slate-200 flex items-center gap-2">
                        {renderPaisConBandera ? renderPaisConBandera(row.pais_nombre) : row.pais_nombre}
                      </td>
                      <td className="py-3 px-4 text-right text-emerald-400 font-semibold">{row.ppd !== null && row.ppd > 0 ? `$${row.ppd.toFixed(2)}` : 'Sin datos'}</td>
                      <td className="py-3 px-4 text-right">{row.cti !== null ? `$${row.cti.toFixed(2)}` : 'Sin datos'}</td>
                      <td className="py-3 px-4 text-right pr-6">
                        {row.cic !== null ? `$${row.cic.toFixed(2)}` : 'Sin datos'}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="5" className="py-8 text-center text-slate-500 font-sans">No hay registros disponibles.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* 3. TABLA DE NORMALIZACIÓN Y PONDERACIÓN FINAL */}
      <div className="space-y-2 pt-2">
        <div className="flex justify-between items-center px-1">
          <h3 className="text-sm font-bold text-white">
            Normalización y Ponderación Final (Factor Costo)
          </h3>
        </div>

        <div className="bg-[#121620] border border-[#1e2536] rounded-xl overflow-hidden shadow-sm">
          <div className="max-h-[450px] overflow-y-auto custom-scrollbar">
            <table className="w-full text-left text-xs border-collapse">
              <thead className="sticky top-0 bg-[#161c29] z-10 border-b border-[#1e2536]">
                <tr className="text-slate-400">
                  <th className="py-3 px-4 w-20 font-medium">ID</th>
                  <th className="py-3 px-4 font-medium">País</th>
                  <th className="py-3 px-4 text-right font-medium">PPD Norm (44%)</th>
                  <th className="py-3 px-4 text-right font-medium">CTI Norm (34%)</th>
                  <th className="py-3 px-4 text-right font-medium">CIC Norm (22%)</th>
                  <th className="py-3 px-4 text-right font-bold text-emerald-400 pr-6">Total Factor (21.5%)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#182030] font-mono text-slate-300">
                {loading ? (
                  <tr>
                    <td colSpan="6" className="py-6 text-center text-slate-500 font-sans">Calculando...</td>
                  </tr>
                ) : matrizFiltrada.length > 0 ? (
                  matrizFiltrada.map((row) => (
                    <tr 
                      key={row.id} 
                      onClick={() => setFilaSeleccionada(row.id)}
                      className={`cursor-pointer transition-colors ${filaSeleccionada === row.id ? 'bg-[#1e293b]' : 'hover:bg-[#161c29]/50'}`}
                    >
                      <td className="py-3 px-4 text-slate-400">{row.id}</td>
                      <td className="py-3 px-4 font-sans font-medium text-slate-200 flex items-center gap-2">
                        {renderPaisConBandera ? renderPaisConBandera(row.pais_nombre) : row.pais_nombre}
                      </td>
                      <td className="py-3 px-4 text-right">{row.ppdNorm !== null ? row.ppdNorm : 'Sin datos'}</td>
                      <td className="py-3 px-4 text-right">{row.ctiNorm !== null ? row.ctiNorm : '-'}</td>
                      <td className="py-3 px-4 text-right">{row.cicNorm !== null ? row.cicNorm : '-'}</td>
                      <td className="py-3 px-4 text-right pr-6 font-bold text-emerald-400">{row.__tieneNulos ? '-' : row.aporteFactorCosto}</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="6" className="py-8 text-center text-slate-500 font-sans">No hay datos normalizados disponibles.</td>
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
import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../supabaseClient.js';

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
    .replace(/[\u0300-\u036f]/g, '') // Quitar tildes
    .replace(/^\d+[\s-]*/, '')        // Quitar códigos iniciales (ej: "0406 - ")
    .trim();
}

// --- Helper Inteligente: Coincidencia Semántica y de Plurales ---
function isMatch(textoProducto, filtro) {
  if (!filtro) return true;
  
  let filtroStr = '';
  if (typeof filtro === 'string') {
    filtroStr = filtro;
  } else if (typeof filtro === 'object' && filtro !== null) {
    filtroStr = filtro.nombre ?? filtro.label ?? filtro.categoria ?? filtro.subcategoria ?? filtro.codigo ?? '';
  }

  const fNorm = normalizarTexto(filtroStr);
  const pNorm = normalizarTexto(textoProducto);

  if (!fNorm || fNorm === 'todos' || fNorm === 'todas') return true;
  if (pNorm.includes(fNorm) || fNorm.includes(pNorm)) return true;

  // Manejo de plurales básicos
  const fSingular = fNorm.endsWith('es') ? fNorm.slice(0, -2) : fNorm.endsWith('s') ? fNorm.slice(0, -1) : fNorm;
  const pSingular = pNorm.endsWith('es') ? pNorm.slice(0, -2) : pNorm.endsWith('s') ? pNorm.slice(0, -1) : pNorm;

  if (pNorm.includes(fSingular) || fSingular.includes(pSingular)) return true;

  // Agrupaciones semánticas comunes
  const semántica = {
    'lacteos': ['leche', 'queso', 'mantequilla', 'yogur', 'crema', 'suero'],
    'bebidas': ['vino', 'cerveza', 'jugo', 'agua', 'refresco', 'ron', 'licor', 'whisky'],
    'alcohol': ['vino', 'cerveza', 'ron', 'licor', 'whisky', 'vodka', 'tequila'],
    'carnes': ['carne', 'pollo', 'res', 'cerdo', 'jamon', 'salchicha', 'embutido'],
    'granos': ['arroz', 'frijol', 'lenteja', 'maiz', 'garbanzo']
  };

  for (const [clave, sinonimos] of Object.entries(semántica)) {
    if (fNorm.includes(clave)) {
      if (sinonimos.some(s => pNorm.includes(s))) return true;
    }
  }

  const palabrasFiltro = fNorm.split(/\s+/).filter(w => w.length > 3);
  if (palabrasFiltro.length > 0) {
    return palabrasFiltro.some(palabra => pNorm.includes(palabra));
  }

  return false;
}

export default function TabCosto({ productoActivo, categoria, subcategoria, busqueda, paisOrigen, onDatosActualizados }) {
  const [paisBase, setPaisBase] = useState(paisOrigen || 'España');
  const [datosProductos, setDatosProductos] = useState([]);
  const [listaPaises, setListaPaises] = useState([]);
  const [loading, setLoading] = useState(true);
  const [errorLog, setErrorLog] = useState(null);

  const [activeAccordion, setActiveAccordion] = useState(null);

  // Estados Formulario Añadir
  const [nuevoPaisNombre, setNuevoPaisNombre] = useState('');
  const [nuevaLatitud, setNuevaLatitud] = useState('');
  const [nuevaLongitud, setNuevaLongitud] = useState('');
  const [nuevoCic, setNuevoCic] = useState('');

  // Estados Formulario Editar
  const [selectedPaisId, setSelectedPaisId] = useState('');
  const [editLatitud, setEditLatitud] = useState('');
  const [editLongitud, setEditLongitud] = useState('');
  const [editCic, setEditCic] = useState('');

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

  // Función principal para cargar datos y calcular la matriz
  async function cargarYCalcularMatriz() {
    setLoading(true);
    setErrorLog(null);

    try {
      // 1. Obtener países
      const { data: dbPaises, error: errPaises } = await supabase.from('paises').select('*').order('nombre');
      if (errPaises) throw errPaises;
      if (!dbPaises || dbPaises.length === 0) {
        setDatosProductos([]);
        setLoading(false);
        return;
      }

      // 2. Obtener costos de importación (CIC)
      const { data: dbCostoImportacion, error: errCIC } = await supabase.from('costo_importacion').select('*');
      if (errCIC) console.warn("Aviso en CIC:", errCIC);

      // 3. Obtener registros de la tabla 'productos'
      const { data: dbProds, error: errProds } = await supabase.from('productos').select('*');
      if (errProds) throw errProds;

      // Extraer nombre del producto activo
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
          const nombreProd = item.producto || item.nombre || item.titulo || item.descripcion || '';
          
          const categoriaProd = item.categoria || item.category || item.codigo_arancelario || item.codigo || item.cat_id || item.id_categoria || '';
          const subcategoriaProd = item.subcategoria || item.subcategory || item.sub_id || '';

          const catFiltroStr = typeof categoria === 'object' && categoria !== null ? (categoria?.id || categoria?.codigo || categoria?.categoria || '') : String(categoria || '');
          const subCatFiltroStr = typeof subcategoria === 'object' && subcategoria !== null ? (subcategoria?.id || subcategoria?.codigo || subcategoria?.subcategoria || '') : String(subcategoria || '');

          const catFiltroNorm = normalizarTexto(catFiltroStr);
          const subCatFiltroNorm = normalizarTexto(subCatFiltroStr);

          const esCatTodos = !catFiltroNorm || catFiltroNorm === 'todos' || catFiltroNorm === 'todas';
          const coincideCat = esCatTodos || 
            normalizarTexto(categoriaProd).includes(catFiltroNorm) || 
            catFiltroNorm === normalizarTexto(categoriaProd) ||
            isMatch(nombreProd, categoria);

          const esSubTodos = !subCatFiltroNorm || subCatFiltroNorm === 'todos' || subCatFiltroNorm === 'todas';
          const coincideSubCat = esSubTodos || 
            normalizarTexto(subcategoriaProd).includes(subCatFiltroNorm) || 
            isMatch(nombreProd, subcategoria);

          const coincideQuery = !nombreProductoBuscado || isMatch(nombreProd, nombreProductoBuscado);

          if (coincideQuery && coincideCat && coincideSubCat) {
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

      // 4. Consolidar datos por país
      const datosConsolidados = dbPaises
        .map((p) => {
          const nombreKey = p.nombre.trim().toLowerCase();
          const ppdVal = mapaPreciosPorPais[nombreKey] !== undefined ? mapaPreciosPorPais[nombreKey] : 0;

          const cicMatch = (dbCostoImportacion || []).find(
            (c) => String(c.pais || c.pais_nombre || '').trim().toLowerCase() === nombreKey
          );
          let cicVal = cicMatch ? Number(cicMatch.valor ?? cicMatch.cic ?? 0) : null;
          if (isNaN(cicVal)) cicVal = null;

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
        })
        .filter(item => item.ppd > 0);

      setDatosProductos(datosConsolidados);
    } catch (err) {
      console.error("❌ Error al consolidar costos:", err);
      setErrorLog(err.message || "Error al conectar con Supabase");
    } finally {
      setLoading(false);
    }
  }

  // DISPARADOR PRINCIPAL: Se ejecuta cada vez que cambia cualquier filtro o el país base
  useEffect(() => {
    cargarYCalcularMatriz();
  }, [productoActivo, categoria, subcategoria, busqueda, paisBase]);

  // ----------------------------------------------------
  // CÁLCULOS DE NORMALIZACIÓN Y PONDERACIÓN (FÓRMULAS EXCEL)
  // ----------------------------------------------------
  const PESO_FACTOR_COSTO = 0.215; // 21.50%

  const PESO_PPD = 0.44; // 44.00%
  const PESO_CTI = 0.34; // 34.00%
  const PESO_CIC = 0.22; // 22.00%
  const PUNTAJE_MAXIMO = 10;

  const ppdVals = datosProductos.map(d => d.ppd).filter(v => v !== null && v !== undefined && v > 0);
  const ctiVals = datosProductos.map(d => d.cti).filter(v => v !== null && v !== undefined && v > 0);
  const cicValsValidos = datosProductos.map(d => d.cic).filter(v => v !== null && v !== undefined && v > 0);

  const maxPpd = ppdVals.length > 0 ? Math.max(...ppdVals) : null;
  const minCti = ctiVals.length > 0 ? Math.min(...ctiVals) : null;
  const minCic = cicValsValidos.length > 0 ? Math.min(...cicValsValidos) : null;

  const calcularNormalizadoDirecto = (val, maxVal) => {
    if (val === null || val === undefined || val <= 0 || !maxVal) return null;
    const resultado = (PUNTAJE_MAXIMO * val) / maxVal;
    return Number(resultado.toFixed(2));
  };

  const calcularNormalizadoInverso = (val, minVal) => {
    if (val === null || val === undefined || val <= 0 || minVal === null || minVal <= 0) return null;
    const resultado = (PUNTAJE_MAXIMO * minVal) / val;
    return Number(resultado.toFixed(2));
  };

  const matrizCalculadaCompleta = datosProductos.map(row => {
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

    return {
      ...row,
      ppdNorm,
      ctiNorm,
      cicNorm,
      aporteFactorCosto,
      __faltantes: faltantes
    };
  });

  matrizCalculadaCompleta.sort((a, b) => {
    if (a.__faltantes !== b.__faltantes) {
      return a.__faltantes - b.__faltantes;
    }
    return b.aporteFactorCosto - a.aporteFactorCosto; 
  });

  const matrizFiltrada = matrizCalculadaCompleta;

  // Sincronización segura con el componente padre usando dependencias estables
  useEffect(() => {
    if (onDatosActualizados && matrizCalculadaCompleta.length > 0) {
      const datosString = JSON.stringify(matrizCalculadaCompleta);
      if (datosString !== prevDatosRef.current) {
        prevDatosRef.current = datosString;
        onDatosActualizados(matrizCalculadaCompleta);
      }
    }
  }, [matrizCalculadaCompleta]);

  const toggleAccordion = (tab) => {
    setActiveAccordion(activeAccordion === tab ? null : tab);
  };

  const handleSelectEdit = (id) => {
    setSelectedPaisId(id);
    const target = datosProductos.find(p => p.id === parseInt(id) || p.id === id);
    if (target) {
      setEditLatitud(target.latitud ?? '');
      setEditLongitud(target.longitud ?? '');
      setEditCic(target.cic ?? '');
    }
  };

  async function handleAgregarPais() {
    if (!nuevoPaisNombre) return alert("Por favor ingresa el nombre del país.");

    try {
      const { error: errP } = await supabase
        .from('paises')
        .insert([{ nombre: nuevoPaisNombre, latitud: nuevaLatitud, longitud: nuevaLongitud }]);

      if (errP) throw errP;

      if (nuevoCic) {
        const { error: errC } = await supabase
          .from('costo_importacion')
          .insert([{ pais: nuevoPaisNombre, valor: parseFloat(nuevoCic) || 0 }]);
        if (errC) throw errC;
      }

      setNuevoPaisNombre(''); setNuevaLatitud(''); setNuevaLongitud(''); setNuevoCic('');
      setActiveAccordion(null);
      cargarYCalcularMatriz();
    } catch (err) {
      alert("Error al agregar registro: " + err.message);
    }
  }

  async function handleGuardarCambios() {
    if (!selectedPaisId) return alert("Selecciona un país para editar.");

    const target = datosProductos.find(p => p.id === parseInt(selectedPaisId) || p.id === selectedPaisId);
    if (!target) return;

    try {
      const { error: errP } = await supabase
        .from('paises')
        .update({ latitud: editLatitud, longitud: editLongitud })
        .eq('id', selectedPaisId);

      if (errP) throw errP;

      const { error: errC } = await supabase
        .from('costo_importacion')
        .upsert({ pais: target.pais_nombre, valor: parseFloat(editCic) || 0 }, { onConflict: 'pais' });

      if (errC) throw errC;

      setSelectedPaisId(''); setEditLatitud(''); setEditLongitud(''); setEditCic('');
      setActiveAccordion(null);
      cargarYCalcularMatriz();
    } catch (err) {
      alert("Error al actualizar: " + err.message);
    }
  }

  async function handleEliminarPais(id, nombrePais) {
    if (!window.confirm(`¿Seguro que deseas eliminar los datos de ${nombrePais}?`)) return;

    try {
      await supabase.from('paises').delete().eq('id', id);
      await supabase.from('costo_importacion').delete().eq('pais', nombrePais);

      setActiveAccordion(null);
      cargarYCalcularMatriz();
    } catch (err) {
      alert("Error al eliminar registro: " + err.message);
    }
  }

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
    <div className="space-y-8 text-slate-100 font-sans">
      
      {/* TÍTULO PRINCIPAL */}
      <div className="flex justify-between items-start border-b border-slate-800 pb-4">
        <div>
          <h1 className="text-3xl font-bold text-white tracking-tight">
            1. Costo (COSTO) — Estandarización de Criterios
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Ponderación del Factor en la Tabla Principal: <span className="text-emerald-400 font-bold">21.50%</span>
            <span className="ml-3 text-slate-300">
              • Filtro Activo: <strong className="text-sky-400">{nombreProductoMostrado}</strong>
            </span>
          </p>
        </div>
      </div>

      {/* SELECTOR DE PAÍS BASE */}
      <div className="space-y-2">
        <label className="block text-xl font-bold text-white">
          Selecciona el país base (Origen para transporte CTI)
        </label>
        <div className="relative">
          <select
            value={paisBase}
            onChange={(e) => setPaisBase(e.target.value)}
            className="w-full bg-[#1e2028] border border-slate-700/80 rounded-lg px-4 py-3 text-sm text-slate-200 focus:outline-none focus:border-slate-500 appearance-none cursor-pointer"
          >
            {listaPaises.map((p) => (
              <option key={p.id || p.nombre} value={p.nombre}>
                {p.nombre}
              </option>
            ))}
          </select>
          <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-4 text-slate-400">
            ▼
          </div>
        </div>
      </div>

      {/* GESTIÓN DE DATOS */}
      <div className="space-y-4 pt-2">
        <h2 className="text-xl font-bold text-white flex items-center gap-2">
          <span>🔧</span> Gestión de Datos (Tabla COSTO)
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          
          {/* Añadir */}
          <div className="bg-[#0e1117] border border-slate-800 rounded-lg overflow-hidden">
            <button
              onClick={() => toggleAccordion('add')}
              className="w-full px-4 py-3 text-left text-sm font-medium text-slate-200 hover:bg-[#181a20] transition-colors flex items-center gap-2 cursor-pointer"
            >
              <span>{activeAccordion === 'add' ? '˅' : '❯'}</span> Añadir país y coordenadas
            </button>
            {activeAccordion === 'add' && (
              <div className="p-4 border-t border-slate-800 space-y-3 bg-[#16181e] text-xs">
                <div>
                  <label className="block text-slate-400 mb-1">Nombre del País</label>
                  <input
                    type="text"
                    value={nuevoPaisNombre}
                    onChange={(e) => setNuevoPaisNombre(e.target.value)}
                    placeholder="Ej. Panamá"
                    className="w-full bg-[#0e1117] border border-slate-700 rounded p-2 text-white"
                  />
                </div>
                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <label className="block text-slate-400 mb-1">Latitud</label>
                    <input
                      type="text"
                      value={nuevaLatitud}
                      onChange={(e) => setNuevaLatitud(e.target.value)}
                      placeholder="8.5379"
                      className="w-full bg-[#0e1117] border border-slate-700 rounded p-2 text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-400 mb-1">Longitud</label>
                    <input
                      type="text"
                      value={nuevaLongitud}
                      onChange={(e) => setNuevaLongitud(e.target.value)}
                      placeholder="-80.7821"
                      className="w-full bg-[#0e1117] border border-slate-700 rounded p-2 text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-400 mb-1">CIC ($)</label>
                    <input
                      type="number"
                      value={nuevoCic}
                      onChange={(e) => setNuevoCic(e.target.value)}
                      placeholder="220"
                      className="w-full bg-[#0e1117] border border-slate-700 rounded p-2 text-white"
                    />
                  </div>
                </div>
                <button
                  onClick={handleAgregarPais}
                  className="bg-emerald-600 hover:bg-emerald-500 text-white px-3 py-1.5 rounded text-xs cursor-pointer transition-colors"
                >
                  Guardar
                </button>
              </div>
            )}
          </div>

          {/* Editar */}
          <div className="bg-[#0e1117] border border-slate-800 rounded-lg overflow-hidden">
            <button
              onClick={() => toggleAccordion('edit')}
              className="w-full px-4 py-3 text-left text-sm font-medium text-slate-200 hover:bg-[#181a20] transition-colors flex items-center gap-2 cursor-pointer"
            >
              <span>{activeAccordion === 'edit' ? '˅' : '❯'}</span> Editar país existente
            </button>
            {activeAccordion === 'edit' && (
              <div className="p-4 border-t border-slate-800 space-y-3 bg-[#16181e] text-xs">
                <select
                  onChange={(e) => handleSelectEdit(e.target.value)}
                  value={selectedPaisId}
                  className="w-full bg-[#0e1117] border border-slate-700 p-2 rounded text-xs text-white cursor-pointer"
                >
                  <option value="">-- Selecciona un país --</option>
                  {listaPaises.map(p => (
                    <option key={p.id} value={p.id}>
                      {p.nombre} (ID: {p.id})
                    </option>
                  ))}
                </select>

                {selectedPaisId && (
                  <>
                    <div className="grid grid-cols-3 gap-2">
                      <div>
                        <label className="text-slate-400 block mb-1">Latitud</label>
                        <input
                          type="text"
                          value={editLatitud}
                          onChange={(e) => setEditLatitud(e.target.value)}
                          className="w-full bg-[#0e1117] border border-slate-700 p-2 rounded text-white"
                        />
                      </div>
                      <div>
                        <label className="text-slate-400 block mb-1">Longitud</label>
                        <input
                          type="text"
                          value={editLongitud}
                          onChange={(e) => setEditLongitud(e.target.value)}
                          className="w-full bg-[#0e1117] border border-slate-700 p-2 rounded text-white"
                        />
                      </div>
                      <div>
                        <label className="text-slate-400 block mb-1">CIC ($)</label>
                        <input
                          type="number"
                          value={editCic}
                          onChange={(e) => setEditCic(e.target.value)}
                          className="w-full bg-[#0e1117] border border-slate-700 p-2 rounded text-white"
                        />
                      </div>
                    </div>
                    <button 
                      onClick={handleGuardarCambios}
                      className="bg-amber-600 hover:bg-amber-500 text-white text-xs px-3 py-1.5 rounded font-medium cursor-pointer transition-colors"
                    >
                      Actualizar
                    </button>
                  </>
                )}
              </div>
            )}
          </div>

          {/* Eliminar */}
          <div className="bg-[#0e1117] border border-slate-800 rounded-lg overflow-hidden">
            <button
              onClick={() => toggleAccordion('delete')}
              className="w-full px-4 py-3 text-left text-sm font-medium text-slate-200 hover:bg-[#181a20] transition-colors flex items-center gap-2 cursor-pointer"
            >
              <span>{activeAccordion === 'delete' ? '˅' : '❯'}</span> Eliminar país
            </button>
            {activeAccordion === 'delete' && (
              <div className="p-4 border-t border-slate-800 space-y-3 bg-[#16181e] text-xs">
                <div className="max-h-40 overflow-y-auto space-y-1 pr-1">
                  {listaPaises.map(p => (
                    <div key={p.id} className="flex justify-between items-center bg-[#0e1117] p-2 rounded border border-slate-800">
                      <span className="text-slate-200 font-medium">{p.nombre}</span>
                      <button
                        onClick={() => handleEliminarPais(p.id, p.nombre)}
                        className="bg-red-600/80 hover:bg-red-600 text-white px-2 py-1 rounded text-[10px] cursor-pointer"
                      >
                        Eliminar
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

        </div>
      </div>

      {errorLog && (
        <div className="bg-red-500/10 border border-red-500 text-red-400 p-3 rounded-lg text-xs">
          ⚠️ <strong>Error BD:</strong> {errorLog}
        </div>
      )}

      {/* TABLA DE COSTOS BASE */}
      <div className="space-y-4 pt-2">
        <h2 className="text-2xl font-bold text-white">
          Tabla de Costos Base
        </h2>

        <div className="max-h-[450px] overflow-y-auto rounded-lg border border-slate-800/80 bg-[#0e1117] custom-scrollbar">
          <table className="w-full text-left text-xs border-collapse">
            <thead className="sticky top-0 bg-[#16181e] z-10">
              <tr className="border-b border-slate-800 text-slate-400">
                <th className="p-3 w-16 text-right pr-6 font-normal">#</th>
                <th className="p-3 font-medium text-slate-300">Países</th>
                <th className="p-3 text-right font-medium text-slate-300">Precio Producto Destino (PPD)</th>
                <th className="p-3 text-right font-medium text-slate-300">Transporte Internacional (CTI) ($0.38/km)</th>
                <th className="p-3 text-right pr-6 font-medium text-slate-300">Cumplimiento Fronterizo (CIC)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/50 font-mono text-slate-200">
              {loading ? (
                <tr>
                  <td colSpan="5" className="p-6 text-center text-slate-500 font-sans">
                    Cargando datos...
                  </td>
                </tr>
              ) : matrizFiltrada.length > 0 ? (
                matrizFiltrada.map((row, idx) => (
                  <tr key={row.id} className="hover:bg-[#16181e]/60 transition-colors">
                    <td className="p-3 text-right pr-6 text-slate-500 font-sans">{idx + 1}</td>
                    <td className="p-3 font-sans font-medium text-slate-100">{row.pais_nombre}</td>
                    <td className="p-3 text-right">${row.ppd.toFixed(2)}</td>
                    <td className="p-3 text-right">{row.cti > 0 ? `$${row.cti.toFixed(2)}` : '$0.00'}</td>
                    <td className="p-3 text-right pr-6">
                      {row.cic !== null ? `$${row.cic.toFixed(2)}` : <span className="text-slate-500">$0.00</span>}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="5" className="p-6 text-center text-slate-500 font-sans">
                    No hay registros con datos de precios válidos para este filtro.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* TABLA DE NORMALIZACIÓN Y PONDERACIÓN */}
      <div className="space-y-4 pt-4 border-t border-slate-800/80">
        <h2 className="text-xl font-bold text-white">
          Normalización y Ponderación Final
        </h2>

        <div className="max-h-[450px] overflow-y-auto rounded-lg border border-slate-800/80 bg-[#0e1117] custom-scrollbar">
          <table className="w-full text-left text-xs border-collapse">
            <thead className="sticky top-0 bg-[#16181e] z-10">
              <tr className="border-b border-slate-800 text-slate-400">
                <th className="p-3 w-16 text-right pr-6 font-normal">#</th>
                <th className="p-3 font-medium text-slate-300">Países</th>
                <th className="p-3 text-right font-medium text-slate-300">PPD Norm (44.00%)</th>
                <th className="p-3 text-right font-medium text-slate-300">CTI Norm (34.00%)</th>
                <th className="p-3 text-right font-medium text-slate-300">CIC Norm (22.00%)</th>
                <th className="p-3 text-right pr-6 font-bold text-emerald-400">Total Factor (21.50%)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/50 font-mono text-slate-200">
              {loading ? (
                <tr>
                  <td colSpan="6" className="p-6 text-center text-slate-500 font-sans">
                    Calculando...
                  </td>
                </tr>
              ) : matrizFiltrada.length > 0 ? (
                matrizFiltrada.map((row, idx) => (
                  <tr key={row.id} className="hover:bg-[#16181e]/60 transition-colors">
                    <td className="p-3 text-right pr-6 text-slate-500 font-sans">{idx + 1}</td>
                    <td className="p-3 font-sans font-medium text-slate-100">{row.pais_nombre}</td>
                    <td className="p-3 text-right">{row.ppdNorm}</td>
                    <td className="p-3 text-right">{row.ctiNorm}</td>
                    <td className="p-3 text-right">{row.cicNorm}</td>
                    <td className="p-3 text-right pr-6 font-bold text-emerald-400">{row.aporteFactorCosto}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="6" className="p-6 text-center text-slate-500 font-sans">
                    Sin registros para calcular.
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
import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
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

      if (nuevoCic !== '') {
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
    <div className="space-y-6 text-[#94a3b8] font-sans antialiased">
      
      {/* 1. PANEL DE GESTIÓN (Barra Superior Estilo Tarjeta) */}
      <div className="bg-[#121620] border border-[#1e2536] rounded-xl p-4 shadow-sm space-y-4">
        
        {/* Encabezado del Panel */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-3 border-b border-[#1e2536] pb-3">
          <div className="flex items-center gap-2 text-white font-bold text-base">
            <span>⚙️</span>
            <span>GESTIÓN DE DATOS</span>
          </div>
          <div className="bg-[#192233] text-[#93c5fd] border border-[#26354a] text-xs px-3 py-1.5 rounded-lg font-medium">
            Módulo Activo
          </div>
        </div>

        {/* Botones Acordeón Superiores */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          
          {/* Añadir */}
          <div className="bg-[#161c29] border border-[#222c40] rounded-lg overflow-hidden transition-all">
            <button
              onClick={() => toggleAccordion('add')}
              className="w-full px-4 py-3 text-left text-xs font-semibold text-slate-200 hover:bg-[#1d2638] transition-colors flex items-center justify-between cursor-pointer"
            >
              <span className="flex items-center gap-2">
                <span className="text-emerald-400 font-bold">+</span> Añadir país
              </span>
              <span className="text-slate-400 text-xs">{activeAccordion === 'add' ? '▴' : '▾'}</span>
            </button>
            {activeAccordion === 'add' && (
              <div className="p-4 border-t border-[#222c40] space-y-3 bg-[#131824] text-xs">
                <div>
                  <label className="block text-slate-400 mb-1 font-medium">Nombre del País</label>
                  <input
                    type="text"
                    value={nuevoPaisNombre}
                    onChange={(e) => setNuevoPaisNombre(e.target.value)}
                    placeholder="Ej. Panamá"
                    className="w-full bg-[#0b0e14] border border-[#222c40] rounded p-2 text-white focus:outline-none focus:border-slate-500"
                  />
                </div>
                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <label className="block text-slate-400 mb-1 font-medium">Latitud</label>
                    <input
                      type="text"
                      value={nuevaLatitud}
                      onChange={(e) => setNuevaLatitud(e.target.value)}
                      placeholder="8.5379"
                      className="w-full bg-[#0b0e14] border border-[#222c40] rounded p-2 text-white focus:outline-none focus:border-slate-500"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-400 mb-1 font-medium">Longitud</label>
                    <input
                      type="text"
                      value={nuevaLongitud}
                      onChange={(e) => setNuevaLongitud(e.target.value)}
                      placeholder="-80.7821"
                      className="w-full bg-[#0b0e14] border border-[#222c40] rounded p-2 text-white focus:outline-none focus:border-slate-500"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-400 mb-1 font-medium">CIC ($)</label>
                    <input
                      type="number"
                      value={nuevoCic}
                      onChange={(e) => setNuevoCic(e.target.value)}
                      placeholder="220"
                      className="w-full bg-[#0b0e14] border border-[#222c40] rounded p-2 text-white focus:outline-none focus:border-slate-500"
                    />
                  </div>
                </div>
                <button
                  onClick={handleAgregarPais}
                  className="bg-emerald-600 hover:bg-emerald-500 text-white px-3 py-1.5 rounded text-xs font-medium cursor-pointer transition-colors"
                >
                  Guardar País
                </button>
              </div>
            )}
          </div>

          {/* Editar */}
          <div className="bg-[#161c29] border border-[#222c40] rounded-lg overflow-hidden transition-all">
            <button
              onClick={() => toggleAccordion('edit')}
              className="w-full px-4 py-3 text-left text-xs font-semibold text-slate-200 hover:bg-[#1d2638] transition-colors flex items-center justify-between cursor-pointer"
            >
              <span className="flex items-center gap-2">
                <span>✏️</span> Editar país
              </span>
              <span className="text-slate-400 text-xs">{activeAccordion === 'edit' ? '▴' : '▾'}</span>
            </button>
            {activeAccordion === 'edit' && (
              <div className="p-4 border-t border-[#222c40] space-y-3 bg-[#131824] text-xs">
                <select
                  onChange={(e) => handleSelectEdit(e.target.value)}
                  value={selectedPaisId}
                  className="w-full bg-[#0b0e14] border border-[#222c40] p-2 rounded text-xs text-white cursor-pointer focus:outline-none"
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
                        <label className="text-slate-400 block mb-1 font-medium">Latitud</label>
                        <input
                          type="text"
                          value={editLatitud}
                          onChange={(e) => setEditLatitud(e.target.value)}
                          className="w-full bg-[#0b0e14] border border-[#222c40] p-2 rounded text-white focus:outline-none"
                        />
                      </div>
                      <div>
                        <label className="text-slate-400 block mb-1 font-medium">Longitud</label>
                        <input
                          type="text"
                          value={editLongitud}
                          onChange={(e) => setEditLongitud(e.target.value)}
                          className="w-full bg-[#0b0e14] border border-[#222c40] p-2 rounded text-white focus:outline-none"
                        />
                      </div>
                      <div>
                        <label className="text-slate-400 block mb-1 font-medium">CIC ($)</label>
                        <input
                          type="number"
                          value={editCic}
                          onChange={(e) => setEditCic(e.target.value)}
                          className="w-full bg-[#0b0e14] border border-[#222c40] p-2 rounded text-white focus:outline-none"
                        />
                      </div>
                    </div>
                    <button 
                      onClick={handleGuardarCambios}
                      className="bg-amber-600 hover:bg-amber-500 text-white text-xs px-3 py-1.5 rounded font-medium cursor-pointer transition-colors"
                    >
                      Actualizar Cambios
                    </button>
                  </>
                )}
              </div>
            )}
          </div>

          {/* Eliminar */}
          <div className="bg-[#161c29] border border-[#222c40] rounded-lg overflow-hidden transition-all">
            <button
              onClick={() => toggleAccordion('delete')}
              className="w-full px-4 py-3 text-left text-xs font-semibold text-slate-200 hover:bg-[#1d2638] transition-colors flex items-center justify-between cursor-pointer"
            >
              <span className="flex items-center gap-2">
                <span>🗑️</span> Eliminar país
              </span>
              <span className="text-slate-400 text-xs">{activeAccordion === 'delete' ? '▴' : '▾'}</span>
            </button>
            {activeAccordion === 'delete' && (
              <div className="p-4 border-t border-[#222c40] space-y-3 bg-[#131824] text-xs">
                <div className="max-h-40 overflow-y-auto space-y-1 pr-1 custom-scrollbar">
                  {listaPaises.map(p => (
                    <div key={p.id} className="flex justify-between items-center bg-[#0b0e14] p-2 rounded border border-[#222c40]">
                      <span className="text-slate-200 font-medium">{p.nombre}</span>
                      <button
                        onClick={() => handleEliminarPais(p.id, p.nombre)}
                        className="bg-red-600/80 hover:bg-red-600 text-white px-2 py-1 rounded text-[10px] font-medium cursor-pointer transition-colors"
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
            Mostrando <strong className="text-slate-200">{matrizFiltrada.length}</strong> de <strong className="text-slate-200">{matrizFiltrada.length}</strong> registros
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
                    <td colSpan="5" className="py-6 text-center text-slate-500 font-sans">
                      Cargando datos...
                    </td>
                  </tr>
                ) : matrizFiltrada.length > 0 ? (
                  matrizFiltrada.map((row) => (
                    <tr key={row.id} className="hover:bg-[#161c29]/50 transition-colors">
                      <td className="py-3 px-4 text-slate-400">{row.id}</td>
                      <td className="py-3 px-4 font-sans font-medium text-slate-200">{row.pais_nombre}</td>
                      <td className="py-3 px-4 text-right text-emerald-400 font-semibold">{row.ppd > 0 ? `$${row.ppd.toFixed(2)}` : 'Sin datos'}</td>
                      <td className="py-3 px-4 text-right">{row.cti > 0 ? `$${row.cti.toFixed(2)}` : '$0.00'}</td>
                      <td className="py-3 px-4 text-right pr-6">
                        {row.cic !== null ? `$${row.cic.toFixed(2)}` : '$0.00'}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="5" className="py-8 text-center text-slate-500 font-sans">
                      No hay registros disponibles.
                    </td>
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
                    <td colSpan="6" className="py-6 text-center text-slate-500 font-sans">
                      Calculando...
                    </td>
                  </tr>
                ) : matrizFiltrada.length > 0 ? (
                  matrizFiltrada.map((row) => (
                    <tr key={row.id} className="hover:bg-[#161c29]/50 transition-colors">
                      <td className="py-3 px-4 text-slate-400">{row.id}</td>
                      <td className="py-3 px-4 font-sans font-medium text-slate-200">{row.pais_nombre}</td>
                      <td className="py-3 px-4 text-right">{row.ppdNorm !== null ? row.ppdNorm : 'Sin datos'}</td>
                      <td className="py-3 px-4 text-right">{row.ctiNorm !== null ? row.ctiNorm : '-'}</td>
                      <td className="py-3 px-4 text-right">{row.cicNorm !== null ? row.cicNorm : '-'}</td>
                      <td className="py-3 px-4 text-right pr-6 font-bold text-emerald-400">{row.aporteFactorCosto}</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="6" className="py-8 text-center text-slate-500 font-sans">
                      No hay datos normalizados disponibles.
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
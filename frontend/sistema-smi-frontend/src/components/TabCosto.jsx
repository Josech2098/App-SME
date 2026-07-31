import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient.js';

// --- Helper: Cálculo de distancia geográfica mediante Haversine ---
function calcularDistanciaKm(lat1, lon1, lat2, lon2) {
  if (!lat1 || !lon1 || !lat2 || !lon2) return 0;
  
  // Reemplazar comas por puntos en caso de strings con formato europeo ("9,7489")
  const parseCoord = (val) => parseFloat(String(val).replace(',', '.'));
  
  const l1 = parseCoord(lat1);
  const ln1 = parseCoord(lon1);
  const l2 = parseCoord(lat2);
  const ln2 = parseCoord(lon2);

  if (isNaN(l1) || isNaN(ln1) || isNaN(l2) || isNaN(ln2)) return 0;

  const R = 6371; // Radio medio de la Tierra en km
  const dLat = (l2 - l1) * (Math.PI / 180);
  const dLon = (ln2 - ln1) * (Math.PI / 180);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(l1 * (Math.PI / 180)) *
      Math.cos(l2 * (Math.PI / 180)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c; // Distancia calculada en km
}

export default function TabCosto({ productoActivo, categoria, subcategoria, busqueda, paisOrigen }) {
  const [paisBase, setPaisBase] = useState(paisOrigen || 'Costa Rica');
  const [datosProductos, setDatosProductos] = useState([]);
  const [listaPaises, setListaPaises] = useState([]);
  const [loading, setLoading] = useState(true);
  const [errorLog, setErrorLog] = useState(null);

  // Control de acordeones para "Gestión de Datos"
  const [activeAccordion, setActiveAccordion] = useState(null); // 'add' | 'edit' | 'delete' | null

  // Estados Formulario Añadir
  const [nuevoPaisNombre, setNuevoPaisNombre] = useState('');
  const [nuevaLatitud, setNuevaLatitud] = useState('');
  const [nuevaLongitud, setNuevaLongitud] = useState('');
  const [nuevoCebc, setNuevoCebc] = useState('');

  // Estados Formulario Editar
  const [selectedPaisId, setSelectedPaisId] = useState('');
  const [editLatitud, setEditLatitud] = useState('');
  const [editLongitud, setEditLongitud] = useState('');
  const [editCebc, setEditCebc] = useState('');

  // Sincronizar país base si cambia la propiedad heredada
  useEffect(() => {
    if (paisOrigen) setPaisBase(paisOrigen);
  }, [paisOrigen]);

  // Cargar lista de países para el selector dinámico de origen
  useEffect(() => {
    async function fetchPaises() {
      const { data } = await supabase.from('paises').select('*').order('nombre');
      if (data) setListaPaises(data);
    }
    fetchPaises();
  }, []);

  // Consultar base de datos y recalcular cada vez que cambien los filtros o el país base
  useEffect(() => {
    cargarYCalcularMatriz();
  }, [productoActivo, categoria, subcategoria, busqueda, paisBase]);

  async function cargarYCalcularMatriz() {
    setLoading(true);
    setErrorLog(null);

    try {
      // 1. Obtener la lista completa de países con sus coordenadas (para INTC)
      const { data: dbPaises, error: errPaises } = await supabase.from('paises').select('*').order('nombre');
      if (errPaises) throw errPaises;

      // 2. Obtener la tabla costo_importacion (para CEBC)
      const { data: dbCostoImportacion, error: errCEBC } = await supabase.from('costo_importacion').select('*');
      if (errCEBC) throw errCEBC;

      // 3. Obtener los precios del producto desde la tabla productos (para PPAO)
      let queryProductos = supabase.from('productos').select('*');
      if (productoActivo && productoActivo.id) {
        queryProductos = queryProductos.eq('id', productoActivo.id);
      }
      const { data: dbProductos, error: errProd } = await queryProductos;
      if (errProd) throw errProd;

      // Ubicar las coordenadas del país origen/base seleccionado
      const objetoPaisBase = dbPaises.find(
        (p) => p.nombre.trim().toLowerCase() === paisBase.trim().toLowerCase()
      ) || dbPaises.find((p) => p.nombre.toLowerCase().includes('costa rica')) || dbPaises[0];

      const latBase = objetoPaisBase?.latitud;
      const lonBase = objetoPaisBase?.longitud;

      // 4. Mapear y calcular INTC y CEBC por cada país de la BD
      const datosConsolidados = dbPaises.map((p) => {
        // Coincidencia PPAO en productos
        const prodMatch = (dbProductos || []).find(
          (prod) => (prod.pais || prod.pais_destino || '').trim().toLowerCase() === p.nombre.trim().toLowerCase()
        );
        const ppaoVal = prodMatch ? Number(prodMatch.precio || prodMatch.precio_origen || prodMatch.ppao) : null;

        // Coincidencia CEBC en costo_importacion
        const cebcMatch = (dbCostoImportacion || []).find(
          (c) => (c.pais || '').trim().toLowerCase() === p.nombre.trim().toLowerCase()
        );
        const cebcVal = cebcMatch ? Number(cebcMatch.valor) : null;

        // Cálculo de INTC basado en Haversine ($0.38 por km)
        const distKm = calcularDistanciaKm(latBase, lonBase, p.latitud, p.longitud);
        const intcVal = distKm > 0 ? Number((distKm * 0.38).toFixed(2)) : 0;

        return {
          id: p.id,
          pais_nombre: p.nombre,
          latitud: p.latitud,
          longitud: p.longitud,
          ppao: ppaoVal,
          intc: intcVal,
          cebc: cebcVal
        };
      });

      setDatosProductos(datosConsolidados);
    } catch (err) {
      console.error("Error al consolidar costos:", err);
      setErrorLog(err.message || "Error al sincronizar datos con Supabase");
    } finally {
      setLoading(false);
    }
  }

  // ----------------------------------------------------
  // FÓRMULAS DE NORMALIZACIÓN Y PONDERACIÓN (35% - 35% - 30%)
  // ----------------------------------------------------
  const PESO_PPAO = 0.35;
  const PESO_INTC = 0.35;
  const PESO_CEBC = 0.30;
  const A3 = 10;

  const ppaoVals = datosProductos.map(d => d.ppao).filter(v => v !== null && v > 0);
  const intcVals = datosProductos.map(d => d.intc).filter(v => v !== null && v > 0);
  const cebcVals = datosProductos.map(d => d.cebc).filter(v => v !== null && v > 0);

  const minPpao = ppaoVals.length > 0 ? Math.min(...ppaoVals) : null;
  const minIntc = intcVals.length > 0 ? Math.min(...intcVals) : null;
  const minCebc = cebcVals.length > 0 ? Math.min(...cebcVals) : null;

  const calcularNormalizado = (val, minVal) => {
    if (!val || !minVal || val <= 0 || minVal <= 0) return null;
    return Number((A3 * (minVal / val)).toFixed(2));
  };

  const matrizCalculada = datosProductos.map(row => {
    const ppaoNorm = calcularNormalizado(row.ppao, minPpao);
    const intcNorm = calcularNormalizado(row.intc, minIntc);
    const cebcNorm = calcularNormalizado(row.cebc, minCebc);

    const p1 = ppaoNorm ?? 0;
    const p2 = intcNorm ?? 0;
    const p3 = cebcNorm ?? 0;

    const costoTotalNorm = (ppaoNorm !== null || intcNorm !== null || cebcNorm !== null)
      ? Number(((PESO_PPAO * p1) + (PESO_INTC * p2) + (PESO_CEBC * p3)).toFixed(2))
      : null;

    return {
      ...row,
      ppaoNorm,
      intcNorm,
      cebcNorm,
      costoTotalNorm
    };
  });

  // Ordenar de mayor a menor puntuación obtenida
  matrizCalculada.sort((a, b) => (b.costoTotalNorm ?? -1) - (a.costoTotalNorm ?? -1));

  // Manejador de visibilidad de acordeones
  const toggleAccordion = (tab) => {
    setActiveAccordion(activeAccordion === tab ? null : tab);
  };

  // Cargar registro seleccionado en formulario de edición
  const handleSelectEdit = (id) => {
    setSelectedPaisId(id);
    const target = datosProductos.find(p => p.id === parseInt(id) || p.id === id);
    if (target) {
      setEditLatitud(target.latitud ?? '');
      setEditLongitud(target.longitud ?? '');
      setEditCebc(target.cebc ?? '');
    }
  };

  // Operación CRUD: Guardar Nuevo País
  async function handleAgregarPais() {
    if (!nuevoPaisNombre) return alert("Por favor ingresa el nombre del país.");

    try {
      // Insertar coordenadas en tabla 'paises'
      const { data: newPais, error: errP } = await supabase
        .from('paises')
        .insert([{ nombre: nuevoPaisNombre, latitud: nuevaLatitud, longitud: nuevaLongitud }])
        .select();

      if (errP) throw errP;

      // Insertar CEBC en tabla 'costo_importacion'
      if (nuevoCebc) {
        const { error: errC } = await supabase
          .from('costo_importacion')
          .insert([{ pais: nuevoPaisNombre, valor: parseFloat(nuevoCebc) || 0 }]);
        if (errC) throw errC;
      }

      setNuevoPaisNombre(''); setNuevaLatitud(''); setNuevaLongitud(''); setNuevoCebc('');
      setActiveAccordion(null);
      cargarYCalcularMatriz();
    } catch (err) {
      alert("Error al agregar registro: " + err.message);
    }
  }

  // Operación CRUD: Actualizar Registro
  async function handleGuardarCambios() {
    if (!selectedPaisId) return alert("Selecciona un país para editar.");

    const target = datosProductos.find(p => p.id === parseInt(selectedPaisId) || p.id === selectedPaisId);
    if (!target) return;

    try {
      // Actualizar coordenadas en 'paises'
      const { error: errP } = await supabase
        .from('paises')
        .update({ latitud: editLatitud, longitud: editLongitud })
        .eq('id', selectedPaisId);

      if (errP) throw errP;

      // Upsert en 'costo_importacion' para CEBC
      const { error: errC } = await supabase
        .from('costo_importacion')
        .upsert({ pais: target.pais_nombre, valor: parseFloat(editCebc) || 0 }, { onConflict: 'pais' });

      if (errC) throw errC;

      setSelectedPaisId(''); setEditLatitud(''); setEditLongitud(''); setEditCebc('');
      setActiveAccordion(null);
      cargarYCalcularMatriz();
    } catch (err) {
      alert("Error al actualizar: " + err.message);
    }
  }

  // Operación CRUD: Eliminar Registro
  async function handleEliminarPais(id, nombrePais) {
    if (!window.confirm(`¿Seguro que deseas eliminar los datos correspondientes a ${nombrePais}?`)) return;

    try {
      await supabase.from('paises').delete().eq('id', id);
      await supabase.from('costo_importacion').delete().eq('pais', nombrePais);

      setActiveAccordion(null);
      cargarYCalcularMatriz();
    } catch (err) {
      alert("Error al eliminar registro: " + err.message);
    }
  }

  return (
    <div className="space-y-8 text-slate-100 font-sans">
      
      {/* ---------------- 1. TÍTULO PRINCIPAL ---------------- */}
      <h1 className="text-3xl font-bold text-white tracking-tight">
        1. Costo (COST) — Estandarización de criterios
      </h1>

      {/* ---------------- 2. SELECTOR DE PAÍS BASE ---------------- */}
      <div className="space-y-2">
        <label className="block text-xl font-bold text-white">
          Selecciona el país base (origen para cálculo de distancia INTC)
        </label>
        <span className="block text-xs text-slate-400">
          Ubicación geográfica tomada como punto de partida para evaluar costos de transporte internacional.
        </span>
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

      {/* ---------------- 3. GESTIÓN DE DATOS (TABLA COST) ---------------- */}
      <div className="space-y-4 pt-2">
        <h2 className="text-xl font-bold text-white flex items-center gap-2">
          <span>🔧</span> Gestión de Datos (Tabla COST)
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          
          {/* Añadir */}
          <div className="bg-[#0e1117] border border-slate-800 rounded-lg overflow-hidden">
            <button
              onClick={() => toggleAccordion('add')}
              className="w-full px-4 py-3 text-left text-sm font-medium text-slate-200 hover:bg-[#181a20] transition-colors flex items-center gap-2"
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
                    <label className="block text-slate-400 mb-1">CEBC ($)</label>
                    <input
                      type="number"
                      value={nuevoCebc}
                      onChange={(e) => setNuevoCebc(e.target.value)}
                      placeholder="250"
                      className="w-full bg-[#0e1117] border border-slate-700 rounded p-2 text-white"
                    />
                  </div>
                </div>
                <button
                  onClick={handleAgregarPais}
                  className="bg-emerald-600 hover:bg-emerald-500 text-white px-3 py-1.5 rounded text-xs cursor-pointer transition-colors"
                >
                  Guardar Registro
                </button>
              </div>
            )}
          </div>

          {/* Editar */}
          <div className="bg-[#0e1117] border border-slate-800 rounded-lg overflow-hidden">
            <button
              onClick={() => toggleAccordion('edit')}
              className="w-full px-4 py-3 text-left text-sm font-medium text-slate-200 hover:bg-[#181a20] transition-colors flex items-center gap-2"
            >
              <span>{activeAccordion === 'edit' ? '˅' : '❯'}</span> Editar país existente
            </button>
            {activeAccordion === 'edit' && (
              <div className="p-4 border-t border-slate-800 space-y-3 bg-[#16181e] text-xs">
                <select
                  onChange={(e) => handleSelectEdit(e.target.value)}
                  value={selectedPaisId}
                  className="w-full bg-[#0e1117] border border-slate-700 p-2 rounded text-xs text-white"
                >
                  <option value="">-- Selecciona un país --</option>
                  {datosProductos.map(p => (
                    <option key={p.id} value={p.id}>
                      {p.pais_nombre} (ID: {p.id})
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
                        <label className="text-slate-400 block mb-1">CEBC ($)</label>
                        <input
                          type="number"
                          value={editCebc}
                          onChange={(e) => setEditCebc(e.target.value)}
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
              className="w-full px-4 py-3 text-left text-sm font-medium text-slate-200 hover:bg-[#181a20] transition-colors flex items-center gap-2"
            >
              <span>{activeAccordion === 'delete' ? '˅' : '❯'}</span> Eliminar país existente
            </button>
            {activeAccordion === 'delete' && (
              <div className="p-4 border-t border-slate-800 space-y-3 bg-[#16181e] text-xs">
                <p className="text-slate-400">Selecciona el registro que deseas remover:</p>
                <div className="max-h-40 overflow-y-auto space-y-1 pr-1">
                  {datosProductos.map(p => (
                    <div key={p.id} className="flex justify-between items-center bg-[#0e1117] p-2 rounded border border-slate-800">
                      <span className="text-slate-200 font-medium">{p.pais_nombre}</span>
                      <button
                        onClick={() => handleEliminarPais(p.id, p.pais_nombre)}
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

      {/* ---------------- 4. TABLA DE COSTOS BASE ---------------- */}
      <div className="space-y-4 pt-2">
        <h2 className="text-2xl font-bold text-white">
          Tabla de costos base
        </h2>

        <div className="overflow-x-auto rounded-lg border border-slate-800/80 bg-[#0e1117]">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-slate-800 text-slate-400 bg-[#16181e]">
                <th className="p-3 w-16 text-right pr-6 font-normal">#</th>
                <th className="p-3 font-medium text-slate-300">Países</th>
                <th className="p-3 text-right font-medium text-slate-300">Precio del producto en origen (PPAO)</th>
                <th className="p-3 text-right font-medium text-slate-300">Costos de transporte internacional (INTC) ($0.38/km)</th>
                <th className="p-3 text-right pr-6 font-medium text-slate-300">Costo de exportación del cumplimiento fronterizo (CEBC)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/50 font-mono text-slate-200">
              {loading ? (
                <tr>
                  <td colSpan="5" className="p-6 text-center text-slate-500 font-sans">
                    Cargando datos de costos...
                  </td>
                </tr>
              ) : matrizCalculada.length > 0 ? (
                matrizCalculada.map((row) => (
                  <tr key={row.id} className="hover:bg-[#16181e]/60 transition-colors">
                    <td className="p-3 text-right pr-6 text-slate-500 font-sans">{row.id}</td>
                    <td className="p-3 font-sans font-medium text-slate-100">{row.pais_nombre}</td>
                    <td className="p-3 text-right">{row.ppao !== null ? `$${row.ppao}` : 'None'}</td>
                    <td className="p-3 text-right">{row.intc > 0 ? `$${row.intc}` : '$0.00'}</td>
                    <td className="p-3 text-right pr-6">{row.cebc !== null ? `$${row.cebc}` : 'None'}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="5" className="p-6 text-center text-slate-500 font-sans">
                    No hay registros en la tabla de costos base.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ---------------- 5. TABLA DE NORMALIZACIÓN Y CÁLCULOS ---------------- */}
      <div className="space-y-4 pt-4 border-t border-slate-800/80">
        <h2 className="text-xl font-bold text-white">
          Normalización y Ponderación Final
        </h2>

        <div className="overflow-x-auto rounded-lg border border-slate-800/80 bg-[#0e1117]">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-slate-800 text-slate-400 bg-[#16181e]">
                <th className="p-3 font-medium text-slate-300">Países</th>
                <th className="p-3 text-right font-medium text-slate-300">PPAO Norm (35%)</th>
                <th className="p-3 text-right font-medium text-slate-300">INTC Norm (35%)</th>
                <th className="p-3 text-right font-medium text-slate-300">CEBC Norm (30%)</th>
                <th className="p-3 text-right pr-6 font-bold text-emerald-400">Costo Total Normalizado</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/50 font-mono text-slate-200">
              {loading ? (
                <tr>
                  <td colSpan="5" className="p-6 text-center text-slate-500 font-sans">
                    Calculando ponderaciones...
                  </td>
                </tr>
              ) : matrizCalculada.length > 0 ? (
                matrizCalculada.map((row) => (
                  <tr key={row.id} className="hover:bg-[#16181e]/60 transition-colors">
                    <td className="p-3 font-sans font-medium text-slate-100">{row.pais_nombre}</td>
                    <td className="p-3 text-right">{row.ppaoNorm ?? 'None'}</td>
                    <td className="p-3 text-right">{row.intcNorm ?? 'None'}</td>
                    <td className="p-3 text-right">{row.cebcNorm ?? 'None'}</td>
                    <td className="p-3 text-right pr-6 font-bold text-emerald-400">{row.costoTotalNorm ?? 'None'}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="5" className="p-6 text-center text-slate-500 font-sans">
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
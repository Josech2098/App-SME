import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient.js';

export default function TabSostenibilidad({ productoActivo, categoria, subcategoria, busqueda, paisOrigen }) {
  const [paisBase, setPaisBase] = useState(paisOrigen || 'Costa Rica');
  const [datosProductos, setDatosProductos] = useState([]);
  const [listaPaises, setListaPaises] = useState([]);
  const [loading, setLoading] = useState(true);
  const [errorLog, setErrorLog] = useState(null);

  const [activeAccordion, setActiveAccordion] = useState(null);

  // Estados Formulario Añadir
  const [nuevoPaisNombre, setNuevoPaisNombre] = useState('');
  const [nuevoEdc, setNuevoEdc] = useState('');
  const [nuevoRpg, setNuevoRpg] = useState('');
  const [nuevoIsg, setNuevoIsg] = useState('');

  // Estados Formulario Editar
  const [selectedPaisId, setSelectedPaisId] = useState('');
  const [editEdc, setEditEdc] = useState('');
  const [editRpg, setEditRpg] = useState('');
  const [editIsg, setEditIsg] = useState('');

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

  useEffect(() => {
    cargarYCalcularMatriz();
  }, [productoActivo, categoria, subcategoria, busqueda, paisBase]);

  async function cargarYCalcularMatriz() {
    setLoading(true);
    setErrorLog(null);

    try {
      // 1. Obtener la lista base de países
      const { data: dbPaises, error: errPaises } = await supabase.from('paises').select('*').order('nombre');
      if (errPaises) throw errPaises;

      // 2. Obtener datos de la tabla emisiones_carbono relacionándola con el país
      // (Asumiendo que 'pais' o 'id_pais' relaciona el nombre/id con la tabla paises)
      const { data: dbEmisiones, error: errEmis } = await supabase.from('emisiones_carbono').select('*');
      if (errEmis) console.warn("Aviso en emisiones_carbono:", errEmis);

      // 3. Obtener datos de la tabla indice_sostenibilidad_global
      const { data: dbIsg, error: errIsg } = await supabase.from('indice_sostenibilidad_global').select('*');
      if (errIsg) console.warn("Aviso en indice_sostenibilidad_global:", errIsg);

      const datosConsolidados = dbPaises.map((p) => {
        // Hacemos el match estricto o normalizado contra los datos de las tablas secundarias
        const nombrePais = (p.nombre || '').trim().toLowerCase();

        // Buscar Emisiones (EDC) haciendo match por nombre o identificador de país existente
        const emisMatch = (dbEmisiones || []).find(c => {
          const valPaisC = String(c.pais || c.nombre || c.id_pais || '').trim().toLowerCase();
          return valPaisC === nombrePais;
        });
        
        let edcVal = emisMatch ? Number(emisMatch.emisionescarbono ?? emisMatch.edc ?? 0) : null;
        if (isNaN(edcVal)) edcVal = null;

        // Buscar Índice Global (ISG) haciendo match por nombre o identificador de país existente
        const isgMatch = (dbIsg || []).find(c => {
          const valPaisI = String(c.pais || c.nombre || c.id_pais || '').trim().toLowerCase();
          return valPaisI === nombrePais;
        });

        let isgVal = isgMatch ? Number(isgMatch.indicesostenibilidaglobal ?? isgMatch.isg ?? 0) : null;
        if (isNaN(isgVal)) isgVal = null;

        // RPG por defecto o integrable si se requiere
        let rpgVal = 0; 

        return {
          id: p.id,
          pais_nombre: p.nombre,
          edc: edcVal,
          rpg: rpgVal,
          isg: isgVal
        };
      });

      setDatosProductos(datosConsolidados);
    } catch (err) {
      console.error("Error al consolidar sostenibilidad:", err);
      setErrorLog(err.message || "Error al conectar con Supabase");
    } finally {
      setLoading(false);
    }
  }

  // ----------------------------------------------------
  // CÁLCULOS DE NORMALIZACIÓN Y PONDERACIÓN (FÓRMULAS EXCEL)
  // ----------------------------------------------------
  const PESO_FACTOR_SOST = 0.055; // 5.50%

  const PESO_EDC = 0.30; // 30.00% (Inversa)
  const PESO_RPG = 0.30; // 30.00% (Inversa)
  const PESO_ISG = 0.40; // 40.00% (Directa)
  const PUNTAJE_MAXIMO = 10;

  const edcVals = datosProductos.map(d => d.edc).filter(v => v !== null && v !== undefined && v > 0);
  const rpgVals = datosProductos.map(d => d.rpg).filter(v => v !== null && v !== undefined && v > 0);
  const isgVals = datosProductos.map(d => d.isg).filter(v => v !== null && v !== undefined && v > 0);

  const minEdc = edcVals.length > 0 ? Math.min(...edcVals) : null; 
  const minRpg = rpgVals.length > 0 ? Math.min(...rpgVals) : null; 
  const maxIsg = isgVals.length > 0 ? Math.max(...isgVals) : null; 

  const calcularNormalizadoInverso = (val, minVal) => {
    if (val === null || val === undefined || val <= 0 || minVal === null || minVal <= 0) return null;
    const resultado = (PUNTAJE_MAXIMO * minVal) / val;
    return Number(resultado.toFixed(2));
  };

  const calcularNormalizadoDirecto = (val, maxVal) => {
    if (val === null || val === undefined || val <= 0 || !maxVal) return null;
    const resultado = (PUNTAJE_MAXIMO * val) / maxVal;
    return Number(resultado.toFixed(2));
  };

  const matrizCalculadaCompleta = datosProductos.map(row => {
    const valEdc = row.edc ?? 0;
    const valRpg = row.rpg ?? 0;
    const valIsg = row.isg ?? 0;

    const edcNorm = calcularNormalizadoInverso(valEdc, minEdc);
    const rpgNorm = calcularNormalizadoInverso(valRpg, minRpg);
    const isgNorm = calcularNormalizadoDirecto(valIsg, maxIsg);

    const p1 = edcNorm ?? 0;
    const p2 = rpgNorm ?? 0;
    const p3 = isgNorm ?? 0;

    const aporteFactorSostenibilidad = Number((((PESO_EDC * p1) + (PESO_RPG * p2) + (PESO_ISG * p3)) * PESO_FACTOR_SOST).toFixed(2));

    const faltantes = [edcNorm, rpgNorm, isgNorm].filter(v => v === null).length;

    return {
      ...row,
      edcNorm,
      rpgNorm,
      isgNorm,
      aporteFactorSostenibilidad,
      __faltantes: faltantes
    };
  });

  matrizCalculadaCompleta.sort((a, b) => {
    if (a.__faltantes !== b.__faltantes) {
      return a.__faltantes - b.__faltantes;
    }
    return b.aporteFactorSostenibilidad - a.aporteFactorSostenibilidad; 
  });

  const matrizFiltrada = matrizCalculadaCompleta;

  const toggleAccordion = (tab) => {
    setActiveAccordion(activeAccordion === tab ? null : tab);
  };

  const handleSelectEdit = (id) => {
    setSelectedPaisId(id);
    const target = datosProductos.find(p => p.id === parseInt(id) || p.id === id);
    if (target) {
      setEditEdc(target.edc ?? '');
      setEditRpg(target.rpg ?? '');
      setEditIsg(target.isg ?? '');
    }
  };

  async function handleAgregarPais() {
    if (!nuevoPaisNombre) return alert("Por favor ingresa o selecciona el nombre del país.");

    try {
      // Verificar si el país ya existe en la tabla principal de países, si no, insertarlo
      const { data: existingPais } = await supabase
        .from('paises')
        .select('id')
        .ilike('nombre', nuevoPaisNombre.trim())
        .maybeSingle();

      let nombreFinalPais = nuevoPaisNombre.trim();

      if (!existingPais) {
        const { error: errP } = await supabase
          .from('paises')
          .insert([{ nombre: nombreFinalPais }]);
        if (errP) throw errP;
      } else {
        // Si ya existe, aseguramos el nombre exacto registrado
        const { data: pObj } = await supabase.from('paises').select('nombre').eq('id', existingPais.id).single();
        if (pObj) nombreFinalPais = pObj.nombre;
      }

      // Upsert en emisiones_carbono usando la columna de país existente
      const { error: errE } = await supabase
        .from('emisiones_carbono')
        .upsert({ pais: nombreFinalPais, emisionescarbono: parseFloat(nuevoEdc) || 0 }, { onConflict: 'pais' });
      if (errE) throw errE;

      // Upsert en indice_sostenibilidad_global usando la columna de país existente
      const { error: errI } = await supabase
        .from('indice_sostenibilidad_global')
        .upsert({ pais: nombreFinalPais, indicesostenibilidaglobal: parseFloat(nuevoIsg) || 0 }, { onConflict: 'pais' });
      if (errI) throw errI;

      setNuevoPaisNombre(''); setNuevoEdc(''); setNuevoRpg(''); setNuevoIsg('');
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
      // Actualizar en emisiones_carbono haciendo match con el país existente
      const { error: errE } = await supabase
        .from('emisiones_carbono')
        .upsert({ pais: target.pais_nombre, emisionescarbono: parseFloat(editEdc) || 0 }, { onConflict: 'pais' });
      if (errE) throw errE;

      // Actualizar en indice_sostenibilidad_global haciendo match con el país existente
      const { error: errI } = await supabase
        .from('indice_sostenibilidad_global')
        .upsert({ pais: target.pais_nombre, indicesostenibilidaglobal: parseFloat(editIsg) || 0 }, { onConflict: 'pais' });
      if (errI) throw errI;

      setSelectedPaisId(''); setEditEdc(''); setEditRpg(''); setEditIsg('');
      setActiveAccordion(null);
      cargarYCalcularMatriz();
    } catch (err) {
      alert("Error al actualizar: " + err.message);
    }
  }

  const nombreProductoMostrado = 
    (typeof productoActivo === 'string' ? productoActivo : (productoActivo?.nombre ?? productoActivo?.producto ?? productoActivo?.titulo)) || 
    busqueda || 
    'Botella de vino (Calidad media)';

  return (
    <div className="space-y-8 text-slate-100 font-sans">
      
      {/* TÍTULO PRINCIPAL */}
      <div className="flex justify-between items-start border-b border-slate-800 pb-4">
        <div>
          <h1 className="text-3xl font-bold text-white tracking-tight">
            6. Sostenibilidad (SUST) — Estandarización de Criterios
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Ponderación del Factor en la Tabla Principal: <span className="text-emerald-400 font-bold">5.50%</span>
            <span className="ml-3 text-slate-300">
              • Producto: <strong className="text-sky-400">{nombreProductoMostrado}</strong>
            </span>
          </p>
        </div>
      </div>

      {/* GESTIÓN DE DATOS */}
      <div className="space-y-4 pt-2">
        <h2 className="text-xl font-bold text-white flex items-center gap-2">
          <span>🔧</span> Gestión de Datos (Tabla SUST)
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          
          {/* Añadir */}
          <div className="bg-[#0e1117] border border-slate-800 rounded-lg overflow-hidden">
            <button
              onClick={() => toggleAccordion('add')}
              className="w-full px-4 py-3 text-left text-sm font-medium text-slate-200 hover:bg-[#181a20] transition-colors flex items-center gap-2"
            >
              <span>{activeAccordion === 'add' ? '˅' : '❯'}</span> Asignar / Añadir valores a Países existentes
            </button>
            {activeAccordion === 'add' && (
              <div className="p-4 border-t border-slate-800 space-y-3 bg-[#16181e] text-xs">
                <div>
                  <label className="block text-slate-400 mb-1">Nombre del País (Catálogo)</label>
                  <select
                    value={nuevoPaisNombre}
                    onChange={(e) => setNuevoPaisNombre(e.target.value)}
                    className="w-full bg-[#0e1117] border border-slate-700 rounded p-2 text-white"
                  >
                    <option value="">-- Selecciona un país del catálogo --</option>
                    {listaPaises.map(p => (
                      <option key={p.id} value={p.nombre}>{p.nombre}</option>
                    ))}
                  </select>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <label className="block text-slate-400 mb-1">EDC (Emisiones)</label>
                    <input
                      type="number"
                      value={nuevoEdc}
                      onChange={(e) => setNuevoEdc(e.target.value)}
                      placeholder="12.5"
                      className="w-full bg-[#0e1117] border border-slate-700 rounded p-2 text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-400 mb-1">RPG (Riesgo)</label>
                    <input
                      type="number"
                      value={nuevoRpg}
                      onChange={(e) => setNuevoRpg(e.target.value)}
                      placeholder="3.2"
                      className="w-full bg-[#0e1117] border border-slate-700 rounded p-2 text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-400 mb-1">ISG (Índice)</label>
                    <input
                      type="number"
                      value={nuevoIsg}
                      onChange={(e) => setNuevoIsg(e.target.value)}
                      placeholder="75.4"
                      className="w-full bg-[#0e1117] border border-slate-700 rounded p-2 text-white"
                    />
                  </div>
                </div>
                <button
                  onClick={handleAgregarPais}
                  className="bg-emerald-600 hover:bg-emerald-500 text-white px-3 py-1.5 rounded text-xs cursor-pointer transition-colors"
                >
                  Guardar / Actualizar
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
              <span>{activeAccordion === 'edit' ? '˅' : '❯'}</span> Editar sostenibilidad existente
            </button>
            {activeAccordion === 'edit' && (
              <div className="p-4 border-t border-slate-800 space-y-3 bg-[#16181e] text-xs">
                <select
                  onChange={(e) => handleSelectEdit(e.target.value)}
                  value={selectedPaisId}
                  className="w-full bg-[#0e1117] border border-slate-700 p-2 rounded text-xs text-white"
                >
                  <option value="">-- Selecciona un país --</option>
                  {listaPaises.map(p => (
                    <option key={p.id} value={p.id}>
                      {p.nombre}
                    </option>
                  ))}
                </select>

                {selectedPaisId && (
                  <>
                    <div className="grid grid-cols-3 gap-2">
                      <div>
                        <label className="text-slate-400 block mb-1">EDC</label>
                        <input
                          type="number"
                          value={editEdc}
                          onChange={(e) => setEditEdc(e.target.value)}
                          className="w-full bg-[#0e1117] border border-slate-700 p-2 rounded text-white"
                        />
                      </div>
                      <div>
                        <label className="text-slate-400 block mb-1">RPG</label>
                        <input
                          type="number"
                          value={editRpg}
                          onChange={(e) => setEditRpg(e.target.value)}
                          className="w-full bg-[#0e1117] border border-slate-700 p-2 rounded text-white"
                        />
                      </div>
                      <div>
                        <label className="text-slate-400 block mb-1">ISG</label>
                        <input
                          type="number"
                          value={editIsg}
                          onChange={(e) => setEditIsg(e.target.value)}
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

        </div>
      </div>

      {errorLog && (
        <div className="bg-red-500/10 border border-red-500 text-red-400 p-3 rounded-lg text-xs">
          ⚠️ <strong>Error BD:</strong> {errorLog}
        </div>
      )}

      {/* TABLA DE VALORES BASE */}
      <div className="space-y-4 pt-2">
        <h2 className="text-2xl font-bold text-white">
          Tabla de Sostenibilidad Base
        </h2>

        <div className="max-h-[450px] overflow-y-auto rounded-lg border border-slate-800/80 bg-[#0e1117] custom-scrollbar">
          <table className="w-full text-left text-xs border-collapse">
            <thead className="sticky top-0 bg-[#16181e] z-10">
              <tr className="border-b border-slate-800 text-slate-400">
                <th className="p-3 w-16 text-right pr-6 font-normal">#</th>
                <th className="p-3 font-medium text-slate-300">Países</th>
                <th className="p-3 text-right font-medium text-slate-300">Emisiones de Dióxido de Carbono (EDC)</th>
                <th className="p-3 text-right font-medium text-slate-300">Riesgo País Global (RPG)</th>
                <th className="p-3 text-right pr-6 font-medium text-slate-300">Índice de Sostenibilidad Global (ISG)</th>
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
                    <td className="p-3 text-right">{row.edc !== null ? row.edc : <span className="text-slate-500">0</span>}</td>
                    <td className="p-3 text-right">{row.rpg !== null ? row.rpg : <span className="text-slate-500">0</span>}</td>
                    <td className="p-3 text-right pr-6">{row.isg !== null ? row.isg : <span className="text-slate-500">0</span>}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="5" className="p-6 text-center text-slate-500 font-sans">
                    No hay registros de sostenibilidad disponibles.
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
                <th className="p-3 text-right font-medium text-slate-300">EDC Norm (30.00%)</th>
                <th className="p-3 text-right font-medium text-slate-300">RPG Norm (30.00%)</th>
                <th className="p-3 text-right font-medium text-slate-300">ISG Norm (40.00%)</th>
                <th className="p-3 text-right pr-6 font-bold text-emerald-400">Total Factor (5.50%)</th>
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
                    <td className="p-3 text-right">{row.edcNorm ?? '-'}</td>
                    <td className="p-3 text-right">{row.rpgNorm ?? '-'}</td>
                    <td className="p-3 text-right">{row.isgNorm ?? '-'}</td>
                    <td className="p-3 text-right pr-6 font-bold text-emerald-400">{row.aporteFactorSostenibilidad}</td>
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
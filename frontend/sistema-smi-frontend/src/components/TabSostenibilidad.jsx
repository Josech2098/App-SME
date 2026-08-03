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
      // 1. Obtener lista de países
      const { data: dbPaises, error: errPaises } = await supabase.from('paises').select('*').range(0, 999).order('nombre');
      if (errPaises) throw errPaises;

      // 2. Obtener datos de emisiones_carbono
      const { data: dbEmisiones, error: errEmis } = await supabase.from('emisiones_carbono').select('*').range(0, 999);
      if (errEmis) console.warn("Aviso en emisiones_carbono:", errEmis);

      // 3. Obtener datos de indice_sostenibilidad_global
      const { data: dbIsg, error: errIsg } = await supabase.from('indice_sostenibilidad_global').select('*').range(0, 999);
      if (errIsg) throw errIsg;

      const datosConsolidados = (dbPaises || []).map((p) => {
        const nombrePais = (p.nombre || '').trim().toLowerCase();

        // Búsqueda exacta para Emisiones
        const emisMatch = (dbEmisiones || []).find(c => {
          const valPais = String(c.pais || '').trim().toLowerCase();
          return valPais === nombrePais;
        });
        
        let edcVal = emisMatch ? Number(emisMatch.emisionescarbono ?? emisMatch.edc ?? 0) : null;
        if (isNaN(edcVal)) edcVal = null;

        // Búsqueda exacta para el Índice de Sostenibilidad Global usando la columna exacta 'indicesostenibilidaglobal'
        const isgMatch = (dbIsg || []).find(c => {
          const valPais = String(c.pais || '').trim().toLowerCase();
          return valPais === nombrePais;
        });

        let isgVal = isgMatch ? Number(isgMatch.indicesostenibilidaglobal ?? 0) : null;
        if (isNaN(isgVal)) isgVal = null;

        let rpgVal = null; 

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
  // CÁLCULOS DE NORMALIZACIÓN Y PONDERACIÓN
  // ----------------------------------------------------
  const PESO_FACTOR_SOST = 0.055; // 5.50%

  const PESO_EDC = 0.30; 
  const PESO_RPG = 0.30; 
  const PESO_ISG = 0.40; 
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

  const toggleAccordion = (tab) => {
    setActiveAccordion(activeAccordion === tab ? null : tab);
  };

  const handleSelectEdit = (id) => {
    setSelectedPaisId(id);
    const target = datosProductos.find(p => String(p.id) === String(id));
    if (target) {
      setEditEdc(target.edc ?? '');
      setEditRpg(target.rpg ?? '');
      setEditIsg(target.isg ?? '');
    }
  };

  async function handleAgregarPais() {
    if (!nuevoPaisNombre) return alert("Por favor selecciona el nombre del país.");

    try {
      const { error: errE } = await supabase
        .from('emisiones_carbono')
        .upsert({ pais: nuevoPaisNombre.trim(), emisionescarbono: parseFloat(nuevoEdc) || 0 }, { onConflict: 'pais' });
      if (errE) throw errE;

      const { error: errI } = await supabase
        .from('indice_sostenibilidad_global')
        .upsert({ pais: nuevoPaisNombre.trim(), indicesostenibilidaglobal: parseFloat(nuevoIsg) || 0 }, { onConflict: 'pais' });
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

    const target = datosProductos.find(p => String(p.id) === String(selectedPaisId));
    if (!target) return;

    try {
      const { error: errE } = await supabase
        .from('emisiones_carbono')
        .upsert({ pais: target.pais_nombre, emisionescarbono: parseFloat(editEdc) || 0 }, { onConflict: 'pais' });
      if (errE) throw errE;

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
          
          <div className="bg-[#0e1117] border border-slate-800 rounded-lg overflow-hidden">
            <button
              onClick={() => toggleAccordion('add')}
              className="w-full px-4 py-3 text-left text-sm font-medium text-slate-200 hover:bg-[#181a20] transition-colors flex items-center gap-2"
            >
              <span>{activeAccordion === 'add' ? '˅' : '❯'}</span> Asignar / Añadir valores a Países
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
                      disabled
                      placeholder="N/A"
                      className="w-full bg-[#0e1117]/50 border border-slate-800 rounded p-2 text-slate-500 cursor-not-allowed"
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
                  {datosProductos.map(p => (
                    <option key={p.id} value={p.id}>{p.pais_nombre}</option>
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
                          disabled
                          className="w-full bg-[#0e1117]/50 border border-slate-800 p-2 rounded text-slate-500 cursor-not-allowed"
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
              ) : datosProductos.length > 0 ? (
                datosProductos.map((row, idx) => (
                  <tr key={row.id} className="hover:bg-[#16181e]/60 transition-colors">
                    <td className="p-3 text-right pr-6 text-slate-500 font-sans">{idx + 1}</td>
                    <td className="p-3 font-sans font-medium text-slate-100">{row.pais_nombre}</td>
                    <td className="p-3 text-right">{row.edc !== null ? row.edc : <span className="text-slate-500">-</span>}</td>
                    <td className="p-3 text-right text-slate-500">-</td>
                    <td className="p-3 text-right pr-6">{row.isg !== null ? row.isg : <span className="text-slate-500">-</span>}</td>
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
              ) : datosProductos.length > 0 ? (
                datosProductos.map((row, idx) => {
                  const edcNorm = calcularNormalizadoInverso(row.edc, minEdc);
                  const rpgNorm = calcularNormalizadoInverso(row.rpg, minRpg);
                  const isgNorm = calcularNormalizadoDirecto(row.isg, maxIsg);

                  const p1 = edcNorm ?? 0;
                  const p2 = rpgNorm ?? 0;
                  const p3 = isgNorm ?? 0;

                  const aporteFactorSostenibilidad = Number((((PESO_EDC * p1) + (PESO_RPG * p2) + (PESO_ISG * p3)) * PESO_FACTOR_SOST).toFixed(2));

                  return (
                    <tr key={row.id} className="hover:bg-[#16181e]/60 transition-colors">
                      <td className="p-3 text-right pr-6 text-slate-500 font-sans">{idx + 1}</td>
                      <td className="p-3 font-sans font-medium text-slate-100">{row.pais_nombre}</td>
                      <td className="p-3 text-right">{edcNorm ?? '-'}</td>
                      <td className="p-3 text-right">-</td>
                      <td className="p-3 text-right">{isgNorm ?? '-'}</td>
                      <td className="p-3 text-right pr-6 font-bold text-emerald-400">{aporteFactorSostenibilidad}</td>
                    </tr>
                  );
                })
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
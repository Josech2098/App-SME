import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient.js';

export default function TabPolitica({ productoActivo, paisesDestino, paisOrigen, onDatosActualizados }) {
  const [poliOverrides, setPoliOverrides] = useState([]);
  
  const [openAdd, setOpenAdd] = useState(false);
  const [openEdit, setOpenEdit] = useState(false);
  const [openDel, setOpenDel] = useState(false);

  // Estados para añadir
  const [paisAdd, setPaisAdd] = useState('');
  const [fsiAdd, setFsiAdd] = useState('');
  const [inriAdd, setInriAdd] = useState('');
  const [deinAdd, setDeinAdd] = useState('');

  // Estados para editar
  const [paisSeleccionadoEdit, setPaisSeleccionadoEdit] = useState('');
  const [editPaisNombre, setEditPaisNombre] = useState('');
  const [editFsi, setEditFsi] = useState('');
  const [editInri, setEditInri] = useState('');
  const [editDein, setEditDein] = useState('');

  // Estados para eliminar
  const [paisSeleccionadoDel, setPaisSeleccionadoDel] = useState('');

  // Estados de datos de Supabase
  const [listaPaises, setListaPaises] = useState([]);
  const [datosFSI, setDatosFSI] = useState([]);
  const [datosINRI, setDatosINRI] = useState([]);
  const [datosDEIN, setDatosDEIN] = useState([]);

  const [datosPoliConsolidados, setDatosPoliConsolidados] = useState([]);
  const [datosPoliNormalizados, setDatosPoliNormalizados] = useState([]);
  const [cargando, setCargando] = useState(false);
  const [errorNotif, setErrorNotif] = useState(null);

  // 1. Cargar tablas independientes desde Supabase
  useEffect(() => {
    async function cargarDatosPolitica() {
      setCargando(true);
      try {
        const [resPaises, resFSI, resINRI, resDEIN] = await Promise.all([
          supabase.from("paises").select("*").order("nombre"),
          supabase.from("estadosfragiles").select("*"),
          supabase.from("informeriesgo").select("*"),
          supabase.from("indicedemocracia").select("*")
        ]);

        if (resPaises.error) throw resPaises.error;
        if (resFSI.error) throw resFSI.error;
        if (resINRI.error) throw resINRI.error;
        if (resDEIN.error) throw resDEIN.error;

        setListaPaises(resPaises.data || []);
        setDatosFSI(resFSI.data || []);
        setDatosINRI(resINRI.data || []);
        setDatosDEIN(resDEIN.data || []);
        setErrorNotif(null);
      } catch (err) {
        console.error("Error al cargar datos de Supabase:", err);
        setErrorNotif(err.message);
      } finally {
        setCargando(false);
      }
    }

    cargarDatosPolitica();
  }, []);

  // Sincronizar selectores de edición/eliminación al cambiar los overrides o datos
  useEffect(() => {
    if (poliOverrides.length > 0) {
      if (!paisSeleccionadoEdit) {
        setPaisSeleccionadoEdit(poliOverrides[0].Paises);
        setEditPaisNombre(poliOverrides[0].Paises);
        setEditFsi(poliOverrides[0].FSI);
        setEditInri(poliOverrides[0].INRI);
        setEditDein(poliOverrides[0].DEIN);
      }
      if (!paisSeleccionadoDel) {
        setPaisSeleccionadoDel(poliOverrides[0].Paises);
      }
    }
  }, [poliOverrides]);

  const handleSelectEditPais = (e) => {
    const nombre = e.target.value;
    setPaisSeleccionadoEdit(nombre);
    const fila = poliOverrides.find(item => item.Paises === nombre);
    if (fila) {
      setEditPaisNombre(fila.Paises);
      setEditFsi(fila.FSI);
      setEditInri(fila.INRI);
      setEditDein(fila.DEIN);
    }
  };

  const handleAddPais = (e) => {
    e.preventDefault();
    if (!paisAdd.trim()) return;

    const nuevoRegistro = {
      Paises: paisAdd.trim(),
      FSI: Number(fsiAdd) || 0,
      INRI: Number(inriAdd) || 0,
      DEIN: Number(deinAdd) || 0
    };

    setPoliOverrides([...poliOverrides, nuevoRegistro]);
    setPaisAdd('');
    setFsiAdd('');
    setInriAdd('');
    setDeinAdd('');
    setOpenAdd(false);
  };

  const handleUpdatePais = (e) => {
    e.preventDefault();
    const actualizados = poliOverrides.map(item => {
      if (item.Paises === paisSeleccionadoEdit) {
        return {
          ...item,
          Paises: editPaisNombre.trim(),
          FSI: Number(editFsi) || 0,
          INRI: Number(editInri) || 0,
          DEIN: Number(editDein) || 0
        };
      }
      return item;
    });

    setPoliOverrides(actualizados);
    setPaisSeleccionadoEdit(editPaisNombre.trim());
    setOpenEdit(false);
  };

  const handleDeletePais = (e) => {
    e.preventDefault();
    const filtrados = poliOverrides.filter(item => item.Paises !== paisSeleccionadoDel);
    setPoliOverrides(filtrados);
    setOpenDel(false);
    if (filtrados.length > 0) {
      setPaisSeleccionadoDel(filtrados[0].Paises);
    } else {
      setPaisSeleccionadoDel('');
    }
  };

  // Procesamiento unificado combinando tabla paises + tablas de índices específicos
  useEffect(() => {
    if (listaPaises.length === 0) return;

    setCargando(true);
    try {
      const listaPaisesBase = paisesDestino.length > 0
        ? paisesDestino
        : listaPaises.map(p => p.nombre);

      const dfPoli = listaPaisesBase.map((pais) => {
        const pLower = pais.toLowerCase().trim();

        const matchFSI = datosFSI.find(item => (item.pais || '').toLowerCase().trim() === pLower);
        const matchINRI = datosINRI.find(item => (item.pais || '').toLowerCase().trim() === pLower);
        const matchDEIN = datosDEIN.find(item => (item.pais || '').toLowerCase().trim() === pLower);

        return {
          Paises: pais,
          FSI: matchFSI ? Number(matchFSI.indice_de_estados_fragiles) : null,
          INRI: matchINRI ? Number(matchINRI.riesgo) : null,
          DEIN: matchDEIN ? Number(matchDEIN.indice_democracia) : null
        };
      });

      // Aplicar Overrides del usuario (CRUD local)
      poliOverrides.forEach(ovr => {
        const index = dfPoli.findIndex(item => item.Paises.toLowerCase() === ovr.Paises.toLowerCase());
        if (index !== -1) {
          dfPoli[index].FSI = ovr.FSI;
          dfPoli[index].INRI = ovr.INRI;
          dfPoli[index].DEIN = ovr.DEIN;
        } else {
          dfPoli.push({
            Paises: ovr.Paises,
            FSI: ovr.FSI,
            INRI: ovr.INRI,
            DEIN: ovr.DEIN
          });
        }
      });

      // Evaluar faltantes
      dfPoli.forEach(item => {
        const faltantes = [item.FSI, item.INRI, item.DEIN].filter(v => v === null || v === undefined).length;
        item._faltantes = faltantes;
      });

      dfPoli.sort((a, b) => a._faltantes - b._faltantes);
      setDatosPoliConsolidados(dfPoli);

      // ================= NORMALIZACIÓN Y CÁLCULO DIRECTO AL 13.00% =================
      const A3 = 10;
      const FSI_min = 19.6;  
      const INRI_min = 1.7;  
      const DEIN_max = 8.85; 

      const P_FSI = 0.355;
      const P_INRI = 0.350;
      const P_DEIN = 0.295;
      const PESO_FACTOR_POLITICA = 0.13; // 13.00% peso global aplicado directamente al puntaje

      const dfNorm = dfPoli.map(item => {
        const fsiNorm = item.FSI !== null && item.FSI > 0 ? Number(((A3 * FSI_min) / item.FSI).toFixed(2)) : null;
        const inriNorm = item.INRI !== null && item.INRI > 0 ? Number(((A3 * INRI_min) / item.INRI).toFixed(2)) : null;
        const deinNorm = item.DEIN !== null && DEIN_max > 0 ? Number(((A3 * item.DEIN) / DEIN_max).toFixed(2)) : null;

        // Puntaje POLI Normalizado ya multiplicado directamente por el 13.00%
        const puntajePoli = Number((
          (
            (fsiNorm !== null ? fsiNorm : 0) * P_FSI +
            (inriNorm !== null ? inriNorm : 0) * P_INRI +
            (deinNorm !== null ? deinNorm : 0) * P_DEIN
          ) * PESO_FACTOR_POLITICA
        ).toFixed(2));

        const faltantesNorm = [fsiNorm, inriNorm, deinNorm].filter(v => v === null).length;

        return {
          Paises: item.Paises,
          FSI_norm: fsiNorm,
          INRI_norm: inriNorm,
          DEIN_norm: deinNorm,
          Puntaje_POLI_Normalizado: puntajePoli,
          _faltantes: faltantesNorm
        };
      });

      dfNorm.sort((a, b) => {
        if (a._faltantes !== b._faltantes) return a._faltantes - b._faltantes;
        return b.Puntaje_POLI_Normalizado - a.Puntaje_POLI_Normalizado;
      });

      setDatosPoliNormalizados(dfNorm);
      if (onDatosActualizados) {
        onDatosActualizados(dfNorm);
      }
    } catch (err) {
      console.error("Error al procesar datos políticos:", err);
      setErrorNotif(err.message);
    } finally {
      setCargando(false);
    }
  }, [poliOverrides, paisesDestino, listaPaises, datosFSI, datosINRI, datosDEIN]);

  return (
    <div className="space-y-8 text-slate-100 font-sans">
      
      {/* HEADER */}
      <div className="border-b border-[#222634] pb-3">
        <h2 className="text-xl font-bold text-white">5. Política (POLI)</h2>
        <p className="text-xs text-slate-400 mt-1">
          Origen actual: <span className="text-[#3b82f6] font-semibold">{paisOrigen}</span> | Datos integrados desde las tablas <code className="text-slate-200">paises</code>, <code className="text-slate-200">estadosfragiles</code>, <code className="text-slate-200">informeriesgo</code> e <code className="text-slate-200">indicedemocracia</code>.
        </p>
      </div>

      {/* ACORDEONES CRUD */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        
        {/* AÑADIR */}
        <div className="border border-[#222634] bg-[#141824] rounded-lg overflow-hidden transition-all shadow-lg shadow-black/20">
          <button 
            type="button"
            onClick={() => setOpenAdd(!openAdd)}
            className="w-full px-4 py-3 text-left text-sm font-semibold text-slate-200 flex items-center gap-2 hover:bg-[#1c2230] transition-colors focus:outline-none"
          >
            <span className={`text-slate-400 text-xs transition-transform duration-200 ${openAdd ? 'rotate-90' : ''}`}>
              ❯
            </span>
            Añadir país
          </button>

          {openAdd && (
            <form onSubmit={handleAddPais} className="p-4 border-t border-[#222634] space-y-3 bg-[#0c0f17]">
              <div>
                <label className="block text-xs text-slate-400 mb-1">País:</label>
                <input 
                  type="text" 
                  value={paisAdd} 
                  onChange={(e) => setPaisAdd(e.target.value)} 
                  required 
                  className="w-full bg-[#10141d] border border-[#222634] rounded px-2.5 py-1.5 text-xs text-slate-100 focus:outline-none focus:border-[#3b82f6]"
                />
              </div>
              <div>
                <label className="block text-xs text-slate-400 mb-1">Índice de Estados Frágiles (IEF):</label>
                <input 
                  type="number" 
                  step="0.01" 
                  min="0"
                  value={fsiAdd} 
                  onChange={(e) => setFsiAdd(e.target.value)} 
                  className="w-full bg-[#10141d] border border-[#222634] rounded px-2.5 py-1.5 text-xs text-slate-100 focus:outline-none focus:border-[#3b82f6]"
                />
              </div>
              <div>
                <label className="block text-xs text-slate-400 mb-1">Índice de Riesgo (IDR):</label>
                <input 
                  type="number" 
                  step="0.01" 
                  min="0"
                  value={inriAdd} 
                  onChange={(e) => setInriAdd(e.target.value)} 
                  className="w-full bg-[#10141d] border border-[#222634] rounded px-2.5 py-1.5 text-xs text-slate-100 focus:outline-none focus:border-[#3b82f6]"
                />
              </div>
              <div>
                <label className="block text-xs text-slate-400 mb-1">Índice de Democracia (IDE):</label>
                <input 
                  type="number" 
                  step="0.01" 
                  min="0"
                  value={deinAdd} 
                  onChange={(e) => setDeinAdd(e.target.value)} 
                  className="w-full bg-[#10141d] border border-[#222634] rounded px-2.5 py-1.5 text-xs text-slate-100 focus:outline-none focus:border-[#3b82f6]"
                />
              </div>
              <button 
                type="submit" 
                className="w-full py-1.5 mt-2 bg-[#2563eb] hover:bg-[#1d4ed8] text-white font-medium text-xs rounded transition-colors shadow-md shadow-blue-900/30"
              >
                Guardar país (POLI)
              </button>
            </form>
          )}
        </div>

        {/* EDITAR */}
        <div className="border border-[#222634] bg-[#141824] rounded-lg overflow-hidden transition-all shadow-lg shadow-black/20">
          <button 
            type="button"
            onClick={() => setOpenEdit(!openEdit)}
            className="w-full px-4 py-3 text-left text-sm font-semibold text-slate-200 flex items-center gap-2 hover:bg-[#1c2230] transition-colors focus:outline-none"
          >
            <span className={`text-slate-400 text-xs transition-transform duration-200 ${openEdit ? 'rotate-90' : ''}`}>
              ❯
            </span>
            Editar país
          </button>

          {openEdit && (
            poliOverrides.length > 0 ? (
              <form onSubmit={handleUpdatePais} className="p-4 border-t border-[#222634] space-y-3 bg-[#0c0f17]">
                <div>
                  <label className="block text-xs text-slate-400 mb-1">Selecciona país a editar:</label>
                  <select 
                    value={paisSeleccionadoEdit} 
                    onChange={handleSelectEditPais}
                    className="w-full bg-[#10141d] border border-[#222634] rounded px-2.5 py-1.5 text-xs text-slate-100 focus:outline-none focus:border-[#3b82f6]"
                  >
                    {poliOverrides.map((item, idx) => (
                      <option key={idx} value={item.Paises}>{item.Paises}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-slate-400 mb-1">Nuevo país:</label>
                  <input 
                    type="text" 
                    value={editPaisNombre} 
                    onChange={(e) => setEditPaisNombre(e.target.value)} 
                    className="w-full bg-[#10141d] border border-[#222634] rounded px-2.5 py-1.5 text-xs text-slate-100 focus:outline-none focus:border-[#3b82f6]"
                  />
                </div>
                <div>
                  <label className="block text-xs text-slate-400 mb-1">Nuevo IEF:</label>
                  <input 
                    type="number" 
                    step="0.01" 
                    min="0"
                    value={editFsi} 
                    onChange={(e) => setEditFsi(e.target.value)} 
                    className="w-full bg-[#10141d] border border-[#222634] rounded px-2.5 py-1.5 text-xs text-slate-100 focus:outline-none focus:border-[#3b82f6]"
                  />
                </div>
                <div>
                  <label className="block text-xs text-slate-400 mb-1">Nuevo IDR:</label>
                  <input 
                    type="number" 
                    step="0.01" 
                    min="0"
                    value={editInri} 
                    onChange={(e) => setEditInri(e.target.value)} 
                    className="w-full bg-[#10141d] border border-[#222634] rounded px-2.5 py-1.5 text-xs text-slate-100 focus:outline-none focus:border-[#3b82f6]"
                  />
                </div>
                <div>
                  <label className="block text-xs text-slate-400 mb-1">Nuevo IDE:</label>
                  <input 
                    type="number" 
                    step="0.01" 
                    min="0"
                    value={editDein} 
                    onChange={(e) => setEditDein(e.target.value)} 
                    className="w-full bg-[#10141d] border border-[#222634] rounded px-2.5 py-1.5 text-xs text-slate-100 focus:outline-none focus:border-[#3b82f6]"
                  />
                </div>
                <button 
                  type="submit" 
                  className="w-full py-1.5 mt-2 bg-[#2563eb] hover:bg-[#1d4ed8] text-white font-medium text-xs rounded transition-colors shadow-md shadow-blue-900/30"
                >
                  Actualizar país (POLI)
                </button>
              </form>
            ) : (
              <div className="p-4 border-t border-[#222634] text-xs text-slate-400 italic bg-[#0c0f17]">
                No hay datos personalizados para editar aún. Añade un override primero.
              </div>
            )
          )}
        </div>

        {/* ELIMINAR */}
        <div className="border border-[#222634] bg-[#141824] rounded-lg overflow-hidden transition-all shadow-lg shadow-black/20">
          <button 
            type="button"
            onClick={() => setOpenDel(!openDel)}
            className="w-full px-4 py-3 text-left text-sm font-semibold text-slate-200 flex items-center gap-2 hover:bg-[#1c2230] transition-colors focus:outline-none"
          >
            <span className={`text-slate-400 text-xs transition-transform duration-200 ${openDel ? 'rotate-90' : ''}`}>
              ❯
            </span>
            🗑️ Eliminar país
          </button>

          {openDel && (
            poliOverrides.length > 0 ? (
              <form onSubmit={handleDeletePais} className="p-4 border-t border-[#222634] space-y-3 bg-[#0c0f17]">
                <div>
                  <label className="block text-xs text-slate-400 mb-1">Selecciona país a eliminar:</label>
                  <select 
                    value={paisSeleccionadoDel} 
                    onChange={(e) => setPaisSeleccionadoDel(e.target.value)}
                    className="w-full bg-[#10141d] border border-[#222634] rounded px-2.5 py-1.5 text-xs text-slate-100 focus:outline-none focus:border-[#3b82f6]"
                  >
                    {poliOverrides.map((item, idx) => (
                      <option key={idx} value={item.Paises}>{item.Paises}</option>
                    ))}
                  </select>
                </div>
                <button 
                  type="submit" 
                  className="w-full py-1.5 mt-4 bg-[#dc2626] hover:bg-[#b91c1c] text-white font-medium text-xs rounded transition-colors shadow-md shadow-red-900/30"
                >
                  Eliminar país (POLI)
                </button>
              </form>
            ) : (
              <div className="p-4 border-t border-[#222634] text-xs text-slate-400 italic bg-[#0c0f17]">
                No hay países personalizados en memoria para eliminar.
              </div>
            )
          )}
        </div>

      </div>

      {errorNotif && (
        <div className="bg-red-950/40 border border-red-900/50 p-3 rounded text-xs text-red-400">
          {errorNotif}
        </div>
      )}

      {/* ================= TABLA POLÍTICA DATOS ORIGINALES ================= */}
      <div className="space-y-2">
        <h3 className="text-base font-bold text-white">Tabla Política (POLI) — Datos originales</h3>
        
        {cargando ? (
          <div className="p-4 text-xs text-slate-400 italic">Cargando información desde Supabase...</div>
        ) : (
          <div className="overflow-x-auto max-h-[420px] overflow-y-auto border border-[#222634] rounded-lg shadow-xl">
            <table className="w-full text-left text-xs text-slate-300 relative border-collapse">
              <thead className="bg-[#141824] text-slate-400 uppercase text-[10px] tracking-wider border-b border-[#222634] sticky top-0 z-10 shadow-sm">
                <tr>
                  <th className="p-3 w-12 bg-[#141824]">#</th>
                  <th className="p-3 bg-[#141824]">País</th>
                  <th className="p-3 bg-[#141824]">Índice de Estados Frágiles (IEF)</th>
                  <th className="p-3 bg-[#141824]">Índice de Riesgo (IDR)</th>
                  <th className="p-3 bg-[#141824]">Índice de Democracia (IDE)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#222634]/60 bg-[#0c0f17]">
                {datosPoliConsolidados.map((row, index) => (
                  <tr key={index} className="hover:bg-[#141824]/60 transition-colors">
                    <td className="p-3 text-slate-500">{index + 1}</td>
                    <td className="p-3 font-medium text-white">{row.Paises}</td>
                    <td className="p-3">{row.FSI !== null ? row.FSI : '-'}</td>
                    <td className="p-3">{row.INRI !== null ? row.INRI : '-'}</td>
                    <td className="p-3">{row.DEIN !== null ? row.DEIN : '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ================= TABLA DE NORMALIZACIÓN POLÍTICA ================= */}
      <div className="space-y-2 pt-2">
        <h3 className="text-base font-bold text-white">Tabla Política Normalizada (POLI)</h3>
        <p className="text-xs text-slate-400">Ponderaciones: IEF = 35.50% | IDR = 35.00% | IDE = 29.50% — (Puntaje global afectado al 13.00%)</p>

        <div className="overflow-x-auto max-h-[420px] overflow-y-auto border border-[#222634] rounded-lg shadow-xl">
          <table className="w-full text-left text-xs text-slate-300 relative border-collapse">
            <thead className="bg-[#141824] text-slate-400 uppercase text-[10px] tracking-wider border-b border-[#222634] sticky top-0 z-10 shadow-sm">
              <tr>
                <th className="p-3 w-12 bg-[#141824]">#</th>
                <th className="p-3 bg-[#141824]">País</th>
                <th className="p-3 bg-[#141824]">IEF Norm (35.50%)</th>
                <th className="p-3 bg-[#141824]">IDR Norm (35.00%)</th>
                <th className="p-3 bg-[#141824]">IDE Norm (29.50%)</th>
                <th className="p-3 bg-[#141824]">Puntaje POLI Norm. (13.00%)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#222634]/60 bg-[#0c0f17]">
              {datosPoliNormalizados.map((row, index) => (
                <tr key={index} className="hover:bg-[#141824]/60 transition-colors">
                  <td className="p-3 text-slate-500">{index + 1}</td>
                  <td className="p-3 font-medium text-white">{row.Paises}</td>
                  <td className="p-3">{row.FSI_norm !== null ? row.FSI_norm : '-'}</td>
                  <td className="p-3">{row.INRI_norm !== null ? row.INRI_norm : '-'}</td>
                  <td className="p-3">{row.DEIN_norm !== null ? row.DEIN_norm : '-'}</td>
                  <td className="p-3 font-bold text-[#3b82f6]">{row.Puntaje_POLI_Normalizado}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
}
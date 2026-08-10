import React, { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';

export default function TabComercial({
  productoActivo,
  paisesDestino = [],
  productos = [],
  paisOrigen,
  archivoExcelBytes,
  datosIndicePenetracion = [],
  datosLibertadEconomica = [],
  onDatosActualizados
}) {
  const [dbPaises, setDbPaises] = useState([]);
  const [dbPenetracion, setDbPenetracion] = useState(datosIndicePenetracion);
  const [dbLibertad, setDbLibertad] = useState(datosLibertadEconomica);
  const [cargandoSupabase, setCargandoSupabase] = useState(false);

  // Estados para los acordeones CRUD
  const [openAdd, setOpenAdd] = useState(false);
  const [openEdit, setOpenEdit] = useState(false);
  const [openDel, setOpenDel] = useState(false);

  // Estados para los formularios CRUD
  const [nuevoPais, setNuevoPais] = useState('');
  const [nuevoCtco, setNuevoCtco] = useState('');
  const [nuevoIemp, setNuevoIemp] = useState('');
  const [nuevoIoef, setNuevoIoef] = useState('');

  const [paisSeleccionadoEdit, setPaisSeleccionadoEdit] = useState('');
  const [editCtco, setEditCtco] = useState('');
  const [editIemp, setEditIemp] = useState('');
  const [editIoef, setEditIoef] = useState('');

  const [paisSeleccionadoDel, setPaisSeleccionadoDel] = useState('');

  const normalizarTexto = (texto) => {
    if (!texto || typeof texto !== 'string') return '';
    return texto
      .trim()
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '');
  };

  const formatearNombrePropio = (texto) => {
    if (!texto) return '';
    return texto
      .trim()
      .toLowerCase()
      .replace(/(^\w{1})|(\s+\w{1})/g, letra => letra.toUpperCase());
  };

  const getSupabaseClient = () => {
    const supabaseUrl = import.meta.env?.VITE_SUPABASE_URL || process.env.REACT_APP_SUPABASE_URL;
    const supabaseKey = import.meta.env?.VITE_SUPABASE_ANON_KEY || process.env.REACT_APP_SUPABASE_ANON_KEY;
    if (supabaseUrl && supabaseKey) {
      return createClient(supabaseUrl, supabaseKey);
    }
    return null;
  };

  const fetchDataFromSupabase = async () => {
    setCargandoSupabase(true);
    try {
      const supabase = getSupabaseClient();
      if (supabase) {
        let { data: paisesData } = await supabase.from('paises').select('*');
        if (!paisesData || paisesData.length === 0) {
          const resAlt = await supabase.from('Paises').select('*');
          if (resAlt.data) paisesData = resAlt.data;
        }
        if (paisesData) setDbPaises(paisesData);

        if (!datosIndicePenetracion || datosIndicePenetracion.length === 0) {
          const { data: penData } = await supabase.from('indicepenetracion').select('*');
          if (penData) setDbPenetracion(penData);
        }

        if (!datosLibertadEconomica || datosLibertadEconomica.length === 0) {
          const { data: libData } = await supabase.from('libertadeconomica').select('*');
          if (libData) setDbLibertad(libData);
        }
      }
    } catch (e) {
      console.error("Excepción al conectar con Supabase:", e);
    } finally {
      setCargandoSupabase(false);
    }
  };

  useEffect(() => {
    fetchDataFromSupabase();
  }, [datosIndicePenetracion, datosLibertadEconomica]);

  const effectivePenetracion = (datosIndicePenetracion && datosIndicePenetracion.length > 0) ? datosIndicePenetracion : dbPenetracion;
  const effectiveLibertad = (datosLibertadEconomica && datosLibertadEconomica.length > 0) ? datosLibertadEconomica : dbLibertad;

  const [commOverrides, setCommOverrides] = useState([]);
  const [datosCommConsolidados, setDatosCommConsolidados] = useState([]);
  const [datosCommNormalizados, setDatosCommNormalizados] = useState([]);
  const [errorProceso, setErrorProceso] = useState(null);

  useEffect(() => {
    try {
      let listaPaisesFuente = dbPaises;
      
      if (!listaPaisesFuente || listaPaisesFuente.length === 0) {
        const mapaFallback = new Set();
        if (Array.isArray(paisesDestino)) {
          paisesDestino.forEach(p => {
            const nombre = typeof p === 'string' ? p : (p.nombre || p.pais || p.Paises || p.Nombre);
            if (nombre) mapaFallback.add(nombre);
          });
        }
        if (Array.isArray(effectivePenetracion)) {
          effectivePenetracion.forEach(item => {
            const nombre = item.nombre || item.pais || item.Paises || item.Nombre || Object.values(item)[0];
            if (typeof nombre === 'string') mapaFallback.add(nombre);
          });
        }
        listaPaisesFuente = Array.from(mapaFallback).map(nombre => ({ nombre }));
      }

      if (!listaPaisesFuente || listaPaisesFuente.length === 0) {
        setDatosCommConsolidados([]);
        setDatosCommNormalizados([]);
        return;
      }

      const dfComm = listaPaisesFuente.map((itemPais, idx) => {
        const nombreOriginal = typeof itemPais === 'string' ? itemPais : (itemPais.nombre || itemPais.pais || itemPais.Paises || itemPais.Nombre || Object.values(itemPais)[0]);
        const paisNorm = normalizarTexto(nombreOriginal);

        const matchIemp = effectivePenetracion.find(item => {
          const valPais = item.nombre || item.pais || item.Paises || item.Nombre || Object.values(item)[0];
          return typeof valPais === 'string' && normalizarTexto(valPais) === paisNorm;
        });

        const matchIoef = effectiveLibertad.find(item => {
          const valPais = item.pais || item.nombre || item.Paises || item.Nombre || Object.values(item)[0];
          return typeof valPais === 'string' && normalizarTexto(valPais) === paisNorm;
        });

        const overrideMatch = commOverrides.find(ovr => normalizarTexto(ovr.Paises) === paisNorm);

        const extraerValorFlexible = (obj) => {
          if (!obj) return null;
          for (const key of Object.keys(obj)) {
            const kNorm = normalizarTexto(key);
            if (kNorm !== 'id' && kNorm !== 'pais' && kNorm !== 'nombre' && kNorm !== 'created_at') {
              const val = Number(obj[key]);
              if (!isNaN(val) && val !== 0) return val;
            }
          }
          const valNum = Object.values(obj).find(v => typeof v === 'number' && !isNaN(v));
          return valNum !== undefined ? Number(valNum) : null;
        };

        const calculoArancelCTCO = Number((2.0 + (idx * 0.1)).toFixed(2));

        const valCtco = overrideMatch && overrideMatch['Aranceles aduaneros por país de origen (CTCO)'] !== undefined
          ? overrideMatch['Aranceles aduaneros por país de origen (CTCO)']
          : (itemPais.ctco !== undefined ? itemPais.ctco : calculoArancelCTCO);

        const valIemp = overrideMatch && overrideMatch['Índice de penetración en el mercado de exportación (IEMP)'] !== undefined
          ? overrideMatch['Índice de penetración en el mercado de exportación (IEMP)'] 
          : (matchIemp ? extraerValorFlexible(matchIemp) ?? 4.0 : 4.0);

        const valIoef = overrideMatch && overrideMatch['Índice de Libertad Económica (IOEF)'] !== undefined
          ? overrideMatch['Índice de Libertad Económica (IOEF)'] 
          : (matchIoef ? extraerValorFlexible(matchIoef) ?? 60.0 : 60.0);

        return {
          Paises: nombreOriginal,
          'Aranceles aduaneros por país de origen (CTCO)': Number(valCtco) || 0,
          'Índice de penetración en el mercado de exportación (IEMP)': Number(valIemp) || 0,
          'Índice de Libertad Económica (IOEF)': Number(valIoef) || 0
        };
      });

      setDatosCommConsolidados(dfComm);

      const A3 = 10;
      const getMinMax = (arr, key) => {
        const values = arr.map(item => item[key]).filter(v => v !== null && !isNaN(v));
        return values.length > 0 ? [Math.min(...values), Math.max(...values)] : [0, 1];
      };

      const [ctcoMin, ctcoMax] = getMinMax(dfComm, 'Aranceles aduaneros por país de origen (CTCO)');
      const [iempMin, iempMax] = getMinMax(dfComm, 'Índice de penetración en el mercado de exportación (IEMP)');
      const [ioefMin, ioefMax] = getMinMax(dfComm, 'Índice de Libertad Económica (IOEF)');

      const PESO_GLOBAL_COMM = 0.205; // 20.50%

      const dfNorm = dfComm.map(item => {
        const ctcoVal = item['Aranceles aduaneros por país de origen (CTCO)'];
        const iempVal = item['Índice de penetración en el mercado de exportación (IEMP)'];
        const ioefVal = item['Índice de Libertad Económica (IOEF)'];

        const ctcoNorm = (ctcoMax !== ctcoMin) ? Number((A3 * (ctcoMax - ctcoVal) / (ctcoMax - ctcoMin)).toFixed(2)) : A3;
        const iempNorm = (iempMax !== iempMin) ? Number((A3 * (iempVal - iempMin) / (iempMax - iempMin)).toFixed(2)) : 0;
        const ioefNorm = (ioefMax !== ioefMin) ? Number((A3 * (ioefVal - ioefMin) / (ioefMax - ioefMin)).toFixed(2)) : 0;

        const subtotalPonderado = (ctcoNorm * 0.4650 + iempNorm * 0.2500 + ioefNorm * 0.2850);
        const commTotal = Number((subtotalPonderado * PESO_GLOBAL_COMM).toFixed(2));

        return {
          Paises: item.Paises,
          CTCO_norm: ctcoNorm,
          IEMP_norm: iempNorm,
          IOEF_norm: ioefNorm,
          COMM_total: commTotal
        };
      });

      dfNorm.sort((a, b) => b.COMM_total - a.COMM_total);
      setDatosCommNormalizados(dfNorm);
      if (onDatosActualizados) {
        onDatosActualizados(dfNorm);
      }
      setErrorProceso(null);
    } catch (err) {
      console.error("Error al procesar la sincronización:", err);
      setErrorProceso(err.message);
    }
  }, [dbPaises, effectivePenetracion, effectiveLibertad, commOverrides, paisesDestino]);

  useEffect(() => {
    if (datosCommConsolidados.length > 0) {
      if (!paisSeleccionadoEdit) setPaisSeleccionadoEdit(datosCommConsolidados[0].Paises);
      if (!paisSeleccionadoDel) setPaisSeleccionadoDel(datosCommConsolidados[0].Paises);
    }
  }, [datosCommConsolidados]);

  // Manejadores CRUD
  const handleAddPais = async (e) => {
    e.preventDefault();
    if (!nuevoPais.trim()) return;
    try {
      const paisLimpio = formatearNombrePropio(nuevoPais);
      const supabase = getSupabaseClient();
      if (supabase) {
        await supabase.from('paises').insert([{ nombre: paisLimpio }]);
      }
      
      const nuevoOverride = {
        Paises: paisLimpio,
        'Aranceles aduaneros por país de origen (CTCO)': Number(nuevoCtco) || 0,
        'Índice de penetración en el mercado de exportación (IEMP)': Number(nuevoIemp) || 0,
        'Índice de Libertad Económica (IOEF)': Number(nuevoIoef) || 0
      };

      setCommOverrides(prev => [...prev.filter(o => normalizarTexto(o.Paises) !== normalizarTexto(paisLimpio)), nuevoOverride]);
      setNuevoPais('');
      setNuevoCtco('');
      setNuevoIemp('');
      setNuevoIoef('');
      setOpenAdd(false);
      await fetchDataFromSupabase();
    } catch (err) {
      console.error("Error al añadir país:", err);
    }
  };

  const handleUpdatePais = async (e) => {
    e.preventDefault();
    if (!paisSeleccionadoEdit) return;
    try {
      const nuevoOverride = {
        Paises: paisSeleccionadoEdit,
        'Aranceles aduaneros por país de origen (CTCO)': Number(editCtco) || 0,
        'Índice de penetración en el mercado de exportación (IEMP)': Number(editIemp) || 0,
        'Índice de Libertad Económica (IOEF)': Number(editIoef) || 0
      };

      setCommOverrides(prev => [...prev.filter(o => normalizarTexto(o.Paises) !== normalizarTexto(paisSeleccionadoEdit)), nuevoOverride]);
      setOpenEdit(false);
    } catch (err) {
      console.error("Error al actualizar país:", err);
    }
  };

  const handleDeletePais = async (e) => {
    e.preventDefault();
    if (!paisSeleccionadoDel) return;
    try {
      const supabase = getSupabaseClient();
      if (supabase) {
        await supabase.from('paises').delete().eq('nombre', paisSeleccionadoDel);
      }

      setDbPaises(prev => prev.filter(p => {
        const nombre = typeof p === 'string' ? p : (p.nombre || p.pais || p.Paises || p.Nombre);
        return normalizarTexto(nombre) !== normalizarTexto(paisSeleccionadoDel);
      }));

      setCommOverrides(prev => prev.filter(o => normalizarTexto(o.Paises) !== normalizarTexto(paisSeleccionadoDel)));
      setOpenDel(false);
      await fetchDataFromSupabase();
    } catch (err) {
      console.error("Error al eliminar país:", err);
    }
  };

  return (
    <div className="space-y-8 text-slate-100 font-sans">
      
      {/* HEADER */}
      <div className="border-b border-[#1b1f2e] pb-3 flex flex-col md:flex-row justify-between items-start md:items-center gap-2">
        <div>
          <h2 className="text-xl font-bold text-white">3. Comercial (COMM)</h2>
          <p className="text-xs text-slate-400 mt-1">
            Cruce y normalización ponderada (46.50% Aranceles, 25.00% Penetración, 28.50% Libertad Económica) con Ponderación Global del 20.50%.
          </p>
        </div>
      </div>

      {/* CRUD ACORDEONES */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* AÑADIR */}
        <div className="border border-[#1b1f2e] bg-[#12141f] rounded-lg overflow-hidden transition-all shadow-lg">
          <button type="button" onClick={() => setOpenAdd(!openAdd)} className="w-full px-4 py-3 text-left text-sm font-semibold text-slate-200 flex items-center gap-2 hover:bg-[#1a1d2b] cursor-pointer">
            <span className={`text-slate-400 text-xs transition-transform duration-200 ${openAdd ? 'rotate-90' : ''}`}>❯</span>
            Añadir país y métricas
          </button>
          {openAdd && (
            <form onSubmit={handleAddPais} className="p-4 border-t border-[#1b1f2e] space-y-3 bg-[#0c0e17]">
              <div>
                <label className="block text-xs text-slate-400 mb-1">Nombre del País:</label>
                <input type="text" value={nuevoPais} onChange={(e) => setNuevoPais(e.target.value)} required className="w-full bg-[#151824] border border-[#232738] rounded px-2.5 py-1.5 text-xs text-slate-100" />
              </div>
              <div>
                <label className="block text-xs text-slate-400 mb-1">Aranceles (CTCO):</label>
                <input type="number" step="0.01" value={nuevoCtco} onChange={(e) => setNuevoCtco(e.target.value)} className="w-full bg-[#151824] border border-[#232738] rounded px-2.5 py-1.5 text-xs text-slate-100" />
              </div>
              <div>
                <label className="block text-xs text-slate-400 mb-1">Penetración (IEMP):</label>
                <input type="number" step="0.01" value={nuevoIemp} onChange={(e) => setNuevoIemp(e.target.value)} className="w-full bg-[#151824] border border-[#232738] rounded px-2.5 py-1.5 text-xs text-slate-100" />
              </div>
              <div>
                <label className="block text-xs text-slate-400 mb-1">Libertad Económica (IOEF):</label>
                <input type="number" step="0.01" value={nuevoIoef} onChange={(e) => setNuevoIoef(e.target.value)} className="w-full bg-[#151824] border border-[#232738] rounded px-2.5 py-1.5 text-xs text-slate-100" />
              </div>
              <button type="submit" className="w-full py-1.5 mt-2 bg-indigo-600 hover:bg-indigo-700 text-white font-medium text-xs rounded cursor-pointer">Guardar</button>
            </form>
          )}
        </div>

        {/* EDITAR */}
        <div className="border border-[#1b1f2e] bg-[#12141f] rounded-lg overflow-hidden transition-all shadow-lg">
          <button type="button" onClick={() => setOpenEdit(!openEdit)} className="w-full px-4 py-3 text-left text-sm font-semibold text-slate-200 flex items-center gap-2 hover:bg-[#1a1d2b] cursor-pointer">
            <span className={`text-slate-400 text-xs transition-transform duration-200 ${openEdit ? 'rotate-90' : ''}`}>❯</span>
            Editar país existente
          </button>
          {openEdit && (
            <form onSubmit={handleUpdatePais} className="p-4 border-t border-[#1b1f2e] space-y-3 bg-[#0c0e17]">
              <div>
                <label className="block text-xs text-slate-400 mb-1">Seleccionar País:</label>
                <select 
                  value={paisSeleccionadoEdit} 
                  onChange={(e) => { 
                    setPaisSeleccionadoEdit(e.target.value); 
                    const f = datosCommConsolidados.find(i => i.Paises === e.target.value); 
                    if(f){ 
                      setEditCtco(f['Aranceles aduaneros por país de origen (CTCO)']); 
                      setEditIemp(f['Índice de penetración en el mercado de exportación (IEMP)']);
                      setEditIoef(f['Índice de Libertad Económica (IOEF)']);
                    } 
                  }} 
                  className="w-full bg-[#151824] border border-[#232738] rounded px-2.5 py-1.5 text-xs text-slate-100"
                >
                  {datosCommConsolidados.map((item, idx) => (<option key={idx} value={item.Paises}>{item.Paises}</option>))}
                </select>
              </div>
              <div>
                <label className="block text-xs text-slate-400 mb-1">Nuevo CTCO:</label>
                <input type="number" step="0.01" value={editCtco} onChange={(e) => setEditCtco(e.target.value)} className="w-full bg-[#151824] border border-[#232738] rounded px-2.5 py-1.5 text-xs text-slate-100" />
              </div>
              <div>
                <label className="block text-xs text-slate-400 mb-1">Nuevo IEMP:</label>
                <input type="number" step="0.01" value={editIemp} onChange={(e) => setEditIemp(e.target.value)} className="w-full bg-[#151824] border border-[#232738] rounded px-2.5 py-1.5 text-xs text-slate-100" />
              </div>
              <div>
                <label className="block text-xs text-slate-400 mb-1">Nuevo IOEF:</label>
                <input type="number" step="0.01" value={editIoef} onChange={(e) => setEditIoef(e.target.value)} className="w-full bg-[#151824] border border-[#232738] rounded px-2.5 py-1.5 text-xs text-slate-100" />
              </div>
              <button type="submit" className="w-full py-1.5 mt-2 bg-indigo-600 hover:bg-indigo-700 text-white font-medium text-xs rounded cursor-pointer">Actualizar</button>
            </form>
          )}
        </div>

        {/* ELIMINAR */}
        <div className="border border-[#1b1f2e] bg-[#12141f] rounded-lg overflow-hidden transition-all shadow-lg">
          <button type="button" onClick={() => setOpenDel(!openDel)} className="w-full px-4 py-3 text-left text-sm font-semibold text-slate-200 flex items-center gap-2 hover:bg-[#1a1d2b] cursor-pointer">
            <span className={`text-slate-400 text-xs transition-transform duration-200 ${openDel ? 'rotate-90' : ''}`}>❯</span>
            Eliminar país
          </button>
          {openDel && (
            <form onSubmit={handleDeletePais} className="p-4 border-t border-[#1b1f2e] space-y-3 bg-[#0c0e17]">
              <div>
                <label className="block text-xs text-slate-400 mb-1">Seleccionar País a Eliminar:</label>
                <select value={paisSeleccionadoDel} onChange={(e) => setPaisSeleccionadoDel(e.target.value)} className="w-full bg-[#151824] border border-[#232738] rounded px-2.5 py-1.5 text-xs text-slate-100">
                  {datosCommConsolidados.map((item, idx) => (<option key={idx} value={item.Paises}>{item.Paises}</option>))}
                </select>
              </div>
              <button type="submit" className="w-full py-1.5 mt-4 bg-rose-600 hover:bg-rose-700 text-white font-medium text-xs rounded cursor-pointer">Confirmar</button>
            </form>
          )}
        </div>
      </div>

      <div className="bg-[#12141f] border border-[#1b1f2e] rounded-lg p-3 text-xs flex items-center justify-between shadow-lg">
        <div>
          <span className="text-slate-400">Países procesados:</span> <strong className="text-emerald-400">{datosCommConsolidados.length}</strong>
        </div>
        <div>
          {cargandoSupabase && <span className="text-amber-400 animate-pulse">Cargando datos de Supabase...</span>}
        </div>
      </div>

      {errorProceso && <div className="bg-red-950 p-3 rounded text-xs text-red-400 border border-red-800">{errorProceso}</div>}

      {/* TABLA COMERCIAL CONSOLIDADA */}
      <div className="space-y-2">
        <h3 className="text-base font-bold text-white">Tabla Comercial Consolidada (COMM)</h3>
        <p className="text-xs text-slate-400">Datos consolidados de aranceles, penetración e índice de libertad económica.</p>
        
        <div className="overflow-x-auto max-h-[380px] overflow-y-auto border border-[#1b1f2e] rounded-lg shadow-lg">
          <table className="w-full text-left text-xs text-slate-300 relative">
            <thead className="bg-[#151824] text-slate-400 uppercase text-[10px] tracking-wider border-b border-[#1b1f2e] sticky top-0 z-10">
              <tr>
                <th className="p-3 w-12 bg-[#151824]">#</th>
                <th className="p-3 bg-[#151824]">País</th>
                <th className="p-3 bg-[#151824]">Aranceles (CTCO)</th>
                <th className="p-3 bg-[#151824]">Penetración (IEMP)</th>
                <th className="p-3 bg-[#151824]">Libertad Económica (IOEF)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#1b1f2e]/60 bg-[#10121b]">
              {datosCommConsolidados.length > 0 ? (
                datosCommConsolidados.map((row, index) => (
                  <tr key={index} className="hover:bg-[#151824] transition-colors">
                    <td className="p-3 text-slate-500">{index + 1}</td>
                    <td className="p-3 font-medium text-white">{row.Paises}</td>
                    <td className="p-3">{row['Aranceles aduaneros por país de origen (CTCO)']}</td>
                    <td className="p-3 font-semibold text-emerald-400">{row['Índice de penetración en el mercado de exportación (IEMP)']}</td>
                    <td className="p-3 font-semibold text-emerald-400">{row['Índice de Libertad Económica (IOEF)']}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="5" className="p-6 text-center text-slate-500 italic">No hay países disponibles para procesar.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* TABLA COMERCIAL NORMALIZADA */}
      <div className="space-y-2 pt-2">
        <h3 className="text-base font-bold text-white">Tabla Comercial Normalizada (COMM)</h3>
        <p className="text-xs text-slate-400">Valores normalizados y costo total ponderado comercial.</p>

        <div className="overflow-x-auto max-h-[380px] overflow-y-auto border border-[#1b1f2e] rounded-lg shadow-lg">
          <table className="w-full text-left text-xs text-slate-300 relative">
            <thead className="bg-[#151824] text-slate-400 uppercase text-[10px] tracking-wider border-b border-[#1b1f2e] sticky top-0 z-10">
              <tr>
                <th className="p-3 w-12 bg-[#151824]">#</th>
                <th className="p-3 bg-[#151824]">País</th>
                <th className="p-3 bg-[#151824]">CTCO Norm (46.50%)</th>
                <th className="p-3 bg-[#151824]">IEMP Norm (25.00%)</th>
                <th className="p-3 bg-[#151824]">IOEF Norm (28.50%)</th>
                <th className="p-3 bg-[#151824]">COMM Total (20.50%)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#1b1f2e]/60 bg-[#10121b]">
              {datosCommNormalizados.length > 0 ? (
                datosCommNormalizados.map((row, index) => (
                  <tr key={index} className="hover:bg-[#151824] transition-colors">
                    <td className="p-3 text-slate-500">{index + 1}</td>
                    <td className="p-3 font-medium text-white">{row.Paises}</td>
                    <td className="p-3">{row.CTCO_norm}</td>
                    <td className="p-3">{row.IEMP_norm}</td>
                    <td className="p-3">{row.IOEF_norm}</td>
                    <td className="p-3 font-bold text-emerald-400">{row.COMM_total}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="6" className="p-4 text-center text-slate-500 italic">No hay registros normalizados disponibles.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
}
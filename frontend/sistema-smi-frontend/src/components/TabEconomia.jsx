import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient.js';

export default function TabEconomia({ productoActivo, paisesDestino, paisOrigen, datosCostoDeVida = [] }) {
  const [econOverrides, setEconOverrides] = useState([]);
  
  const [openAdd, setOpenAdd] = useState(false);
  const [openEdit, setOpenEdit] = useState(false);
  const [openDel, setOpenDel] = useState(false);

  // Estados para añadir
  const [paisAdd, setPaisAdd] = useState('');
  const [icvAdd, setIcvAdd] = useState('');
  const [inanAdd, setInanAdd] = useState('');
  const [tadAdd, setTadAdd] = useState('');

  // Estados para editar
  const [paisSeleccionadoEdit, setPaisSeleccionadoEdit] = useState('');
  const [editPaisNombre, setEditPaisNombre] = useState('');
  const [editIcv, setEditIcv] = useState('');
  const [editInan, setEditInan] = useState('');
  const [editTad, setEditTad] = useState('');

  // Estados para eliminar
  const [paisSeleccionadoDel, setPaisSeleccionadoDel] = useState('');

  // Estados procesados
  const [datosEconConsolidados, setDatosEconConsolidados] = useState([]);
  const [datosEconNormalizados, setDatosEconNormalizados] = useState([]);
  const [cargando, setCargando] = useState(false);
  const [errorEco, setErrorEco] = useState(null);

  // Estado local sincronizado con Supabase usando rango ampliado
  const [listaCostoVidaDB, setListaCostoVidaDB] = useState(datosCostoDeVida);

  useEffect(() => {
    async function fetchCostoVidaDB() {
      try {
        const { data: cvData, error } = await supabase.from('costodevida').select('*').range(0, 999);
        if (error) {
          console.error("Error en Supabase costodevida:", error.message);
        } else if (cvData) {
          console.log("Datos de costodevida cargados desde Supabase:", cvData);
          setListaCostoVidaDB(cvData);
        }
      } catch (err) {
        console.error("Error cargando datos de costo de vida:", err.message);
      }
    }
    fetchCostoVidaDB();
  }, []);

  // Sincronizar selectores de edición/eliminación al cambiar los overrides
  useEffect(() => {
    if (econOverrides.length > 0) {
      if (!paisSeleccionadoEdit) {
        setPaisSeleccionadoEdit(econOverrides[0].Paises);
        setEditPaisNombre(econOverrides[0].Paises);
        setEditIcv(econOverrides[0].ICV);
        setEditInan(econOverrides[0].INAN);
        setEditTad(econOverrides[0].TAD);
      }
      if (!paisSeleccionadoDel) {
        setPaisSeleccionadoDel(econOverrides[0].Paises);
      }
    }
  }, [econOverrides]);

  const handleSelectEditPais = (e) => {
    const nombre = e.target.value;
    setPaisSeleccionadoEdit(nombre);
    const fila = econOverrides.find(item => item.Paises === nombre);
    if (fila) {
      setEditPaisNombre(fila.Paises);
      setEditIcv(fila.ICV);
      setEditInan(fila.INAN);
      setEditTad(fila.TAD);
    }
  };

  const handleAddPais = (e) => {
    e.preventDefault();
    if (!paisAdd.trim()) return;

    const nuevoRegistro = {
      Paises: paisAdd.trim(),
      ICV: Number(icvAdd) || 0,
      INAN: Number(inanAdd) || 0,
      TAD: Number(tadAdd) || 0
    };

    setEconOverrides([...econOverrides, nuevoRegistro]);
    setPaisAdd('');
    setIcvAdd('');
    setInanAdd('');
    setTadAdd('');
    setOpenAdd(false);
  };

  const handleUpdatePais = (e) => {
    e.preventDefault();
    const actualizados = econOverrides.map(item => {
      if (item.Paises === paisSeleccionadoEdit) {
        return {
          ...item,
          Paises: editPaisNombre.trim(),
          ICV: Number(editIcv) || 0,
          INAN: Number(editInan) || 0,
          TAD: Number(editTad) || 0
        };
      }
      return item;
    });

    setEconOverrides(actualizados);
    setPaisSeleccionadoEdit(editPaisNombre.trim());
    setOpenEdit(false);
  };

  const handleDeletePais = (e) => {
    e.preventDefault();
    const filtrados = econOverrides.filter(item => item.Paises !== paisSeleccionadoDel);
    setEconOverrides(filtrados);
    setOpenDel(false);
    if (filtrados.length > 0) {
      setPaisSeleccionadoDel(filtrados[0].Paises);
    } else {
      setPaisSeleccionadoDel('');
    }
  };

  // Procesamiento y construcción dinámica basada completamente en la tabla costodevida de Supabase
  useEffect(() => {
    setCargando(true);
    try {
      const limpiarTexto = (str) => {
        if (!str && str !== 0) return '';
        return str
          .toString()
          .toLowerCase()
          .normalize("NFD")
          .replace(/[\u0300-\u036f]/g, "")
          .trim();
      };

      const fuenteDatosCV = listaCostoVidaDB.length > 0 ? listaCostoVidaDB : datosCostoDeVida;

      // Construcción directa de dfEcon barriendo múltiples variantes de nombres de columnas de Supabase
      let dfEcon = fuenteDatosCV.map((item, idx) => {
        const nombrePais = 
          item.pais || item.País || item.PAIS || 
          item.nombre || item.Nombre || item.NOMBRE || 
          item.paises || item.Paises || item.PAISES || 
          item.country || item.Country || `País ${idx + 1}`;
        
        const valorICV = 
          item.costo_de_vida ?? item.Costo_de_Vida ?? item.COSTO_DE_VIDA ?? 
          item.icv ?? item.ICV ?? item.costovida ?? item.CostoVida;

        const valorIAN = 
          item.inflacion_anual ?? item.Inflacion_Anual ?? item.INFLACION_ANUAL ?? 
          item.inflacion ?? item.Inflacion ?? item.INFLACION ?? 
          item.inan ?? item.INAN;

        const valorTAD = 
          item.tasa_desempleo ?? item.Tasa_de_Desempleo ?? item.TASA_DE_DESEMPLEO ?? 
          item.desempleo ?? item.Desempleo ?? item.DESEMPLEO ?? 
          item.tad ?? item.TAD;

        return {
          Paises: nombrePais,
          ICV: valorICV !== null && valorICV !== undefined && !isNaN(Number(valorICV)) ? Number(valorICV) : 0,
          INAN: valorIAN !== null && valorIAN !== undefined && !isNaN(Number(valorIAN)) ? Number(valorIAN) : 0,
          TAD: valorTAD !== null && valorTAD !== undefined && !isNaN(Number(valorTAD)) ? Number(valorTAD) : 0
        };
      });

      // Filtrar por paisesDestino opcionalmente si se encuentra definido y con elementos
      if (paisesDestino && paisesDestino.length > 0) {
        const paisesDestinoLimpios = paisesDestino.map(p => limpiarTexto(p));
        dfEcon = dfEcon.filter(item => paisesDestinoLimpios.includes(limpiarTexto(item.Paises)));
      }

      // Aplicar Overrides del usuario
      econOverrides.forEach(ovr => {
        const index = dfEcon.findIndex(item => limpiarTexto(item.Paises) === limpiarTexto(ovr.Paises));
        if (index !== -1) {
          dfEcon[index].ICV = ovr.ICV;
          dfEcon[index].INAN = ovr.INAN;
          dfEcon[index].TAD = ovr.TAD;
        } else {
          dfEcon.push({
            Paises: ovr.Paises,
            ICV: ovr.ICV,
            INAN: ovr.INAN,
            TAD: ovr.TAD
          });
        }
      });

      dfEcon.forEach(item => {
        item.completos = item.ICV !== null && item.INAN !== null && item.TAD !== null;
      });
      dfEcon.sort((a, b) => (b.completos === a.completos ? 0 : b.completos ? 1 : -1));

      setDatosEconConsolidados(dfEcon);

      // ================= NORMALIZACIÓN =================
      const valoresIcvPositivos = dfEcon.map(i => i.ICV).filter(v => v !== null && v > 0);
      const valoresInanPositivos = dfEcon.map(i => i.INAN).filter(v => v !== null && v > 0);
      const valoresTadPositivos = dfEcon.map(i => i.TAD).filter(v => v !== null && v > 0);

      const minIcv = valoresIcvPositivos.length > 0 ? Math.min(...valoresIcvPositivos) : null;
      const minInan = valoresInanPositivos.length > 0 ? Math.min(...valoresInanPositivos) : null;
      const minTad = valoresTadPositivos.length > 0 ? Math.min(...valoresTadPositivos) : null;

      const normInversa = (valor, minimo) => {
        if (valor === null || valor === undefined || minimo === null || valor <= 0) return null;
        const num = Number(valor);
        if (isNaN(num) || num <= 0) return null;
        return Number(((10 * minimo) / num).toFixed(4));
      };

      const P_ICV = 0.30;
      const P_INAN = 0.30;
      const P_TAD = 0.40;

      const dfNorm = dfEcon.map(item => {
        const icvNorm = normInversa(item.ICV, minIcv);
        const inanNorm = normInversa(item.INAN, minInan);
        const tadNorm = normInversa(item.TAD, minTad);

        const puntajeEcon = Number((
          (icvNorm !== null ? icvNorm : 0) * P_ICV +
          (inanNorm !== null ? inanNorm : 0) * P_INAN +
          (tadNorm !== null ? tadNorm : 0) * P_TAD
        ).toFixed(4));

        const completosNorm = icvNorm !== null && inanNorm !== null && tadNorm !== null;

        return {
          Paises: item.Paises,
          ICV_norm: icvNorm,
          INAN_norm: inanNorm,
          TAD_norm: tadNorm,
          Puntaje_ECON_Normalizado: puntajeEcon,
          completos: completosNorm
        };
      });

      dfNorm.sort((a, b) => {
        if (b.completos !== a.completos) return b.completos ? 1 : -1;
        return b.Puntaje_ECON_Normalizado - a.Puntaje_ECON_Normalizado;
      });

      setDatosEconNormalizados(dfNorm);
      setErrorEco(null);
    } catch (err) {
      console.error("Error al procesar datos económicos:", err);
      setErrorEco(err.message);
    } finally {
      setCargando(false);
    }
  }, [econOverrides, paisesDestino, listaCostoVidaDB, datosCostoDeVida]);

  return (
    <div className="space-y-8 text-slate-100 font-sans">
      
      {/* HEADER */}
      <div className="border-b border-slate-800 pb-3">
        <h2 className="text-xl font-bold text-white">4. Economía (ECON)</h2>
        <p className="text-xs text-slate-400 mt-1">
          Gestión y normalización de indicadores macroeconómicos obtenidos directamente de la tabla `costodevida` en Supabase: Índice del Costo de Vida (ICV), Inflación Anual (IAN) y Tasa de Desempleo (TAD).
        </p>
      </div>

      {/* ACORDEONES CRUD */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        
        {/* AÑADIR */}
        <div className="border border-slate-800 bg-[#16181d] rounded-lg overflow-hidden transition-all">
          <button 
            type="button"
            onClick={() => setOpenAdd(!openAdd)}
            className="w-full px-4 py-3 text-left text-sm font-semibold text-slate-200 flex items-center gap-2 hover:bg-[#1e2029] transition-colors focus:outline-none cursor-pointer"
          >
            <span className={`text-slate-400 text-xs transition-transform duration-200 ${openAdd ? 'rotate-90' : ''}`}>❯</span>
            Añadir país
          </button>

          {openAdd && (
            <form onSubmit={handleAddPais} className="p-4 border-t border-slate-800/80 space-y-3 bg-[#0e1117]/50">
              <div>
                <label className="block text-xs text-slate-400 mb-1">País nuevo:</label>
                <input type="text" value={paisAdd} onChange={(e) => setPaisAdd(e.target.value)} required className="w-full bg-[#181a20] border border-slate-700/80 rounded px-2.5 py-1.5 text-xs text-slate-100 focus:outline-none focus:border-red-500" />
              </div>
              <div>
                <label className="block text-xs text-slate-400 mb-1">ICV (Costo de Vida):</label>
                <input type="number" step="0.01" min="0" value={icvAdd} onChange={(e) => setIcvAdd(e.target.value)} className="w-full bg-[#181a20] border border-slate-700/80 rounded px-2.5 py-1.5 text-xs text-slate-100 focus:outline-none focus:border-red-500" />
              </div>
              <div>
                <label className="block text-xs text-slate-400 mb-1">IAN (Inflación Anual):</label>
                <input type="number" step="0.01" min="0" value={inanAdd} onChange={(e) => setInanAdd(e.target.value)} className="w-full bg-[#181a20] border border-slate-700/80 rounded px-2.5 py-1.5 text-xs text-slate-100 focus:outline-none focus:border-red-500" />
              </div>
              <div>
                <label className="block text-xs text-slate-400 mb-1">TAD (Tasa de Desempleo):</label>
                <input type="number" step="0.01" min="0" value={tadAdd} onChange={(e) => setTadAdd(e.target.value)} className="w-full bg-[#181a20] border border-slate-700/80 rounded px-2.5 py-1.5 text-xs text-slate-100 focus:outline-none focus:border-red-500" />
              </div>
              <button type="submit" className="w-full py-1.5 mt-2 bg-red-600 hover:bg-red-700 text-white font-medium text-xs rounded transition-colors cursor-pointer">
                Guardar país ECON
              </button>
            </form>
          )}
        </div>

        {/* EDITAR */}
        <div className="border border-slate-800 bg-[#16181d] rounded-lg overflow-hidden transition-all">
          <button 
            type="button"
            onClick={() => setOpenEdit(!openEdit)}
            className="w-full px-4 py-3 text-left text-sm font-semibold text-slate-200 flex items-center gap-2 hover:bg-[#1e2029] transition-colors focus:outline-none cursor-pointer"
          >
            <span className={`text-slate-400 text-xs transition-transform duration-200 ${openEdit ? 'rotate-90' : ''}`}>❯</span>
            Editar país
          </button>

          {openEdit && (
            econOverrides.length > 0 ? (
              <form onSubmit={handleUpdatePais} className="p-4 border-t border-slate-800/80 space-y-3 bg-[#0e1117]/50">
                <div>
                  <label className="block text-xs text-slate-400 mb-1">Selecciona país a editar:</label>
                  <select value={paisSeleccionadoEdit} onChange={handleSelectEditPais} className="w-full bg-[#181a20] border border-slate-700/80 rounded px-2.5 py-1.5 text-xs text-slate-100 focus:outline-none focus:border-red-500">
                    {econOverrides.map((item, idx) => (
                      <option key={idx} value={item.Paises}>{item.Paises}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-slate-400 mb-1">Nuevo país:</label>
                  <input type="text" value={editPaisNombre} onChange={(e) => setEditPaisNombre(e.target.value)} className="w-full bg-[#181a20] border border-slate-700/80 rounded px-2.5 py-1.5 text-xs text-slate-100 focus:outline-none focus:border-red-500" />
                </div>
                <div>
                  <label className="block text-xs text-slate-400 mb-1">Nuevo ICV:</label>
                  <input type="number" step="0.01" min="0" value={editIcv} onChange={(e) => setEditIcv(e.target.value)} className="w-full bg-[#181a20] border border-slate-700/80 rounded px-2.5 py-1.5 text-xs text-slate-100 focus:outline-none focus:border-red-500" />
                </div>
                <div>
                  <label className="block text-xs text-slate-400 mb-1">Nuevo IAN:</label>
                  <input type="number" step="0.01" min="0" value={editInan} onChange={(e) => setEditInan(e.target.value)} className="w-full bg-[#181a20] border border-slate-700/80 rounded px-2.5 py-1.5 text-xs text-slate-100 focus:outline-none focus:border-red-500" />
                </div>
                <div>
                  <label className="block text-xs text-slate-400 mb-1">Nuevo TAD:</label>
                  <input type="number" step="0.01" min="0" value={editTad} onChange={(e) => setEditTad(e.target.value)} className="w-full bg-[#181a20] border border-slate-700/80 rounded px-2.5 py-1.5 text-xs text-slate-100 focus:outline-none focus:border-red-500" />
                </div>
                <button type="submit" className="w-full py-1.5 mt-2 bg-red-600 hover:bg-red-700 text-white font-medium text-xs rounded transition-colors cursor-pointer">
                  Actualizar país ECON
                </button>
              </form>
            ) : (
              <div className="p-4 border-t border-slate-800 text-xs text-slate-400 italic bg-[#0e1117]/50">
                No hay datos personalizados para editar aún.
              </div>
            )
          )}
        </div>

        {/* ELIMINAR */}
        <div className="border border-slate-800 bg-[#16181d] rounded-lg overflow-hidden transition-all">
          <button 
            type="button"
            onClick={() => setOpenDel(!openDel)}
            className="w-full px-4 py-3 text-left text-sm font-semibold text-slate-200 flex items-center gap-2 hover:bg-[#1e2029] transition-colors focus:outline-none cursor-pointer"
          >
            <span className={`text-slate-400 text-xs transition-transform duration-200 ${openDel ? 'rotate-90' : ''}`}>❯</span>
            Eliminar país
          </button>

          {openDel && (
            econOverrides.length > 0 ? (
              <form onSubmit={handleDeletePais} className="p-4 border-t border-slate-800/80 space-y-3 bg-[#0e1117]/50">
                <div>
                  <label className="block text-xs text-slate-400 mb-1">Selecciona país a eliminar:</label>
                  <select value={paisSeleccionadoDel} onChange={(e) => setPaisSeleccionadoDel(e.target.value)} className="w-full bg-[#181a20] border border-slate-700/80 rounded px-2.5 py-1.5 text-xs text-slate-100 focus:outline-none focus:border-red-500">
                    {econOverrides.map((item, idx) => (
                      <option key={idx} value={item.Paises}>{item.Paises}</option>
                    ))}
                  </select>
                </div>
                <button type="submit" className="w-full py-1.5 mt-4 bg-red-800 hover:bg-red-900 text-white font-medium text-xs rounded transition-colors cursor-pointer">
                  Eliminar país ECON
                </button>
              </form>
            ) : (
              <div className="p-4 border-t border-slate-800 text-xs text-slate-400 italic bg-[#0e1117]/50">
                No hay países en memoria para eliminar aún.
              </div>
            )
          )}
        </div>

      </div>

      {errorEco && (
        <div className="bg-red-950/40 border border-red-900/50 p-3 rounded text-xs text-red-400">
          {errorEco}
        </div>
      )}

      {/* ================= TABLA ECONÓMICA DATOS ORIGINALES ================= */}
      <div className="space-y-2">
        <h3 className="text-base font-bold text-white">Tabla Económica (ECON) — Datos originales</h3>
        <p className="text-xs text-slate-400">Índice del Costo de Vida (ICV), Inflación Anual (IAN) y Tasa de Desempleo (TAD) cargados dinámicamente desde Supabase.</p>
        
        {cargando ? (
          <div className="p-4 text-xs text-slate-400 italic">Procesando datos económicos...</div>
        ) : (
          <div className="overflow-x-auto max-h-[380px] overflow-y-auto border border-slate-800 rounded-lg">
            <table className="w-full text-left text-xs text-slate-300 relative">
              <thead className="bg-[#181a20] text-slate-400 uppercase text-[10px] tracking-wider border-b border-slate-800 sticky top-0 z-10">
                <tr>
                  <th className="p-3 w-12 bg-[#181a20]">#</th>
                  <th className="p-3 bg-[#181a20]">País</th>
                  <th className="p-3 bg-[#181a20]">Índice del Costo de Vida (ICV)</th>
                  <th className="p-3 bg-[#181a20]">Inflación Anual (IAN)</th>
                  <th className="p-3 bg-[#181a20]">Tasa de Desempleo (TAD)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 bg-[#0e1117]">
                {datosEconConsolidados.map((row, index) => (
                  <tr key={index} className="hover:bg-[#16181d] transition-colors">
                    <td className="p-3 text-slate-500">{index + 1}</td>
                    <td className="p-3 font-medium text-white">{row.Paises}</td>
                    <td className="p-3 text-emerald-400 font-semibold">{row.ICV !== null ? row.ICV : '-'}</td>
                    <td className="p-3">{row.INAN !== null ? row.INAN : '-'}</td>
                    <td className="p-3">{row.TAD !== null ? row.TAD : '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ================= TABLA DE NORMALIZACIÓN ECONÓMICA ================= */}
      <div className="space-y-2 pt-2">
        <h3 className="text-base font-bold text-white">Tabla de Normalización Económica (ECON)</h3>
        <p className="text-xs text-slate-400">Ponderaciones: ICV = 30% | IAN = 30% | TAD = 40% (Normalización Inversa)</p>

        <div className="overflow-x-auto max-h-[380px] overflow-y-auto border border-slate-800 rounded-lg">
          <table className="w-full text-left text-xs text-slate-300 relative">
            <thead className="bg-[#181a20] text-slate-400 uppercase text-[10px] tracking-wider border-b border-slate-800 sticky top-0 z-10">
              <tr>
                <th className="p-3 w-12 bg-[#181a20]">#</th>
                <th className="p-3 bg-[#181a20]">País</th>
                <th className="p-3 bg-[#181a20]">ICV Norm</th>
                <th className="p-3 bg-[#181a20]">IAN Norm</th>
                <th className="p-3 bg-[#181a20]">TAD Norm</th>
                <th className="p-3 bg-[#181a20]">Puntaje ECON Normalizado</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 bg-[#0e1117]">
              {datosEconNormalizados.map((row, index) => (
                <tr key={index} className="hover:bg-[#16181d] transition-colors">
                  <td className="p-3 text-slate-500">{index + 1}</td>
                  <td className="p-3 font-medium text-white">{row.Paises}</td>
                  <td className="p-3">{row.ICV_norm !== null ? row.ICV_norm : '-'}</td>
                  <td className="p-3">{row.INAN_norm !== null ? row.INAN_norm : '-'}</td>
                  <td className="p-3">{row.TAD_norm !== null ? row.TAD_norm : '-'}</td>
                  <td className="p-3 font-bold text-emerald-400">{row.Puntaje_ECON_Normalizado}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
}
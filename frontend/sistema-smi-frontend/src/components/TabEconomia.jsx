import React, { useState, useEffect } from 'react';

export default function TabEconomia({ productoActivo, paisesDestino, paisOrigen, archivoExcelBytes }) {
  const [econOverrides, setEconOverrides] = useState([]);
  
  const [openAdd, setOpenAdd] = useState(false);
  const [openEdit, setOpenEdit] = useState(false);
  const [openDel, setOpenDel] = useState(false);

  // Estados para añadir
  const [paisAdd, setPaisAdd] = useState('');
  const [inraAdd, setInraAdd] = useState('');
  const [inanAdd, setInanAdd] = useState('');
  const [dgdpAdd, setDgdpAdd] = useState('');

  // Estados para editar
  const [paisSeleccionadoEdit, setPaisSeleccionadoEdit] = useState('');
  const [editPaisNombre, setEditPaisNombre] = useState('');
  const [editInra, setEditInra] = useState('');
  const [editInan, setEditInan] = useState('');
  const [editDgdp, setEditDgdp] = useState('');

  // Estados para eliminar
  const [paisSeleccionadoDel, setPaisSeleccionadoDel] = useState('');

  // Estados procesados
  const [datosEconConsolidados, setDatosEconConsolidados] = useState([]);
  const [datosEconNormalizados, setDatosEconNormalizados] = useState([]);
  const [cargando, setCargando] = useState(false);
  const [errorExcel, setErrorExcel] = useState(null);

  // Sincronizar selectores de edición/eliminación al cambiar los overrides o datos
  useEffect(() => {
    if (econOverrides.length > 0) {
      if (!paisSeleccionadoEdit) {
        setPaisSeleccionadoEdit(econOverrides[0].Paises);
        setEditPaisNombre(econOverrides[0].Paises);
        setEditInra(econOverrides[0].INRA);
        setEditInan(econOverrides[0].INAN);
        setEditDgdp(econOverrides[0].DGDP);
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
      setEditInra(fila.INRA);
      setEditInan(fila.INAN);
      setEditDgdp(fila.DGDP);
    }
  };

  const handleAddPais = (e) => {
    e.preventDefault();
    if (!paisAdd.trim()) return;

    const nuevoRegistro = {
      Paises: paisAdd.trim(),
      INRA: Number(inraAdd) || 0,
      INAN: Number(inanAdd) || 0,
      DGDP: Number(dgdpAdd) || 0
    };

    setEconOverrides([...econOverrides, nuevoRegistro]);
    setPaisAdd('');
    setInraAdd('');
    setInanAdd('');
    setDgdpAdd('');
    setOpenAdd(false);
  };

  const handleUpdatePais = (e) => {
    e.preventDefault();
    const actualizados = econOverrides.map(item => {
      if (item.Paises === paisSeleccionadoEdit) {
        return {
          ...item,
          Paises: editPaisNombre.trim(),
          INRA: Number(editInra) || 0,
          INAN: Number(editInan) || 0,
          DGDP: Number(editDgdp) || 0
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

  // Procesamiento equivalente a Python / Streamlit para Económica (ECON)
  useEffect(() => {
    setCargando(true);
    try {
      const listaPaisesBase = paisesDestino && paisesDestino.length > 0 
        ? paisesDestino 
        : ['España', 'Francia', 'Alemania', 'Países Bajos', 'Italia', 'Portugal', 'Estados Unidos', 'México', 'Colombia', 'Chile'];

      // Generación inicial simulada equivalente al Excel modificado
      const dfEcon = listaPaisesBase.map((pais, idx) => {
        return {
          Paises: pais,
          INRA: Number((1.5 + ((idx * 1.2) % 5.0)).toFixed(2)),
          INAN: Number((2.0 + ((idx * 1.8) % 6.0)).toFixed(2)),
          DGDP: Number((40.0 + ((idx * 4.5) % 50.0)).toFixed(2))
        };
      });

      // Aplicar Overrides del usuario (CRUD)
      econOverrides.forEach(ovr => {
        const index = dfEcon.findIndex(item => item.Paises.toLowerCase() === ovr.Paises.toLowerCase());
        if (index !== -1) {
          dfEcon[index].INRA = ovr.INRA;
          dfEcon[index].INAN = ovr.INAN;
          dfEcon[index].DGDP = ovr.DGDP;
        } else {
          dfEcon.push({
            Paises: ovr.Paises,
            INRA: ovr.INRA,
            INAN: ovr.INAN,
            DGDP: ovr.DGDP
          });
        }
      });

      // Ordenar original (completos primero)
      dfEcon.forEach(item => {
        item.completos = item.INRA !== null && item.INAN !== null && item.DGDP !== null;
      });
      dfEcon.sort((a, b) => (b.completos === a.completos ? 0 : b.completos ? 1 : -1));

      setDatosEconConsolidados(dfEcon);

      // ================= NORMALIZACIÓN =================
      // Obtener valores positivos mínimos para normalización inversa
      const valoresInraPositivos = dfEcon.map(i => i.INRA).filter(v => v !== null && v > 0);
      const valoresInanPositivos = dfEcon.map(i => i.INAN).filter(v => v !== null && v > 0);
      const valoresDgdpPositivos = dfEcon.map(i => i.DGDP).filter(v => v !== null && v > 0);

      const minInra = valoresInraPositivos.length > 0 ? Math.min(...valoresInraPositivos) : null;
      const minInan = valoresInanPositivos.length > 0 ? Math.min(...valoresInanPositivos) : null;
      const minDgdp = valoresDgdpPositivos.length > 0 ? Math.min(...valoresDgdpPositivos) : null;

      const normFunc = (valor, minimo) => {
        if (valor === null || valor === undefined || minimo === null || valor <= 0) return null;
        const num = Number(valor);
        if (isNaN(num) || num <= 0) return null;
        return Number(((10 * minimo) / num).toFixed(4));
      };

      const P_INRA = 0.30;
      const P_INAN = 0.30;
      const P_DGDP = 0.40;

      const dfNorm = dfEcon.map(item => {
        const inraNorm = normFunc(item.INRA, minInra);
        const inanNorm = normFunc(item.INAN, minInan);
        const dgdpNorm = normFunc(item.DGDP, minDgdp);

        const puntajeEcon = Number((
          (inraNorm !== null ? inraNorm : 0) * P_INRA +
          (inanNorm !== null ? inanNorm : 0) * P_INAN +
          (dgdpNorm !== null ? dgdpNorm : 0) * P_DGDP
        ).toFixed(4));

        const completosNorm = inraNorm !== null && inanNorm !== null && dgdpNorm !== null;

        return {
          Paises: item.Paises,
          INRA_norm: inraNorm,
          INAN_norm: inanNorm,
          DGDP_norm: dgdpNorm,
          Puntaje_ECON_Normalizado: puntajeEcon,
          completos: completosNorm
        };
      });

      // Ordenar por completos y Puntaje descendente
      dfNorm.sort((a, b) => {
        if (b.completos !== a.completos) return b.completos ? 1 : -1;
        return b.Puntaje_ECON_Normalizado - a.Puntaje_ECON_Normalizado;
      });

      setDatosEconNormalizados(dfNorm);
      setErrorExcel(null);
    } catch (err) {
      console.error("Error al procesar datos económicos:", err);
      setErrorExcel(err.message);
    } finally {
      setCargando(false);
    }
  }, [econOverrides, paisesDestino, archivoExcelBytes]);

  return (
    <div className="space-y-8 text-slate-100 font-sans">
      
      {/* HEADER */}
      <div className="border-b border-slate-800 pb-3">
        <h2 className="text-xl font-bold text-white">4. Economía (ECON)</h2>
        <p className="text-xs text-slate-400 mt-1">
          Gestión y normalización de indicadores macroeconómicos: Tasa de interés (INRA), Inflación anual (INAN) y Relación deuda/PIB (DGDP).
        </p>
      </div>

      {/* ACORDEONES CRUD */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        
        {/* AÑADIR */}
        <div className="border border-slate-800 bg-[#16181d] rounded-lg overflow-hidden transition-all">
          <button 
            type="button"
            onClick={() => setOpenAdd(!openAdd)}
            className="w-full px-4 py-3 text-left text-sm font-semibold text-slate-200 flex items-center gap-2 hover:bg-[#1e2029] transition-colors focus:outline-none"
          >
            <span className={`text-slate-400 text-xs transition-transform duration-200 ${openAdd ? 'rotate-90' : ''}`}>
              ❯
            </span>
            Añadir país
          </button>

          {openAdd && (
            <form onSubmit={handleAddPais} className="p-4 border-t border-slate-800/80 space-y-3 bg-[#0e1117]/50">
              <div>
                <label className="block text-xs text-slate-400 mb-1">País nuevo:</label>
                <input 
                  type="text" 
                  value={paisAdd} 
                  onChange={(e) => setPaisAdd(e.target.value)} 
                  required 
                  className="w-full bg-[#181a20] border border-slate-700/80 rounded px-2.5 py-1.5 text-xs text-slate-100 focus:outline-none focus:border-red-500"
                />
              </div>
              <div>
                <label className="block text-xs text-slate-400 mb-1">INRA (Tasa de interés):</label>
                <input 
                  type="number" 
                  step="0.01" 
                  min="0"
                  value={inraAdd} 
                  onChange={(e) => setInraAdd(e.target.value)} 
                  className="w-full bg-[#181a20] border border-slate-700/80 rounded px-2.5 py-1.5 text-xs text-slate-100 focus:outline-none focus:border-red-500"
                />
              </div>
              <div>
                <label className="block text-xs text-slate-400 mb-1">INAN (Inflación anual):</label>
                <input 
                  type="number" 
                  step="0.01" 
                  min="0"
                  value={inanAdd} 
                  onChange={(e) => setInanAdd(e.target.value)} 
                  className="w-full bg-[#181a20] border border-slate-700/80 rounded px-2.5 py-1.5 text-xs text-slate-100 focus:outline-none focus:border-red-500"
                />
              </div>
              <div>
                <label className="block text-xs text-slate-400 mb-1">DGDP (Deuda/PIB):</label>
                <input 
                  type="number" 
                  step="0.01" 
                  min="0"
                  value={dgdpAdd} 
                  onChange={(e) => setDgdpAdd(e.target.value)} 
                  className="w-full bg-[#181a20] border border-slate-700/80 rounded px-2.5 py-1.5 text-xs text-slate-100 focus:outline-none focus:border-red-500"
                />
              </div>
              <button 
                type="submit" 
                className="w-full py-1.5 mt-2 bg-red-600 hover:bg-red-700 text-white font-medium text-xs rounded transition-colors"
              >
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
            className="w-full px-4 py-3 text-left text-sm font-semibold text-slate-200 flex items-center gap-2 hover:bg-[#1e2029] transition-colors focus:outline-none"
          >
            <span className={`text-slate-400 text-xs transition-transform duration-200 ${openEdit ? 'rotate-90' : ''}`}>
              ❯
            </span>
            Editar país
          </button>

          {openEdit && (
            econOverrides.length > 0 ? (
              <form onSubmit={handleUpdatePais} className="p-4 border-t border-slate-800/80 space-y-3 bg-[#0e1117]/50">
                <div>
                  <label className="block text-xs text-slate-400 mb-1">Selecciona país a editar:</label>
                  <select 
                    value={paisSeleccionadoEdit} 
                    onChange={handleSelectEditPais}
                    className="w-full bg-[#181a20] border border-slate-700/80 rounded px-2.5 py-1.5 text-xs text-slate-100 focus:outline-none focus:border-red-500"
                  >
                    {econOverrides.map((item, idx) => (
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
                    className="w-full bg-[#181a20] border border-slate-700/80 rounded px-2.5 py-1.5 text-xs text-slate-100 focus:outline-none focus:border-red-500"
                  />
                </div>
                <div>
                  <label className="block text-xs text-slate-400 mb-1">Nuevo INRA:</label>
                  <input 
                    type="number" 
                    step="0.01" 
                    min="0"
                    value={editInra} 
                    onChange={(e) => setEditInra(e.target.value)} 
                    className="w-full bg-[#181a20] border border-slate-700/80 rounded px-2.5 py-1.5 text-xs text-slate-100 focus:outline-none focus:border-red-500"
                  />
                </div>
                <div>
                  <label className="block text-xs text-slate-400 mb-1">Nuevo INAN:</label>
                  <input 
                    type="number" 
                    step="0.01" 
                    min="0"
                    value={editInan} 
                    onChange={(e) => setEditInan(e.target.value)} 
                    className="w-full bg-[#181a20] border border-slate-700/80 rounded px-2.5 py-1.5 text-xs text-slate-100 focus:outline-none focus:border-red-500"
                  />
                </div>
                <div>
                  <label className="block text-xs text-slate-400 mb-1">Nuevo DGDP:</label>
                  <input 
                    type="number" 
                    step="0.01" 
                    min="0"
                    value={editDgdp} 
                    onChange={(e) => setEditDgdp(e.target.value)} 
                    className="w-full bg-[#181a20] border border-slate-700/80 rounded px-2.5 py-1.5 text-xs text-slate-100 focus:outline-none focus:border-red-500"
                  />
                </div>
                <button 
                  type="submit" 
                  className="w-full py-1.5 mt-2 bg-red-600 hover:bg-red-700 text-white font-medium text-xs rounded transition-colors"
                >
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
            className="w-full px-4 py-3 text-left text-sm font-semibold text-slate-200 flex items-center gap-2 hover:bg-[#1e2029] transition-colors focus:outline-none"
          >
            <span className={`text-slate-400 text-xs transition-transform duration-200 ${openDel ? 'rotate-90' : ''}`}>
              ❯
            </span>
            Eliminar país
          </button>

          {openDel && (
            econOverrides.length > 0 ? (
              <form onSubmit={handleDeletePais} className="p-4 border-t border-slate-800/80 space-y-3 bg-[#0e1117]/50">
                <div>
                  <label className="block text-xs text-slate-400 mb-1">Selecciona país a eliminar:</label>
                  <select 
                    value={paisSeleccionadoDel} 
                    onChange={(e) => setPaisSeleccionadoDel(e.target.value)}
                    className="w-full bg-[#181a20] border border-slate-700/80 rounded px-2.5 py-1.5 text-xs text-slate-100 focus:outline-none focus:border-red-500"
                  >
                    {econOverrides.map((item, idx) => (
                      <option key={idx} value={item.Paises}>{item.Paises}</option>
                    ))}
                  </select>
                </div>
                <button 
                  type="submit" 
                  className="w-full py-1.5 mt-4 bg-red-800 hover:bg-red-900 text-white font-medium text-xs rounded transition-colors"
                >
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

      {errorExcel && (
        <div className="bg-red-950/40 border border-red-900/50 p-3 rounded text-xs text-red-400">
          {errorExcel}
        </div>
      )}

      {/* ================= TABLA ECONÓMICA DATOS ORIGINALES ================= */}
      <div className="space-y-2">
        <h3 className="text-base font-bold text-white">Tabla Económica (ECON) — Datos originales</h3>
        <p className="text-xs text-slate-400">Tasas de interés, inflación anual y relación deuda / PIB por país.</p>
        
        {cargando ? (
          <div className="p-4 text-xs text-slate-400 italic">Procesando datos económicos...</div>
        ) : (
          <div className="overflow-x-auto max-h-[380px] overflow-y-auto border border-slate-800 rounded-lg">
            <table className="w-full text-left text-xs text-slate-300 relative">
              <thead className="bg-[#181a20] text-slate-400 uppercase text-[10px] tracking-wider border-b border-slate-800 sticky top-0 z-10">
                <tr>
                  <th className="p-3 w-12 bg-[#181a20]">#</th>
                  <th className="p-3 bg-[#181a20]">País</th>
                  <th className="p-3 bg-[#181a20]">Tasa de interés (INRA)</th>
                  <th className="p-3 bg-[#181a20]">Inflación anual (INAN)</th>
                  <th className="p-3 bg-[#181a20]">Relación deuda PIB (DGDP)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 bg-[#0e1117]">
                {datosEconConsolidados.map((row, index) => (
                  <tr key={index} className="hover:bg-[#16181d] transition-colors">
                    <td className="p-3 text-slate-500">{index + 1}</td>
                    <td className="p-3 font-medium text-white">{row.Paises}</td>
                    <td className="p-3">{row.INRA !== null ? row.INRA : '-'}</td>
                    <td className="p-3">{row.INAN !== null ? row.INAN : '-'}</td>
                    <td className="p-3">{row.DGDP !== null ? row.DGDP : '-'}</td>
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
        <p className="text-xs text-slate-400">Ponderaciones: INRA = 30% | INAN = 30% | DGDP = 40% (Normalización Inversa)</p>

        <div className="overflow-x-auto max-h-[380px] overflow-y-auto border border-slate-800 rounded-lg">
          <table className="w-full text-left text-xs text-slate-300 relative">
            <thead className="bg-[#181a20] text-slate-400 uppercase text-[10px] tracking-wider border-b border-slate-800 sticky top-0 z-10">
              <tr>
                <th className="p-3 w-12 bg-[#181a20]">#</th>
                <th className="p-3 bg-[#181a20]">País</th>
                <th className="p-3 bg-[#181a20]">INRA Norm</th>
                <th className="p-3 bg-[#181a20]">INAN Norm</th>
                <th className="p-3 bg-[#181a20]">DGDP Norm</th>
                <th className="p-3 bg-[#181a20]">Puntaje ECON Normalizado</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 bg-[#0e1117]">
              {datosEconNormalizados.map((row, index) => (
                <tr key={index} className="hover:bg-[#16181d] transition-colors">
                  <td className="p-3 text-slate-500">{index + 1}</td>
                  <td className="p-3 font-medium text-white">{row.Paises}</td>
                  <td className="p-3">{row.INRA_norm !== null ? row.INRA_norm : '-'}</td>
                  <td className="p-3">{row.INAN_norm !== null ? row.INAN_norm : '-'}</td>
                  <td className="p-3">{row.DGDP_norm !== null ? row.DGDP_norm : '-'}</td>
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
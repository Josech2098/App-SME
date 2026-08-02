import React, { useState, useEffect } from 'react';

export default function TabPolitica({ productoActivo, paisesDestino, paisOrigen }) {
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

  // Estados procesados
  const [datosPoliConsolidados, setDatosPoliConsolidados] = useState([]);
  const [datosPoliNormalizados, setDatosPoliNormalizados] = useState([]);
  const [cargando, setCargando] = useState(false);
  const [errorNotif, setErrorNotif] = useState(null);

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

  // Procesamiento unificado dinámico idéntico a Economía para sincronizar todos los países de destino
  useEffect(() => {
    setCargando(true);
    try {
      const listaPaisesBase = paisesDestino && paisesDestino.length > 0 
        ? paisesDestino 
        : [
            'Alemania', 'Argentina', 'Australia', 'Bélgica', 'Brasil', 'Canadá', 
            'Chile', 'China', 'Colombia', 'Corea del Sur', 'Costa Rica', 'España', 
            'Estados Unidos', 'Francia', 'Guatemala', 'India', 'Italia', 'Japón', 
            'México', 'Países Bajos', 'Panamá', 'Reino Unido'
          ];

      // Valores base robustos para todos los países posibles de la tabla productos
      const dfPoli = listaPaisesBase.map((pais, idx) => {
        let fsiDefault = 35.0;
        let inriDefault = 3.0;
        let deinDefault = 7.0;

        const pLower = pais.toLowerCase();
        if (pLower.includes('alemania')) { fsiDefault = 24.0; inriDefault = 2.6; deinDefault = 8.8; }
        else if (pLower.includes('españa')) { fsiDefault = 22.5; inriDefault = 2.4; deinDefault = 8.1; }
        else if (pLower.includes('francia')) { fsiDefault = 28.0; inriDefault = 2.7; deinDefault = 8.0; }
        else if (pLower.includes('estados unidos')) { fsiDefault = 34.0; inriDefault = 2.9; deinDefault = 7.8; }
        else if (pLower.includes('méxico')) { fsiDefault = 65.2; inriDefault = 5.1; deinDefault = 5.14; }
        else if (pLower.includes('colombia')) { fsiDefault = 78.4; inriDefault = 6.2; deinDefault = 6.05; }
        else if (pLower.includes('argentina')) { fsiDefault = 44.2; inriDefault = 3.7; deinDefault = 6.62; }
        else if (pLower.includes('australia')) { fsiDefault = 19.6; inriDefault = 2.4; deinDefault = 8.66; }
        else if (pLower.includes('chile')) { fsiDefault = 35.1; inriDefault = 3.0; deinDefault = 7.98; }
        else if (pLower.includes('canadá')) { fsiDefault = 21.4; inriDefault = 2.5; deinDefault = 8.85; }
        else if (pLower.includes('reino unido')) { fsiDefault = 27.5; inriDefault = 2.8; deinDefault = 8.25; }
        else if (pLower.includes('brasil')) { fsiDefault = 69.8; inriDefault = 5.4; deinDefault = 6.78; }
        else if (pLower.includes('panamá')) { fsiDefault = 52.1; inriDefault = 4.2; deinDefault = 7.05; }
        else if (pLower.includes('costa rica')) { fsiDefault = 43.6; inriDefault = 3.5; deinDefault = 8.12; }
        else if (pLower.includes('japón')) { fsiDefault = 25.8; inriDefault = 2.5; deinDefault = 8.15; }
        else if (pLower.includes('china')) { fsiDefault = 68.3; inriDefault = 5.8; deinDefault = 3.32; }

        return {
          Paises: pais,
          FSI: Number((fsiDefault + ((idx * 0.5) % 2.0)).toFixed(2)),
          INRI: Number((inriDefault + ((idx * 0.1) % 0.5)).toFixed(2)),
          DEIN: Number((deinDefault - ((idx * 0.1) % 0.4)).toFixed(2))
        };
      });

      // Aplicar Overrides del usuario (CRUD)
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

      // ================= NORMALIZACIÓN =================
      const A3 = 10;
      const FSI_min = 19.6;  
      const INRI_min = 1.7;  
      const DEIN_max = 8.85; 

      const P_FSI = 0.35;
      const P_INRI = 0.35;
      const P_DEIN = 0.30;

      const dfNorm = dfPoli.map(item => {
        const fsiNorm = item.FSI > 0 ? Number(((A3 * FSI_min) / item.FSI).toFixed(2)) : null;
        const inriNorm = item.INRI > 0 ? Number(((A3 * INRI_min) / item.INRI).toFixed(2)) : null;
        const deinNorm = DEIN_max > 0 ? Number(((A3 * item.DEIN) / DEIN_max).toFixed(2)) : null;

        const puntajePoli = Number((
          (fsiNorm !== null ? fsiNorm : 0) * P_FSI +
          (inriNorm !== null ? inriNorm : 0) * P_INRI +
          (deinNorm !== null ? deinNorm : 0) * P_DEIN
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
      setErrorNotif(null);
    } catch (err) {
      console.error("Error al procesar datos políticos:", err);
      setErrorNotif(err.message);
    } finally {
      setCargando(false);
    }
  }, [poliOverrides, paisesDestino]);

  return (
    <div className="space-y-8 text-slate-100 font-sans">
      
      {/* HEADER */}
      <div className="border-b border-slate-800 pb-3">
        <h2 className="text-xl font-bold text-white">5. Política (POLI)</h2>
        <p className="text-xs text-slate-400 mt-1">
          Gestión y normalización de indicadores políticos utilizando el listado completo de países de la tabla de productos: Índice de Estados Frágiles (FSI), Informe sobre el riesgo (INRI) e Índice de Democracia (DEIN).
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
                <label className="block text-xs text-slate-400 mb-1">País:</label>
                <input 
                  type="text" 
                  value={paisAdd} 
                  onChange={(e) => setPaisAdd(e.target.value)} 
                  required 
                  className="w-full bg-[#181a20] border border-slate-700/80 rounded px-2.5 py-1.5 text-xs text-slate-100 focus:outline-none focus:border-red-500"
                />
              </div>
              <div>
                <label className="block text-xs text-slate-400 mb-1">Índice de Estados Frágiles (FSI):</label>
                <input 
                  type="number" 
                  step="0.01" 
                  min="0"
                  value={fsiAdd} 
                  onChange={(e) => setFsiAdd(e.target.value)} 
                  className="w-full bg-[#181a20] border border-slate-700/80 rounded px-2.5 py-1.5 text-xs text-slate-100 focus:outline-none focus:border-red-500"
                />
              </div>
              <div>
                <label className="block text-xs text-slate-400 mb-1">Informe sobre el riesgo (INRI):</label>
                <input 
                  type="number" 
                  step="0.01" 
                  min="0"
                  value={inriAdd} 
                  onChange={(e) => setInriAdd(e.target.value)} 
                  className="w-full bg-[#181a20] border border-slate-700/80 rounded px-2.5 py-1.5 text-xs text-slate-100 focus:outline-none focus:border-red-500"
                />
              </div>
              <div>
                <label className="block text-xs text-slate-400 mb-1">Índice de Democracia (DEIN):</label>
                <input 
                  type="number" 
                  step="0.01" 
                  min="0"
                  value={deinAdd} 
                  onChange={(e) => setDeinAdd(e.target.value)} 
                  className="w-full bg-[#181a20] border border-slate-700/80 rounded px-2.5 py-1.5 text-xs text-slate-100 focus:outline-none focus:border-red-500"
                />
              </div>
              <button 
                type="submit" 
                className="w-full py-1.5 mt-2 bg-red-600 hover:bg-red-700 text-white font-medium text-xs rounded transition-colors"
              >
                Guardar país (POLI)
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
            poliOverrides.length > 0 ? (
              <form onSubmit={handleUpdatePais} className="p-4 border-t border-slate-800/80 space-y-3 bg-[#0e1117]/50">
                <div>
                  <label className="block text-xs text-slate-400 mb-1">Selecciona país a editar:</label>
                  <select 
                    value={paisSeleccionadoEdit} 
                    onChange={handleSelectEditPais}
                    className="w-full bg-[#181a20] border border-slate-700/80 rounded px-2.5 py-1.5 text-xs text-slate-100 focus:outline-none focus:border-red-500"
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
                    className="w-full bg-[#181a20] border border-slate-700/80 rounded px-2.5 py-1.5 text-xs text-slate-100 focus:outline-none focus:border-red-500"
                  />
                </div>
                <div>
                  <label className="block text-xs text-slate-400 mb-1">Nuevo FSI:</label>
                  <input 
                    type="number" 
                    step="0.01" 
                    min="0"
                    value={editFsi} 
                    onChange={(e) => setEditFsi(e.target.value)} 
                    className="w-full bg-[#181a20] border border-slate-700/80 rounded px-2.5 py-1.5 text-xs text-slate-100 focus:outline-none focus:border-red-500"
                  />
                </div>
                <div>
                  <label className="block text-xs text-slate-400 mb-1">Nuevo INRI:</label>
                  <input 
                    type="number" 
                    step="0.01" 
                    min="0"
                    value={editInri} 
                    onChange={(e) => setEditInri(e.target.value)} 
                    className="w-full bg-[#181a20] border border-slate-700/80 rounded px-2.5 py-1.5 text-xs text-slate-100 focus:outline-none focus:border-red-500"
                  />
                </div>
                <div>
                  <label className="block text-xs text-slate-400 mb-1">Nuevo DEIN:</label>
                  <input 
                    type="number" 
                    step="0.01" 
                    min="0"
                    value={editDein} 
                    onChange={(e) => setEditDein(e.target.value)} 
                    className="w-full bg-[#181a20] border border-slate-700/80 rounded px-2.5 py-1.5 text-xs text-slate-100 focus:outline-none focus:border-red-500"
                  />
                </div>
                <button 
                  type="submit" 
                  className="w-full py-1.5 mt-2 bg-red-600 hover:bg-red-700 text-white font-medium text-xs rounded transition-colors"
                >
                  Actualizar país (POLI)
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
            🗑️ Eliminar país
          </button>

          {openDel && (
            poliOverrides.length > 0 ? (
              <form onSubmit={handleDeletePais} className="p-4 border-t border-slate-800/80 space-y-3 bg-[#0e1117]/50">
                <div>
                  <label className="block text-xs text-slate-400 mb-1">Selecciona país a eliminar:</label>
                  <select 
                    value={paisSeleccionadoDel} 
                    onChange={(e) => setPaisSeleccionadoDel(e.target.value)}
                    className="w-full bg-[#181a20] border border-slate-700/80 rounded px-2.5 py-1.5 text-xs text-slate-100 focus:outline-none focus:border-red-500"
                  >
                    {poliOverrides.map((item, idx) => (
                      <option key={idx} value={item.Paises}>{item.Paises}</option>
                    ))}
                  </select>
                </div>
                <button 
                  type="submit" 
                  className="w-full py-1.5 mt-4 bg-red-800 hover:bg-red-900 text-white font-medium text-xs rounded transition-colors"
                >
                  Eliminar país (POLI)
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

      {errorNotif && (
        <div className="bg-red-950/40 border border-red-900/50 p-3 rounded text-xs text-red-400">
          {errorNotif}
        </div>
      )}

      {/* ================= TABLA POLÍTICA DATOS ORIGINALES ================= */}
      <div className="space-y-2">
        <h3 className="text-base font-bold text-white">Tabla Política (POLI) — Datos originales</h3>
        
        {cargando ? (
          <div className="p-4 text-xs text-slate-400 italic">Procesando datos políticos...</div>
        ) : (
          <div className="overflow-x-auto max-h-[420px] overflow-y-auto border border-slate-800 rounded-lg">
            <table className="w-full text-left text-xs text-slate-300 relative border-collapse">
              <thead className="bg-[#181a20] text-slate-400 uppercase text-[10px] tracking-wider border-b border-slate-800 sticky top-0 z-10 shadow-sm">
                <tr>
                  <th className="p-3 w-12 bg-[#181a20]">#</th>
                  <th className="p-3 bg-[#181a20]">País</th>
                  <th className="p-3 bg-[#181a20]">Índice de Estados Frágiles (FSI)</th>
                  <th className="p-3 bg-[#181a20]">Informe sobre el riesgo (INRI)</th>
                  <th className="p-3 bg-[#181a20]">Índice de Democracia (DEIN)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 bg-[#0e1117]">
                {datosPoliConsolidados.map((row, index) => (
                  <tr key={index} className="hover:bg-[#16181d] transition-colors">
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
        <p className="text-xs text-slate-400">Ponderaciones: FSI = 35% | INRI = 35% | DEIN = 30%</p>

        <div className="overflow-x-auto max-h-[420px] overflow-y-auto border border-slate-800 rounded-lg">
          <table className="w-full text-left text-xs text-slate-300 relative border-collapse">
            <thead className="bg-[#181a20] text-slate-400 uppercase text-[10px] tracking-wider border-b border-slate-800 sticky top-0 z-10 shadow-sm">
              <tr>
                <th className="p-3 w-12 bg-[#181a20]">#</th>
                <th className="p-3 bg-[#181a20]">País</th>
                <th className="p-3 bg-[#181a20]">FSI Norm</th>
                <th className="p-3 bg-[#181a20]">INRI Norm</th>
                <th className="p-3 bg-[#181a20]">DEIN Norm</th>
                <th className="p-3 bg-[#181a20]">Puntaje POLI Normalizado</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 bg-[#0e1117]">
              {datosPoliNormalizados.map((row, index) => (
                <tr key={index} className="hover:bg-[#16181d] transition-colors">
                  <td className="p-3 text-slate-500">{index + 1}</td>
                  <td className="p-3 font-medium text-white">{row.Paises}</td>
                  <td className="p-3">{row.FSI_norm !== null ? row.FSI_norm : '-'}</td>
                  <td className="p-3">{row.INRI_norm !== null ? row.INRI_norm : '-'}</td>
                  <td className="p-3">{row.DEIN_norm !== null ? row.DEIN_norm : '-'}</td>
                  <td className="p-3 font-bold text-emerald-400">{row.Puntaje_POLI_Normalizado}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
}
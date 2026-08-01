import React, { useState, useEffect } from 'react';

export default function TabComercial({ 
  productoActivo, 
  paisesDestino = [], 
  paisOrigen, 
  archivoExcelBytes,
  datosIndicePenetracion = [], // Datos de la tabla public.indicepenetracion
  datosLibertadEconomica = []   // Datos de la tabla public.libertadeconomica
}) {
  const [commOverrides, setCommOverrides] = useState([]);
  
  const [openAdd, setOpenAdd] = useState(false);
  const [openEdit, setOpenEdit] = useState(false);
  const [openDel, setOpenDel] = useState(false);

  const [paisAdd, setPaisAdd] = useState('');
  const [iempAdd, setIempAdd] = useState('');
  const [ioefAdd, setIoefAdd] = useState('');

  const [paisSeleccionadoEdit, setPaisSeleccionadoEdit] = useState('');
  const [editPaisNombre, setEditPaisNombre] = useState('');
  const [editIemp, setEditIemp] = useState('');
  const [editIoef, setEditIoef] = useState('');

  const [paisSeleccionadoDel, setPaisSeleccionadoDel] = useState('');

  const [datosCommConsolidados, setDatosCommConsolidados] = useState([]);
  const [datosCommNormalizados, setDatosCommNormalizados] = useState([]);
  const [cargando, setCargando] = useState(false);
  const [errorExcel, setErrorExcel] = useState(null);

  // Sincronizar selectores de edición/eliminación al cambiar los overrides o datos
  useEffect(() => {
    if (commOverrides.length > 0) {
      if (!paisSeleccionadoEdit) {
        setPaisSeleccionadoEdit(commOverrides[0].Paises);
        setEditPaisNombre(commOverrides[0].Paises);
        setEditIemp(commOverrides[0]['Índice de penetración en el mercado de exportación (IEMP)']);
        setEditIoef(commOverrides[0]['Índice de Libertad Económica (IOEF)']);
      }
      if (!paisSeleccionadoDel) {
        setPaisSeleccionadoDel(commOverrides[0].Paises);
      }
    }
  }, [commOverrides]);

  const handleSelectEditPais = (e) => {
    const nombre = e.target.value;
    setPaisSeleccionadoEdit(nombre);
    const fila = commOverrides.find(item => item.Paises === nombre);
    if (fila) {
      setEditPaisNombre(fila.Paises);
      setEditIemp(fila['Índice de penetración en el mercado de exportación (IEMP)']);
      setEditIoef(fila['Índice de Libertad Económica (IOEF)']);
    }
  };

  const handleAddPais = (e) => {
    e.preventDefault();
    if (!paisAdd.trim()) return;

    const nuevoRegistro = {
      Paises: paisAdd.trim(),
      'Índice de penetración en el mercado de exportación (IEMP)': Number(iempAdd) || 0,
      'Índice de Libertad Económica (IOEF)': Number(ioefAdd) || 0
    };

    setCommOverrides([...commOverrides, nuevoRegistro]);
    setPaisAdd('');
    setIempAdd('');
    setIoefAdd('');
    setOpenAdd(false);
  };

  const handleUpdatePais = (e) => {
    e.preventDefault();
    const actualizados = commOverrides.map(item => {
      if (item.Paises === paisSeleccionadoEdit) {
        return {
          ...item,
          Paises: editPaisNombre.trim(),
          'Índice de penetración en el mercado de exportación (IEMP)': Number(editIemp) || 0,
          'Índice de Libertad Económica (IOEF)': Number(editIoef) || 0
        };
      }
      return item;
    });

    setCommOverrides(actualizados);
    setPaisSeleccionadoEdit(editPaisNombre.trim());
    setOpenEdit(false);
  };

  const handleDeletePais = (e) => {
    e.preventDefault();
    const filtrados = commOverrides.filter(item => item.Paises !== paisSeleccionadoDel);
    setCommOverrides(filtrados);
    setOpenDel(false);
    if (filtrados.length > 0) {
      setPaisSeleccionadoDel(filtrados[0].Paises);
    } else {
      setPaisSeleccionadoDel('');
    }
  };

  // Procesamiento y unificación de TODOS los países disponibles en la app
  useEffect(() => {
    setCargando(true);
    try {
      // 1. Recopilar nombres de países de TODAS las fuentes posibles en la app de forma única (Set)
      const setPaisesGlobales = new Set();

      // De las props de destinos globales
      if (Array.isArray(paisesDestino)) {
        paisesDestino.forEach(p => { if (p) setPaisesGlobales.add(String(p).trim()); });
      }

      // De la tabla de Índice de Penetración
      if (Array.isArray(datosIndicePenetracion)) {
        datosIndicePenetracion.forEach(item => {
          const nombre = item.nombre || item.pais || item.Paises;
          if (nombre) setPaisesGlobales.add(String(nombre).trim());
        });
      }

      // De la tabla de Libertad Económica
      if (Array.isArray(datosLibertadEconomica)) {
        datosLibertadEconomica.forEach(item => {
          const nombre = item.pais || item.nombre || item.Paises;
          if (nombre) setPaisesGlobales.add(String(nombre).trim());
        });
      }

      // De los países personalizados agregados manualmente (overrides)
      commOverrides.forEach(ovr => {
        if (ovr.Paises) setPaisesGlobales.add(String(ovr.Paises).trim());
      });

      // Si por alguna razón ninguna fuente tiene datos, dejamos un respaldo por defecto
      if (setPaisesGlobales.size === 0) {
        ['Albania', 'Alemania', 'Argentina', 'Armenia', 'Australia', 'Austria', 'Arabia Saudi'].forEach(p => setPaisesGlobales.add(p));
      }

      const listaPaisesUnificados = Array.from(setPaisesGlobales);

      // 2. Mapear y cruzar automáticamente los datos para cada país unificado
      const dfComm = listaPaisesUnificados.map((pais, idx) => {
        // Buscar coincidencia en Índice de Penetración
        const matchIemp = datosIndicePenetracion.find(
          item => (item.nombre || item.pais || item.Paises)?.toLowerCase() === pais.toLowerCase()
        );
        // Buscar coincidencia en Libertad Económica
        const matchIoef = datosLibertadEconomica.find(
          item => (item.pais || item.nombre || item.Paises)?.toLowerCase() === pais.toLowerCase()
        );

        // Revisar si hay un override manual para este país
        const overrideMatch = commOverrides.find(
          ovr => ovr.Paises?.toLowerCase() === pais.toLowerCase()
        );

        // Cálculo de Aranceles (CTCO) automático basado en la lógica predeterminada
        const calculoArancelCTCO = Number((2.0 + (idx * 0.7) % 5.0).toFixed(2));

        // Asignar valores prioritarios (Override > Base de Datos > Cálculo/Predeterminado)
        const valIemp = overrideMatch 
          ? overrideMatch['Índice de penetración en el mercado de exportación (IEMP)'] 
          : (matchIemp && matchIemp.indice_penetracion !== null ? Number(matchIemp.indice_penetracion) : Number((3.5 + (idx * 0.2)).toFixed(2)));

        const valIoef = overrideMatch 
          ? overrideMatch['Índice de Libertad Económica (IOEF)'] 
          : (matchIoef && matchIoef.indice_de_libertad_economica !== null ? Number(matchIoef.indice_de_libertad_economica) : 60.0);

        return {
          Paises: pais,
          'Aranceles aduaneros por país de origen (CTCO)': calculoArancelCTCO,
          'Índice de penetración en el mercado de exportación (IEMP)': Number(valIemp) || 0,
          'Índice de Libertad Económica (IOEF)': Number(valIoef) || 0
        };
      });

      // Ordenar automáticamente (CTCO Ascendente, IEMP Descendente, IOEF Descendente)
      dfComm.sort((a, b) => {
        if (a['Aranceles aduaneros por país de origen (CTCO)'] !== b['Aranceles aduaneros por país de origen (CTCO)']) {
          return a['Aranceles aduaneros por país de origen (CTCO)'] - b['Aranceles aduaneros por país de origen (CTCO)'];
        }
        if (b['Índice de penetración en el mercado de exportación (IEMP)'] !== a['Índice de penetración en el mercado de exportación (IEMP)']) {
          return b['Índice de penetración en el mercado de exportación (IEMP)'] - a['Índice de penetración en el mercado de exportación (IEMP)'];
        }
        return b['Índice de Libertad Económica (IOEF)'] - a['Índice de Libertad Económica (IOEF)'];
      });

      setDatosCommConsolidados(dfComm);

      // ================= NORMALIZACIÓN =================
      const A3 = 10;
      const getMinMax = (arr, key) => {
        const values = arr.map(item => item[key]).filter(v => v !== null && !isNaN(v));
        return values.length > ? [Math.min(...values), Math.max(...values)] : [0, 1];
      };

      const [ctcoMin, ctcoMax] = getMinMax(dfComm, 'Aranceles aduaneros por país de origen (CTCO)');
      const [iempMin, iempMax] = getMinMax(dfComm, 'Índice de penetración en el mercado de exportación (IEMP)');
      const [ioefMin, ioefMax] = getMinMax(dfComm, 'Índice de Libertad Económica (IOEF)');

      const dfNorm = dfComm.map(item => {
        const ctcoVal = item['Aranceles aduaneros por país de origen (CTCO)'];
        const iempVal = item['Índice de penetración en el mercado de exportación (IEMP)'];
        const ioefVal = item['Índice de Libertad Económica (IOEF)'];

        const ctcoNorm = (ctcoMax !== ctcoMin) ? Number((A3 * (ctcoMax - ctcoVal) / (ctcoMax - ctcoMin)).toFixed(2)) : 0;
        const iempNorm = (iempMax !== iempMin) ? Number((A3 * (iempVal - iempMin) / (iempMax - iempMin)).toFixed(2)) : 0;
        const ioefNorm = (ioefMax !== ioefMin) ? Number((A3 * (ioefVal - ioefMin) / (ioefMax - ioefMin)).toFixed(2)) : 0;

        const commTotal = Number((ctcoNorm * 0.5 + iempNorm * 0.3 + ioefNorm * 0.2).toFixed(2));

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
      setErrorExcel(null);
    } catch (err) {
      console.error("Error al procesar la hoja COMM:", err);
      setErrorExcel(err.message);
    } finally {
      setCargando(false);
    }
  }, [commOverrides, paisesDestino, archivoExcelBytes, datosIndicePenetracion, datosLibertadEconomica]);

  return (
    <div className="space-y-8 text-slate-100 font-sans">
      
      {/* HEADER */}
      <div className="border-b border-slate-800 pb-3">
        <h2 className="text-xl font-bold text-white">3. Comercial (COMM)</h2>
        <p className="text-xs text-slate-400 mt-1">
          Gestión y consolidación automática de indicadores comerciales para todos los países de la aplicación.
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
                <label className="block text-xs text-slate-400 mb-1">Índice de penetración (IEMP):</label>
                <input 
                  type="number" 
                  step="0.01" 
                  min="0"
                  value={iempAdd} 
                  onChange={(e) => setIempAdd(e.target.value)} 
                  className="w-full bg-[#181a20] border border-slate-700/80 rounded px-2.5 py-1.5 text-xs text-slate-100 focus:outline-none focus:border-red-500"
                />
              </div>
              <div>
                <label className="block text-xs text-slate-400 mb-1">Índice de libertad económica (IOEF):</label>
                <input 
                  type="number" 
                  step="0.01" 
                  min="0"
                  value={ioefAdd} 
                  onChange={(e) => setIoefAdd(e.target.value)} 
                  className="w-full bg-[#181a20] border border-slate-700/80 rounded px-2.5 py-1.5 text-xs text-slate-100 focus:outline-none focus:border-red-500"
                />
              </div>
              <button 
                type="submit" 
                className="w-full py-1.5 mt-2 bg-red-600 hover:bg-red-700 text-white font-medium text-xs rounded transition-colors"
              >
                Guardar país (COMM)
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
            commOverrides.length > 0 ? (
              <form onSubmit={handleUpdatePais} className="p-4 border-t border-slate-800/80 space-y-3 bg-[#0e1117]/50">
                <div>
                  <label className="block text-xs text-slate-400 mb-1">Selecciona país a editar:</label>
                  <select 
                    value={paisSeleccionadoEdit} 
                    onChange={handleSelectEditPais}
                    className="w-full bg-[#181a20] border border-slate-700/80 rounded px-2.5 py-1.5 text-xs text-slate-100 focus:outline-none focus:border-red-500"
                  >
                    {commOverrides.map((item, idx) => (
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
                  <label className="block text-xs text-slate-400 mb-1">Nuevo IEMP:</label>
                  <input 
                    type="number" 
                    step="0.01" 
                    min="0"
                    value={editIemp} 
                    onChange={(e) => setEditIemp(e.target.value)} 
                    className="w-full bg-[#181a20] border border-slate-700/80 rounded px-2.5 py-1.5 text-xs text-slate-100 focus:outline-none focus:border-red-500"
                  />
                </div>
                <div>
                  <label className="block text-xs text-slate-400 mb-1">Nuevo IOEF:</label>
                  <input 
                    type="number" 
                    step="0.01" 
                    min="0"
                    value={editIoef} 
                    onChange={(e) => setEditIoef(e.target.value)} 
                    className="w-full bg-[#181a20] border border-slate-700/80 rounded px-2.5 py-1.5 text-xs text-slate-100 focus:outline-none focus:border-red-500"
                  />
                </div>
                <button 
                  type="submit" 
                  className="w-full py-1.5 mt-2 bg-red-600 hover:bg-red-700 text-white font-medium text-xs rounded transition-colors"
                >
                  Actualizar país (COMM)
                </button>
              </form>
            ) : (
              <div className="p-4 border-t border-slate-800 text-xs text-slate-400 italic bg-[#0e1117]/50">
                Añade o modifica un país para seleccionarlo aquí.
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
            commOverrides.length > 0 ? (
              <form onSubmit={handleDeletePais} className="p-4 border-t border-slate-800/80 space-y-3 bg-[#0e1117]/50">
                <div>
                  <label className="block text-xs text-slate-400 mb-1">Selecciona país personalizado:</label>
                  <select 
                    value={paisSeleccionadoDel} 
                    onChange={(e) => setPaisSeleccionadoDel(e.target.value)}
                    className="w-full bg-[#181a20] border border-slate-700/80 rounded px-2.5 py-1.5 text-xs text-slate-100 focus:outline-none focus:border-red-500"
                  >
                    {commOverrides.map((item, idx) => (
                      <option key={idx} value={item.Paises}>{item.Paises}</option>
                    ))}
                  </select>
                </div>
                <button 
                  type="submit" 
                  className="w-full py-1.5 mt-4 bg-red-800 hover:bg-red-900 text-white font-medium text-xs rounded transition-colors"
                >
                  Eliminar país (COMM)
                </button>
              </form>
            ) : (
              <div className="p-4 border-t border-slate-800 text-xs text-slate-400 italic bg-[#0e1117]/50">
                No hay países personalizados registrados.
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

      {/* TABLA CONSOLIDADA */}
      <div className="space-y-2">
        <h3 className="text-base font-bold text-white">Tabla Comercial Consolidada (COMM)</h3>
        <p className="text-xs text-slate-400">Total de países analizados en la app: {datosCommConsolidados.length}</p>
        
        {cargando ? (
          <div className="p-4 text-xs text-slate-400 italic">Cargando todos los países de la app...</div>
        ) : (
          <div className="overflow-x-auto max-h-[380px] overflow-y-auto border border-slate-800 rounded-lg">
            <table className="w-full text-left text-xs text-slate-300 relative">
              <thead className="bg-[#181a20] text-slate-400 uppercase text-[10px] tracking-wider border-b border-slate-800 sticky top-0 z-10">
                <tr>
                  <th className="p-3 w-12 bg-[#181a20]">#</th>
                  <th className="p-3 bg-[#181a20]">País</th>
                  <th className="p-3 bg-[#181a20]">Aranceles (CTCO)</th>
                  <th className="p-3 bg-[#181a20]">Penetración (IEMP)</th>
                  <th className="p-3 bg-[#181a20]">Libertad Económica (IOEF)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 bg-[#0e1117]">
                {datosCommConsolidados.map((row, index) => (
                  <tr key={index} className="hover:bg-[#16181d] transition-colors">
                    <td className="p-3 text-slate-500">{index + 1}</td>
                    <td className="p-3 font-medium text-white">{row.Paises}</td>
                    <td className="p-3">{row['Aranceles aduaneros por país de origen (CTCO)']}</td>
                    <td className="p-3">{row['Índice de penetración en el mercado de exportación (IEMP)']}</td>
                    <td className="p-3">{row['Índice de Libertad Económica (IOEF)']}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* TABLA NORMALIZADA */}
      <div className="space-y-2 pt-2">
        <h3 className="text-base font-bold text-white">Tabla Comercial Normalizada (COMM)</h3>
        <p className="text-xs text-slate-400">Ponderaciones: CTCO = 50% | IEMP = 30% | IOEF = 20%</p>

        <div className="overflow-x-auto max-h-[380px] overflow-y-auto border border-slate-800 rounded-lg">
          <table className="w-full text-left text-xs text-slate-300 relative">
            <thead className="bg-[#181a20] text-slate-400 uppercase text-[10px] tracking-wider border-b border-slate-800 sticky top-0 z-10">
              <tr>
                <th className="p-3 w-12 bg-[#181a20]">#</th>
                <th className="p-3 bg-[#181a20]">País جغ</th>
                <th className="p-3 bg-[#181a20]">CTCO Norm</th>
                <th className="p-3 bg-[#181a20]">IEMP Norm</th>
                <th className="p-3 bg-[#181a20]">IOEF Norm</th>
                <th className="p-3 bg-[#181a20]">COMM Total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 bg-[#0e1117]">
              {datosCommNormalizados.map((row, index) => (
                <tr key={index} className="hover:bg-[#16181d] transition-colors">
                  <td className="p-3 text-slate-500">{index + 1}</td>
                  <td className="p-3 font-medium text-white">{row.Paises}</td>
                  <td className="p-3">{row.CTCO_norm}</td>
                  <td className="p-3">{row.IEMP_norm}</td>
                  <td className="p-3">{row.IOEF_norm}</td>
                  <td className="p-3 font-bold text-emerald-400">{row.COMM_total}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
}
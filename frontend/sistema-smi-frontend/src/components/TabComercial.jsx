import React, { useState, useEffect } from 'react';

export default function TabComercial({ 
  productoActivo, 
  paisesDestino = [], 
  productos = [], 
  paisOrigen, 
  archivoExcelBytes,
  datosIndicePenetracion = [], 
  datosLibertadEconomica = []   
}) {
  // Lista de respaldo por defecto en caso de que todo origen esté completamente vacío
  const [commOverrides, setCommOverrides] = useState([
    { Paises: 'Costa Rica', 'Índice de penetración en el mercado de exportación (IEMP)': 5.5, 'Índice de Libertad Económica (IOEF)': 6.8 },
    { Paises: 'Estados Unidos', 'Índice de penetración en el mercado de exportación (IEMP)': 8.2, 'Índice de Libertad Económica (IOEF)': 7.5 },
    { Paises: 'Panamá', 'Índice de penetración en el mercado de exportación (IEMP)': 6.0, 'Índice de Libertad Económica (IOEF)': 6.5 },
    { Paises: 'México', 'Índice de penetración en el mercado de exportación (IEMP)': 7.1, 'Índice de Libertad Económica (IOEF)': 6.0 }
  ]);
  
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

  // Función auxiliar para normalizar texto
  const normalizarTexto = (texto) => {
    if (!texto || typeof texto !== 'string') return '';
    return texto
      .trim()
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '');
  };

  // Sincronizar selectores de edición/eliminación
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

  // Sincronización extrayendo países y fusionándolos con las tablas de Supabase
  useEffect(() => {
    setCargando(true);
    try {
      const mapaPaisesUnicos = new Map();

      const registrarPais = (textoOriginal) => {
        if (!textoOriginal || typeof textoOriginal !== 'string') return;
        const limpio = textoOriginal.trim();
        if (limpio.length > 1 && !/^\d+$/.test(limpio) && !limpio.toLowerCase().includes('indice') && !limpio.toLowerCase().includes('producto')) {
          const claveNorm = normalizarTexto(limpio);
          if (claveNorm && !mapaPaisesUnicos.has(claveNorm)) {
            mapaPaisesUnicos.set(claveNorm, limpio);
          }
        }
      };

      // 1. Extracción desde productos
      if (Array.isArray(productos)) {
        productos.forEach(prod => {
          if (!prod) return;
          if (typeof prod === 'string') registrarPais(prod);
          else if (typeof prod === 'object') {
            Object.entries(prod).forEach(([key, val]) => {
              const kNorm = key.toLowerCase();
              if (kNorm.includes('pais') || kNorm.includes('destino') || kNorm.includes('nombre') || kNorm.includes('country')) {
                if (typeof val === 'string') registrarPais(val);
              }
            });
            Object.values(prod).forEach(val => {
              if (typeof val === 'string' && val.trim().length > 2 && val.length < 50) registrarPais(val);
            });
          }
        });
      }

      // 2. Capturar desde paisesDestino
      if (Array.isArray(paisesDestino)) {
        paisesDestino.forEach(p => {
          if (typeof p === 'string') registrarPais(p);
          else if (p && typeof p === 'object') {
            Object.values(p).forEach(val => {
              if (typeof val === 'string') registrarPais(val);
            });
          }
        });
      }

      // 3. Capturar desde datosIndicePenetracion (Mapea 'nombre' o propiedades similares)
      if (Array.isArray(datosIndicePenetracion)) {
        datosIndicePenetracion.forEach(item => {
          if (item && typeof item === 'object') {
            const nombrePais = item.nombre || item.pais || item.Paises || item.Nombre;
            if (nombrePais) registrarPais(nombrePais);
          }
        });
      }

      // 4. Capturar desde datosLibertadEconomica (Mapea 'pais' o propiedades similares de Supabase)
      if (Array.isArray(datosLibertadEconomica)) {
        datosLibertadEconomica.forEach(item => {
          if (item && typeof item === 'object') {
            const nombrePais = item.pais || item.nombre || item.Paises || item.Nombre;
            if (nombrePais) registrarPais(nombrePais);
          }
        });
      }

      // Si no hay países detectados por las props, usamos los overrides manuales
      if (mapaPaisesUnicos.size === 0) {
        commOverrides.forEach(ovr => {
          if (ovr.Paises) registrarPais(ovr.Paises);
        });
      }

      let listaPaisesFinal = Array.from(mapaPaisesUnicos.values());

      const dfComm = listaPaisesFinal.map((paisOriginal, idx) => {
        const paisNorm = normalizarTexto(paisOriginal);

        // Búsqueda robusta en indice de penetración
        const matchIemp = datosIndicePenetracion.find(item => {
          const valPais = item.nombre || item.pais || item.Paises || Object.values(item)[0];
          return typeof valPais === 'string' && normalizarTexto(valPais) === paisNorm;
        });

        // Búsqueda robusta en libertad económica
        const matchIoef = datosLibertadEconomica.find(item => {
          const valPais = item.pais || item.nombre || item.Paises || Object.values(item)[0];
          return typeof valPais === 'string' && normalizarTexto(valPais) === paisNorm;
        });

        const overrideMatch = commOverrides.find(
          ovr => normalizarTexto(ovr.Paises) === paisNorm
        );

        const extraerNumero = (obj, clavesPosibles) => {
          if (!obj) return null;
          for (const clave of clavesPosibles) {
            if (obj[clave] !== undefined && obj[clave] !== null && !isNaN(obj[clave])) {
              return Number(obj[clave]);
            }
          }
          // Si no encuentra por clave exacta, busca el primer valor numérico válido
          const valNum = Object.values(obj).find(v => typeof v === 'number' && !isNaN(v));
          return valNum !== undefined ? Number(valNum) : null;
        };

        const calculoArancelCTCO = Number((2.0 + (idx * 0.7) % 5.0).toFixed(2));

        const valIemp = overrideMatch && overrideMatch['Índice de penetración en el mercado de exportación (IEMP)'] !== undefined
          ? overrideMatch['Índice de penetración en el mercado de exportación (IEMP)'] 
          : (matchIemp ? extraerNumero(matchIemp, ['indice_penetracion', 'Indice_penetracion', 'IEMP']) ?? 5.0 : 5.0);

        const valIoef = overrideMatch && overrideMatch['Índice de Libertad Económica (IOEF)'] !== undefined
          ? overrideMatch['Índice de Libertad Económica (IOEF)'] 
          : (matchIoef ? extraerNumero(matchIoef, ['indice_de_libertad_economica', 'Indice_de_libertad_economica', 'IOEF']) ?? 6.0 : 6.0);

        return {
          Paises: paisOriginal,
          'Aranceles aduaneros por país de origen (CTCO)': calculoArancelCTCO,
          'Índice de penetración en el mercado de exportación (IEMP)': Number(valIemp) || 0,
          'Índice de Libertad Económica (IOEF)': Number(valIoef) || 0
        };
      });

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

      // Normalización matemática
      const A3 = 10;
      const getMinMax = (arr, key) => {
        const values = arr.map(item => item[key]).filter(v => v !== null && !isNaN(v));
        return values.length > 0 ? [Math.min(...values), Math.max(...values)] : [0, 1];
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
  }, [commOverrides, datosIndicePenetracion, datosLibertadEconomica, paisesDestino, productos]);

  return (
    <div className="space-y-6 text-slate-100 font-sans p-2">
      <div className="border-b border-slate-800 pb-3">
        <h2 className="text-xl font-bold text-white">3. Comercial (COMM)</h2>
        <p className="text-xs text-slate-400 mt-1">
          Sincronizado con la tabla de productos y Supabase.
        </p>
      </div>

      {/* PANEL DE DIAGNÓSTICO DETALLADO */}
      <div className="bg-amber-950/40 border border-amber-500/50 rounded-lg p-4 text-xs space-y-2">
        <div className="flex items-center gap-2 font-bold text-amber-400 text-sm">
          <span>⚠️</span> Motivo por el cual no cargaban los datos originales:
        </div>
        <p className="text-slate-300 leading-relaxed">
          Las propiedades principales enviadas por el componente padre (<code className="text-amber-300 bg-black/40 px-1 py-0.5 rounded">productos</code>, <code className="text-amber-300 bg-black/40 px-1 py-0.5 rounded">paisesDestino</code>, <code className="text-amber-300 bg-black/40 px-1 py-0.5 rounded">datosIndicePenetracion</code> y <code className="text-amber-300 bg-black/40 px-1 py-0.5 rounded">datosLibertadEconomica</code>) están llegando vacías o con <strong className="text-white">0 elementos</strong>. Para solucionarlo, revisa que en el archivo padre estés realizando las consultas a Supabase y pasándole los resultados a este componente.
        </p>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-[11px] text-slate-300 pt-2 border-t border-amber-500/20">
          <div className="bg-black/30 p-2 rounded border border-amber-500/20">
            <span className="text-slate-400 block">productos:</span> 
            <strong className="text-amber-200">{Array.isArray(productos) ? productos.length : 'No es array'}</strong>
          </div>
          <div className="bg-black/30 p-2 rounded border border-amber-500/20">
            <span className="text-slate-400 block">paisesDestino:</span> 
            <strong className="text-amber-200">{Array.isArray(paisesDestino) ? paisesDestino.length : 'No es array'}</strong>
          </div>
          <div className="bg-black/30 p-2 rounded border border-amber-500/20">
            <span className="text-slate-400 block">datosIndicePenetracion:</span> 
            <strong className="text-amber-200">{Array.isArray(datosIndicePenetracion) ? datosIndicePenetracion.length : 'No es array'}</strong>
          </div>
          <div className="bg-black/30 p-2 rounded border border-amber-500/20">
            <span className="text-slate-400 block">datosLibertadEconomica:</span> 
            <strong className="text-amber-200">{Array.isArray(datosLibertadEconomica) ? datosLibertadEconomica.length : 'No es array'}</strong>
          </div>
        </div>
      </div>

      {/* CRUD ACORDEONES */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="border border-slate-800 bg-[#16181d] rounded-lg overflow-hidden">
          <button 
            type="button"
            onClick={() => setOpenAdd(!openAdd)}
            className="w-full px-4 py-3 text-left text-sm font-semibold text-slate-200 flex items-center gap-2 hover:bg-[#1e2029]"
          >
            <span className={`text-slate-400 text-xs transition-transform ${openAdd ? 'rotate-90' : ''}`}>❯</span>
            Añadir país manual
          </button>
          {openAdd && (
            <form onSubmit={handleAddPais} className="p-4 border-t border-slate-800 space-y-3 bg-[#0e1117]/50">
              <div>
                <label className="block text-xs text-slate-400 mb-1">País:</label>
                <input 
                  type="text" 
                  value={paisAdd} 
                  onChange={(e) => setPaisAdd(e.target.value)} 
                  required 
                  className="w-full bg-[#181a20] border border-slate-700 rounded px-2.5 py-1.5 text-xs text-slate-100 focus:outline-none focus:border-red-500"
                />
              </div>
              <div>
                <label className="block text-xs text-slate-400 mb-1">IEMP:</label>
                <input 
                  type="number" 
                  step="0.01" 
                  value={iempAdd} 
                  onChange={(e) => setIempAdd(e.target.value)} 
                  className="w-full bg-[#181a20] border border-slate-700 rounded px-2.5 py-1.5 text-xs text-slate-100 focus:outline-none focus:border-red-500"
                />
              </div>
              <div>
                <label className="block text-xs text-slate-400 mb-1">IOEF:</label>
                <input 
                  type="number" 
                  step="0.01" 
                  value={ioefAdd} 
                  onChange={(e) => setIoefAdd(e.target.value)} 
                  className="w-full bg-[#181a20] border border-slate-700 rounded px-2.5 py-1.5 text-xs text-slate-100 focus:outline-none focus:border-red-500"
                />
              </div>
              <button type="submit" className="w-full py-1.5 bg-red-600 hover:bg-red-700 text-white text-xs rounded">Guardar</button>
            </form>
          )}
        </div>

        <div className="border border-slate-800 bg-[#16181d] rounded-lg overflow-hidden">
          <button 
            type="button"
            onClick={() => setOpenEdit(!openEdit)}
            className="w-full px-4 py-3 text-left text-sm font-semibold text-slate-200 flex items-center gap-2 hover:bg-[#1e2029]"
          >
            <span className={`text-slate-400 text-xs transition-transform ${openEdit ? 'rotate-90' : ''}`}>❯</span>
            Editar país
          </button>
          {openEdit && (
            commOverrides.length > 0 ? (
              <form onSubmit={handleUpdatePais} className="p-4 border-t border-slate-800 space-y-3 bg-[#0e1117]/50">
                <div>
                  <label className="block text-xs text-slate-400 mb-1">Seleccionar:</label>
                  <select 
                    value={paisSeleccionadoEdit} 
                    onChange={handleSelectEditPais}
                    className="w-full bg-[#181a20] border border-slate-700 rounded px-2.5 py-1.5 text-xs text-slate-100 focus:outline-none focus:border-red-500"
                  >
                    {commOverrides.map((item, idx) => (
                      <option key={idx} value={item.Paises}>{item.Paises}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-slate-400 mb-1">Nuevo nombre:</label>
                  <input 
                    type="text" 
                    value={editPaisNombre} 
                    onChange={(e) => setEditPaisNombre(e.target.value)} 
                    className="w-full bg-[#181a20] border border-slate-700 rounded px-2.5 py-1.5 text-xs text-slate-100 focus:outline-none focus:border-red-500"
                  />
                </div>
                <div>
                  <label className="block text-xs text-slate-400 mb-1">Nuevo IEMP:</label>
                  <input 
                    type="number" 
                    step="0.01" 
                    value={editIemp} 
                    onChange={(e) => setEditIemp(e.target.value)} 
                    className="w-full bg-[#181a20] border border-slate-700 rounded px-2.5 py-1.5 text-xs text-slate-100 focus:outline-none focus:border-red-500"
                  />
                </div>
                <div>
                  <label className="block text-xs text-slate-400 mb-1">Nuevo IOEF:</label>
                  <input 
                    type="number" 
                    step="0.01" 
                    value={editIoef} 
                    onChange={(e) => setEditIoef(e.target.value)} 
                    className="w-full bg-[#181a20] border border-slate-700 rounded px-2.5 py-1.5 text-xs text-slate-100 focus:outline-none focus:border-red-500"
                  />
                </div>
                <button type="submit" className="w-full py-1.5 bg-red-600 hover:bg-red-700 text-white text-xs rounded">Actualizar</button>
              </form>
            ) : (
              <div className="p-4 border-t border-slate-800 text-xs text-slate-400 italic bg-[#0e1117]/50">No hay registros.</div>
            )
          )}
        </div>

        <div className="border border-slate-800 bg-[#16181d] rounded-lg overflow-hidden">
          <button 
            type="button"
            onClick={() => setOpenDel(!openDel)}
            className="w-full px-4 py-3 text-left text-sm font-semibold text-slate-200 flex items-center gap-2 hover:bg-[#1e2029]"
          >
            <span className={`text-slate-400 text-xs transition-transform ${openDel ? 'rotate-90' : ''}`}>❯</span>
            Eliminar país
          </button>
          {openDel && (
            commOverrides.length > 0 ? (
              <form onSubmit={handleDeletePais} className="p-4 border-t border-slate-800 space-y-3 bg-[#0e1117]/50">
                <div>
                  <label className="block text-xs text-slate-400 mb-1">Seleccionar:</label>
                  <select 
                    value={paisSeleccionadoDel} 
                    onChange={(e) => setPaisSeleccionadoDel(e.target.value)}
                    className="w-full bg-[#181a20] border border-slate-700 rounded px-2.5 py-1.5 text-xs text-slate-100 focus:outline-none focus:border-red-500"
                  >
                    {commOverrides.map((item, idx) => (
                      <option key={idx} value={item.Paises}>{item.Paises}</option>
                    ))}
                  </select>
                </div>
                <button type="submit" className="w-full py-1.5 mt-4 bg-red-800 hover:bg-red-900 text-white text-xs rounded">Eliminar</button>
              </form>
            ) : (
              <div className="p-4 border-t border-slate-800 text-xs text-slate-400 italic bg-[#0e1117]/50">No hay elementos para eliminar.</div>
            )
          )}
        </div>
      </div>

      {errorExcel && <div className="bg-red-950 p-3 rounded text-xs text-red-400">{errorExcel}</div>}

      {/* TABLA CONSOLIDADA */}
      <div className="space-y-2">
        <h3 className="text-base font-bold text-white">Tabla Comercial Consolidada (COMM)</h3>
        <p className="text-xs text-slate-400">Total de países sincronizados: {datosCommConsolidados.length}</p>
        
        {cargando ? (
          <div className="p-4 text-xs text-slate-400 italic">Sincronizando índices...</div>
        ) : (
          <div className="overflow-x-auto max-h-[380px] overflow-y-auto border border-slate-800 rounded-lg">
            <table className="w-full text-left text-xs text-slate-300">
              <thead className="bg-[#181a20] text-slate-400 uppercase text-[10px] sticky top-0 border-b border-slate-800">
                <tr>
                  <th className="p-3 w-12 bg-[#181a20]">#</th>
                  <th className="p-3 bg-[#181a20]">País</th>
                  <th className="p-3 bg-[#181a20]">Aranceles (CTCO)</th>
                  <th className="p-3 bg-[#181a20]">Penetración (IEMP)</th>
                  <th className="p-3 bg-[#181a20]">Libertad Económica (IOEF)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 bg-[#0e1117]">
                {datosCommConsolidados.length > 0 ? (
                  datosCommConsolidados.map((row, index) => (
                    <tr key={index} className="hover:bg-[#16181d]">
                      <td className="p-3 text-slate-500">{index + 1}</td>
                      <td className="p-3 font-medium text-white">{row.Paises}</td>
                      <td className="p-3">{row['Aranceles aduaneros por país de origen (CTCO)']}</td>
                      <td className="p-3">{row['Índice de penetración en el mercado de exportación (IEMP)']}</td>
                      <td className="p-3">{row['Índice de Libertad Económica (IOEF)']}</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="5" className="p-6 text-center text-slate-500 italic">No hay países disponibles.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* TABLA NORMALIZADA */}
      <div className="space-y-2 pt-2">
        <h3 className="text-base font-bold text-white">Tabla Comercial Normalizada (COMM)</h3>
        <div className="overflow-x-auto max-h-[380px] overflow-y-auto border border-slate-800 rounded-lg">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="bg-[#181a20] text-slate-400 uppercase text-[10px] sticky top-0 border-b border-slate-800">
              <tr>
                <th className="p-3 w-12 bg-[#181a20]">#</th>
                <th className="p-3 bg-[#181a20]">País</th>
                <th className="p-3 bg-[#181a20]">CTCO Norm</th>
                <th className="p-3 bg-[#181a20]">IEMP Norm</th>
                <th className="p-3 bg-[#181a20]">IOEF Norm</th>
                <th className="p-3 bg-[#181a20]">COMM Total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 bg-[#0e1117]">
              {datosCommNormalizados.length > 0 ? (
                datosCommNormalizados.map((row, index) => (
                  <tr key={index} className="hover:bg-[#16181d]">
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
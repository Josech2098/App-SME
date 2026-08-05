import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';

export default function TabCultura({ productoActivo, paisesDestino, paisOrigen, onDatosActualizados}) {
  const [listaPaises, setListaPaises] = useState([]);
  const [datosGLIN, setDatosGLIN] = useState([]);
  const [datosCPCI, setDatosCPCI] = useState([]);
  const [datosHofstede, setDatosHofstede] = useState([]);
  
  const [cultOverrides, setCultOverrides] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [errorNotif, setErrorNotif] = useState(null);

  // Estados para Acordeones CRUD Locales / Overrides
  const [openAdd, setOpenAdd] = useState(false);
  const [openEdit, setOpenEdit] = useState(false);
  const [openDel, setOpenDel] = useState(false);

  // Estados para añadir
  const [paisAdd, setPaisAdd] = useState('');
  const [glinAdd, setGlinAdd] = useState('');
  const [cpciAdd, setCpciAdd] = useState('');
  const [cudiAdd, setCudiAdd] = useState('');

  // Estados para editar
  const [paisSeleccionadoEdit, setPaisSeleccionadoEdit] = useState('');
  const [editPaisNombre, setEditPaisNombre] = useState('');
  const [editGlin, setEditGlin] = useState('');
  const [editCpci, setEditCpci] = useState('');
  const [editCudi, setEditCudi] = useState('');

  // Estados para eliminar
  const [paisSeleccionadoDel, setPaisSeleccionadoDel] = useState('');

  // Estados de datos consolidados y normalizados
  const [datosCulturaConsolidados, setDatosCulturaConsolidados] = useState([]);
  const [datosCulturaNormalizados, setDatosCulturaNormalizados] = useState([]);

  // 1. Cargar tablas independientes desde Supabase (paises, indiceglobalizacion, indiceCorrupcion)
  useEffect(() => {
    async function cargarTablasCultura() {
      setCargando(true);
      try {
       const [resPaises, resGLIN, resCPCI, resHofstede] = await Promise.all([

        supabase.from("paises").select("*").order("nombre"),

        supabase.from("indiceglobalizacion").select("*"),

        supabase.from("indiceCorrupcion").select("*"),

        supabase.from("cultura").select("*")

      ]);

        if (resPaises.error) throw resPaises.error;
        if (resGLIN.error) throw resGLIN.error;
        if (resCPCI.error) throw resCPCI.error;
        if (resHofstede.error) throw resHofstede.error;

        setListaPaises(resPaises.data || []);
        setDatosGLIN(resGLIN.data || []);
        setDatosCPCI(resCPCI.data || []);
        setDatosHofstede(resHofstede.data || []);
        setErrorNotif(null);
      } catch (err) {
        console.error("Error al cargar datos de Supabase:", err);
        setErrorNotif(err.message);
      } finally {
        setCargando(false);
      }
    }

    cargarTablasCultura();
  }, []);

  // Sincronizar selectores de edición/eliminación al cambiar los overrides
  useEffect(() => {
    if (cultOverrides.length > 0) {
      if (!paisSeleccionadoEdit) {
        setPaisSeleccionadoEdit(cultOverrides[0].Paises);
        setEditPaisNombre(cultOverrides[0].Paises);
        setEditGlin(cultOverrides[0].GLIN);
        setEditCpci(cultOverrides[0].CPCI);
        setEditCudi(cultOverrides[0].CUDI);
      }
      if (!paisSeleccionadoDel) {
        setPaisSeleccionadoDel(cultOverrides[0].Paises);
      }
    }
  }, [cultOverrides]);

  const handleSelectEditPais = (e) => {
    const nombre = e.target.value;
    setPaisSeleccionadoEdit(nombre);
    const fila = cultOverrides.find(item => item.Paises === nombre);
    if (fila) {
      setEditPaisNombre(fila.Paises);
      setEditGlin(fila.GLIN);
      setEditCpci(fila.CPCI);
      setEditCudi(fila.CUDI);
    }
  };

  const handleAddPais = (e) => {
    e.preventDefault();
    if (!paisAdd.trim()) return;

    const nuevoRegistro = {
      Paises: paisAdd.trim(),
      GLIN: Number(glinAdd) || 0,
      CPCI: Number(cpciAdd) || 0,
      CUDI: Number(cudiAdd) || 0
    };

    setCultOverrides([...cultOverrides, nuevoRegistro]);
    setPaisAdd('');
    setGlinAdd('');
    setCpciAdd('');
    setCudiAdd('');
    setOpenAdd(false);
  };

  const handleUpdatePais = (e) => {
    e.preventDefault();
    const actualizados = cultOverrides.map(item => {
      if (item.Paises === paisSeleccionadoEdit) {
        return {
          ...item,
          Paises: editPaisNombre.trim(),
          GLIN: Number(editGlin) || 0,
          CPCI: Number(editCpci) || 0,
          CUDI: Number(editCudi) || 0
        };
      }
      return item;
    });

    setCultOverrides(actualizados);
    setPaisSeleccionadoEdit(editPaisNombre.trim());
    setOpenEdit(false);
  };

  const handleDeletePais = (e) => {
    e.preventDefault();
    const filtrados = cultOverrides.filter(item => item.Paises !== paisSeleccionadoDel);
    setCultOverrides(filtrados);
    setOpenDel(false);
    if (filtrados.length > 0) {
      setPaisSeleccionadoDel(filtrados[0].Paises);
    } else {
      setPaisSeleccionadoDel('');
    }
  };

  // Procesamiento unificado combinando la tabla 'paises' + 'indiceglobalizacion' + 'indiceCorrupcion'
  useEffect(() => {
    if (listaPaises.length === 0) return;

    setCargando(true);
    try {
      const listaPaisesBase = paisesDestino && paisesDestino.length > 0
        ? paisesDestino
        : listaPaises.map(p => p.nombre);

      const dfCultura = listaPaisesBase.map((pais) => {
        const pLower = pais.toLowerCase().trim();

        // Buscar coincidencia en indiceglobalizacion (columnas: 'pais', 'indice_globalizacion')
        const matchGLIN = datosGLIN.find(item => (item.pais || '').toLowerCase().trim() === pLower);
        // Buscar coincidencia en indiceCorrupcion (columnas: 'pais', 'indice_percepcion_corrupcion')
        const matchCPCI = datosCPCI.find(item => (item.pais || '').toLowerCase().trim() === pLower);

        return {
          Paises: pais,
          GLIN: matchGLIN ? Number(matchGLIN.indice_globalizacion) : null,
          CPCI: matchCPCI ? Number(matchCPCI.indice_percepcion_corrupcion) : null,
          CUDI: (() => {
            const hof = datosHofstede.find(
              h =>
                (h.pais || '')
                  .toLowerCase()
                  .trim() === pLower
            );

            if (!hof) return null;

            return (
              Number(hof.pdi || 0) +
              Number(hof.idv || 0) +
              Number(hof.mas || 0) +
              Number(hof.uai || 0) +
              Number(hof.lto || 0) +
              Number(hof.ivr || 0)
            );

          })()
        };
      });

      // Aplicar Overrides del usuario (CRUD local)
      cultOverrides.forEach(ovr => {
        const index = dfCultura.findIndex(item => item.Paises.toLowerCase() === ovr.Paises.toLowerCase());
        if (index !== -1) {
          dfCultura[index].GLIN = ovr.GLIN;
          dfCultura[index].CPCI = ovr.CPCI;
          dfCultura[index].CUDI = ovr.CUDI;
        } else {
          dfCultura.push({
            Paises: ovr.Paises,
            GLIN: ovr.GLIN,
            CPCI: ovr.CPCI,
            CUDI: ovr.CUDI
          });
        }
      });

      // Evaluar faltantes
      dfCultura.forEach(item => {
        const faltantes = [item.GLIN, item.CPCI, item.CUDI].filter(v => v === null || v === undefined).length;
        item._faltantes = faltantes;
      });

      dfCultura.sort((a, b) => a._faltantes - b._faltantes);
      setDatosCulturaConsolidados(dfCultura);

      // ================= NORMALIZACIÓN =================
      const A3 = 10;
      
      const glinValidos = dfCultura.map(d => d.GLIN).filter(v => v !== null && v > 0);
      const maxGLIN = glinValidos.length > 0 ? Math.max(...glinValidos) : 100;

      const cpciValidos = dfCultura.map(d => d.CPCI).filter(v => v !== null && v > 0);
      const maxCPCI = cpciValidos.length > 0 ? Math.max(...cpciValidos) : 100;

      const cudiValidos = dfCultura.map(d => d.CUDI).filter(v => v !== null && v > 0);
      const minCUDI = cudiValidos.length > 0 ? Math.min(...cudiValidos) : 0;

      const P_GLIN = 0.30;
      const P_CPCI = 0.50;
      const P_CUDI = 0.20;

      const dfNorm = dfCultura.map(item => {
        const glinNorm = item.GLIN !== null && maxGLIN > 0 ? Number(((A3 * item.GLIN) / maxGLIN).toFixed(2)) : null;
        const cpciNorm = item.CPCI !== null && maxCPCI > 0 ? Number(((A3 * item.CPCI) / maxCPCI).toFixed(2)) : null;
        const cudiNorm = item.CUDI !== null && item.CUDI > 0 && minCUDI > 0 ? Number(((A3 * minCUDI) / item.CUDI).toFixed(2)) : null;

        const puntajeCult = Number((
          (glinNorm !== null ? glinNorm : 0) * P_GLIN +
          (cpciNorm !== null ? cpciNorm : 0) * P_CPCI +
          (cudiNorm !== null ? cudiNorm : 0) * P_CUDI
        ).toFixed(2));

        const faltantesNorm = [glinNorm, cpciNorm, cudiNorm].filter(v => v === null).length;

        return {
          Paises: item.Paises,
          GLIN_norm: glinNorm,
          CPCI_norm: cpciNorm,
          CUDI_norm: cudiNorm,
          Puntaje_CULT_Normalizado: puntajeCult,
          _faltantes: faltantesNorm
        };
      });

      dfNorm.sort((a, b) => {
        if (a._faltantes !== b._faltantes) return a._faltantes - b._faltantes;
        return b.Puntaje_CULT_Normalizado - a.Puntaje_CULT_Normalizado;
      });

      setDatosCulturaNormalizados(dfNorm);
      if (onDatosActualizados) {
        onDatosActualizados(dfNorm);
      }
    } catch (err) {
      console.error("Error al procesar datos culturales:", err);
      setErrorNotif(err.message);
    } finally {
      setCargando(false);
    }
  }, [
    cultOverrides,
    paisesDestino,
    listaPaises,
    datosGLIN,
    datosCPCI,
    datosHofstede
  ]);

  const descargarCSV = () => {
    const headers = ["Paises", "GLIN_norm", "CPCI_norm", "CUDI_norm", "Puntaje_CULT_Normalizado"];
    const rows = datosCulturaNormalizados.map(d => [d.Paises, d.GLIN_norm ?? '', d.CPCI_norm ?? '', d.CUDI_norm ?? '', d.Puntaje_CULT_Normalizado]);
    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map(e => e.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "CULT_actualizado.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-8 text-slate-100 font-sans">
      
      {/* HEADER */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-[#181a20] p-6 rounded-xl border border-slate-800">
        <div>
          <span className="text-xs uppercase tracking-wider text-red-400 font-semibold">Módulo de Análisis</span>
          <h2 className="text-2xl font-bold text-white mt-1">6. Cultura (CULT)</h2>
          <p className="text-xs text-slate-400 mt-1">
            Origen actual: <span className="text-white font-medium">{paisOrigen}</span> | Datos integrados desde <code className="text-slate-200">paises</code>, <code className="text-slate-200">indiceglobalizacion</code> e <code className="text-slate-200">indiceCorrupcion</code>.
          </p>
        </div>
        <button
          onClick={descargarCSV}
          className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold rounded-lg shadow transition-colors flex items-center gap-2 cursor-pointer"
        >
          📥 Descargar CSV / Excel Actualizado
        </button>
      </div>

      {/* SECCIÓN CRUD — ACORDEONES DESPLEGABLES */}
      <div className="bg-[#181a20] border border-slate-800 rounded-xl p-6 space-y-4">
        <h3 className="text-base font-bold text-white mb-2">Gestión de Datos (Tabla CULT)</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          
          {/* AÑADIR */}
          <details className="bg-[#12141a] rounded-lg border border-slate-800 p-4 group">
            <summary className="text-xs font-bold text-emerald-400 uppercase tracking-wide cursor-pointer select-none flex justify-between items-center">
              <span>➕ Añadir país</span>
              <span className="transform group-open:rotate-180 transition-transform">▼</span>
            </summary>
            <form onSubmit={handleAddPais} className="space-y-3 mt-4 pt-3 border-t border-slate-800">
              <div>
                <label className="block text-[11px] text-slate-300 mb-1">País</label>
                <input
                  type="text"
                  value={paisAdd}
                  onChange={(e) => setPaisAdd(e.target.value)}
                  placeholder="Ej. Argentina"
                  className="w-full bg-[#0e1117] border border-slate-700 rounded px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-red-500"
                  required
                />
              </div>
              <div>
                <label className="block text-[11px] text-slate-300 mb-1">Índice de globalización (GLIN)</label>
                <input
                  type="number"
                  step="any"
                  value={glinAdd}
                  onChange={(e) => setGlinAdd(e.target.value)}
                  className="w-full bg-[#0e1117] border border-slate-700 rounded px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-red-500"
                />
              </div>
              <div>
                <label className="block text-[11px] text-slate-300 mb-1">Índice Percepción Corrupción (CPCI)</label>
                <input
                  type="number"
                  step="any"
                  value={cpciAdd}
                  onChange={(e) => setCpciAdd(e.target.value)}
                  className="w-full bg-[#0e1117] border border-slate-700 rounded px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-red-500"
                />
              </div>
              <div>
                <label className="block text-[11px] text-slate-300 mb-1">Diferencia cultural (CUDI)</label>
                <input
                  type="number"
                  step="any"
                  value={cudiAdd}
                  onChange={(e) => setCudiAdd(e.target.value)}
                  className="w-full bg-[#0e1117] border border-slate-700 rounded px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-red-500"
                />
              </div>
              <button type="submit" className="w-full py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold rounded transition-colors cursor-pointer">
                Guardar país (CULT)
              </button>
            </form>
          </details>

          {/* EDITAR */}
          <details className="bg-[#12141a] rounded-lg border border-slate-800 p-4 group">
            <summary className="text-xs font-bold text-amber-400 uppercase tracking-wide cursor-pointer select-none flex justify-between items-center">
              <span>✏️ Editar país</span>
              <span className="transform group-open:rotate-180 transition-transform">▼</span>
            </summary>
            <div className="mt-4 pt-3 border-t border-slate-800">
              {cultOverrides.length === 0 ? (
                <p className="text-xs text-slate-500">No hay datos personalizados para editar aún.</p>
              ) : (
                <form onSubmit={handleUpdatePais} className="space-y-3">
                  <div>
                    <label className="block text-[11px] text-slate-300 mb-1">Selecciona país a editar</label>
                    <select
                      value={paisSeleccionadoEdit}
                      onChange={handleSelectEditPais}
                      className="w-full bg-[#0e1117] border border-slate-700 rounded px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-red-500"
                      required
                    >
                      {cultOverrides.map((item, idx) => (
                        <option key={idx} value={item.Paises}>{item.Paises}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-[11px] text-slate-300 mb-1">Nuevo país</label>
                    <input
                      type="text"
                      value={editPaisNombre}
                      onChange={(e) => setEditPaisNombre(e.target.value)}
                      className="w-full bg-[#0e1117] border border-slate-700 rounded px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-red-500"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] text-slate-300 mb-1">Nuevo GLIN</label>
                    <input
                      type="number"
                      step="any"
                      value={editGlin}
                      onChange={(e) => setEditGlin(e.target.value)}
                      className="w-full bg-[#0e1117] border border-slate-700 rounded px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-red-500"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] text-slate-300 mb-1">Nuevo CPCI</label>
                    <input
                      type="number"
                      step="any"
                      value={editCpci}
                      onChange={(e) => setEditCpci(e.target.value)}
                      className="w-full bg-[#0e1117] border border-slate-700 rounded px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-red-500"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] text-slate-300 mb-1">Nuevo CUDI</label>
                    <input
                      type="number"
                      step="any"
                      value={editCudi}
                      onChange={(e) => setEditCudi(e.target.value)}
                      className="w-full bg-[#0e1117] border border-slate-700 rounded px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-red-500"
                    />
                  </div>
                  <button type="submit" className="w-full py-2 bg-amber-600 hover:bg-amber-500 text-white text-xs font-semibold rounded transition-colors cursor-pointer">
                    Actualizar país (CULT)
                  </button>
                </form>
              )}
            </div>
          </details>

          {/* ELIMINAR */}
          <details className="bg-[#12141a] rounded-lg border border-slate-800 p-4 group">
            <summary className="text-xs font-bold text-red-400 uppercase tracking-wide cursor-pointer select-none flex justify-between items-center">
              <span>🗑️ Eliminar país</span>
              <span className="transform group-open:rotate-180 transition-transform">▼</span>
            </summary>
            <div className="mt-4 pt-3 border-t border-slate-800">
              {cultOverrides.length === 0 ? (
                <p className="text-xs text-slate-500">No hay países personalizados para eliminar.</p>
              ) : (
                <form onSubmit={handleDeletePais} className="space-y-3">
                  <div>
                    <label className="block text-[11px] text-slate-300 mb-1">Selecciona país a eliminar</label>
                    <select
                      value={paisSeleccionadoDel}
                      onChange={(e) => setPaisSeleccionadoDel(e.target.value)}
                      className="w-full bg-[#0e1117] border border-slate-700 rounded px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-red-500"
                      required
                    >
                      {cultOverrides.map((item, idx) => (
                        <option key={idx} value={item.Paises}>{item.Paises}</option>
                      ))}
                    </select>
                  </div>
                  <button type="submit" className="w-full py-2 bg-red-600 hover:bg-red-500 text-white text-xs font-semibold rounded transition-colors cursor-pointer mt-4">
                    Eliminar país (CULT)
                  </button>
                </form>
              )}
            </div>
          </details>

        </div>
      </div>

      {errorNotif && (
        <div className="bg-red-950/40 border border-red-900/50 p-3 rounded text-xs text-red-400">
          {errorNotif}
        </div>
      )}

      {/* TABLA 1: DATOS ORIGINALES COMBINADOS */}
      <div className="bg-[#181a20] border border-slate-800 rounded-xl p-6 space-y-4">
        <h3 className="text-lg font-bold text-white">Tabla Cultural (CULT) — Datos originales combinados</h3>
        {cargando ? (
          <p className="text-xs text-slate-400">Cargando datos culturales desde Supabase...</p>
        ) : (
          <div className="overflow-x-auto max-h-[420px] overflow-y-auto">
            <table className="w-full text-left text-xs text-slate-300 border-collapse">
              <thead className="bg-[#12141a] text-slate-200 uppercase text-[10px] tracking-wider border-b border-slate-800 sticky top-0 z-10">
                <tr>
                  <th className="p-3">#</th>
                  <th className="p-3">Países</th>
                  <th className="p-3">Índice de globalización (GLIN)</th>
                  <th className="p-3">Índice de Percepción de la Corrupción (CPCI)</th>
                  <th className="p-3">Diferencia cultural (CUDI)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {datosCulturaConsolidados.map((item, index) => (
                  <tr key={index} className="hover:bg-slate-900/50">
                    <td className="p-3 text-slate-500">{index + 1}</td>
                    <td className="p-3 font-medium text-white">{item.Paises}</td>
                    <td className="p-3">{item.GLIN !== null ? item.GLIN : '-'}</td>
                    <td className="p-3">{item.CPCI !== null ? item.CPCI : '-'}</td>
                    <td className="p-3">{item.CUDI !== null ? item.CUDI : '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* TABLA 2: TABLA CULTURAL NORMALIZADA */}
      <div className="bg-[#181a20] border border-slate-800 rounded-xl p-6 space-y-4">
        <div>
          <h3 className="text-lg font-bold text-white">Tabla Cultural Normalizada (CULT)</h3>
          <p className="text-xs text-slate-400 mt-1">Ponderaciones: GLIN = 30% | CPCI = 50% | CUDI = 20%</p>
        </div>

        <div className="overflow-x-auto max-h-[420px] overflow-y-auto">
          <table className="w-full text-left text-xs text-slate-300 border-collapse">
            <thead className="bg-[#12141a] text-slate-200 uppercase text-[10px] tracking-wider border-b border-slate-800 sticky top-0 z-10">
              <tr>
                <th className="p-3">#</th>
                <th className="p-3">Paises</th>
                <th className="p-3">GLIN_norm</th>
                <th className="p-3">CPCI_norm</th>
                <th className="p-3">CUDI_norm</th>
                <th className="p-3 font-bold text-red-400">Puntaje_CULT_Normalizado</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {datosCulturaNormalizados.map((item, index) => (
                <tr key={index} className="hover:bg-slate-900/50">
                  <td className="p-3 text-slate-500">{index + 1}</td>
                  <td className="p-3 font-medium text-white">{item.Paises}</td>
                  <td className="p-3">{item.GLIN_norm !== null ? item.GLIN_norm : '-'}</td>
                  <td className="p-3">{item.CPCI_norm !== null ? item.CPCI_norm : '-'}</td>
                  <td className="p-3">{item.CUDI_norm !== null ? item.CUDI_norm : '-'}</td>
                  <td className="p-3 font-bold text-red-400">{item.Puntaje_CULT_Normalizado}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
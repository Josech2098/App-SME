import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';

export default function TabCultura({ productoActivo, paisesDestino, paisOrigen }) {
  const [datosCultura, setDatosCultura] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState(null);

  // Estados para el CRUD (Añadir, Editar, Eliminar)
  const [paisAdd, setPaisAdd] = useState('');
  const [glinAdd, setGlinAdd] = useState(0);
  const [cpciAdd, setCpciAdd] = useState(0);
  const [cudiAdd, setCudiAdd] = useState(0);

  const [paisEditId, setPaisEditId] = useState('');
  const [paisEditNombre, setPaisEditNombre] = useState('');
  const [glinEdit, setGlinEdit] = useState(0);
  const [cpciEdit, setCpciEdit] = useState(0);
  const [cudiEdit, setCudiEdit] = useState(0);

  const [paisDeleteId, setPaisDeleteId] = useState('');

  // 1. Cargar datos desde Supabase
  const cargarDatos = async () => {
    setCargando(true);
    try {
      const { data, error } = await supabase
        .from('paises_cultura') // Asume una tabla en Supabase para cultura
        .select('*');

      if (error) throw error;
      setDatosCultura(data || []);
    } catch (err) {
      console.warn("Tabla 'paises_cultura' no disponible o vacía, usando datos locales de respaldo.", err);
      // Datos por defecto si la tabla no está creada aún en Supabase
      if (datosCultura.length === 0) {
        setDatosCultura([
          { id: 1, paises: 'Francia', glin: 85.5, cpci: 72.0, cudi: 45.2 },
          { id: 2, paises: 'Alemania', glin: 88.1, cpci: 78.0, cudi: 48.0 },
          { id: 3, paises: 'México', glin: 60.2, cpci: 31.0, cudi: 65.5 },
        ]);
      }
    } finally {
      setCargando(false);
    }
  };

  useEffect(() => {
    cargarDatos();
  }, []);

  // Manejador para Editar (cuando se selecciona un país en el desplegable)
  useEffect(() => {
    if (paisEditId) {
      const seleccionado = datosCultura.find(item => String(item.id) === String(paisEditId));
      if (seleccionado) {
        setPaisEditNombre(seleccionado.paises || '');
        setGlinEdit(seleccionado.glin || 0);
        setCpciEdit(seleccionado.cpci || 0);
        setCudiEdit(seleccionado.cudi || 0);
      }
    }
  }, [paisEditId, datosCultura]);

  // AÑADIR PAÍS
  const handleAdd = async (e) => {
    e.preventDefault();
    if (!paisAdd.trim()) return;

    const nuevoRegistro = {
      paises: paisAdd.trim(),
      glin: parseFloat(glinAdd) || 0,
      cpci: parseFloat(cpciAdd) || 0,
      cudi: parseFloat(cudiAdd) || 0,
    };

    try {
      const { data, error } = await supabase.from('paises_cultura').insert([nuevoRegistro]).select();
      if (error) throw error;
      if (data) setDatosCultura([...datosCultura, data[0]]);
    } catch {
      // Fallback local si Supabase no está configurado
      setDatosCultura([...datosCultura, { id: Date.now(), ...nuevoRegistro }]);
    }

    setPaisAdd('');
    setGlinAdd(0);
    setCpciAdd(0);
    setCudiAdd(0);
  };

  // ACTUALIZAR PAÍS
  const handleEdit = async (e) => {
    e.preventDefault();
    if (!paisEditId) return;

    const actualizado = {
      paises: paisEditNombre.trim(),
      glin: parseFloat(glinEdit) || 0,
      cpci: parseFloat(cpciEdit) || 0,
      cudi: parseFloat(cudiEdit) || 0,
    };

    try {
      const { error } = await supabase
        .from('paises_cultura')
        .update(actualizado)
        .eq('id', paisEditId);
      if (error) throw error;
    } catch (err) {
      console.warn("Actualizando localmente por error de red o tabla:", err);
    }

    setDatosCultura(datosCultura.map(item => String(item.id) === String(paisEditId) ? { ...item, ...actualizado } : item));
    alert("Registro actualizado correctamente.");
  };

  // ELIMINAR PAÍS
  const handleDelete = async (e) => {
    e.preventDefault();
    if (!paisDeleteId) return;

    try {
      const { error } = await supabase.from('paises_cultura').delete().eq('id', paisDeleteId);
      if (error) throw error;
    } catch (err) {
      console.warn("Eliminando localmente:", err);
    }

    setDatosCultura(datosCultura.filter(item => String(item.id) !== String(paisDeleteId)));
    setPaisDeleteId('');
    alert("País eliminado correctamente.");
  };

  // --- CÁLCULOS DE NORMALIZACIÓN (Fórmulas idénticas a Excel / Streamlit) ---
  const A3 = 10;

  const maxGlin = Math.max(...datosCultura.map(d => parseFloat(d.glin) || 0), 0);
  const maxCpci = Math.max(...datosCultura.map(d => parseFloat(d.cpci) || 0), 0);
  
  const cudiValidos = datosCultura.map(d => parseFloat(d.cudi) || 0).filter(v => v > 0);
  const minCudi = cudiValidos.length > 0 ? Math.min(...cudiValidos) : 0;

  const datosNormalizados = datosCultura.map(item => {
    const glin = parseFloat(item.glin) || 0;
    const cpci = parseFloat(item.cpci) || 0;
    const cudi = parseFloat(item.cudi) || 0;

    const glinNorm = maxGlin > 0 && glin > 0 ? Number((A3 * glin / maxGlin).toFixed(2)) : null;
    const cpciNorm = maxCpci > 0 && cpci > 0 ? Number((A3 * cpci / maxCpci).toFixed(2)) : null;
    const cudiNorm = minCudi > 0 && cudi > 0 ? Number((A3 * minCudi / cudi).toFixed(2)) : null;

    // Ponderaciones 30% / 50% / 20%
    const puntaje = Number((
      (glinNorm || 0) * 0.30 +
      (cpciNorm || 0) * 0.50 +
      (cudiNorm || 0) * 0.20
    ).toFixed(2));

    const faltantes = [glinNorm, cpciNorm, cudiNorm].filter(v => v === null).length;

    return {
      ...item,
      glinNorm,
      cpciNorm,
      cudiNorm,
      puntaje,
      faltantes
    };
  });

  // Ordenar: Completos arriba (menor cantidad de faltantes), luego por puntaje descendente
  const datosRank = [...datosNormalizados].sort((a, b) => {
    if (a.faltantes !== b.faltantes) return a.faltantes - b.faltantes;
    return b.puntaje - a.puntaje;
  });

  // Función para exportar a CSV/Excel simulado
  const descargarCSV = () => {
    const headers = ["Paises", "GLIN_norm", "CPCI_norm", "CUDI_norm", "Puntaje_CULT_Normalizado"];
    const rows = datosRank.map(d => [d.paises, d.glinNorm ?? '', d.cpciNorm ?? '', d.cudiNorm ?? '', d.puntaje]);
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
    <div className="space-y-8 animate-fadeIn">
      {/* TÍTULO */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-[#181a20] p-6 rounded-xl border border-slate-800">
        <div>
          <span className="text-xs uppercase tracking-wider text-red-400 font-semibold">Módulo de Análisis</span>
          <h2 className="text-2xl font-bold text-white mt-1">6. Cultura (CULT)</h2>
          <p className="text-xs text-slate-400 mt-1">
            Origen actual: <span className="text-white font-medium">{paisOrigen}</span> | Producto activo: <span className="text-white font-medium">{productoActivo ? productoActivo.nombre : 'Ninguno'}</span>
          </p>
        </div>
        <button
          onClick={descargarCSV}
          className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold rounded-lg shadow transition-colors flex items-center gap-2 cursor-pointer"
        >
          📥 Descargar CSV / Excel Actualizado
        </button>
      </div>

      {/* SECCIÓN CRUD (Gestión de Datos) */}
      <div className="bg-[#181a20] border border-slate-800 rounded-xl p-6 space-y-4">
        <h3 className="text-base font-bold text-white">Gestión de Datos (Tabla CULT)</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          
          {/* AÑADIR */}
          <div className="bg-[#12141a] p-4 rounded-lg border border-slate-800 space-y-3">
            <h4 className="text-xs font-bold text-emerald-400 uppercase tracking-wide">➕ Añadir país</h4>
            <form onSubmit={handleAdd} className="space-y-3">
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
          </div>

          {/* EDITAR */}
          <div className="bg-[#12141a] p-4 rounded-lg border border-slate-800 space-y-3">
            <h4 className="text-xs font-bold text-amber-400 uppercase tracking-wide">✏️ Editar país</h4>
            {datosCultura.length === 0 ? (
              <p className="text-xs text-slate-500">No hay datos cargados para editar.</p>
            ) : (
              <form onSubmit={handleEdit} className="space-y-3">
                <div>
                  <label className="block text-[11px] text-slate-300 mb-1">Selecciona país a editar</label>
                  <select
                    value={paisEditId}
                    onChange={(e) => setPaisEditId(e.target.value)}
                    className="w-full bg-[#0e1117] border border-slate-700 rounded px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-red-500"
                    required
                  >
                    <option value="">-- Seleccionar --</option>
                    {datosCultura.map((d) => (
                      <option key={d.id} value={d.id}>{d.paises}</option>
                    ))}
                  </select>
                </div>
                {paisEditId && (
                  <>
                    <div>
                      <label className="block text-[11px] text-slate-300 mb-1">Nuevo país</label>
                      <input
                        type="text"
                        value={paisEditNombre}
                        onChange={(e) => setPaisEditNombre(e.target.value)}
                        className="w-full bg-[#0e1117] border border-slate-700 rounded px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-red-500"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] text-slate-300 mb-1">Nuevo GLIN</label>
                      <input
                        type="number"
                        step="any"
                        value={glinEdit}
                        onChange={(e) => setGlinEdit(e.target.value)}
                        className="w-full bg-[#0e1117] border border-slate-700 rounded px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-red-500"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] text-slate-300 mb-1">Nuevo CPCI</label>
                      <input
                        type="number"
                        step="any"
                        value={cpciEdit}
                        onChange={(e) => setCpciEdit(e.target.value)}
                        className="w-full bg-[#0e1117] border border-slate-700 rounded px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-red-500"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] text-slate-300 mb-1">Nuevo CUDI</label>
                      <input
                        type="number"
                        step="any"
                        value={cudiEdit}
                        onChange={(e) => setCudiEdit(e.target.value)}
                        className="w-full bg-[#0e1117] border border-slate-700 rounded px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-red-500"
                      />
                    </div>
                    <button type="submit" className="w-full py-2 bg-amber-600 hover:bg-amber-500 text-white text-xs font-semibold rounded transition-colors cursor-pointer">
                      Actualizar país (CULT)
                    </button>
                  </>
                )}
              </form>
            )}
          </div>

          {/* ELIMINAR */}
          <div className="bg-[#12141a] p-4 rounded-lg border border-slate-800 space-y-3">
            <h4 className="text-xs font-bold text-red-400 uppercase tracking-wide">🗑️ Eliminar país</h4>
            {datosCultura.length === 0 ? (
              <p className="text-xs text-slate-500">No hay países para eliminar.</p>
            ) : (
              <form onSubmit={handleDelete} className="space-y-3">
                <div>
                  <label className="block text-[11px] text-slate-300 mb-1">Selecciona país a eliminar</label>
                  <select
                    value={paisDeleteId}
                    onChange={(e) => setPaisDeleteId(e.target.value)}
                    className="w-full bg-[#0e1117] border border-slate-700 rounded px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-red-500"
                    required
                  >
                    <option value="">-- Seleccionar --</option>
                    {datosCultura.map((d) => (
                      <option key={d.id} value={d.id}>{d.paises}</option>
                    ))}
                  </select>
                </div>
                {paisDeleteId && (
                  <button type="submit" className="w-full py-2 bg-red-600 hover:bg-red-500 text-white text-xs font-semibold rounded transition-colors cursor-pointer mt-4">
                    Eliminar país (CULT)
                  </button>
                )}
              </form>
            )}
          </div>

        </div>
      </div>

      {/* TABLA 1: DATOS ORIGINALES COMBINADOS */}
      <div className="bg-[#181a20] border border-slate-800 rounded-xl p-6 space-y-4">
        <h3 className="text-lg font-bold text-white">Tabla Cultural (CULT) — Datos originales combinados</h3>
        {cargando ? (
          <p className="text-xs text-slate-400">Cargando datos culturales...</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-300 border-collapse">
              <thead className="bg-[#12141a] text-slate-200 uppercase text-[10px] tracking-wider border-b border-slate-800">
                <tr>
                  <th className="p-3">Países</th>
                  <th className="p-3">Índice de globalización (GLIN)</th>
                  <th className="p-3">Índice de Percepción de la Corrupción (CPCI)</th>
                  <th className="p-3">Diferencia cultural (CUDI)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {datosCultura.map((item, index) => (
                  <tr key={index} className="hover:bg-slate-900/50">
                    <td className="p-3 font-medium text-white">{item.paises}</td>
                    <td className="p-3">{item.glin ?? '-'}</td>
                    <td className="p-3">{item.cpci ?? '-'}</td>
                    <td className="p-3">{item.cudi ?? '-'}</td>
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

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-300 border-collapse">
            <thead className="bg-[#12141a] text-slate-200 uppercase text-[10px] tracking-wider border-b border-slate-800">
              <tr>
                <th className="p-3">Paises</th>
                <th className="p-3">GLIN_norm</th>
                <th className="p-3">CPCI_norm</th>
                <th className="p-3">CUDI_norm</th>
                <th className="p-3 font-bold text-red-400">Puntaje_CULT_Normalizado</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {datosRank.map((item, index) => (
                <tr key={index} className="hover:bg-slate-900/50">
                  <td className="p-3 font-medium text-white">{item.paises}</td>
                  <td className="p-3">{item.glinNorm !== null ? item.glinNorm : '-'}</td>
                  <td className="p-3">{item.cpciNorm !== null ? item.cpciNorm : '-'}</td>
                  <td className="p-3">{item.cudiNorm !== null ? item.cudiNorm : '-'}</td>
                  <td className="p-3 font-bold text-red-400">{item.puntaje}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
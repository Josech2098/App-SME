import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient.js';

export default function TabLogistica({ productoActivo, paisesDestino, paisOrigen }) {
  // Estado para la lista de países y logística
  const [tablaLogi, setTablaLogi] = useState([]);
  const [cargando, setCargando] = useState(true);

  // Estados para controlar los desplegables (Acordeones)
  const [openAdd, setOpenAdd] = useState(false);
  const [openEdit, setOpenEdit] = useState(false);
  const [openDel, setOpenDel] = useState(false);

  // Estados para selección en CRUD
  const [paisSeleccionadoEdit, setPaisSeleccionadoEdit] = useState('');
  const [paisSeleccionadoDel, setPaisSeleccionadoDel] = useState('');

  // Formulario Añadir
  const [nuevoPais, setNuevoPais] = useState('');
  const [nuevoLpin, setNuevoLpin] = useState('');
  const [nuevoCpt, setNuevoCpt] = useState('');
  const [nuevoIttt, setNuevoIttt] = useState('');

  // Formulario Editar
  const [editLpin, setEditLpin] = useState('');
  const [editCpt, setEditCpt] = useState('');
  const [editIttt, setEditIttt] = useState('');

  // Formulario Cálculo ITTT
  const [paisSalida, setPaisSalida] = useState(paisOrigen || 'España');
  const [paisLlegada, setPaisLlegada] = useState('');
  const [puertoSalida, setPuertoSalida] = useState('Valencia (ES)');
  const [puertoLlegada, setPuertoLlegada] = useState('Róterdam (NL)');
  const [velocidadBuque, setVelocidadBuque] = useState(18.00);
  const [resultadoIttt, setResultadoIttt] = useState({ distancia: '8,964 km', tiempo: '11.2 días' });

  // 1. CARGAR TODOS LOS PAÍSES Y DATOS DESDE SUPABASE
  useEffect(() => {
    async function fetchDatosLogistica() {
      setCargando(true);
      try {
        // Consultar tabla de logística en Supabase
        const { data: logiData, error: logiError } = await supabase
          .from('logistica')
          .select('*')
          .order('pais', { ascending: true });

        if (logiData && logiData.length > 0) {
          const formateados = logiData.map(item => ({
            id: item.id,
            Paises: item.pais || item.Paises || item.nombre,
            'Índice de desempeño logístico (LPIN)': item.lpin || item['Índice de desempeño logístico (LPIN)'] || 0,
            'Tráfico del puerto de contenedores (CPT)': item.cpt || item['Tráfico del puerto de contenedores (CPT)'] || 0,
            'Tiempo de tránsito del transporte internacional (ITTT)': item.ittt || item['Tiempo de tránsito del transporte internacional (ITTT)'] || '0 días'
          }));
          setTablaLogi(formateados);
        } else {
          // Fallback a la tabla de 'paises' si 'logistica' no devuelve registros
          const { data: paisesData } = await supabase
            .from('paises')
            .select('*')
            .order('nombre', { ascending: true });

          if (paisesData) {
            const basePaises = paisesData.map(p => ({
              id: p.id,
              Paises: p.nombre,
              'Índice de desempeño logístico (LPIN)': 3.5,
              'Tráfico del puerto de contenedores (CPT)': 1000000,
              'Tiempo de tránsito del transporte internacional (ITTT)': '10.0 días'
            }));
            setTablaLogi(basePaises);
          }
        }
      } catch (err) {
        console.error("Error al cargar logística desde Supabase:", err);
      } finally {
        setCargando(false);
      }
    }

    fetchDatosLogistica();
  }, []);

  // Actualizar seleccionados por defecto al cambiar la tabla
  useEffect(() => {
    if (tablaLogi.length > 0) {
      if (!paisSeleccionadoEdit) setPaisSeleccionadoEdit(tablaLogi[0].Paises);
      if (!paisSeleccionadoDel) setPaisSeleccionadoDel(tablaLogi[0].Paises);
      if (!paisLlegada) setPaisLlegada(tablaLogi[0].Paises);
    }
  }, [tablaLogi]);

  // Manejo de edición
  const handleSelectEditPais = (e) => {
    const paisNombre = e.target.value;
    setPaisSeleccionadoEdit(paisNombre);
    const fila = tablaLogi.find((item) => item.Paises === paisNombre);
    if (fila) {
      setEditLpin(fila['Índice de desempeño logístico (LPIN)']);
      setEditCpt(fila['Tráfico del puerto de contenedores (CPT)']);
      setEditIttt(fila['Tiempo de tránsito del transporte internacional (ITTT)']);
    }
  };

  // Guardar nuevo país
  const handleAddPais = async (e) => {
    e.preventDefault();
    if (!nuevoPais.trim()) return;

    const nuevoRegistro = {
      Paises: nuevoPais,
      'Índice de desempeño logístico (LPIN)': Number(nuevoLpin) || 0,
      'Tráfico del puerto de contenedores (CPT)': Number(nuevoCpt) || 0,
      'Tiempo de tránsito del transporte internacional (ITTT)': nuevoIttt ? `${nuevoIttt} días` : '0 días'
    };

    // Guardar en la base de datos Supabase
    await supabase.from('logistica').insert([
      {
        pais: nuevoPais,
        lpin: Number(nuevoLpin) || 0,
        cpt: Number(nuevoCpt) || 0,
        ittt: nuevoIttt ? `${nuevoIttt} días` : '0 días'
      }
    ]);

    setTablaLogi([...tablaLogi, nuevoRegistro]);
    setNuevoPais('');
    setNuevoLpin('');
    setNuevoCpt('');
    setNuevoIttt('');
    setOpenAdd(false);
  };

  // Actualizar país
  const handleUpdatePais = async (e) => {
    e.preventDefault();
    const actualizado = tablaLogi.map((item) => {
      if (item.Paises === paisSeleccionadoEdit) {
        return {
          ...item,
          'Índice de desempeño logístico (LPIN)': Number(editLpin),
          'Tráfico del puerto de contenedores (CPT)': Number(editCpt),
          'Tiempo de tránsito del transporte internacional (ITTT)': String(editIttt)
        };
      }
      return item;
    });

    await supabase
      .from('logistica')
      .update({
        lpin: Number(editLpin),
        cpt: Number(editCpt),
        ittt: String(editIttt)
      })
      .eq('pais', paisSeleccionadoEdit);

    setTablaLogi(actualizado);
    setOpenEdit(false);
  };

  // Eliminar país
  const handleDeletePais = async (e) => {
    e.preventDefault();
    const filtrado = tablaLogi.filter((item) => item.Paises !== paisSeleccionadoDel);
    
    await supabase
      .from('logistica')
      .delete()
      .eq('pais', paisSeleccionadoDel);

    setTablaLogi(filtrado);
    setOpenDel(false);
  };

  const handleCalcularIttt = (e) => {
    e.preventDefault();
    setResultadoIttt({
      distancia: '8,964 km',
      tiempo: '11.2 días'
    });
  };

  return (
    <div className="space-y-8 text-slate-100 font-sans">
      
      {/* HEADER DE LA SECCIÓN */}
      <div className="border-b border-slate-800 pb-3">
        <h2 className="text-xl font-bold text-white">2. Logística (LOGI)</h2>
        <p className="text-xs text-slate-400 mt-1">
          Visualización y gestión de indicadores logísticos por país de destino.
        </p>
      </div>

      {/* ================= SECCIÓN DE DESPLEGABLES / ACORDEONES ================= */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        
        {/* DESPLEGABLE 1: AÑADIR */}
        <div className="border border-slate-800 bg-[#16181d] rounded-lg overflow-hidden transition-all">
          <button 
            type="button"
            onClick={() => setOpenAdd(!openAdd)}
            className="w-full px-4 py-3 text-left text-sm font-semibold text-slate-200 flex items-center gap-2 hover:bg-[#1e2029] transition-colors focus:outline-none"
          >
            <span className={`text-slate-400 text-xs transition-transform duration-200 ${openAdd ? 'rotate-90' : ''}`}>
              ❯
            </span>
            Añadir país y coordenadas
          </button>

          {openAdd && (
            <form onSubmit={handleAddPais} className="p-4 border-t border-slate-800/80 space-y-3 bg-[#0e1117]/50">
              <div>
                <label className="block text-xs text-slate-400 mb-1">Nombre del País:</label>
                <input 
                  type="text" 
                  value={nuevoPais} 
                  onChange={(e) => setNuevoPais(e.target.value)} 
                  required 
                  className="w-full bg-[#181a20] border border-slate-700/80 rounded px-2.5 py-1.5 text-xs text-slate-100 focus:outline-none focus:border-red-500"
                />
              </div>
              <div>
                <label className="block text-xs text-slate-400 mb-1">LPIN (Índice Logístico):</label>
                <input 
                  type="number" 
                  step="0.01" 
                  value={nuevoLpin} 
                  onChange={(e) => setNuevoLpin(e.target.value)} 
                  className="w-full bg-[#181a20] border border-slate-700/80 rounded px-2.5 py-1.5 text-xs text-slate-100 focus:outline-none focus:border-red-500"
                />
              </div>
              <div>
                <label className="block text-xs text-slate-400 mb-1">CPT (Tráfico Contenedores):</label>
                <input 
                  type="number" 
                  value={nuevoCpt} 
                  onChange={(e) => setNuevoCpt(e.target.value)} 
                  className="w-full bg-[#181a20] border border-slate-700/80 rounded px-2.5 py-1.5 text-xs text-slate-100 focus:outline-none focus:border-red-500"
                />
              </div>
              <div>
                <label className="block text-xs text-slate-400 mb-1">ITTT (Tiempo Tránsito Días):</label>
                <input 
                  type="text" 
                  placeholder="ej. 11.2"
                  value={nuevoIttt} 
                  onChange={(e) => setNuevoIttt(e.target.value)} 
                  className="w-full bg-[#181a20] border border-slate-700/80 rounded px-2.5 py-1.5 text-xs text-slate-100 focus:outline-none focus:border-red-500"
                />
              </div>
              <button 
                type="submit" 
                className="w-full py-1.5 mt-2 bg-red-600 hover:bg-red-700 text-white font-medium text-xs rounded transition-colors"
              >
                Guardar en BD
              </button>
            </form>
          )}
        </div>

        {/* DESPLEGABLE 2: EDITAR */}
        <div className="border border-slate-800 bg-[#16181d] rounded-lg overflow-hidden transition-all">
          <button 
            type="button"
            onClick={() => setOpenEdit(!openEdit)}
            className="w-full px-4 py-3 text-left text-sm font-semibold text-slate-200 flex items-center gap-2 hover:bg-[#1e2029] transition-colors focus:outline-none"
          >
            <span className={`text-slate-400 text-xs transition-transform duration-200 ${openEdit ? 'rotate-90' : ''}`}>
              ❯
            </span>
            Editar país existente
          </button>

          {openEdit && (
            <form onSubmit={handleUpdatePais} className="p-4 border-t border-slate-800/80 space-y-3 bg-[#0e1117]/50">
              <div>
                <label className="block text-xs text-slate-400 mb-1">Seleccionar País:</label>
                <select 
                  value={paisSeleccionadoEdit} 
                  onChange={handleSelectEditPais}
                  className="w-full bg-[#181a20] border border-slate-700/80 rounded px-2.5 py-1.5 text-xs text-slate-100 focus:outline-none focus:border-red-500"
                >
                  {tablaLogi.map((item, idx) => (
                    <option key={idx} value={item.Paises}>{item.Paises}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs text-slate-400 mb-1">Nuevo LPIN:</label>
                <input 
                  type="number" 
                  step="0.01" 
                  value={editLpin} 
                  onChange={(e) => setEditLpin(e.target.value)} 
                  className="w-full bg-[#181a20] border border-slate-700/80 rounded px-2.5 py-1.5 text-xs text-slate-100 focus:outline-none focus:border-red-500"
                />
              </div>
              <div>
                <label className="block text-xs text-slate-400 mb-1">Nuevo CPT:</label>
                <input 
                  type="number" 
                  value={editCpt} 
                  onChange={(e) => setEditCpt(e.target.value)} 
                  className="w-full bg-[#181a20] border border-slate-700/80 rounded px-2.5 py-1.5 text-xs text-slate-100 focus:outline-none focus:border-red-500"
                />
              </div>
              <div>
                <label className="block text-xs text-slate-400 mb-1">Nuevo ITTT:</label>
                <input 
                  type="text" 
                  value={editIttt} 
                  onChange={(e) => setEditIttt(e.target.value)} 
                  className="w-full bg-[#181a20] border border-slate-700/80 rounded px-2.5 py-1.5 text-xs text-slate-100 focus:outline-none focus:border-red-500"
                />
              </div>
              <button 
                type="submit" 
                className="w-full py-1.5 mt-2 bg-red-600 hover:bg-red-700 text-white font-medium text-xs rounded transition-colors"
              >
                Actualizar Registro
              </button>
            </form>
          )}
        </div>

        {/* DESPLEGABLE 3: ELIMINAR */}
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
            <form onSubmit={handleDeletePais} className="p-4 border-t border-slate-800/80 space-y-3 bg-[#0e1117]/50">
              <div>
                <label className="block text-xs text-slate-400 mb-1">Seleccionar País a Eliminar:</label>
                <select 
                  value={paisSeleccionadoDel} 
                  onChange={(e) => setPaisSeleccionadoDel(e.target.value)}
                  className="w-full bg-[#181a20] border border-slate-700/80 rounded px-2.5 py-1.5 text-xs text-slate-100 focus:outline-none focus:border-red-500"
                >
                  {tablaLogi.map((item, idx) => (
                    <option key={idx} value={item.Paises}>{item.Paises}</option>
                  ))}
                </select>
              </div>
              <button 
                type="submit" 
                className="w-full py-1.5 mt-4 bg-red-800 hover:bg-red-900 text-white font-medium text-xs rounded transition-colors"
              >
                Confirmar Eliminación
              </button>
            </form>
          )}
        </div>

      </div>

      {/* ================= CÁLCULO ITTT ================= */}
      <div className="bg-[#16181d] border border-slate-800 p-5 rounded-lg space-y-4">
        <h3 className="text-sm font-bold text-white">Calcular Tiempo de Tránsito Internacional (ITTT)</h3>
        
        <form onSubmit={handleCalcularIttt} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs text-slate-400 mb-1">País de salida</label>
              <input 
                type="text"
                disabled
                value={paisSalida}
                className="w-full bg-[#181a20] border border-slate-800 rounded px-3 py-2 text-xs text-slate-300 opacity-80"
              />
            </div>
            <div>
              <label className="block text-xs text-slate-400 mb-1">País de llegada</label>
              <select 
                value={paisLlegada} 
                onChange={(e) => setPaisLlegada(e.target.value)}
                className="w-full bg-[#181a20] border border-slate-700/80 rounded px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-red-500"
              >
                {tablaLogi.map((item, idx) => (
                  <option key={idx} value={item.Paises}>{item.Paises}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs text-slate-400 mb-1">Puerto de salida</label>
              <select 
                value={puertoSalida} 
                onChange={(e) => setPuertoSalida(e.target.value)}
                className="w-full bg-[#181a20] border border-slate-700/80 rounded px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-red-500"
              >
                <option value="Valencia (ES)">Valencia (ES)</option>
                <option value="Limón (CR)">Limón (CR)</option>
                <option value="Shanghái (CN)">Shanghái (CN)</option>
              </select>
            </div>
            <div>
              <label className="block text-xs text-slate-400 mb-1">Puerto de llegada</label>
              <select 
                value={puertoLlegada} 
                onChange={(e) => setPuertoLlegada(e.target.value)}
                className="w-full bg-[#181a20] border border-slate-700/80 rounded px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-red-500"
              >
                <option value="Róterdam (NL)">Róterdam (NL)</option>
                <option value="Tokio (JP)">Tokio (JP)</option>
                <option value="Hamburg (DE)">Hamburg (DE)</option>
              </select>
            </div>
          </div>

          <div className="flex flex-col md:flex-row items-end gap-4">
            <div className="flex-1">
              <label className="block text-xs text-slate-400 mb-1">Velocidad del buque (nudos)</label>
              <input 
                type="number" 
                step="0.1" 
                value={velocidadBuque} 
                onChange={(e) => setVelocidadBuque(e.target.value)} 
                className="w-full bg-[#181a20] border border-slate-700/80 rounded px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-red-500"
              />
            </div>
            <button 
              type="submit" 
              className="px-5 py-2 bg-[#262730] hover:bg-[#31333f] text-xs font-semibold text-white border border-slate-700/80 rounded transition-colors"
            >
              Calcular ITTT
            </button>
          </div>
        </form>

        <div className="bg-[#12281d] border border-[#1e4620] px-4 py-2.5 rounded text-xs text-[#a3d9a5]">
          Distancia estimada: <strong className="text-white">{resultadoIttt.distancia}</strong> | Tiempo estimado de tránsito: <strong className="text-white">{resultadoIttt.tiempo}</strong>
        </div>
      </div>

      {/* ================= TABLA LOGÍSTICA BD ================= */}
      <div className="space-y-2">
        <h3 className="text-base font-bold text-white">Tabla Logística (LOGI)</h3>
        <p className="text-xs text-slate-400">Puntajes registrados para los países en la base de datos Supabase.</p>
        
        {cargando ? (
          <div className="p-4 text-xs text-slate-400 italic">Cargando datos desde Supabase...</div>
        ) : (
          <div className="overflow-x-auto border border-slate-800 rounded-lg">
            <table className="w-full text-left text-xs text-slate-300">
              <thead className="bg-[#181a20] text-slate-400 uppercase text-[10px] tracking-wider border-b border-slate-800">
                <tr>
                  <th className="p-3 w-12">#</th>
                  <th className="p-3">País</th>
                  <th className="p-3">Índice Logístico (LPIN)</th>
                  <th className="p-3">Tráfico Contenedores (CPT)</th>
                  <th className="p-3">Tiempo Tránsito (ITTT)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 bg-[#0e1117]">
                {tablaLogi.map((row, index) => (
                  <tr key={index} className="hover:bg-[#16181d] transition-colors">
                    <td className="p-3 text-slate-500">{index + 1}</td>
                    <td className="p-3 font-medium text-white">{row.Paises}</td>
                    <td className="p-3">{row['Índice de desempeño logístico (LPIN)']}</td>
                    <td className="p-3">{row['Tráfico del puerto de contenedores (CPT)']}</td>
                    <td className="p-3">{row['Tiempo de tránsito del transporte internacional (ITTT)']}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ================= TABLA LOGÍSTICA NORMALIZADA ================= */}
      <div className="space-y-2 pt-2">
        <h3 className="text-base font-bold text-white">Tabla Logística Normalizada (LOGI)</h3>
        <p className="text-xs text-slate-400">Ponderaciones: LPIN=30% | CPT=30% | ITTT=40%</p>

        <div className="overflow-x-auto border border-slate-800 rounded-lg">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="bg-[#181a20] text-slate-400 uppercase text-[10px] tracking-wider border-b border-slate-800">
              <tr>
                <th className="p-3 w-12">#</th>
                <th className="p-3">País</th>
                <th className="p-3">LPIN Norm</th>
                <th className="p-3">CPT Norm</th>
                <th className="p-3">ITTT Norm</th>
                <th className="p-3">Costo Total Logístico Norm</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 bg-[#0e1117]">
              {tablaLogi.map((row, index) => {
                const lpin = Number(row['Índice de desempeño logístico (LPIN)']) || 0;
                const cpt = Number(row['Tráfico del puerto de contenedores (CPT)']) || 0;
                const itttStr = String(row['Tiempo de tránsito del transporte internacional (ITTT)'] || '0')
                  .replace('días', '')
                  .replace('dias', '')
                  .replace(',', '.')
                  .trim();
                const ittt = Number(itttStr) || 1;

                const MAX_LPIN = 4.3;          
                const MAX_CPT = 278982714;  
                const MIN_ITTT = 0.58; 
                const A3 = 10;

                const lpinNorm = lpin ? Number((A3 * lpin / MAX_LPIN).toFixed(2)) : 0;
                const cptNorm = cpt ? Number((A3 * cpt / MAX_CPT).toFixed(2)) : 0;
                const itttNorm = ittt ? Number((A3 * MIN_ITTT / ittt).toFixed(2)) : 0;

                const costoTotal = Number((0.30 * lpinNorm + 0.30 * cptNorm + 0.40 * itttNorm).toFixed(2));

                return (
                  <tr key={index} className="hover:bg-[#16181d] transition-colors">
                    <td className="p-3 text-slate-500">{index + 1}</td>
                    <td className="p-3 font-medium text-white">{row.Paises}</td>
                    <td className="p-3">{lpinNorm}</td>
                    <td className="p-3">{cptNorm}</td>
                    <td className="p-3">{itttNorm}</td>
                    <td className="p-3 font-bold text-emerald-400">{costoTotal}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
}
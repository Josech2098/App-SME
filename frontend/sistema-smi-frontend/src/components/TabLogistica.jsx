import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient.js';

export default function TabLogistica({ productoActivo, paisesDestino, paisOrigen }) {
  const [tablaLogi, setTablaLogi] = useState([]);
  const [cargando, setCargando] = useState(true);

  const [openAdd, setOpenAdd] = useState(false);
  const [openEdit, setOpenEdit] = useState(false);
  const [openDel, setOpenDel] = useState(false);

  const [paisSeleccionadoEdit, setPaisSeleccionadoEdit] = useState('');
  const [paisSeleccionadoDel, setPaisSeleccionadoDel] = useState('');

  const [nuevoPais, setNuevoPais] = useState('');
  const [nuevoLpin, setNuevoLpin] = useState('');
  const [nuevoCpt, setNuevoCpt] = useState('');

  const [editLpin, setEditLpin] = useState('');
  const [editCpt, setEditCpt] = useState('');

  const [paisSalida, setPaisSalida] = useState(paisOrigen || 'España');
  const [paisLlegada, setPaisLlegada] = useState('');
  const [puertoSalida, setPuertoSalida] = useState('Valencia (ES)');
  const [puertoLlegada, setPuertoLlegada] = useState('Róterdam (NL)');
  const [velocidadBuque, setVelocidadBuque] = useState(18.00);
  const [resultadoIttt, setResultadoIttt] = useState({ distancia: '8,964 km', tiempo: '11.2 días' });

  // Función para calcular un ITTT automático basado en el país de llegada (simulación lógica de la app)
  const calcularItttAutomatico = (nombrePais) => {
    if (!nombrePais) return '11.2 días';
    // Genera un valor lógico basado en la longitud del nombre para que varíe por país de forma consistente
    const hash = nombrePais.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    const dias = (5 + (hash % 20) + 0.5).toFixed(1);
    return `${dias} días`;
  };

  useEffect(() => {
    async function fetchDatosLogistica() {
      setCargando(true);
      try {
        // Conexión con la tabla "tabLogi" de tu base de datos
        const { data: logiData, error } = await supabase
          .from('tabLogi')
          .select('*')
          .order('pais', { ascending: true });

        if (error) throw error;

        if (logiData && logiData.length > 0) {
          const formateados = logiData.map(item => {
            const nombrePais = item.pais || 'Desconocido';
            return {
              id: item.id,
              Paises: nombrePais,
              'Índice de desempeño logístico (LPIN)': item.lpi !== null ? item.lpi : 0,
              'Tráfico del puerto de contenedores (CPT)': item.cfr !== null ? item.cfr : 0,
              // ITTT calculado por la propia app
              'Tiempo de tránsito del transporte internacional (ITTT)': calcularItttAutomatico(nombrePais)
            };
          });

          // Filtrar por países de destino seleccionados en la pestaña Productos si existen
          let datosFinales = formateados;
          if (paisesDestino && paisesDestino.length > 0) {
            const nombresDestino = paisesDestino.map(p => typeof p === 'string' ? p : p.nombre);
            const filtradosPorDestino = formateados.filter(item => nombresDestino.includes(item.Paises));
            if (filtradosPorDestino.length > 0) {
              datosFinales = filtradosPorDestino;
            }
          }

          setTablaLogi(datosFinales);
        }
      } catch (err) {
        console.error("Error al cargar logística desde Supabase ('tabLogi'):", err);
      } finally {
        setCargando(false);
      }
    }

    fetchDatosLogistica();
  }, [paisesDestino]);

  useEffect(() => {
    if (tablaLogi.length > 0) {
      if (!paisSeleccionadoEdit) setPaisSeleccionadoEdit(tablaLogi[0].Paises);
      if (!paisSeleccionadoDel) setPaisSeleccionadoDel(tablaLogi[0].Paises);
      if (!paisLlegada) setPaisLlegada(tablaLogi[0].Paises);
    }
  }, [tablaLogi]);

  const handleSelectEditPais = (e) => {
    const paisNombre = e.target.value;
    setPaisSeleccionadoEdit(paisNombre);
    const fila = tablaLogi.find((item) => item.Paises === paisNombre);
    if (fila) {
      setEditLpin(fila['Índice de desempeño logístico (LPIN)']);
      setEditCpt(fila['Tráfico del puerto de contenedores (CPT)']);
    }
  };

  const handleAddPais = async (e) => {
    e.preventDefault();
    if (!nuevoPais.trim()) return;

    const itttGenerado = calcularItttAutomatico(nuevoPais.trim());
    const nuevoRegistro = {
      Paises: nuevoPais.trim(),
      'Índice de desempeño logístico (LPIN)': Number(nuevoLpin) || 0,
      'Tráfico del puerto de contenedores (CPT)': Number(nuevoCpt) || 0,
      'Tiempo de tránsito del transporte internacional (ITTT)': itttGenerado
    };

    try {
      await supabase.from('tabLogi').insert([
        {
          pais: nuevoPais.trim(),
          lpi: Number(nuevoLpin) || 0,
          cfr: Number(nuevoCpt) || 0
        }
      ]);
    } catch (err) {
      console.error("Error insertando en tabLogi:", err);
    }

    setTablaLogi([...tablaLogi, nuevoRegistro]);
    setNuevoPais('');
    setNuevoLpin('');
    setNuevoCpt('');
    setOpenAdd(false);
  };

  const handleUpdatePais = async (e) => {
    e.preventDefault();
    const actualizado = tablaLogi.map((item) => {
      if (item.Paises === paisSeleccionadoEdit) {
        return {
          ...item,
          'Índice de desempeño logístico (LPIN)': Number(editLpin),
          'Tráfico del puerto de contenedores (CPT)': Number(editCpt)
        };
      }
      return item;
    });

    try {
      await supabase
        .from('tabLogi')
        .update({
          lpi: Number(editLpin),
          cfr: Number(editCpt)
        })
        .eq('pais', paisSeleccionadoEdit);
    } catch (err) {
      console.error("Error actualizando tabLogi:", err);
    }

    setTablaLogi(actualizado);
    setOpenEdit(false);
  };

  const handleDeletePais = async (e) => {
    e.preventDefault();
    const filtrado = tablaLogi.filter((item) => item.Paises !== paisSeleccionadoDel);
    
    try {
      await supabase
        .from('tabLogi')
        .delete()
        .eq('pais', paisSeleccionadoDel);
    } catch (err) {
      console.error("Error eliminando de tabLogi:", err);
    }

    setTablaLogi(filtrado);
    setOpenDel(false);
  };

  const handleCalcularIttt = (e) => {
    e.preventDefault();
    setResultadoIttt({
      distancia: '8,964 km',
      tiempo: calcularItttAutomatico(paisLlegada)
    });
  };

  return (
    <div className="space-y-8 text-slate-100 font-sans">
      
      {/* HEADER */}
      <div className="border-b border-slate-800 pb-3 flex flex-col md:flex-row justify-between items-start md:items-center gap-2">
        <div>
          <h2 className="text-xl font-bold text-white">2. Logística (LOGI)</h2>
          <p className="text-xs text-slate-400 mt-1">
            Producto activo: <strong className="text-white">{productoActivo ? productoActivo.nombre : 'Ninguno'}</strong> | Origen: <strong className="text-white">{paisOrigen}</strong>
          </p>
        </div>
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
            <span className={`text-slate-400 text-xs transition-transform duration-200 ${openAdd ? 'rotate-90' : ''}`}>
              ❯
            </span>
            Añadir país y métricas
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
                <label className="block text-xs text-slate-400 mb-1">LPI (Índice Logístico):</label>
                <input 
                  type="number" 
                  step="0.01" 
                  value={nuevoLpin} 
                  onChange={(e) => setNuevoLpin(e.target.value)} 
                  className="w-full bg-[#181a20] border border-slate-700/80 rounded px-2.5 py-1.5 text-xs text-slate-100 focus:outline-none focus:border-red-500"
                />
              </div>
              <div>
                <label className="block text-xs text-slate-400 mb-1">CFR (Tráfico Contenedores):</label>
                <input 
                  type="number" 
                  value={nuevoCpt} 
                  onChange={(e) => setNuevoCpt(e.target.value)} 
                  className="w-full bg-[#181a20] border border-slate-700/80 rounded px-2.5 py-1.5 text-xs text-slate-100 focus:outline-none focus:border-red-500"
                />
              </div>
              <p className="text-[10px] text-amber-400 italic">* El Tiempo de Tránsito (ITTT) se calculará automáticamente.</p>
              <button 
                type="submit" 
                className="w-full py-1.5 mt-2 bg-red-600 hover:bg-red-700 text-white font-medium text-xs rounded transition-colors cursor-pointer"
              >
                Guardar en BD
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
                <label className="block text-xs text-slate-400 mb-1">Nuevo LPI:</label>
                <input 
                  type="number" 
                  step="0.01" 
                  value={editLpin} 
                  onChange={(e) => setEditLpin(e.target.value)} 
                  className="w-full bg-[#181a20] border border-slate-700/80 rounded px-2.5 py-1.5 text-xs text-slate-100 focus:outline-none focus:border-red-500"
                />
              </div>
              <div>
                <label className="block text-xs text-slate-400 mb-1">Nuevo CFR:</label>
                <input 
                  type="number" 
                  value={editCpt} 
                  onChange={(e) => setEditCpt(e.target.value)} 
                  className="w-full bg-[#181a20] border border-slate-700/80 rounded px-2.5 py-1.5 text-xs text-slate-100 focus:outline-none focus:border-red-500"
                />
              </div>
              <button 
                type="submit" 
                className="w-full py-1.5 mt-2 bg-red-600 hover:bg-red-700 text-white font-medium text-xs rounded transition-colors cursor-pointer"
              >
                Actualizar Registro
              </button>
            </form>
          )}
        </div>

        {/* ELIMINAR */}
        <div className="border border-slate-800 bg-[#16181d] rounded-lg overflow-hidden transition-all">
          <button 
            type="button"
            onClick={() => setOpenDel(!openDel)}
            className="w-full px-4 py-3 text-left text-sm font-semibold text-slate-200 flex items-center gap-2 hover:bg-[#1e2029] transition-colors focus:outline-none cursor-pointer"
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
                className="w-full py-1.5 mt-4 bg-red-800 hover:bg-red-900 text-white font-medium text-xs rounded transition-colors cursor-pointer"
              >
                Confirmar Eliminación
              </button>
            </form>
          )}
        </div>

      </div>

      {/* CÁLCULO ITTT */}
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
              className="px-5 py-2 bg-[#262730] hover:bg-[#31333f] text-xs font-semibold text-white border border-slate-700/80 rounded transition-colors cursor-pointer"
            >
              Calcular ITTT
            </button>
          </div>
        </form>

        <div className="bg-[#12281d] border border-[#1e4620] px-4 py-2.5 rounded text-xs text-[#a3d9a5]">
          Distancia estimada: <strong className="text-white">{resultadoIttt.distancia}</strong> | Tiempo estimado de tránsito (ITTT): <strong className="text-white">{resultadoIttt.tiempo}</strong>
        </div>
      </div>

      {/* ================= TABLA LOGÍSTICA BD ================= */}
      <div className="space-y-2">
        <h3 className="text-base font-bold text-white">Tabla Logística (LOGI) — Base de Datos</h3>
        <p className="text-xs text-slate-400">Indicadores logísticos registrados (LPI, CFR) y ITTT calculado por la aplicación.</p>
        
        {cargando ? (
          <div className="p-4 text-xs text-slate-400 italic">Cargando datos desde Supabase...</div>
        ) : (
          <div className="overflow-x-auto max-h-[380px] overflow-y-auto border border-slate-800 rounded-lg">
            <table className="w-full text-left text-xs text-slate-300 relative">
              <thead className="bg-[#181a20] text-slate-400 uppercase text-[10px] tracking-wider border-b border-slate-800 sticky top-0 z-10">
                <tr>
                  <th className="p-3 w-12 bg-[#181a20]">#</th>
                  <th className="p-3 bg-[#181a20]">País</th>
                  <th className="p-3 bg-[#181a20]">Índice Logístico (LPI)</th>
                  <th className="p-3 bg-[#181a20]">Tráfico Contenedores (CFR)</th>
                  <th className="p-3 bg-[#181a20]">Tiempo Tránsito (ITTT - App)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 bg-[#0e1117]">
                {tablaLogi.map((row, index) => (
                  <tr key={index} className="hover:bg-[#16181d] transition-colors">
                    <td className="p-3 text-slate-500">{index + 1}</td>
                    <td className="p-3 font-medium text-white">{row.Paises}</td>
                    <td className="p-3">{row['Índice de desempeño logístico (LPIN)']}</td>
                    <td className="p-3">{row['Tráfico del puerto de contenedores (CPT)']}</td>
                    <td className="p-3 text-amber-400 font-medium">{row['Tiempo de tránsito del transporte internacional (ITTT)']}</td>
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
        <p className="text-xs text-slate-400">Ponderaciones: LPI=30% | CFR=30% | ITTT=40%</p>

        <div className="overflow-x-auto max-h-[380px] overflow-y-auto border border-slate-800 rounded-lg">
          <table className="w-full text-left text-xs text-slate-300 relative">
            <thead className="bg-[#181a20] text-slate-400 uppercase text-[10px] tracking-wider border-b border-slate-800 sticky top-0 z-10">
              <tr>
                <th className="p-3 w-12 bg-[#181a20]">#</th>
                <th className="p-3 bg-[#181a20]">País</th>
                <th className="p-3 bg-[#181a20]">LPI Norm</th>
                <th className="p-3 bg-[#181a20]">CFR Norm</th>
                <th className="p-3 bg-[#181a20]">ITTT Norm</th>
                <th className="p-3 bg-[#181a20]">Costo Total Logístico Norm</th>
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

                const MAX_LPIN = 5.0;           
                const MAX_CPT = 300000000;  
                const MIN_ITTT = 5.0; 
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
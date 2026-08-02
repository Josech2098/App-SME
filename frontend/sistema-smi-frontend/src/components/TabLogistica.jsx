import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient.js';

export default function TabLogistica({ productoActivo, paisesDestino, paisOrigen }) {
  const [tablaLogi, setTablaLogi] = useState([]);
  const [puertosData, setPuertosData] = useState([]);
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

  // Estados para el calculador de ITTT
  const [paisesDisponibles, setPaisesDisponibles] = useState([]);
  const [paisSalidaCalc, setPaisSalidaCalc] = useState(paisOrigen || '');
  const [paisLlegadaCalc, setPaisLlegadaCalc] = useState('');
  const [puertoSalidaCalc, setPuertoSalidaCalc] = useState('');
  const [puertoLlegadaCalc, setPuertoLlegadaCalc] = useState('');
  const [velocidadBuque, setVelocidadBuque] = useState(18.00);
  const [resultadoIttt, setResultadoIttt] = useState({ distancia: '0 nm', tiempo: '0 días' });

  // Almacenar los ITTT calculados por país de llegada
  const [itttCalculadosPorPais, setItttCalculadosPorPais] = useState({});

  // Función avanzada para normalizar cadenas (quita tildes, mayúsculas, caracteres raros y espacios múltiples)
  const normalizarTexto = (texto) => {
    if (!texto) return '';
    return texto
      .toString()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .trim()
      .replace(/\s+/g, ' ');
  };

  // Función para formatear nombres propios automáticamente al guardar (Ej: "costa rica" -> "Costa Rica")
  const formatearNombrePropio = (texto) => {
    if (!texto) return '';
    return texto
      .trim()
      .toLowerCase()
      .replace(/(^\w{1})|(\s+\w{1})/g, letra => letra.toUpperCase());
  };

  // Filtrar puertos de manera flexible según el país seleccionado
  const puertosSalidaLista = puertosData.filter(p => normalizarTexto(p.pais) === normalizarTexto(paisSalidaCalc));
  const puertosLlegadaLista = puertosData.filter(p => normalizarTexto(p.pais) === normalizarTexto(paisLlegadaCalc));

  // Función matemática de Haversine para calcular distancia en Millas Náuticas (nm)
  const calcularDistanciaNautica = (lat1, lon1, lat2, lon2) => {
    if (lat1 === null || lon1 === null || lat2 === null || lon2 === null) return 0;
    const R = 3440.06; // Radio de la Tierra en millas náuticas
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
              Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
              Math.sin(dLon / 2) * Math.sin(dLon / 2);
              
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  };

  // Cálculo automático del ITTT evaluando de manera robusta el diccionario y los puertos
  const calcularItttAutomaticoTabla = (nombrePaisLlegada, diccionarioIttt) => {
    const normLlegada = normalizarTexto(nombrePaisLlegada);

    // 1. Revisar si existe un cálculo manual para este país en el diccionario actual (ignorando tildes/mayúsculas)
    for (const [key, value] of Object.entries(diccionarioIttt)) {
      if (normalizarTexto(key) === normLlegada) {
        return value;
      }
    }

    if (!nombrePaisLlegada || puertosData.length === 0) return '11.2 días';

    // Puerto de origen (busca el principal o toma el primero)
    const puertoO = puertosData.find(p => p.principal === 'Y') || puertosData[0];
    
    // Puerto de llegada (busca el principal del país o el primer puerto disponible de ese país)
    const puertoD = puertosData.find(p => normalizarTexto(p.pais) === normLlegada && p.principal === 'Y')
                 || puertosData.find(p => normalizarTexto(p.pais) === normLlegada);

    if (!puertoO || !puertoD) return '11.2 días';

    const distNm = calcularDistanciaNautica(puertoO.latitud, puertoO.longitud, puertoD.latitud, puertoD.longitud);
    const horasNavegacion = distNm / 15; 
    const diasNavegacion = horasNavegacion / 24;
    const manejoDias = (Number(puertoD.manejo_dias) || 0) + (Number(puertoO.manejo_dias) || 0);
    const totalDias = Math.max(1, diasNavegacion + manejoDias);

    return `${totalDias.toFixed(1)} días`;
  };

  // Función centralizada para recargar datos desde Supabase y aplicar el diccionario actual
  const cargarDatos = async (diccionarioActual = itttCalculadosPorPais) => {
    try {
      setCargando(true);
      const { data: puertosRes, error: errPuertos } = await supabase
        .from('puertos')
        .select('*');

      if (errPuertos) throw errPuertos;
      const listaPuertos = puertosRes || [];
      setPuertosData(listaPuertos);

      const unicosPaises = [...new Set(listaPuertos.map(p => p.pais))].sort();
      setPaisesDisponibles(unicosPaises);

      if (unicosPaises.length > 0 && !paisSalidaCalc) {
        setPaisSalidaCalc(unicosPaises[0]);
      }
      if (unicosPaises.length > 1 && !paisLlegadaCalc) {
        setPaisLlegadaCalc(unicosPaises[1]);
      }

      const { data: logiData, error: errLogi } = await supabase
        .from('tabLogi')
        .select('*')
        .order('pais', { ascending: true });

      if (errLogi) throw errLogi;

      if (logiData) {
        const formateados = logiData.map(item => {
          const nombrePais = item.pais || 'Desconocido';
          return {
            id: item.id,
            Paises: nombrePais,
            'Índice de desempeño logístico (LPIN)': item.lpi !== null ? item.lpi : 0,
            'Tráfico del puerto de contenedores (CPT)': item.cfr !== null ? item.cfr : 0,
            'Tiempo de tránsito del transporte internacional (ITTT)': calcularItttAutomaticoTabla(nombrePais, diccionarioActual)
          };
        });

        let datosFinales = formateados;
        if (paisesDestino && paisesDestino.length > 0) {
          const nombresDestino = paisesDestino.map(p => typeof p === 'string' ? p : p.nombre);
          const filtradosPorDestino = formateados.filter(item => 
            nombresDestino.some(nd => normalizarTexto(nd) === normalizarTexto(item.Paises))
          );
          if (filtradosPorDestino.length > 0) {
            datosFinales = filtradosPorDestino;
          }
        }

        setTablaLogi(datosFinales);
      }
    } catch (err) {
      console.error("Error al cargar datos desde Supabase:", err);
    } finally {
      setCargando(false);
    }
  };

  useEffect(() => {
    cargarDatos();
  }, [paisesDestino]);

  // Actualizar puertos seleccionados por defecto al cambiar de país
  useEffect(() => {
    const pSalida = puertosData.filter(p => normalizarTexto(p.pais) === normalizarTexto(paisSalidaCalc));
    if (pSalida.length > 0) {
      const principal = pSalida.find(p => p.principal === 'Y') || pSalida[0];
      setPuertoSalidaCalc(principal.puerto);
    } else {
      setPuertoSalidaCalc('');
    }
  }, [paisSalidaCalc, puertosData]);

  useEffect(() => {
    const pLlegada = puertosData.filter(p => normalizarTexto(p.pais) === normalizarTexto(paisLlegadaCalc));
    if (pLlegada.length > 0) {
      const principal = pLlegada.find(p => p.principal === 'Y') || pLlegada[0];
      setPuertoLlegadaCalc(principal.puerto);
    } else {
      setPuertoLlegadaCalc('');
    }
  }, [paisLlegadaCalc, puertosData]);

  useEffect(() => {
    if (tablaLogi.length > 0) {
      if (!paisSeleccionadoEdit) setPaisSeleccionadoEdit(tablaLogi[0].Paises);
      if (!paisSeleccionadoDel) setPaisSeleccionadoDel(tablaLogi[0].Paises);
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

    try {
      const paisLimpio = formatearNombrePropio(nuevoPais);
      const { error } = await supabase.from('tabLogi').insert([
        {
          pais: paisLimpio,
          lpi: Number(nuevoLpin) || 0,
          cfr: Number(nuevoCpt) || 0
        }
      ]);
      if (error) throw error;

      setNuevoPais('');
      setNuevoLpin('');
      setNuevoCpt('');
      setOpenAdd(false);

      await cargarDatos();
    } catch (err) {
      console.error("Error insertando en tabLogi:", err);
    }
  };

  const handleUpdatePais = async (e) => {
    e.preventDefault();
    try {
      const { error } = await supabase
        .from('tabLogi')
        .update({
          lpi: Number(editLpin),
          cfr: Number(editCpt)
        })
        .eq('pais', paisSeleccionadoEdit);

      if (error) throw error;

      setOpenEdit(false);
      await cargarDatos();
    } catch (err) {
      console.error("Error actualizando tabLogi:", err);
    }
  };

  const handleDeletePais = async (e) => {
    e.preventDefault();
    try {
      const { error } = await supabase
        .from('tabLogi')
        .delete()
        .eq('pais', paisSeleccionadoDel);

      if (error) throw error;

      setOpenDel(false);
      await cargarDatos();
    } catch (err) {
      console.error("Error eliminando de tabLogi:", err);
    }
  };

  const handleCalcularIttt = (e) => {
    e.preventDefault();

    const normSalida = normalizarTexto(paisSalidaCalc);
    const normLlegada = normalizarTexto(paisLlegadaCalc);

    // Búsqueda flexible de puertos
    let pO = puertosData.find(p => normalizarTexto(p.puerto) === normalizarTexto(puertoSalidaCalc));
    let pD = puertosData.find(p => normalizarTexto(p.puerto) === normalizarTexto(puertoLlegadaCalc));

    if (!pO && normSalida) {
      pO = puertosData.find(p => normalizarTexto(p.pais) === normSalida && p.principal === 'Y') 
        || puertosData.find(p => normalizarTexto(p.pais) === normSalida);
    }
    
    if (!pD && normLlegada) {
      pD = puertosData.find(p => normalizarTexto(p.pais) === normLlegada && p.principal === 'Y') 
        || puertosData.find(p => normalizarTexto(p.pais) === normLlegada);
    }

    if (!pO || !pD) {
      setResultadoIttt({ distancia: '0 nm', tiempo: '0 días' });
      return;
    }

    const distNm = calcularDistanciaNautica(pO.latitud, pO.longitud, pD.latitud, pD.longitud);
    const vel = Number(velocidadBuque) || 18;
    const horasNavegacion = distNm / vel;
    const diasNavegacion = horasNavegacion / 24;
    const manejoDias = (Number(pD.manejo_dias) || 0) + (Number(pO.manejo_dias) || 0);
    const totalDias = Math.max(1, diasNavegacion + manejoDias);

    const formatoDias = `${totalDias.toFixed(1)} días`;

    setResultadoIttt({
      distancia: `${Math.round(distNm).toLocaleString()} nm`,
      tiempo: formatoDias
    });

    if (paisLlegadaCalc) {
      const filaTabla = tablaLogi.find(item => normalizarTexto(item.Paises) === normLlegada);
      const nombrePaisReal = filaTabla ? filaTabla.Paises : paisLlegadaCalc;

      const nuevoDiccionario = {
        ...itttCalculadosPorPais,
        [nombrePaisReal]: formatoDias
      };

      setItttCalculadosPorPais(nuevoDiccionario);
      cargarDatos(nuevoDiccionario);
    }
  };

  return (
    <div className="space-y-8 text-slate-100 font-sans">
      
      {/* HEADER */}
      <div className="border-b border-slate-800 pb-3 flex flex-col md:flex-row justify-between items-start md:items-center gap-2">
        <div>
          <h2 className="text-xl font-bold text-white">2. Logística (LOGI)</h2>
          <p className="text-xs text-slate-400 mt-1">
            Producto activo: <strong className="text-white">{productoActivo ? productoActivo.nombre : 'Ninguno'}</strong>
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

      {/* ================= CÁLCULO ITTT ================= */}
      <div className="bg-[#16181d] border border-slate-800 p-5 rounded-lg space-y-4">
        <h3 className="text-sm font-bold text-white">Calcular Tiempo de Tránsito Internacional (ITTT)</h3>
        
        <form onSubmit={handleCalcularIttt} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            
            {/* País de salida */}
            <div>
              <label className="block text-xs text-slate-400 mb-1">País de salida</label>
              <select 
                value={paisSalidaCalc} 
                onChange={(e) => setPaisSalidaCalc(e.target.value)}
                className="w-full bg-[#181a20] border border-slate-700/80 rounded px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-red-500"
              >
                {paisesDisponibles.map((pais, idx) => (
                  <option key={idx} value={pais}>{pais}</option>
                ))}
              </select>
            </div>

            {/* País de llegada */}
            <div>
              <label className="block text-xs text-slate-400 mb-1">País de llegada</label>
              <select 
                value={paisLlegadaCalc} 
                onChange={(e) => setPaisLlegadaCalc(e.target.value)}
                className="w-full bg-[#181a20] border border-slate-700/80 rounded px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-red-500"
              >
                {paisesDisponibles.map((pais, idx) => (
                  <option key={idx} value={pais}>{pais}</option>
                ))}
              </select>
            </div>

            {/* Puerto de salida */}
            <div>
              <label className="block text-xs text-slate-400 mb-1">Puerto de salida</label>
              <select 
                value={puertoSalidaCalc} 
                onChange={(e) => setPuertoSalidaCalc(e.target.value)}
                className="w-full bg-[#181a20] border border-slate-700/80 rounded px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-red-500"
              >
                {puertosSalidaLista.length === 0 ? (
                  <option value="">Seleccionar puerto</option>
                ) : (
                  puertosSalidaLista.map((p, idx) => (
                    <option key={idx} value={p.puerto}>{p.puerto}</option>
                  ))
                )}
              </select>
            </div>

            {/* Puerto de llegada */}
            <div>
              <label className="block text-xs text-slate-400 mb-1">Puerto de llegada</label>
              <select 
                value={puertoLlegadaCalc} 
                onChange={(e) => setPuertoLlegadaCalc(e.target.value)}
                className="w-full bg-[#181a20] border border-slate-700/80 rounded px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-red-500"
              >
                {puertosLlegadaLista.length === 0 ? (
                  <option value="">Seleccionar puerto</option>
                ) : (
                  puertosLlegadaLista.map((p, idx) => (
                    <option key={idx} value={p.puerto}>{p.puerto}</option>
                  ))
                )}
              </select>
            </div>

          </div>

          <div className="flex flex-col md:flex-row items-end gap-4 pt-2">
            <div className="flex-1">
              <label className="block text-xs text-slate-400 mb-1">Velocidad del buque (nudos)</label>
              <input 
                type="number" 
                step="0.01" 
                value={velocidadBuque} 
                onChange={(e) => setVelocidadBuque(e.target.value)} 
                className="w-full bg-[#181a20] border border-slate-700/80 rounded px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-red-500"
              />
            </div>
            <button 
              type="submit" 
              className="px-5 py-2 bg-[#1b1e26] hover:bg-[#252833] text-xs font-semibold text-white border border-slate-700/80 rounded transition-colors cursor-pointer"
            >
              Calcular ITTT
            </button>
          </div>
        </form>

        <div className="bg-[#12281d] border border-[#1e4620] px-4 py-2.5 rounded text-xs text-[#a3d9a5] mt-3">
          Distancia calculada: <strong className="text-white">{resultadoIttt.distancia}</strong> | Tiempo de tránsito (ITTT): <strong className="text-white">{resultadoIttt.tiempo}</strong> (Tablas actualizadas automáticamente)
        </div>
      </div>

      {/* ================= TABLA LOGÍSTICA BD ================= */}
      <div className="space-y-2">
        <h3 className="text-base font-bold text-white">Tabla Logística (LOGI) — Base de Datos</h3>
        <p className="text-xs text-slate-400">Indicadores logísticos registrados (LPI, CFR) y ITTT calculado automáticamente.</p>
        
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
                  <th className="p-3 bg-[#181a20]">Tiempo Tránsito (ITTT)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 bg-[#0e1117]">
                {(() => {
                  const lpinVals = tablaLogi.map(d => Number(d['Índice de desempeño logístico (LPIN)'])).filter(v => v > 0);
                  const cptVals = tablaLogi.map(d => Number(d['Tráfico del puerto de contenedores (CPT)'])).filter(v => v > 0);
                  
                  const itttVals = tablaLogi.map(d => {
                    const itttStr = String(d['Tiempo de tránsito del transporte internacional (ITTT)'] || '0')
                      .replace(/días|dias/gi, '')
                      .replace(',', '.')
                      .trim();
                    return Number(itttStr);
                  }).filter(v => v > 0);

                  const MAX_LPIN = lpinVals.length > 0 ? Math.max(...lpinVals) : 5.0;          
                  const MAX_CPT = cptVals.length > 0 ? Math.max(...cptVals) : 300000000;  
                  const MIN_ITTT = itttVals.length > 0 ? Math.min(...itttVals) : 5.0; 
                  const A3 = 10;

                  const tablaOrdenadaBD = tablaLogi.map((row) => {
                    const lpin = Number(row['Índice de desempeño logístico (LPIN)']) || 0;
                    const cpt = Number(row['Tráfico del puerto de contenedores (CPT)']) || 0;
                    
                    const itttStr = String(row['Tiempo de tránsito del transporte internacional (ITTT)'] || '0')
                      .replace(/días|dias/gi, '')
                      .replace(',', '.')
                      .trim();
                    const ittt = Number(itttStr) || 1;

                    const lpinNorm = lpin ? Number((A3 * lpin / MAX_LPIN).toFixed(2)) : 0;
                    const cptNorm = cpt ? Number((A3 * cpt / MAX_CPT).toFixed(2)) : 0;
                    const itttNorm = ittt ? Number((A3 * MIN_ITTT / ittt).toFixed(2)) : 0;

                    const costoTotal = Number((0.30 * lpinNorm + 0.30 * cptNorm + 0.40 * itttNorm).toFixed(2));
                    const faltantes = [lpinNorm, cptNorm, itttNorm].filter(v => v === 0).length;

                    return {
                      ...row,
                      costoTotal,
                      __faltantes: faltantes
                    };
                  });

                  tablaOrdenadaBD.sort((a, b) => {
                    if (a.__faltantes !== b.__faltantes) return a.__faltantes - b.__faltantes;
                    return b.costoTotal - a.costoTotal;
                  });

                  return tablaOrdenadaBD.map((row, index) => (
                    <tr key={index} className="hover:bg-[#16181d] transition-colors">
                      <td className="p-3 text-slate-500">{index + 1}</td>
                      <td className="p-3 font-medium text-white">{row.Paises}</td>
                      <td className="p-3">{row['Índice de desempeño logístico (LPIN)']}</td>
                      <td className="p-3">{row['Tráfico del puerto de contenedores (CPT)']}</td>
                      <td className="p-3 text-amber-400 font-medium">{row['Tiempo de tránsito del transporte internacional (ITTT)']}</td>
                    </tr>
                  ));
                })()}
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
              {(() => {
                const lpinVals = tablaLogi.map(d => Number(d['Índice de desempeño logístico (LPIN)'])).filter(v => v > 0);
                const cptVals = tablaLogi.map(d => Number(d['Tráfico del puerto de contenedores (CPT)'])).filter(v => v > 0);
                
                const itttVals = tablaLogi.map(d => {
                  const itttStr = String(d['Tiempo de tránsito del transporte internacional (ITTT)'] || '0')
                    .replace(/días|dias/gi, '')
                    .replace(',', '.')
                    .trim();
                  return Number(itttStr);
                }).filter(v => v > 0);

                const MAX_LPIN = lpinVals.length > 0 ? Math.max(...lpinVals) : 5.0;          
                const MAX_CPT = cptVals.length > 0 ? Math.max(...cptVals) : 300000000;  
                const MIN_ITTT = itttVals.length > 0 ? Math.min(...itttVals) : 5.0; 
                const A3 = 10;

                const tablaProcesada = tablaLogi.map((row) => {
                  const lpin = Number(row['Índice de desempeño logístico (LPIN)']) || 0;
                  const cpt = Number(row['Tráfico del puerto de contenedores (CPT)']) || 0;
                  
                  const itttStr = String(row['Tiempo de tránsito del transporte internacional (ITTT)'] || '0')
                    .replace(/días|dias/gi, '')
                    .replace(',', '.')
                    .trim();
                  const ittt = Number(itttStr) || 1;

                  const lpinNorm = lpin ? Number((A3 * lpin / MAX_LPIN).toFixed(2)) : 0;
                  const cptNorm = cpt ? Number((A3 * cpt / MAX_CPT).toFixed(2)) : 0;
                  const itttNorm = ittt ? Number((A3 * MIN_ITTT / ittt).toFixed(2)) : 0;

                  const costoTotal = Number((0.30 * lpinNorm + 0.30 * cptNorm + 0.40 * itttNorm).toFixed(2));
                  const faltantes = [lpinNorm, cptNorm, itttNorm].filter(v => v === 0).length;

                  return {
                    ...row,
                    lpinNorm,
                    cptNorm,
                    itttNorm,
                    costoTotal,
                    __faltantes: faltantes
                  };
                });

                tablaProcesada.sort((a, b) => {
                  if (a.__faltantes !== b.__faltantes) return a.__faltantes - b.__faltantes;
                  return b.costoTotal - a.costoTotal;
                });

                return tablaProcesada.map((row, index) => (
                  <tr key={index} className="hover:bg-[#16181d] transition-colors">
                    <td className="p-3 text-slate-500">{index + 1}</td>
                    <td className="p-3 font-medium text-white">{row.Paises}</td>
                    <td className="p-3">{row.lpinNorm}</td>
                    <td className="p-3">{row.cptNorm}</td>
                    <td className="p-3">{row.itttNorm}</td>
                    <td className="p-3 font-bold text-emerald-400">{row.costoTotal}</td>
                  </tr>
                ));
              })()}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
}
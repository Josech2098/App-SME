import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient.js';

export default function TabLogistica({ productoActivo, paisesDestino, paisOrigen, onDatosActualizados }) {
  const [tablaLogi, setTablaLogi] = useState([]);
  const [puertosData, setPuertosData] = useState([]);
  const [cargando, setCargando] = useState(true);

  const [openAdd, setOpenAdd] = useState(false);
  const [openEdit, setOpenEdit] = useState(false);
  const [openDel, setOpenDel] = useState(false);

  const [paisSeleccionadoEdit, setPaisSeleccionadoEdit] = useState('');
  const [paisSeleccionadoDel, setPaisSeleccionadoDel] = useState('');

  const [nuevoPais, setNuevoPais] = useState('');
  const [nuevoIdl, setNuevoIdl] = useState('');
  const [nuevoCcp, setNuevoCcp] = useState('');

  const [editIdl, setEditIdl] = useState('');
  const [editCcp, setEditCcp] = useState('');

  // Estados para el calculador de TTI
  const [paisesDisponibles, setPaisesDisponibles] = useState([]);
  
  // Sincronizamos el país de salida con el paisOrigen global recibido por props
  const [paisSalidaCalc, setPaisSalidaCalc] = useState(paisOrigen || 'España');
  const [paisLlegadaCalc, setPaisLlegadaCalc] = useState('');
  const [puertoSalidaCalc, setPuertoSalidaCalc] = useState('');
  const [puertoLlegadaCalc, setPuertoLlegadaCalc] = useState('');
  const [velocidadBuque, setVelocidadBuque] = useState(18.50);
  const [resultadoTti, setResultadoTti] = useState({ distancia: '0 nm', tiempo: '0 días' });

  // Almacena el resultado manual específico cuando el usuario presiona "Calcular TTI"
  const [resultadoManualFijado, setResultadoManualFijado] = useState(null);

  // Normalización avanzada de textos
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

  const formatearNombrePropio = (texto) => {
    if (!texto) return '';
    return texto
      .trim()
      .toLowerCase()
      .replace(/(^\w{1})|(\s+\w{1})/g, letra => letra.toUpperCase());
  };

  // Sincronizar si cambia el paisOrigen desde las props globales de la app
  useEffect(() => {
    if (paisOrigen) {
      setPaisSalidaCalc(paisOrigen);
      setResultadoManualFijado(null); // Si cambia el origen global, volvemos al modo masivo automático
    }
  }, [paisOrigen]);

  const puertosSalidaLista = puertosData.filter(p => normalizarTexto(p.pais) === normalizarTexto(paisSalidaCalc));
  const puertosLlegadaLista = puertosData.filter(p => normalizarTexto(p.pais) === normalizarTexto(paisLlegadaCalc));

  const calcularDistanciaNautica = (lat1, lon1, lat2, lon2) => {
    if (lat1 === null || lon1 === null || lat2 === null || lon2 === null) return 0;
    const R = 3440.06; 
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
              Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
              Math.sin(dLon / 2) * Math.sin(dLon / 2);
              
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  };

  const calcularTtiEntrePuertos = (pO, pD, vel = 18.50) => {
    if (!pO || !pD) return null;
    const distNm = calcularDistanciaNautica(pO.latitud, pO.longitud, pD.latitud, pD.longitud);
    if (distNm === 0) return null;
    const horasNavegacion = distNm / vel;
    const diasNavegacion = horasNavegacion / 24;
    const manejoDias = (Number(pD.manejo_dias) || 0) + (Number(pO.manejo_dias) || 0);
    return {
      distancia: distNm,
      dias: diasNavegacion + manejoDias
    };
  };

  // Lógica principal para decidir qué mostrar en la celda de TTI de cada fila de la tabla
  const calcularTtiParaFila = (nombrePaisFila) => {
    const normFila = normalizarTexto(nombrePaisFila);

    // 1. Si el usuario realizó un cálculo manual específico, SOLO ese país muestra el dato, los demás quedan en '-'
    if (resultadoManualFijado) {
      if (normalizarTexto(resultadoManualFijado.pais) === normFila) {
        return resultadoManualFijado.ttiFormateado;
      }
      return '-';
    }

    // 2. Modo Automático Masivo (calcula para todos basado en el país de salida global/seleccionado)
    if (!paisSalidaCalc || puertosData.length === 0) return '-';

    const puertoO = puertosData.find(p => normalizarTexto(p.puerto) === normalizarTexto(puertoSalidaCalc))
                 || puertosData.find(p => normalizarTexto(p.pais) === normalizarTexto(paisSalidaCalc) && p.principal === 'Y')
                 || puertosData.find(p => normalizarTexto(p.pais) === normalizarTexto(paisSalidaCalc));

    const puertoD = puertosData.find(p => normalizarTexto(p.pais) === normFila && p.principal === 'Y')
                 || puertosData.find(p => normalizarTexto(p.pais) === normFila);

    if (!puertoO || !puertoD) return '-';

    const resultado = calcularTtiEntrePuertos(puertoO, puertoD, Number(velocidadBuque) || 18.50);
    if (!resultado) return '-';

    return `${resultado.dias.toFixed(1)} días`;
  };

  const cargarDatos = async () => {
    try {
      setCargando(true);
      const { data: puertosRes, error: errPuertos } = await supabase.from('puertos').select('*');
      if (errPuertos) throw errPuertos;
      const listaPuertos = puertosRes || [];
      setPuertosData(listaPuertos);

      const unicosPaises = [...new Set(listaPuertos.map(p => p.pais))].sort();
      setPaisesDisponibles(unicosPaises);

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
            'Índice de Desempeño Logístico (IDL)': item.lpi !== null ? item.lpi : 0,
            'Calidad de las carreteras por país (CCP)': item.cfr !== null ? item.cfr : 0,
            'Tiempo de tránsito del Transporte Internacional (TTI)': calcularTtiParaFila(nombrePais)
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
      console.error("Error al cargar datos:", err);
    } finally {
      setCargando(false);
    }
  };
  
  useEffect(() => {
    cargarDatos();
  }, [paisesDestino, paisSalidaCalc, puertoSalidaCalc, velocidadBuque, resultadoManualFijado]);

  // Actualización de normalizaciones para costos de la aplicación
  useEffect(() => {
    if (tablaLogi.length === 0) return;

    const idkVals = tablaLogi.map(d => Number(d['Índice de Desempeño Logístico (IDL)'])).filter(v => v > 0);
    const ccpVals = tablaLogi.map(d => Number(d['Calidad de las carreteras por país (CCP)'])).filter(v => v > 0);
    
    const ttiVals = tablaLogi.map(d => {
      const ttiStr = String(d['Tiempo de tránsito del Transporte Internacional (TTI)'] || '0').replace(/días|dias|-/gi, '').trim();
      return Number(ttiStr);
    }).filter(v => v > 0);

    const MAX_IDL = idkVals.length > 0 ? Math.max(...idkVals) : 5.0;
    const MAX_CCP = ccpVals.length > 0 ? Math.max(...ccpVals) : 300000000;
    const MIN_TTI = ttiVals.length > 0 ? Math.min(...ttiVals) : 1.0;
    const A3 = 10;

    const tablaProcesada = tablaLogi.map(row => {
      const idl = Number(row['Índice de Desempeño Logístico (IDL)']) || 0;
      const ccp = Number(row['Calidad de las carreteras por país (CCP)']) || 0;
      const ttiStr = String(row['Tiempo de tránsito del Transporte Internacional (TTI)'] || '0').replace(/días|dias|-/gi, '').trim();
      const tti = Number(ttiStr) || MIN_TTI;

      const idlNorm = idl ? Number((A3 * idl / MAX_IDL).toFixed(2)) : 0;
      const ccpNorm = ccp ? Number((A3 * ccp / MAX_CCP).toFixed(2)) : 0;
      const ttiNorm = tti ? Number((A3 * MIN_TTI / tti).toFixed(2)) : 0;

      const costoTotal = Number((0.185 * idlNorm + 0.185 * ccpNorm + 0.63 * ttiNorm).toFixed(2));

      return { ...row, idlNorm, ccpNorm, ttiNorm, costoTotal };
    });

    if (onDatosActualizados) {
      onDatosActualizados(tablaProcesada);
    }
  }, [tablaLogi]);

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

  // ACCIÓN MANUAL: Al hacer clic en "Calcular TTI"
  const handleCalcularTtiManual = (e) => {
    e.preventDefault();
    if (!paisLlegadaCalc) return;

    let pO = puertosData.find(p => normalizarTexto(p.puerto) === normalizarTexto(puertoSalidaCalc));
    let pD = puertosData.find(p => normalizarTexto(p.puerto) === normalizarTexto(puertoLlegadaCalc));

    if (!pO && paisSalidaCalc) {
      pO = puertosData.find(p => normalizarTexto(p.pais) === normalizarTexto(paisSalidaCalc) && p.principal === 'Y') 
        || puertosData.find(p => normalizarTexto(p.pais) === normalizarTexto(paisSalidaCalc));
    }
    
    if (!pD && paisLlegadaCalc) {
      pD = puertosData.find(p => normalizarTexto(p.pais) === normalizarTexto(paisLlegadaCalc) && p.principal === 'Y') 
        || puertosData.find(p => normalizarTexto(p.pais) === normalizarTexto(paisLlegadaCalc));
    }

    const resultado = calcularTtiEntrePuertos(pO, pD, Number(velocidadBuque) || 18.50);

    if (!resultado) {
      setResultadoTti({ distancia: '0 nm', tiempo: '0 días' });
      return;
    }

    const formatoDias = `${resultado.dias.toFixed(1)} días`;

    setResultadoTti({
      distancia: `${Math.round(resultado.distancia).toLocaleString()} nm`,
      tiempo: formatoDias
    });

    const filaTabla = tablaLogi.find(item => normalizarTexto(item.Paises) === normalizarTexto(paisLlegadaCalc));
    const nombrePaisReal = filaTabla ? filaTabla.Paises : paisLlegadaCalc;

    // Fijamos el resultado manual para que la tabla deje en blanco (-) a los demás países
    setResultadoManualFijado({
      pais: nombrePaisReal,
      ttiFormateado: formatoDias
    });
  };

  const limpiarCalculoManual = () => {
    setResultadoManualFijado(null);
  };

  const handleAddPais = async (e) => {
    e.preventDefault();
    if (!nuevoPais.trim()) return;
    try {
      const paisLimpio = formatearNombrePropio(nuevoPais);
      const { error } = await supabase.from('tabLogi').insert([
        { pais: paisLimpio, lpi: Number(nuevoIdl) || 0, cfr: Number(nuevoCcp) || 0 }
      ]);
      if (error) throw error;
      setNuevoPais(''); setNuevoIdl(''); setNuevoCcp(''); setOpenAdd(false);
      await cargarDatos();
    } catch (err) { console.error(err); }
  };

  const handleUpdatePais = async (e) => {
    e.preventDefault();
    try {
      const { error } = await supabase.from('tabLogi').update({ lpi: Number(editIdl), cfr: Number(editCcp) }).eq('pais', paisSeleccionadoEdit);
      if (error) throw error;
      setOpenEdit(false);
      await cargarDatos();
    } catch (err) { console.error(err); }
  };

  const handleDeletePais = async (e) => {
    e.preventDefault();
    try {
      const { error } = await supabase.from('tabLogi').delete().eq('pais', paisSeleccionadoDel);
      if (error) throw error;
      setOpenDel(false);
      await cargarDatos();
    } catch (err) { console.error(err); }
  };

  return (
    <div className="space-y-8 text-slate-100 font-sans">
      
      {/* HEADER */}
      <div className="border-b border-[#1b1f2e] pb-3 flex flex-col md:flex-row justify-between items-start md:items-center gap-2">
        <div>
          <h2 className="text-xl font-bold text-white">2. Logística (LOGI)</h2>
          <p className="text-xs text-slate-400 mt-1">
            Producto activo: <strong className="text-white">{productoActivo ? productoActivo.nombre : 'Ninguno'}</strong>
          </p>
        </div>
      </div>

      {/* CRUD ACORDEONES */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* AÑADIR */}
        <div className="border border-[#1b1f2e] bg-[#12141f] rounded-lg overflow-hidden transition-all shadow-lg">
          <button type="button" onClick={() => setOpenAdd(!openAdd)} className="w-full px-4 py-3 text-left text-sm font-semibold text-slate-200 flex items-center gap-2 hover:bg-[#1a1d2b] cursor-pointer">
            <span className={`text-slate-400 text-xs transition-transform duration-200 ${openAdd ? 'rotate-90' : ''}`}>❯</span>
            Añadir país y métricas
          </button>
          {openAdd && (
            <form onSubmit={handleAddPais} className="p-4 border-t border-[#1b1f2e] space-y-3 bg-[#0c0e17]">
              <div>
                <label className="block text-xs text-slate-400 mb-1">Nombre del País:</label>
                <input type="text" value={nuevoPais} onChange={(e) => setNuevoPais(e.target.value)} required className="w-full bg-[#151824] border border-[#232738] rounded px-2.5 py-1.5 text-xs text-slate-100" />
              </div>
              <div>
                <label className="block text-xs text-slate-400 mb-1">IDL:</label>
                <input type="number" step="0.01" value={nuevoIdl} onChange={(e) => setNuevoIdl(e.target.value)} className="w-full bg-[#151824] border border-[#232738] rounded px-2.5 py-1.5 text-xs text-slate-100" />
              </div>
              <div>
                <label className="block text-xs text-slate-400 mb-1">CCP:</label>
                <input type="number" value={nuevoCcp} onChange={(e) => setNuevoCcp(e.target.value)} className="w-full bg-[#151824] border border-[#232738] rounded px-2.5 py-1.5 text-xs text-slate-100" />
              </div>
              <button type="submit" className="w-full py-1.5 mt-2 bg-indigo-600 hover:bg-indigo-700 text-white font-medium text-xs rounded cursor-pointer">Guardar en BD</button>
            </form>
          )}
        </div>

        {/* EDITAR */}
        <div className="border border-[#1b1f2e] bg-[#12141f] rounded-lg overflow-hidden transition-all shadow-lg">
          <button type="button" onClick={() => setOpenEdit(!openEdit)} className="w-full px-4 py-3 text-left text-sm font-semibold text-slate-200 flex items-center gap-2 hover:bg-[#1a1d2b] cursor-pointer">
            <span className={`text-slate-400 text-xs transition-transform duration-200 ${openEdit ? 'rotate-90' : ''}`}>❯</span>
            Editar país existente
          </button>
          {openEdit && (
            <form onSubmit={handleUpdatePais} className="p-4 border-t border-[#1b1f2e] space-y-3 bg-[#0c0e17]">
              <div>
                <label className="block text-xs text-slate-400 mb-1">Seleccionar País:</label>
                <select value={paisSeleccionadoEdit} onChange={(e) => { setPaisSeleccionadoEdit(e.target.value); const f = tablaLogi.find(i => i.Paises === e.target.value); if(f){ setEditIdl(f['Índice de Desempeño Logístico (IDL)']); setEditCcp(f['Calidad de las carreteras por país (CCP)']); } }} className="w-full bg-[#151824] border border-[#232738] rounded px-2.5 py-1.5 text-xs text-slate-100">
                  {tablaLogi.map((item, idx) => (<option key={idx} value={item.Paises}>{item.Paises}</option>))}
                </select>
              </div>
              <div>
                <label className="block text-xs text-slate-400 mb-1">Nuevo IDL:</label>
                <input type="number" step="0.01" value={editIdl} onChange={(e) => setEditIdl(e.target.value)} className="w-full bg-[#151824] border border-[#232738] rounded px-2.5 py-1.5 text-xs text-slate-100" />
              </div>
              <div>
                <label className="block text-xs text-slate-400 mb-1">Nuevo CCP:</label>
                <input type="number" value={editCcp} onChange={(e) => setEditCcp(e.target.value)} className="w-full bg-[#151824] border border-[#232738] rounded px-2.5 py-1.5 text-xs text-slate-100" />
              </div>
              <button type="submit" className="w-full py-1.5 mt-2 bg-indigo-600 hover:bg-indigo-700 text-white font-medium text-xs rounded cursor-pointer">Actualizar</button>
            </form>
          )}
        </div>

        {/* ELIMINAR */}
        <div className="border border-[#1b1f2e] bg-[#12141f] rounded-lg overflow-hidden transition-all shadow-lg">
          <button type="button" onClick={() => setOpenDel(!openDel)} className="w-full px-4 py-3 text-left text-sm font-semibold text-slate-200 flex items-center gap-2 hover:bg-[#1a1d2b] cursor-pointer">
            <span className={`text-slate-400 text-xs transition-transform duration-200 ${openDel ? 'rotate-90' : ''}`}>❯</span>
            Eliminar país
          </button>
          {openDel && (
            <form onSubmit={handleDeletePais} className="p-4 border-t border-[#1b1f2e] space-y-3 bg-[#0c0e17]">
              <div>
                <label className="block text-xs text-slate-400 mb-1">Seleccionar País a Eliminar:</label>
                <select value={paisSeleccionadoDel} onChange={(e) => setPaisSeleccionadoDel(e.target.value)} className="w-full bg-[#151824] border border-[#232738] rounded px-2.5 py-1.5 text-xs text-slate-100">
                  {tablaLogi.map((item, idx) => (<option key={idx} value={item.Paises}>{item.Paises}</option>))}
                </select>
              </div>
              <button type="submit" className="w-full py-1.5 mt-4 bg-rose-600 hover:bg-rose-700 text-white font-medium text-xs rounded cursor-pointer">Confirmar</button>
            </form>
          )}
        </div>
      </div>

      {/* ================= CÁLCULO TTI ================= */}
      <div className="bg-[#12141f] border border-[#1b1f2e] p-5 rounded-lg space-y-4 shadow-lg">
        <div className="flex justify-between items-center">
          <h3 className="text-sm font-bold text-white">Calcular Tiempo de Tránsito del Transporte Internacional (TTI)</h3>
          {resultadoManualFijado && (
            <button onClick={limpiarCalculoManual} className="text-[11px] text-indigo-400 hover:underline cursor-pointer">
              ↺ Regresar a cálculo masivo automático
            </button>
          )}
        </div>
        
        <form onSubmit={handleCalcularTtiManual} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs text-slate-400 mb-1">País de salida</label>
              <select value={paisSalidaCalc} onChange={(e) => { setPaisSalidaCalc(e.target.value); setResultadoManualFijado(null); }} className="w-full bg-[#151824] border border-[#232738] rounded px-3 py-2 text-xs text-slate-200">
                {paisesDisponibles.map((pais, idx) => (<option key={idx} value={pais}>{pais}</option>))}
              </select>
            </div>
            <div>
              <label className="block text-xs text-slate-400 mb-1">País de llegada</label>
              <select value={paisLlegadaCalc} onChange={(e) => setPaisLlegadaCalc(e.target.value)} className="w-full bg-[#151824] border border-[#232738] rounded px-3 py-2 text-xs text-slate-200">
                {paisesDisponibles.map((pais, idx) => (<option key={idx} value={pais}>{pais}</option>))}
              </select>
            </div>
            <div>
              <label className="block text-xs text-slate-400 mb-1">Puerto de salida</label>
              <select value={puertoSalidaCalc} onChange={(e) => { setPuertoSalidaCalc(e.target.value); setResultadoManualFijado(null); }} className="w-full bg-[#151824] border border-[#232738] rounded px-3 py-2 text-xs text-slate-200">
                {puertosSalidaLista.map((p, idx) => (<option key={idx} value={p.puerto}>{p.puerto}</option>))}
              </select>
            </div>
            <div>
              <label className="block text-xs text-slate-400 mb-1">Puerto de llegada</label>
              <select value={puertoLlegadaCalc} onChange={(e) => setPuertoLlegadaCalc(e.target.value)} className="w-full bg-[#151824] border border-[#232738] rounded px-3 py-2 text-xs text-slate-200">
                {puertosLlegadaLista.map((p, idx) => (<option key={idx} value={p.puerto}>{p.puerto}</option>))}
              </select>
            </div>
          </div>

          <div className="flex flex-col md:flex-row items-end gap-4 pt-2">
            <div className="flex-1">
              <label className="block text-xs text-slate-400 mb-1">Velocidad del buque (nudos)</label>
              <input type="number" step="0.01" value={velocidadBuque} onChange={(e) => setVelocidadBuque(e.target.value)} className="w-full bg-[#151824] border border-[#232738] rounded px-3 py-2 text-xs text-slate-200" />
            </div>
            <button type="submit" className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-xs font-semibold text-white rounded cursor-pointer transition-colors">
              Calcular TTI
            </button>
          </div>
        </form>

        <div className="bg-[#101b1e] border border-[#1b353a] px-4 py-2.5 rounded text-xs text-[#7ee787] mt-3">
          Distancia calculada: <strong className="text-white">{resultadoTti.distancia}</strong> | Tiempo de tránsito (TTI): <strong className="text-white">{resultadoTti.tiempo}</strong>
          <span className="text-slate-400 ml-2">({resultadoManualFijado ? 'Modo Específico Manual Activo' : 'Modo Automático Masivo'})</span>
        </div>
      </div>

      {/* ================= TABLA LOGÍSTICA ================= */}
      <div className="space-y-2">
        <h3 className="text-base font-bold text-white">Tabla Logística (LOGI)</h3>
        <p className="text-xs text-slate-400">Indicadores logísticos registrados (IDL, CCP) y TTI calculado.</p>
        
        {cargando ? (
          <div className="p-4 text-xs text-slate-400 italic">Cargando datos...</div>
        ) : (
          <div className="overflow-x-auto max-h-[380px] overflow-y-auto border border-[#1b1f2e] rounded-lg shadow-lg">
            <table className="w-full text-left text-xs text-slate-300 relative">
              <thead className="bg-[#151824] text-slate-400 uppercase text-[10px] tracking-wider border-b border-[#1b1f2e] sticky top-0 z-10">
                <tr>
                  <th className="p-3 w-12 bg-[#151824]">#</th>
                  <th className="p-3 bg-[#151824]">País</th>
                  <th className="p-3 bg-[#151824]">Índice de Desempeño Logístico (IDL)</th>
                  <th className="p-3 bg-[#151824]">Calidad de las carreteras por país (CCP)</th>
                  <th className="p-3 bg-[#151824]">Tiempo de tránsito del Transporte Internacional (TTI)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#1b1f2e]/60 bg-[#10121b]">
                {tablaLogi.map((row, index) => {
                  const ttiMostrado = calcularTtiParaFila(row.Paises);
                  return (
                    <tr key={index} className="hover:bg-[#151824] transition-colors">
                      <td className="p-3 text-slate-500">{index + 1}</td>
                      <td className="p-3 font-medium text-white">{row.Paises}</td>
                      <td className="p-3">{row['Índice de Desempeño Logístico (IDL)']}</td>
                      <td className="p-3">{row['Calidad de las carreteras por país (CCP)']}</td>
                      <td className={`p-3 font-medium ${ttiMostrado === '-' ? 'text-slate-500' : 'text-emerald-400'}`}>
                        {ttiMostrado}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

    </div>
  );
}
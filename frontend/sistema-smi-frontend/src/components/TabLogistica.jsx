import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { supabase } from '../supabaseClient.js';
import { renderPaisConBandera } from './banderas.jsx';

export default function TabLogistica({ productoActivo, paisesDestino, paisOrigen, onDatosActualizados }) {
  const [tablaLogi, setTablaLogi] = useState([]);
  const [puertosData, setPuertosData] = useState([]);
  const [cargando, setCargando] = useState(true);

  // Estado para desplegar u ocultar el calculador TTI
  const [mostrarCalculador, setMostrarCalculador] = useState(false);

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

  // 🔹 Sincronizar si cambia el paisOrigen desde las props globales de la app
  useEffect(() => {
    if (paisOrigen) {
      setPaisSalidaCalc(paisOrigen);
      setResultadoManualFijado(null);
    }
  }, [paisOrigen]);

  const puertosSalidaLista = useMemo(() => {
    return puertosData.filter(p => normalizarTexto(p.pais) === normalizarTexto(paisSalidaCalc));
  }, [puertosData, paisSalidaCalc]);

  const puertosLlegadaLista = useMemo(() => {
    return puertosData.filter(p => normalizarTexto(p.pais) === normalizarTexto(paisLlegadaCalc));
  }, [puertosData, paisLlegadaCalc]);

  // Cálculo de distancia náutica con factor de corrección marítima internacional básico 
  const calcularDistanciaNautica = (lat1, lon1, lat2, lon2) => {
    if (lat1 === null || lon1 === null || lat2 === null || lon2 === null) return 0;
    const R = 3440.06; 
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
              Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
              Math.sin(dLon / 2) * Math.sin(dLon / 2);
              
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    let distanciaDirecta = R * c;

    const factorMaritimo = (Math.abs(lon1 - lon2) > 30 || Math.abs(lat1 - lat2) > 30) ? 1.35 : 1.15;
    return distanciaDirecta * factorMaritimo;
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

  // 🔹 CORRECCIÓN: Cálculo por fila optimizado e independiente
  const calcularTtiParaFila = useCallback((nombrePaisFila) => {
    const normFila = normalizarTexto(nombrePaisFila);

    if (resultadoManualFijado && normalizarTexto(resultadoManualFijado.pais) === normFila) {
      return resultadoManualFijado.ttiFormateado;
    }

    if (!paisSalidaCalc || puertosData.length === 0) return '-';

    const puertoO = puertosData.find(p => normalizarTexto(p.puerto) === normalizarTexto(puertoSalidaCalc))
                   || puertosData.find(p => normalizarTexto(p.pais) === normalizarTexto(paisSalidaCalc) && p.principal === 'Y')
                   || puertosData.find(p => normalizarTexto(p.pais) === normalizarTexto(paisSalidaCalc));

    const puertoD = puertosData.find(p => normalizarTexto(p.pais) === normFila && p.principal === 'Y')
                   || puertosData.find(p => normalizarTexto(p.pais) === normFila);

    if (!puertoO || !puertoD) return '-';

    const resultado = calcularTtiEntrePuertos(puertoO, puertoD, Number(velocidadBuque) || 18.50);
    if (!resultado) return '-';

    return `${resultado.dias.toFixed(2)} días`;
  }, [paisSalidaCalc, puertoSalidaCalc, puertosData, velocidadBuque, resultadoManualFijado]);

  // Manejar el cambio automático del puerto de salida al cambiar el país de salida
  useEffect(() => {
    if (puertosSalidaLista.length > 0) {
      const principal = puertosSalidaLista.find(p => p.principal === 'Y') || puertosSalidaLista[0];
      setPuertoSalidaCalc(principal.puerto);
    } else {
      setPuertoSalidaCalc('');
    }
  }, [paisSalidaCalc, puertosSalidaLista]);

  // Manejar el cambio automático del puerto de llegada
  useEffect(() => {
    if (puertosLlegadaLista.length > 0) {
      const principal = puertosLlegadaLista.find(p => p.principal === 'Y') || puertosLlegadaLista[0];
      setPuertoLlegadaCalc(principal.puerto);
    } else {
      setPuertoLlegadaCalc('');
    }
  }, [paisLlegadaCalc, puertosLlegadaLista]);

  // Carga inicial de datos desde Supabase
  useEffect(() => {
    async function cargarDatos() {
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
          .select('*');

        if (errLogi) throw errLogi;

        if (logiData) {
          const formateados = logiData.map(item => {
            const nombrePais = item.pais || 'Desconocido';
            return {
              id: item.id,
              Paises: nombrePais,
              'Índice de Desempeño Logístico (IDL)': item.lpi !== null && item.lpi !== undefined ? item.lpi : null,
              'Calidad de las carreteras por país (CCP)': item.cfr !== null && item.cfr !== undefined ? item.cfr : null,
              'Tiempo de tránsito del Transporte Internacional (TTI)': '-'
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
        console.error("Error al cargar datos logísticos:", err);
      } finally {
        setCargando(false);
      }
    }
    cargarDatos();
  }, [paisesDestino]);

  // Valores válidos y normalización general para la tabla inferior
  const ttiValoresValidos = useMemo(() => {
    return tablaLogi
      .map(d => {
        const ttiStr = String(calcularTtiParaFila(d.Paises) || '0').replace(/días|dias|-/gi, '').trim();
        const num = Number(ttiStr);
        return isNaN(num) || num <= 0 ? null : num;
      })
      .filter(v => v !== null);
  }, [tablaLogi, calcularTtiParaFila]);

  const MIN_TTI = useMemo(() => {
    return ttiValoresValidos.length > 0 ? Math.min(...ttiValoresValidos) : null;
  }, [ttiValoresValidos]);

  const tablaProcesadaFinal = useMemo(() => {
    if (tablaLogi.length === 0) return [];

    const idkVals = tablaLogi.map(d => Number(d['Índice de Desempeño Logístico (IDL)'])).filter(v => v !== null && !isNaN(v) && v > 0);
    const ccpVals = tablaLogi.map(d => Number(d['Calidad de las carreteras por país (CCP)'])).filter(v => v !== null && !isNaN(v) && v > 0);

    const MAX_IDL = idkVals.length > 0 ? Math.max(...idkVals) : null;
    const MAX_CCP = ccpVals.length > 0 ? Math.max(...ccpVals) : null;
    const A3 = 10;

    const procesada = tablaLogi.map(row => {
      const rawIdl = row['Índice de Desempeño Logístico (IDL)'];
      const rawCcp = row['Calidad de las carreteras por país (CCP)'];

      const idl = rawIdl !== null && rawIdl !== undefined ? Number(rawIdl) : null;
      const ccp = rawCcp !== null && rawCcp !== undefined ? Number(rawCcp) : null;
      
      const ttiStr = String(calcularTtiParaFila(row.Paises) || '0').replace(/días|dias|-/gi, '').trim();
      const ttiVal = Number(ttiStr);
      const tieneTtiValido = !isNaN(ttiVal) && ttiVal > 0;

      const idlNorm = (idl !== null && idl > 0 && MAX_IDL) ? Number((A3 * idl / MAX_IDL).toFixed(2)) : null;
      
      const ccpNorm = (ccp !== null && ccp > 0 && MAX_CCP) 
        ? Number((A3 * (Math.log(ccp + 1) / Math.log(MAX_CCP + 1))).toFixed(2)) 
        : null;

      const ttiNorm = (tieneTtiValido && MIN_TTI) 
        ? Number((A3 * (MIN_TTI / ttiVal)).toFixed(2)) 
        : null;

      const tieneNulosOIncompletos = idlNorm === null || ccpNorm === null || ttiNorm === null;

      const costoTotal = tieneNulosOIncompletos 
        ? null 
        : Number((0.185 * idlNorm + 0.185 * ccpNorm + 0.63 * ttiNorm).toFixed(2));

      return { 
        ...row, 
        'Tiempo de tránsito del Transporte Internacional (TTI)': calcularTtiParaFila(row.Paises),
        idlNorm, 
        ccpNorm, 
        ttiNorm, 
        costoTotal,
        __tieneNulos: tieneNulosOIncompletos
      };
    });

    procesada.sort((a, b) => {
      if (a.__tieneNulos !== b.__tieneNulos) {
        return a.__tieneNulos ? 1 : -1;
      }
      if (!a.__tieneNulos && !b.__tieneNulos) {
        return b.costoTotal - a.costoTotal;
      }
      return a.Paises.localeCompare(b.Paises);
    });

    return procesada;
  }, [tablaLogi, calcularTtiParaFila, MIN_TTI]);

  // Emitir datos actualizados al componente principal
  useEffect(() => {
    if (onDatosActualizados && tablaProcesadaFinal.length > 0) {
      onDatosActualizados(tablaProcesadaFinal);
    }
  }, [tablaProcesadaFinal, onDatosActualizados]);

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

    const formatoDias = `${resultado.dias.toFixed(2)} días`;

    setResultadoTti({
      distancia: `${Math.round(resultado.distancia).toLocaleString()} nm`,
      tiempo: formatoDias
    });

    const filaTabla = tablaLogi.find(item => normalizarTexto(item.Paises) === normalizarTexto(paisLlegadaCalc));
    const nombrePaisReal = filaTabla ? filaTabla.Paises : paisLlegadaCalc;

    setResultadoManualFijado({
      pais: nombrePaisReal,
      ttiFormateado: formatoDias
    });
  };

  const limpiarCalcularManual = () => {
    setResultadoManualFijado(null);
  };

  return (
    <div className="space-y-8 text-slate-100 font-sans">
      
      {/* HEADER */}
      <div className="border-b border-[#1b1f2e] pb-3 flex flex-col md:flex-row justify-between items-start md:items-center gap-2">
        <div>
          <h2 className="text-xl font-bold text-white">2. Logística (LOGI)</h2>
          <p className="text-xs text-slate-400 mt-1">
            Producto activo: <strong className="text-white">{productoActivo ? (productoActivo.nombre || productoActivo) : 'Ninguno'}</strong> | País Origen Actual: <strong className="text-indigo-400">{paisSalidaCalc}</strong>
          </p>
        </div>
      </div>

      {/* ================= CÁLCULO TTI (DESPLEGABLE) ================= */}
      <div className="bg-[#12141f] border border-[#1b1f2e] rounded-lg shadow-lg overflow-hidden">
        <button
          type="button"
          onClick={() => setMostrarCalculador(!mostrarCalculador)}
          className="w-full flex justify-between items-center p-4 bg-[#151824] hover:bg-[#1a1e2e] transition-colors text-left cursor-pointer"
        >
          <div className="flex items-center gap-2">
            <span className="text-sm font-bold text-white">Calcular Tiempo de Tránsito del Transporte Internacional (TTI)</span>
            {resultadoManualFijado && (
              <span className="text-[10px] bg-indigo-900/60 text-indigo-300 px-2 py-0.5 rounded border border-indigo-700/50">
                Manual activo
              </span>
            )}
          </div>
          <div className="flex items-center gap-3">
            <span className="text-xs text-slate-400">{mostrarCalculador ? 'Ocultar' : 'Mostrar'}</span>
            <span className={`transform transition-transform duration-200 text-slate-400 text-xs ${mostrarCalculador ? 'rotate-180' : ''}`}>
              ▼
            </span>
          </div>
        </button>

        {mostrarCalculador && (
          <div className="p-5 space-y-4 border-t border-[#1b1f2e]">
            <div className="flex justify-end">
              {resultadoManualFijado && (
                <button onClick={limpiarCalcularManual} className="text-[11px] text-indigo-400 hover:underline cursor-pointer">
                  ↺ Regresar a cálculo masivo automático
                </button>
              )}
            </div>

            <form onSubmit={handleCalcularTtiManual} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs text-slate-400 mb-1">País de salida (Sincronizado con Origen)</label>
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
        )}
      </div>

      {/* ================= TABLA LOGÍSTICA PRINCIPAL ================= */}
      <div className="space-y-2">
        <h3 className="text-base font-bold text-white">Tabla Logística (LOGI)</h3>
        <p className="text-xs text-slate-400">Indicadores logísticos registrados (IDL, CCP) y TTI calculado desde <span className="text-indigo-400">{paisSalidaCalc}</span>.</p>
        
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
                {tablaProcesadaFinal.map((row, index) => {
                  const ttiMostrado = row['Tiempo de tránsito del Transporte Internacional (TTI)'];
                  const idlVal = row['Índice de Desempeño Logístico (IDL)'];
                  const ccpVal = row['Calidad de las carreteras por país (CCP)'];
                  return (
                    <tr key={row.id || index} className="hover:bg-[#151824] transition-colors">
                      <td className="p-3 text-slate-500">{index + 1}</td>
                      <td className="p-3 font-medium text-white flex items-center gap-2">
                        {renderPaisConBandera ? renderPaisConBandera(row.Paises) : row.Paises}
                      </td>
                      <td className="p-3">{idlVal !== null && idlVal !== undefined ? idlVal : 'Sin datos'}</td>
                      <td className="p-3">{ccpVal !== null && ccpVal !== undefined ? ccpVal : 'Sin datos'}</td>
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

      {/* ================= TABLA NORMALIZADA ================= */}
      <div className="space-y-2 pt-4">
        <h3 className="text-base font-bold text-white">Tabla Normalizada (LOGI - Escala 0 a 10)</h3>
        <p className="text-xs text-slate-400">Valores normalizados de IDL, CCP y TTI para la ponderación multicriterio.</p>
        
        {cargando ? (
          <div className="p-4 text-xs text-slate-400 italic">Cargando datos normalizados...</div>
        ) : (
          <div className="overflow-x-auto max-h-[380px] overflow-y-auto border border-[#1b1f2e] rounded-lg shadow-lg">
            <table className="w-full text-left text-xs text-slate-300 relative">
              <thead className="bg-[#151824] text-slate-400 uppercase text-[10px] tracking-wider border-b border-[#1b1f2e] sticky top-0 z-10">
                <tr>
                  <th className="p-3 w-12 bg-[#151824]">#</th>
                  <th className="p-3 bg-[#151824]">País</th>
                  <th className="p-3 bg-[#151824]">IDL Normalizado (A3*IDL/Max)</th>
                  <th className="p-3 bg-[#151824]">CCP Normalizado (Logarítmico)</th>
                  <th className="p-3 bg-[#151824]">TTI Normalizado (A3*Min/TTI)</th>
                  <th className="p-3 bg-[#151824] text-indigo-400">Ponderación Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#1b1f2e]/60 bg-[#10121b]">
                {tablaProcesadaFinal.map((row, index) => {
                  return (
                    <tr key={row.id || index} className="hover:bg-[#151824] transition-colors">
                      <td className="p-3 text-slate-500">{index + 1}</td>
                      <td className="p-3 font-medium text-white flex items-center gap-2">
                        {renderPaisConBandera ? renderPaisConBandera(row.Paises) : row.Paises}
                      </td>
                      <td className="p-3 text-slate-300">{row.idlNorm !== null ? row.idlNorm : '-'}</td>
                      <td className="p-3 text-slate-300">{row.ccpNorm !== null ? row.ccpNorm : '-'}</td>
                      <td className="p-3 text-slate-300">{row.ttiNorm !== null ? row.ttiNorm : '-'}</td>
                      <td className="p-3 font-bold text-indigo-400">{row.costoTotal !== null ? row.costoTotal : '-'}</td>
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
import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';

export default function TabTablaTotal({ paisesDestino, paisOrigen }) {
  const [datosTotales, setDatosTotales] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [errorNotif, setErrorNotif] = useState(null);

  // Ponderaciones iniciales por categoría (Suman 100%)
  const [pesosCat, setPesosCat] = useState({
    COST: 20,
    LOGI: 20,
    COMM: 15,
    ECON: 15,
    POLI: 15,
    CULT: 15
  });

  const handlePesoChange = (cat, valor) => {
    setPesosCat(prev => ({
      ...prev,
      [cat]: parseFloat(valor) || 0
    }));
  };

  const sumaPesos = Object.values(pesosCat).reduce((acc, val) => acc + val, 0);

  useEffect(() => {
    async function cargarYProcesarTablas() {
      setCargando(true);
      try {
        // Cargar en paralelo todas las fuentes de datos y tablas normalizadas desde Supabase
        const [
          resCostos,
          resLogistica,
          resComercio,
          resEconomia,
          resPolitica,
          resCultura,
          resPaises
        ] = await Promise.all([
          supabase.from("costos").select("*").range(0, 999),
          supabase.from("logistica").select("*").range(0, 999),
          supabase.from("comercio").select("*").range(0, 999),
          supabase.from("economia").select("*").range(0, 999),
          supabase.from("politica").select("*").range(0, 999),
          supabase.from("indiceglobalizacion").select("*").range(0, 999),
          supabase.from("paises").select("*").order("nombre")
        ]);

        const mapaPaises = {};

        // Inicializar con todos los países del catálogo maestro
        resPaises.data?.forEach(p => {
          const nombre = (p.nombre || "").trim();
          if (nombre) {
            mapaPaises[nombre] = {
              Paises: nombre,
              "1. Cost (COST)": null,
              "2. Logistical (LOGI)": null,
              "3. Commercial (COMM)": null,
              "4. Economic (ECON)": null,
              "5. Political (POLI)": null,
              "6. Cultura (CULT)": null
            };
          }
        });

        // Función auxiliar genérica para extraer y normalizar el valor cuantitativo de cada registro de pestaña
        const extraerValor = (row) => {
          const camposPosibles = [
            'costo_normalizado', 'logistica_normalizada', 'comercio_normalizado',
            'economia_normalizada', 'politica_normalizada', 'indice_globalizacion',
            'valor_normalizado', 'puntaje', 'score', 'valor'
          ];
          for (let campo of camposPosibles) {
            if (row[campo] !== undefined && row[campo] !== null && !isNaN(row[campo])) {
              return Number(row[campo]);
            }
          }
          return null;
        };

        // 1. Procesar COST (Tab Costo)
        resCostos.data?.forEach(row => {
          const pais = (row.pais || row.Paises || row.nombre || "").trim();
          if (pais && mapaPaises[pais]) {
            const val = extraerValor(row);
            if (val !== null) mapaPaises[pais]["1. Cost (COST)"] = val;
          }
        });

        // 2. Procesar LOGI (Tab Logística)
        resLogistica.data?.forEach(row => {
          const pais = (row.pais || row.Paises || row.nombre || "").trim();
          if (pais && mapaPaises[pais]) {
            const val = extraerValor(row);
            if (val !== null) mapaPaises[pais]["2. Logistical (LOGI)"] = val;
          }
        });

        // 3. Procesar COMM (Tab Comercial)
        resComercio.data?.forEach(row => {
          const pais = (row.pais || row.Paises || row.nombre || "").trim();
          if (pais && mapaPaises[pais]) {
            const val = extraerValor(row);
            if (val !== null) mapaPaises[pais]["3. Commercial (COMM)"] = val;
          }
        });

        // 4. Procesar ECON (Tab Economía)
        resEconomia.data?.forEach(row => {
          const pais = (row.pais || row.Paises || row.nombre || "").trim();
          if (pais && mapaPaises[pais]) {
            const val = extraerValor(row);
            if (val !== null) mapaPaises[pais]["4. Economic (ECON)"] = val;
          }
        });

        // 5. Procesar POLI (Tab Política)
        resPolitica.data?.forEach(row => {
          const pais = (row.pais || row.Paises || row.nombre || "").trim();
          if (pais && mapaPaises[pais]) {
            const val = extraerValor(row);
            if (val !== null) mapaPaises[pais]["5. Political (POLI)"] = val;
          }
        });

        // 6. Procesar CULT (Tab Cultura)
        resCultura.data?.forEach(row => {
          const pais = (row.pais || row.Paises || row.nombre || "").trim();
          if (pais && mapaPaises[pais]) {
            const val = extraerValor(row);
            if (val !== null) mapaPaises[pais]["6. Cultura (CULT)"] = val;
          }
        });

        // Filtrar aquellos países que contengan datos en todas las pestañas normalizadas
        let lista = Object.values(mapaPaises).filter(item => {
          const completo = 
            item["1. Cost (COST)"] !== null &&
            item["2. Logistical (LOGI)"] !== null &&
            item["3. Commercial (COMM)"] !== null &&
            item["4. Economic (ECON)"] !== null &&
            item["5. Political (POLI)"] !== null &&
            item["6. Cultura (CULT)"] !== null;

          if (!completo) return false;

          // Si hay países destino seleccionados en la app, filtrar de acuerdo a ellos
          if (paisesDestino && paisesDestino.length > 0) {
            return paisesDestino.some(p => p.toLowerCase().trim() === item.Paises.toLowerCase().trim());
          }
          return true;
        });

        setDatosTotales(lista);
        setErrorNotif(null);
      } catch (err) {
        console.error("Error al sincronizar las tablas totales:", err);
        setErrorNotif("Hubo un problema al consolidar las métricas de las pestañas.");
      } finally {
        setCargando(false);
      }
    }

    cargarYProcesarTablas();
  }, [paisesDestino]);

  // Cálculo dinámico del puntaje global ponderado IMSFE
  const datosCalculados = datosTotales.map(item => {
    const puntajeBruto = (
      (item["1. Cost (COST)"] * (pesosCat.COST / 100)) +
      (item["2. Logistical (LOGI)"] * (pesosCat.LOGI / 100)) +
      (item["3. Commercial (COMM)"] * (pesosCat.COMM / 100)) +
      (item["4. Economic (ECON)"] * (pesosCat.ECON / 100)) +
      (item["5. Political (POLI)"] * (pesosCat.POLI / 100)) +
      (item["6. Cultura (CULT)"] * (pesosCat.CULT / 100))
    );

    const puntajeClampeado = Math.min(Math.max(puntajeBruto, 0), 10);

    return {
      ...item,
      "Puntaje Global – TOTAL": Number(puntajeClampeado.toFixed(2))
    };
  }).sort((a, b) => b["Puntaje Global – TOTAL"] - a["Puntaje Global – TOTAL"]);

  const totalPaisesBase = datosTotales.length;
  const paisesIncluidos = datosCalculados.length;
  const paisesExcluidos = Math.max(0, totalPaisesBase - paisesIncluidos);

  return (
    <div className="space-y-8 text-slate-100 font-sans">
      
      {/* ENCABEZADO */}
      <div className="bg-[#181a20] p-6 rounded-xl border border-slate-800 shadow-sm">
        <span className="text-xs uppercase tracking-wider text-red-400 font-semibold">Módulo de Consolidación Global</span>
        <h2 className="text-2xl font-bold text-white mt-1">Visualización de Tablas Totales y Normalizadas</h2>
        <p className="text-xs text-slate-400 mt-1">
          Origen actual: <span className="text-white font-medium">{paisOrigen}</span> | Cruce integral de las 6 pestañas de análisis estratégico (Costo, Logística, Comercial, Economía, Política y Cultura).
        </p>
      </div>

      {/* AJUSTE MANUAL DE PONDERACIONES (GRID 2x3) */}
      <div className="bg-[#181a20] border border-slate-800 rounded-xl p-6 space-y-4 shadow-sm">
        <div>
          <h3 className="text-base font-bold text-white">Ajuste manual de ponderaciones (IMSFE)</h3>
          <p className="text-xs text-slate-400 mt-1">Personaliza el peso porcentual de cada categoría. El acumulado debe sumar exactamente 100%.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[
            { label: "COST (%)", cat: "COST" },
            { label: "COMM (%)", cat: "COMM" },
            { label: "POLI (%)", cat: "POLI" },
            { label: "LOGI (%)", cat: "LOGI" },
            { label: "ECON (%)", cat: "ECON" },
            { label: "CULT (%)", cat: "CULT" }
          ].map(({ label, cat }) => (
            <div key={cat} className="bg-[#12141a] p-4 rounded-lg border border-slate-800 space-y-2">
              <label className="block text-xs font-semibold text-slate-300">{label}</label>
              <div className="flex items-center justify-between bg-[#0e1117] border border-slate-700 rounded px-3 py-1.5">
                <input
                  type="number"
                  step="any"
                  value={pesosCat[cat]}
                  onChange={(e) => handlePesoChange(cat, e.target.value)}
                  className="w-full bg-transparent text-xs text-slate-200 focus:outline-none"
                />
                <div className="flex items-center gap-2 text-slate-400 text-xs font-bold">
                  <button onClick={() => handlePesoChange(cat, pesosCat[cat] - 1)} className="hover:text-white cursor-pointer">−</button>
                  <button onClick={() => handlePesoChange(cat, pesosCat[cat] + 1)} className="hover:text-white cursor-pointer">+</button>
                </div>
              </div>
            </div>
          ))}
        </div>

        {sumaPesos !== 100 ? (
          <div className="bg-red-950/40 border border-red-900/50 p-2.5 rounded text-xs text-red-400">
            La suma actual de las ponderaciones es {sumaPesos}%. Debe ser exactamente 100%.
          </div>
        ) : (
          <div className="bg-emerald-950/40 border border-emerald-900/50 p-2.5 rounded text-xs text-emerald-400">
            La suma es 100%. Ponderaciones aplicadas correctamente.
          </div>
        )}
      </div>

      {errorNotif && (
        <div className="bg-red-950/40 border border-red-900/50 p-3 rounded text-xs text-red-400">
          {errorNotif}
        </div>
      )}

      {/* TABLA GENERAL DE EVALUACIÓN CONSOLIDADA */}
      <div className="bg-[#181a20] border border-slate-800 rounded-xl p-6 space-y-4 shadow-sm">
        <div>
          <h3 className="text-lg font-bold text-white">Tabla General de Evaluación de Países (Datos Normalizados de Todas las Tabs)</h3>
          <p className="text-xs text-slate-400 mt-1 whitespace-pre-line">
            {`Países incluidos con datos completos en las 6 pestañas: ${paisesIncluidos} / ${totalPaisesBase} totales\n` +
             `Países excluidos: ${paisesExcluidos}\n` +
             `Pesos aplicados: COST=${pesosCat.COST}%, LOGI=${pesosCat.LOGI}%, COMM=${pesosCat.COMM}%, ECON=${pesosCat.ECON}%, POLI=${pesosCat.POLI}%, CULT=${pesosCat.CULT}%`}
          </p>
        </div>

        {cargando ? (
          <div className="py-12 text-center text-xs text-slate-400">
            Cargando y cruzando las métricas normalizadas de cada pestaña...
          </div>
        ) : datosCalculados.length === 0 ? (
          <div className="py-12 text-center text-xs text-slate-400">
            No se encontraron países con registros normalizados disponibles en las 6 pestañas simultáneamente.
          </div>
        ) : (
          <div className="overflow-x-auto max-h-[550px] overflow-y-auto">
            <table className="w-full text-left text-xs text-slate-300 border-collapse">
              <thead className="bg-[#12141a] text-slate-200 uppercase text-[10px] tracking-wider border-b border-slate-800 sticky top-0 z-10">
                <tr>
                  <th className="p-3">#</th>
                  <th className="p-3">Países</th>
                  <th className="p-3">1. Cost (COST)</th>
                  <th className="p-3">2. Logistical (LOGI)</th>
                  <th className="p-3">3. Commercial (COMM)</th>
                  <th className="p-3">4. Economic (ECON)</th>
                  <th className="p-3">5. Political (POLI)</th>
                  <th className="p-3">6. Cultura (CULT)</th>
                  <th className="p-3 font-bold text-red-400">Puntaje Global – TOTAL</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {datosCalculados.map((item, index) => (
                  <tr key={index} className="hover:bg-slate-900/50 transition-colors">
                    <td className="p-3 text-slate-500">{index + 1}</td>
                    <td className="p-3 font-medium text-white">{item.Paises}</td>
                    <td className="p-3">{item["1. Cost (COST)"] !== null ? Number(item["1. Cost (COST)"]).toFixed(2) : '-'}</td>
                    <td className="p-3">{item["2. Logistical (LOGI)"] !== null ? Number(item["2. Logistical (LOGI)"]).toFixed(2) : '-'}</td>
                    <td className="p-3">{item["3. Commercial (COMM)"] !== null ? Number(item["3. Commercial (COMM)"]).toFixed(2) : '-'}</td>
                    <td className="p-3">{item["4. Economic (ECON)"] !== null ? Number(item["4. Economic (ECON)"]).toFixed(2) : '-'}</td>
                    <td className="p-3">{item["5. Political (POLI)"] !== null ? Number(item["5. Political (POLI)"]).toFixed(2) : '-'}</td>
                    <td className="p-3">{item["6. Cultura (CULT)"] !== null ? Number(item["6. Cultura (CULT)"]).toFixed(2) : '-'}</td>
                    <td className="p-3 font-bold text-red-400 bg-red-950/10">{item["Puntaje Global – TOTAL"]}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

    </div>
  );
}
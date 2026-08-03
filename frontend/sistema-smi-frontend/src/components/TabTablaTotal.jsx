import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';

export default function TabTablaTotal({ paisesDestino, paisOrigen }) {
  const [datosTotales, setDatosTotales] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [errorNotif, setErrorNotif] = useState(null);

  // Ponderaciones iniciales por categoría (7 categorías, suman 100%)
  const [pesosCat, setPesosCat] = useState({
    COST: 15,
    LOGI: 15,
    COMM: 15,
    ECON: 15,
    POLI: 15,
    CULT: 15,
    SUST: 10
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
        const [
          resCostos,
          resLogistica,
          resComercio,
          resEconomia,
          resPolitica,
          resCultura,
          resEmisiones,
          resIsg,
          resPaises
        ] = await Promise.all([
          supabase.from("costos").select("*").range(0, 9999),
          supabase.from("logistica").select("*").range(0, 9999),
          supabase.from("comercio").select("*").range(0, 9999),
          supabase.from("economia").select("*").range(0, 9999),
          supabase.from("politica").select("*").range(0, 9999),
          supabase.from("indiceglobalizacion").select("*").range(0, 9999),
          supabase.from("emisiones_carbono").select("*").range(0, 9999),
          supabase.from("indice_sostenibilidad_global").select("*").range(0, 9999),
          supabase.from("paises").select("*").order("nombre")
        ]);

        const mapaPaises = {};

        resPaises.data?.forEach(p => {
          const nombre = (p.nombre || p.pais || p.country || "").trim();
          if (nombre) {
            mapaPaises[nombre.toLowerCase()] = {
              Paises: nombre,
              "1. Cost (COST)": null,
              "2. Logistical (LOGI)": null,
              "3. Commercial (COMM)": null,
              "4. Economic (ECON)": null,
              "5. Political (POLI)": null,
              "6. Cultura (CULT)": null,
              "7. Sostenibilidad (SUST)": null,
              rawEdc: null,
              rawIsg: null
            };
          }
        });

        const extraerValorEspecifico = (row, posiblesCampos, escala100 = false) => {
          if (!row) return null;
          for (let campo of posiblesCampos) {
            if (row[campo] !== undefined && row[campo] !== null && !isNaN(row[campo])) {
              const val = Number(row[campo]);
              // Si viene en escala 0-100 y supera 10, lo convertimos a 0-10
              return escala100 && val > 10 ? val / 10 : val;
            }
          }
          return null;
        };

        const procesarDataset = (data, claveMetrica, camposPosibles, escala100 = false) => {
          data?.forEach(row => {
            const nombrePais = (row.pais || row.Paises || row.nombre || row.country || "").trim();
            if (!nombrePais) return;
            const keyMap = nombrePais.toLowerCase();

            if (!mapaPaises[keyMap]) {
              mapaPaises[keyMap] = {
                Paises: nombrePais,
                "1. Cost (COST)": null,
                "2. Logistical (LOGI)": null,
                "3. Commercial (COMM)": null,
                "4. Economic (ECON)": null,
                "5. Political (POLI)": null,
                "6. Cultura (CULT)": null,
                "7. Sostenibilidad (SUST)": null,
                rawEdc: null,
                rawIsg: null
              };
            }

            const val = extraerValorEspecifico(row, camposPosibles, escala100);
            if (val !== null) {
              mapaPaises[keyMap][claveMetrica] = val;
            }
          });
        };

        // Asignación directa de campos normalizados específicos por tabla
        procesarDataset(resCostos.data, "1. Cost (COST)", ['costo_normalizado', 'costo', 'valor_normalizado', 'puntaje', 'score', 'valor']);
        procesarDataset(resLogistica.data, "2. Logistical (LOGI)", ['logistica_normalizada', 'logistica', 'valor_normalizado', 'puntaje', 'score', 'valor']);
        procesarDataset(resComercio.data, "3. Commercial (COMM)", ['comercio_normalizado', 'comercio', 'valor_normalizado', 'puntaje', 'score', 'valor']);
        procesarDataset(resEconomia.data, "4. Economic (ECON)", ['economia_normalizada', 'economia', 'valor_normalizado', 'puntaje', 'score', 'valor']);
        procesarDataset(resPolitica.data, "5. Political (POLI)", ['politica_normalizada', 'politica', 'valor_normalizado', 'puntaje', 'score', 'valor']);
        procesarDataset(resCultura.data, "6. Cultura (CULT)", ['indice_globalizacion', 'cultura', 'valor_normalizado', 'puntaje', 'score', 'indiceglobalizacion', 'valor'], true);

        // Procesamiento específico para Sostenibilidad
        resEmisiones.data?.forEach(row => {
          const pais = (row.pais || row.nombre || row.country || "").trim().toLowerCase();
          if (pais && mapaPaises[pais]) {
            const val = Number(row.emisionescarbono ?? row.edc ?? row.valor);
            if (!isNaN(val)) mapaPaises[pais].rawEdc = val;
          }
        });

        resIsg.data?.forEach(row => {
          const pais = (row.pais || row.nombre || row.country || "").trim().toLowerCase();
          if (pais && mapaPaises[pais]) {
            const val = Number(row.indicesostenibilidaglobal ?? row.isg ?? row.valor);
            if (!isNaN(val)) mapaPaises[pais].rawIsg = val;
          }
        });

        const allItems = Object.values(mapaPaises);
        const edcVals = allItems.map(i => i.rawEdc).filter(v => v !== null && v > 0);
        const isgVals = allItems.map(i => i.rawIsg).filter(v => v !== null && v > 0);
        const minEdc = edcVals.length > 0 ? Math.min(...edcVals) : null;
        const maxIsg = isgVals.length > 0 ? Math.max(...isgVals) : null;

        allItems.forEach(item => {
          let sustVal = null;
          if (item.rawEdc !== null && item.rawIsg !== null && minEdc && maxIsg) {
            const edcNorm = (10 * minEdc) / item.rawEdc;
            const isgNorm = (10 * item.rawIsg) / maxIsg;
            sustVal = Number(((edcNorm * 0.3) + (isgNorm * 0.7)).toFixed(2));
          }
          item["7. Sostenibilidad (SUST)"] = sustVal;
        });

        // Limpieza final y filtro por países destino si aplica
        let lista = allItems.map(item => ({
          ...item,
          "1. Cost (COST)": item["1. Cost (COST)"] !== null ? item["1. Cost (COST)"] : 5.0,
          "2. Logistical (LOGI)": item["2. Logistical (LOGI)"] !== null ? item["2. Logistical (LOGI)"] : 5.0,
          "3. Commercial (COMM)": item["3. Commercial (COMM)"] !== null ? item["3. Commercial (COMM)"] : 5.0,
          "4. Economic (ECON)": item["4. Economic (ECON)"] !== null ? item["4. Economic (ECON)"] : 5.0,
          "5. Political (POLI)": item["5. Political (POLI)"] !== null ? item["5. Political (POLI)"] : 5.0,
          "6. Cultura (CULT)": item["6. Cultura (CULT)"] !== null ? item["6. Cultura (CULT)"] : 5.0,
          "7. Sostenibilidad (SUST)": item["7. Sostenibilidad (SUST)"] !== null ? item["7. Sostenibilidad (SUST)"] : 5.0,
        })).filter(item => {
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

  const datosCalculados = datosTotales.map(item => {
    const puntajeBruto = (
      (item["1. Cost (COST)"] * (pesosCat.COST / 100)) +
      (item["2. Logistical (LOGI)"] * (pesosCat.LOGI / 100)) +
      (item["3. Commercial (COMM)"] * (pesosCat.COMM / 100)) +
      (item["4. Economic (ECON)"] * (pesosCat.ECON / 100)) +
      (item["5. Political (POLI)"] * (pesosCat.POLI / 100)) +
      (item["6. Cultura (CULT)"] * (pesosCat.CULT / 100)) +
      (item["7. Sostenibilidad (SUST)"] * (pesosCat.SUST / 100))
    );

    const puntajeClampeado = Math.min(Math.max(puntajeBruto, 0), 10);

    return {
      ...item,
      "Puntaje Global – TOTAL": Number(puntajeClampeado.toFixed(2))
    };
  }).sort((a, b) => b["Puntaje Global – TOTAL"] - a["Puntaje Global – TOTAL"]);

  const totalPaisesBase = datosTotales.length;
  const paisesIncluidos = datosCalculados.length;

  return (
    <div className="space-y-8 text-slate-100 font-sans">
      
      {/* ENCABEZADO */}
      <div className="bg-[#181a20] p-6 rounded-xl border border-slate-800 shadow-sm">
        <span className="text-xs uppercase tracking-wider text-red-400 font-semibold">Módulo de Consolidación Global</span>
        <h2 className="text-2xl font-bold text-white mt-1">Visualización de Tablas Totales y Normalizadas</h2>
        <p className="text-xs text-slate-400 mt-1">
          Origen actual: <span className="text-white font-medium">{paisOrigen}</span> | Cruce integral de las 7 pestañas de análisis estratégico.
        </p>
      </div>

      {/* AJUSTE MANUAL DE PONDERACIONES */}
      <div className="bg-[#181a20] border border-slate-800 rounded-xl p-6 space-y-4 shadow-sm">
        <div>
          <h3 className="text-base font-bold text-white">Ajuste manual de ponderaciones (IMSFE)</h3>
          <p className="text-xs text-slate-400 mt-1">Personaliza el peso porcentual de cada categoría. El acumulado debe sumar exactamente 100%.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[
            { label: "COST (%)", cat: "COST" },
            { label: "COMM (%)", cat: "COMM" },
            { label: "POLI (%)", cat: "POLI" },
            { label: "LOGI (%)", cat: "LOGI" },
            { label: "ECON (%)", cat: "ECON" },
            { label: "CULT (%)", cat: "CULT" },
            { label: "SUST (%)", cat: "SUST" }
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

      {/* TABLA 1: TABLA GENERAL DE EVALUACIÓN CONSOLIDADA */}
      <div className="bg-[#181a20] border border-slate-800 rounded-xl p-6 space-y-4 shadow-sm">
        <div>
          <h3 className="text-lg font-bold text-white">Tabla General de Evaluación de Países (Datos Normalizados de Todas las Tabs)</h3>
          <p className="text-xs text-slate-400 mt-1 whitespace-pre-line">
            {`Países incluidos en el análisis global: ${paisesIncluidos} / ${totalPaisesBase} totales\n` +
             `Pesos aplicados: COST=${pesosCat.COST}%, LOGI=${pesosCat.LOGI}%, COMM=${pesosCat.COMM}%, ECON=${pesosCat.ECON}%, POLI=${pesosCat.POLI}%, CULT=${pesosCat.CULT}%, SUST=${pesosCat.SUST}%`}
          </p>
        </div>

        {cargando ? (
          <div className="py-12 text-center text-xs text-slate-400">
            Cargando y consolidando las métricas normalizadas de cada pestaña...
          </div>
        ) : datosCalculados.length === 0 ? (
          <div className="py-12 text-center text-xs text-slate-400">
            No se encontraron países disponibles para mostrar en la tabla consolidada.
          </div>
        ) : (
          <div className="overflow-x-auto max-h-[550px] overflow-y-auto">
            <table className="w-full text-left text-xs text-slate-300 border-collapse">
              <thead className="bg-[#12141a] text-slate-200 uppercase text-[10px] tracking-wider border-b border-slate-800 sticky top-0 z-10">
                <tr>
                  <th className="p-3">#</th>
                  <th className="p-3">Países</th>
                  <th className="p-3">1. Cost</th>
                  <th className="p-3">2. Logistical</th>
                  <th className="p-3">3. Commercial</th>
                  <th className="p-3">4. Economic</th>
                  <th className="p-3">5. Political</th>
                  <th className="p-3">6. Cultura</th>
                  <th className="p-3">7. Sostenibilidad</th>
                  <th className="p-3 font-bold text-red-400">Puntaje Global – TOTAL</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {datosCalculados.map((item, index) => (
                  <tr key={index} className="hover:bg-slate-900/50 transition-colors">
                    <td className="p-3 text-slate-500">{index + 1}</td>
                    <td className="p-3 font-medium text-white">{item.Paises}</td>
                    <td className="p-3">{Number(item["1. Cost (COST)"]).toFixed(2)}</td>
                    <td className="p-3">{Number(item["2. Logistical (LOGI)"]).toFixed(2)}</td>
                    <td className="p-3">{Number(item["3. Commercial (COMM)"]).toFixed(2)}</td>
                    <td className="p-3">{Number(item["4. Economic (ECON)"]).toFixed(2)}</td>
                    <td className="p-3">{Number(item["5. Political (POLI)"]).toFixed(2)}</td>
                    <td className="p-3">{Number(item["6. Cultura (CULT)"]).toFixed(2)}</td>
                    <td className="p-3">{Number(item["7. Sostenibilidad (SUST)"]).toFixed(2)}</td>
                    <td className="p-3 font-bold text-red-400 bg-red-950/10">{item["Puntaje Global – TOTAL"]}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* TABLA 2: TABLA RESUMEN — PUNTAJE PONDERADO TOTAL */}
      <div className="bg-[#181a20] border border-slate-800 rounded-xl p-6 space-y-4 shadow-sm">
        <div>
          <h3 className="text-lg font-bold text-white">Tabla Resumen — Puntaje Ponderado Total</h3>
          <p className="text-xs text-slate-400 mt-1">
            Ranking general ordenado por el puntaje ponderado global de los mejores mercados destino.
          </p>
        </div>

        {cargando ? (
          <div className="py-8 text-center text-xs text-slate-400">
            Generando resumen de ranking...
          </div>
        ) : datosCalculados.length === 0 ? (
          <div className="py-8 text-center text-xs text-slate-400">
            No hay datos suficientes para mostrar el resumen.
          </div>
        ) : (
          <div className="overflow-x-auto max-h-[400px] overflow-y-auto">
            <table className="w-full text-left text-xs text-slate-300 border-collapse">
              <thead className="bg-[#12141a] text-slate-200 uppercase text-[10px] tracking-wider border-b border-slate-800 sticky top-0 z-10">
                <tr>
                  <th className="p-3 w-16">Ranking</th>
                  <th className="p-3">País</th>
                  <th className="p-3 text-right">Ponderado Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {datosCalculados.map((item, index) => (
                  <tr key={index} className="hover:bg-slate-900/50 transition-colors">
                    <td className="p-3 text-slate-400 font-bold">{index + 1}</td>
                    <td className="p-3 font-medium text-white">{item.Paises}</td>
                    <td className="p-3 text-right font-bold text-red-400">{item["Puntaje Global – TOTAL"]}</td>
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
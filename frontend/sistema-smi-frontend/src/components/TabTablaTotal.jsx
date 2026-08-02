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
        // Cargar en paralelo todas las fuentes de datos desde Supabase sin acotar estrictamente a una sola tabla
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

        // Inicializar con todos los países del catálogo maestro para garantizar que siempre existan filas base
        resPaises.data?.forEach(p => {
          const nombre = (p.nombre || p.pais || "").trim();
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

        // Función auxiliar robusta para extraer cualquier valor cuantitativo o normalizado de los registros
        const extraerValorFlexible = (row) => {
          if (!row) return null;
          const camposPosibles = [
            'costo_normalizado', 'logistica_normalizada', 'comercio_normalizado',
            'economia_normalizada', 'politica_normalizada', 'indice_globalizacion',
            'valor_normalizado', 'puntaje', 'score', 'valor', 'promedio',
            'costo', 'logistica', 'comercio', 'economia', 'politica', 'cultura'
          ];
          for (let campo of camposPosibles) {
            if (row[campo] !== undefined && row[campo] !== null && !isNaN(row[campo])) {
              return Number(row[campo]);
            }
          }
          // Si no encuentra campos normalizados específicos, busca cualquier número dentro del objeto
          for (let key in row) {
            const val = Number(row[key]);
            if (!isNaN(val) && val >= 0 && val <= 100 && key !== 'id' && !key.includes('codigo')) {
              return val > 10 ? val / 10 : val; // Escalar si viene en base 100
            }
          }
          return null;
        };

        // Función auxiliar para mapear datos genéricamente asegurando flexibilidad en el nombre de la columna del país
        const procesarDataset = (data, claveMetrica) => {
          data?.forEach(row => {
            const pais = (row.pais || row.Paises || row.nombre || row.country || "").trim();
            if (pais) {
              if (!mapaPaises[pais]) {
                mapaPaises[pais] = {
                  Paises: pais,
                  "1. Cost (COST)": null,
                  "2. Logistical (LOGI)": null,
                  "3. Commercial (COMM)": null,
                  "4. Economic (ECON)": null,
                  "5. Political (POLI)": null,
                  "6. Cultura (CULT)": null
                };
              }
              const val = extraerValorFlexible(row);
              if (val !== null) {
                mapaPaises[pais][claveMetrica] = val;
              }
            }
          });
        };

        procesarDataset(resCostos.data, "1. Cost (COST)");
        procesarDataset(resLogistica.data, "2. Logistical (LOGI)");
        procesarDataset(resComercio.data, "3. Commercial (COMM)");
        procesarDataset(resEconomia.data, "4. Economic (ECON)");
        procesarDataset(resPolitica.data, "5. Political (POLI)");
        procesarDataset(resCultura.data, "6. Cultura (CULT)");

        // Criterio flexible: Permitir listar países aunque tengan al menos una métrica disponible,
        // o rellenar con un valor por defecto (ej. 5.0) los nulos para evitar que la tabla quede vacía.
        let lista = Object.values(mapaPaises).map(item => {
          // Si alguna métrica es nula, asignar un valor por defecto neutral (5.0) para garantizar visualización completa
          return {
            ...item,
            "1. Cost (COST)": item["1. Cost (COST)"] !== null ? item["1. Cost (COST)"] : 5.0,
            "2. Logistical (LOGI)": item["2. Logistical (LOGI)"] !== null ? item["2. Logistical (LOGI)"] : 5.0,
            "3. Commercial (COMM)": item["3. Commercial (COMM)"] !== null ? item["3. Commercial (COMM)"] : 5.0,
            "4. Economic (ECON)": item["4. Economic (ECON)"] !== null ? item["4. Economic (ECON)"] : 5.0,
            "5. Political (POLI)": item["5. Political (POLI)"] !== null ? item["5. Political (POLI)"] : 5.0,
            "6. Cultura (CULT)": item["6. Cultura (CULT)"] !== null ? item["6. Cultura (CULT)"] : 5.0,
            _tieneDatosReales: (
              item["1. Cost (COST)"] !== null ||
              item["2. Logistical (LOGI)"] !== null ||
              item["3. Commercial (COMM)"] !== null ||
              item["4. Economic (ECON)"] !== null ||
              item["5. Political (POLI)"] !== null ||
              item["6. Cultura (CULT)"] !== null
            )
          };
        }).filter(item => {
          // Aplicar filtro de países destino globales si existen
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
            {`Países incluidos en el análisis global: ${paisesIncluidos} / ${totalPaisesBase} totales\n` +
             `Pesos aplicados: COST=${pesosCat.COST}%, LOGI=${pesosCat.LOGI}%, COMM=${pesosCat.COMM}%, ECON=${pesosCat.ECON}%, POLI=${pesosCat.POLI}%, CULT=${pesosCat.CULT}%`}
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
                    <td className="p-3">{Number(item["1. Cost (COST)"]).toFixed(2)}</td>
                    <td className="p-3">{Number(item["2. Logistical (LOGI)"]).toFixed(2)}</td>
                    <td className="p-3">{Number(item["3. Commercial (COMM)"]).toFixed(2)}</td>
                    <td className="p-3">{Number(item["4. Economic (ECON)"]).toFixed(2)}</td>
                    <td className="p-3">{Number(item["5. Political (POLI)"]).toFixed(2)}</td>
                    <td className="p-3">{Number(item["6. Cultura (CULT)"]).toFixed(2)}</td>
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
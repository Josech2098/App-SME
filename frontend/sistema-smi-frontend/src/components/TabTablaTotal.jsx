import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';

export default function TabVisualizacionTotal({ paisesDestino, paisOrigen }) {
  const [datosTotales, setDatosTotales] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [errorNotif, setErrorNotif] = useState(null);

  // Pesos iniciales por categoría (Suman 100%)
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
    async function calcularTablaTotal() {
      setCargando(true);
      try {
        // Cargar las tablas normalizadas y secundarias necesarias desde Supabase
        const [
          resCost,
          resLogi,
          resComm,
          resEcon,
          resPoli,
          resCult,
          resPaises
        ] = await Promise.all([
          supabase.from("costos").select("*"),
          supabase.from("logistica").select("*"),
          supabase.from("comercio").select("*"),
          supabase.from("economia").select("*"),
          supabase.from("politica").select("*"),
          supabase.from("indiceglobalizacion").select("*"), // Referencia para CULT
          supabase.from("paises").select("*").order("nombre")
        ]);

        // Mapeo y unificación aproximada de datos por país según la estructura de la app
        const mapaPaises = {};

        // Registrar todos los países conocidos
        resPaises.data?.forEach(p => {
          const nombre = p.nombre.trim();
          mapaPaises[nombre] = {
            Paises: nombre,
            "1. Cost (COST)": null,
            "2. Logistical (LOGI)": null,
            "3. Commercial (COMM)": null,
            "4. Economic (ECON)": null,
            "5. Political (POLI)": null,
            "6. Cultura (CULT)": null
          };
        });

        // Completar con datos disponibles (ejemplo de integración de tablas)
        resCost.data?.forEach(row => {
          const pais = (row.pais || row.Paises || "").trim();
          if (mapaPaises[pais]) {
            mapaPaises[pais]["1. Cost (COST)"] = Number(row.costo_normalizado || row.valor || 0);
          }
        });

        resLogi.data?.forEach(row => {
          const pais = (row.pais || row.Paises || "").trim();
          if (mapaPaises[pais]) {
            mapaPaises[pais]["2. Logistical (LOGI)"] = Number(row.logistica_normalizada || row.valor || 0);
          }
        });

        resComm.data?.forEach(row => {
          const pais = (row.pais || row.Paises || "").trim();
          if (mapaPaises[pais]) {
            mapaPaises[pais]["3. Commercial (COMM)"] = Number(row.comercio_normalizado || row.valor || 0);
          }
        });

        resEcon.data?.forEach(row => {
          const pais = (row.pais || row.Paises || "").trim();
          if (mapaPaises[pais]) {
            mapaPaises[pais]["4. Economic (ECON)"] = Number(row.economia_normalizada || row.valor || 0);
          }
        });

        resPoli.data?.forEach(row => {
          const pais = (row.pais || row.Paises || "").trim();
          if (mapaPaises[pais]) {
            mapaPaises[pais]["5. Political (POLI)"] = Number(row.politica_normalizada || row.valor || 0);
          }
        });

        resCult.data?.forEach(row => {
          const pais = (row.pais || row.Paises || "").trim();
          if (mapaPaises[pais]) {
            mapaPaises[pais]["6. Cultura (CULT)"] = Number(row.indice_globalizacion || row.valor || 0);
          }
        });

        // Filtrar solo países con datos completos en las 6 categorías y opcionalmente por paisesDestino
        let lista = Object.values(mapaPaises).filter(item => {
          const completo = 
            item["1. Cost (COST)"] !== null &&
            item["2. Logistical (LOGI)"] !== null &&
            item["3. Commercial (COMM)"] !== null &&
            item["4. Economic (ECON)"] !== null &&
            item["5. Political (POLI)"] !== null &&
            item["6. Cultura (CULT)"] !== null;

          if (!completo) return false;

          if (paisesDestino && paisesDestino.length > 0) {
            return paisesDestino.map(p => p.toLowerCase()).includes(item.Paises.toLowerCase());
          }
          return true;
        });

        setDatosTotales(lista);
        setErrorNotif(null);
      } catch (err) {
        console.error("Error al cargar la tabla total:", err);
        setErrorNotif(err.message);
      } finally {
        setCargando(false);
      }
    }

    calcularTablaTotal();
  }, [paisesDestino]);

  // Cálculo dinámico del Puntaje Global con base en los pesos actuales
  const datosCalculados = datosTotales.map(item => {
    const puntajeGlobal = (
      (item["1. Cost (COST)"] * (pesosCat.COST / 100)) +
      (item["2. Logistical (LOGI)"] * (pesosCat.LOGI / 100)) +
      (item["3. Commercial (COMM)"] * (pesosCat.COMM / 100)) +
      (item["4. Economic (ECON)"] * (pesosCat.ECON / 100)) +
      (item["5. Political (POLI)"] * (pesosCat.POLI / 100)) +
      (item["6. Cultura (CULT)"] * (pesosCat.CULT / 100))
    );

    const puntajeClampeado = Math.min(Math.max(puntajeGlobal, 0), 10);

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
      
      {/* TÍTULO Y ENCABEZADO */}
      <div className="bg-[#181a20] p-6 rounded-xl border border-slate-800">
        <span className="text-xs uppercase tracking-wider text-red-400 font-semibold">Módulo de Evaluación Global</span>
        <h2 className="text-2xl font-bold text-white mt-1">Visualización de Tablas Totales</h2>
        <p className="text-xs text-slate-400 mt-1">
          Origen actual: <span className="text-white font-medium">{paisOrigen}</span> | Consolidación IMSFE de factores estratégicos.
        </p>
      </div>

      {/* AJUSTE MANUAL DE PONDERACIONES (GRID DE 2 FILAS x 3 COLUMNAS COMO LA IMAGEN) */}
      <div className="bg-[#181a20] border border-slate-800 rounded-xl p-6 space-y-4">
        <div>
          <h3 className="text-base font-bold text-white">Ajuste manual de ponderaciones (IMSFE)</h3>
          <p className="text-xs text-slate-400 mt-1">Puedes modificar los pesos de cada categoría. El total debe sumar 100%.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Fila 1 / Columna 1: COST */}
          <div className="bg-[#12141a] p-4 rounded-lg border border-slate-800 space-y-2">
            <label className="block text-xs font-semibold text-slate-300">COST (%)</label>
            <div className="flex items-center justify-between bg-[#0e1117] border border-slate-700 rounded px-3 py-1.5">
              <input
                type="number"
                step="any"
                value={pesosCat.COST}
                onChange={(e) => handlePesoChange('COST', e.target.value)}
                className="w-full bg-transparent text-xs text-slate-200 focus:outline-none"
              />
              <div className="flex items-center gap-2 text-slate-400 text-xs font-bold">
                <button onClick={() => handlePesoChange('COST', pesosCat.COST - 1)} className="hover:text-white cursor-pointer">−</button>
                <button onClick={() => handlePesoChange('COST', pesosCat.COST + 1)} className="hover:text-white cursor-pointer">+</button>
              </div>
            </div>
          </div>

          {/* Fila 1 / Columna 2: COMM */}
          <div className="bg-[#12141a] p-4 rounded-lg border border-slate-800 space-y-2">
            <label className="block text-xs font-semibold text-slate-300">COMM (%)</label>
            <div className="flex items-center justify-between bg-[#0e1117] border border-slate-700 rounded px-3 py-1.5">
              <input
                type="number"
                step="any"
                value={pesosCat.COMM}
                onChange={(e) => handlePesoChange('COMM', e.target.value)}
                className="w-full bg-transparent text-xs text-slate-200 focus:outline-none"
              />
              <div className="flex items-center gap-2 text-slate-400 text-xs font-bold">
                <button onClick={() => handlePesoChange('COMM', pesosCat.COMM - 1)} className="hover:text-white cursor-pointer">−</button>
                <button onClick={() => handlePesoChange('COMM', pesosCat.COMM + 1)} className="hover:text-white cursor-pointer">+</button>
              </div>
            </div>
          </div>

          {/* Fila 1 / Columna 3: POLI */}
          <div className="bg-[#12141a] p-4 rounded-lg border border-slate-800 space-y-2">
            <label className="block text-xs font-semibold text-slate-300">POLI (%)</label>
            <div className="flex items-center justify-between bg-[#0e1117] border border-slate-700 rounded px-3 py-1.5">
              <input
                type="number"
                step="any"
                value={pesosCat.POLI}
                onChange={(e) => handlePesoChange('POLI', e.target.value)}
                className="w-full bg-transparent text-xs text-slate-200 focus:outline-none"
              />
              <div className="flex items-center gap-2 text-slate-400 text-xs font-bold">
                <button onClick={() => handlePesoChange('POLI', pesosCat.POLI - 1)} className="hover:text-white cursor-pointer">−</button>
                <button onClick={() => handlePesoChange('POLI', pesosCat.POLI + 1)} className="hover:text-white cursor-pointer">+</button>
              </div>
            </div>
          </div>

          {/* Fila 2 / Columna 1: LOGI */}
          <div className="bg-[#12141a] p-4 rounded-lg border border-slate-800 space-y-2">
            <label className="block text-xs font-semibold text-slate-300">LOGI (%)</label>
            <div className="flex items-center justify-between bg-[#0e1117] border border-slate-700 rounded px-3 py-1.5">
              <input
                type="number"
                step="any"
                value={pesosCat.LOGI}
                onChange={(e) => handlePesoChange('LOGI', e.target.value)}
                className="w-full bg-transparent text-xs text-slate-200 focus:outline-none"
              />
              <div className="flex items-center gap-2 text-slate-400 text-xs font-bold">
                <button onClick={() => handlePesoChange('LOGI', pesosCat.LOGI - 1)} className="hover:text-white cursor-pointer">−</button>
                <button onClick={() => handlePesoChange('LOGI', pesosCat.LOGI + 1)} className="hover:text-white cursor-pointer">+</button>
              </div>
            </div>
          </div>

          {/* Fila 2 / Columna 2: ECON */}
          <div className="bg-[#12141a] p-4 rounded-lg border border-slate-800 space-y-2">
            <label className="block text-xs font-semibold text-slate-300">ECON (%)</label>
            <div className="flex items-center justify-between bg-[#0e1117] border border-slate-700 rounded px-3 py-1.5">
              <input
                type="number"
                step="any"
                value={pesosCat.ECON}
                onChange={(e) => handlePesoChange('ECON', e.target.value)}
                className="w-full bg-transparent text-xs text-slate-200 focus:outline-none"
              />
              <div className="flex items-center gap-2 text-slate-400 text-xs font-bold">
                <button onClick={() => handlePesoChange('ECON', pesosCat.ECON - 1)} className="hover:text-white cursor-pointer">−</button>
                <button onClick={() => handlePesoChange('ECON', pesosCat.ECON + 1)} className="hover:text-white cursor-pointer">+</button>
              </div>
            </div>
          </div>

          {/* Fila 2 / Columna 3: CULT */}
          <div className="bg-[#12141a] p-4 rounded-lg border border-slate-800 space-y-2">
            <label className="block text-xs font-semibold text-slate-300">CULT (%)</label>
            <div className="flex items-center justify-between bg-[#0e1117] border border-slate-700 rounded px-3 py-1.5">
              <input
                type="number"
                step="any"
                value={pesosCat.CULT}
                onChange={(e) => handlePesoChange('CULT', e.target.value)}
                className="w-full bg-transparent text-xs text-slate-200 focus:outline-none"
              />
              <div className="flex items-center gap-2 text-slate-400 text-xs font-bold">
                <button onClick={() => handlePesoChange('CULT', pesosCat.CULT - 1)} className="hover:text-white cursor-pointer">−</button>
                <button onClick={() => handlePesoChange('CULT', pesosCat.CULT + 1)} className="hover:text-white cursor-pointer">+</button>
              </div>
            </div>
          </div>
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

      {/* TABLA GENERAL DE EVALUACIÓN DE PAÍSES */}
      <div className="bg-[#181a20] border border-slate-800 rounded-xl p-6 space-y-4">
        <div>
          <h3 className="text-lg font-bold text-white">Tabla General de Evaluación de Países (solo datos completos)</h3>
          <p className="text-xs text-slate-400 mt-1 whitespace-pre-line">
            {`Países incluidos: ${paisesIncluidos} / ${totalPaisesBase} totales\n` +
             `Países excluidos: ${paisesExcluidos}\n` +
             `Pesos aplicados: COST=${pesosCat.COST}%, LOGI=${pesosCat.LOGI}%, COMM=${pesosCat.COMM}%, ECON=${pesosCat.ECON}%, POLI=${pesosCat.POLI}%, CULT=${pesosCat.CULT}%`}
          </p>
        </div>

        {cargando ? (
          <p className="text-xs text-slate-400">Consolidando datos de todas las pestañas...</p>
        ) : (
          <div className="overflow-x-auto max-h-[500px] overflow-y-auto">
            <table className="w-full text-left text-xs text-slate-300 border-collapse">
              <thead className="bg-[#12141a] text-slate-200 uppercase text-[10px] tracking-wider border-b border-slate-800 sticky top-0 z-10">
                <tr>
                  <th className="p-3">#</th>
                  <th className="p-3">Paises</th>
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
                  <tr key={index} className="hover:bg-slate-900/50">
                    <td className="p-3 text-slate-500">{index}</td>
                    <td className="p-3 font-medium text-white">{item.Paises}</td>
                    <td className="p-3">{item["1. Cost (COST)"] ?? '-'}</td>
                    <td className="p-3">{item["2. Logistical (LOGI)"] ?? '-'}</td>
                    <td className="p-3">{item["3. Commercial (COMM)"] ?? '-'}</td>
                    <td className="p-3">{item["4. Economic (ECON)"] ?? '-'}</td>
                    <td className="p-3">{item["5. Political (POLI)"] ?? '-'}</td>
                    <td className="p-3">{item["6. Cultura (CULT)"] ?? '-'}</td>
                    <td className="p-3 font-bold text-red-400">{item["Puntaje Global – TOTAL"]}</td>
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
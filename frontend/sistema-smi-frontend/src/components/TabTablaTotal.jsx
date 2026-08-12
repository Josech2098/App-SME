import React, { useMemo, useEffect, useState } from 'react';
import { renderPaisConBandera } from './banderas.jsx'; // 👈 Importación de banderas

export default function TabTablaTotal({
  datosCosto = [],
  datosLogi = [],
  datosComm = [],
  datosEcon = [],
  datosPoli = [],
  datosCult = [],
  datosSust = [],
  onDatosActualizados
}) {

  // ================= ESTADOS DE PONDERACIÓN =================
  const [pesosCat, setPesosCat] = useState({
    COST: 21.5,
    LOGI: 18.5,
    COMM: 20.5,
    ECON: 16,
    POLI: 13,
    CULT: 5,
    SUST: 5.5
  });

  const [pesosAplicados, setPesosAplicados] = useState({
    COST: 21.5,
    LOGI: 18.5,
    COMM: 20.5,
    ECON: 16,
    POLI: 13,
    CULT: 5,
    SUST: 5.5
  });

  // Estado para controlar si el módulo de ponderaciones está abierto o cerrado
  const [esVisible, setEsVisible] = useState(false);

  // Manejador para actualizar el valor individual de cada peso
  const handlePesoChange = (cat, valor) => {
    setPesosCat(prev => ({
      ...prev,
      [cat]: parseFloat(valor) || 0
    }));
  };

  // Validación de la sumatoria de pesos (debe ser estrictamente 100%)
  const sumaPesos = Object.values(pesosCat)
    .reduce((acc, val) => acc + val, 0);

  // ================= CONSOLIDACIÓN Y CÁLCULO GENERAL =================
  const datosFinales = useMemo(() => {
    const mapa = {};

    const asegurarPais = (pais) => {
      if (!pais) return null;
      const key = pais.toLowerCase().trim();
      if (!mapa[key]) {
        mapa[key] = {
          pais,
          COST: null,
          LOGI: null,
          COMM: null,
          ECON: null,
          POLI: null,
          CULT: null,
          SUST: null
        };
      }
      return mapa[key];
    };

    // 1. COST
    datosCosto.forEach(row => {
      const pais = row.pais_nombre || row.Paises || row.pais;
      const item = asegurarPais(pais);
      if (item && row.aporteFactorCosto !== null && row.aporteFactorCosto !== undefined) {
        item.COST = Number(row.aporteFactorCosto);
      }
    });

    // 2. LOGI
    datosLogi.forEach(row => {
      const pais = row.Paises || row.pais_nombre || row.pais;
      const item = asegurarPais(pais);
      if (item && row.costoTotal !== null && row.costoTotal !== undefined) {
        item.LOGI = Number(row.costoTotal);
      }
    });

    // 3. COMM
    datosComm.forEach(row => {
      const pais = row.Paises || row.pais_nombre || row.pais;
      const item = asegurarPais(pais);
      if (item && row.COMM_total !== null && row.COMM_total !== undefined) {
        item.COMM = Number(row.COMM_total);
      }
    });

    // 4. ECON
    datosEcon.forEach(row => {
      const pais = row.Paises || row.pais_nombre || row.pais;
      const item = asegurarPais(pais);
      if (item && row.Puntaje_ECON_Normalizado !== null && row.Puntaje_ECON_Normalizado !== undefined) {
        item.ECON = Number(row.Puntaje_ECON_Normalizado);
      }
    });

    // 5. POLI
    datosPoli.forEach(row => {
      const pais = row.Paises || row.pais_nombre || row.pais;
      const item = asegurarPais(pais);
      if (item && row.Puntaje_POLI_Normalizado !== null && row.Puntaje_POLI_Normalizado !== undefined) {
        item.POLI = Number(row.Puntaje_POLI_Normalizado);
      }
    });

    // 6. CULT
    datosCult.forEach(row => {
      const pais = row.Paises || row.pais_nombre || row.pais;
      const item = asegurarPais(pais);
      if (item && row.Puntaje_CULT_Normalizado !== null && row.Puntaje_CULT_Normalizado !== undefined) {
        item.CULT = Number(row.Puntaje_CULT_Normalizado);
      }
    });

    // 7. SUST
    datosSust.forEach(row => {
      const pais = row.Paises || row.pais_nombre || row.pais;
      const item = asegurarPais(pais);
      if (item && row.aporteFactorSostenibilidad !== null && row.aporteFactorSostenibilidad !== undefined) {
        item.SUST = Number(row.aporteFactorSostenibilidad);
      }
    });

    // Procesar y calcular totales finales
    return Object.values(mapa)
      .map(row => {
        // Para evitar NaN en la fórmula matemática si falta un campo, tratamos el null como 0 operativo
        const cCost = row.COST ?? 0;
        const cLogi = row.LOGI ?? 0;
        const cComm = row.COMM ?? 0;
        const cEcon = row.ECON ?? 0;
        const cPoli = row.POLI ?? 0;
        const cCult = row.CULT ?? 0;
        const cSust = row.SUST ?? 0;

        const total = Number(
          (
            cCost * (pesosAplicados.COST / 100) +
            cLogi * (pesosAplicados.LOGI / 100) +
            cComm * (pesosAplicados.COMM / 100) +
            cEcon * (pesosAplicados.ECON / 100) +
            cPoli * (pesosAplicados.POLI / 100) +
            cCult * (pesosAplicados.CULT / 100) +
            cSust * (pesosAplicados.SUST / 100)
          ).toFixed(2)
        );

        return {
          ...row,
          TOTAL: total,
          Paises: row.pais,
          "1. Cost (COST)": row.COST,
          "2. Logistical (LOGI)": row.LOGI,
          "3. Commercial (COMM)": row.COMM,
          "4. Economic (ECON)": row.ECON,
          "5. Political (POLI)": row.POLI,
          "6. Cultura (CULT)": row.CULT,
          "7. Sostenibilidad (SUST)": row.SUST,
          "Puntaje Total": total,
          "Puntaje Global – TOTAL": total
        };
      })
      .sort((a, b) => b.TOTAL - a.TOTAL);

  }, [
    datosCosto,
    datosLogi,
    datosComm,
    datosEcon,
    datosPoli,
    datosCult,
    datosSust,
    pesosAplicados
  ]);

  // Sincronizar datos consolidados hacia afuera si el componente padre lo requiere
  useEffect(() => {
    if (onDatosActualizados) {
      onDatosActualizados(datosFinales);
    }
  }, [datosFinales, onDatosActualizados]);

  return (
    <div className="space-y-10 text-slate-100 font-sans">
      
      {/* MÓDULO DE AJUSTE DE PESOS */}
      <div className="bg-[#121620] border border-[#1b2230] rounded-xl p-6 space-y-4 shadow-sm">
        <div 
          className="flex justify-between items-center cursor-pointer select-none" 
          onClick={() => setEsVisible(!esVisible)}
        >
          <div>
            <span className="text-xs uppercase tracking-wider text-sky-400 font-semibold">Módulo de Ponderación</span>
            <h3 className="text-xl font-bold text-white mt-1">
              Ajuste manual de ponderaciones (IMSFE)
            </h3>
            <p className="text-xs text-slate-400 mt-1">
              {esVisible ? "Haz clic para ocultar el ajuste de pesos." : "Haz clic para ajustar los pesos de cada categoría de evaluación."}
            </p>
          </div>
          <button className="text-sky-400 font-bold text-sm bg-[#1b2230] px-3 py-1 rounded border border-[#2d3748]">
            {esVisible ? "Ocultar ▲" : "Configurar ▼"}
          </button>
        </div>

        {esVisible && (
          <div className="space-y-4 pt-2 border-t border-[#1b2230]">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              {[
                { label: "COST (%)", cat: "COST" },
                { label: "LOGI (%)", cat: "LOGI" },
                { label: "COMM (%)", cat: "COMM" },
                { label: "ECON (%)", cat: "ECON" },
                { label: "POLI (%)", cat: "POLI" },
                { label: "CULT (%)", cat: "CULT" },
                { label: "SUST (%)", cat: "SUST" }
              ].map(({ label, cat }) => (
                <div
                  key={cat}
                  className="bg-[#0d1017] border border-[#1b2230] rounded-lg p-3"
                >
                  <label className="block text-xs font-semibold mb-2 text-slate-300">
                    {label}
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      step="0.5"
                      value={pesosCat[cat]}
                      onChange={(e) =>
                        handlePesoChange(cat, e.target.value)
                      }
                      className="flex-1 bg-[#121620] border border-[#1b2230] rounded px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-sky-500"
                    />
                    <button
                      onClick={() =>
                        handlePesoChange(
                          cat,
                          pesosCat[cat] - 0.5
                        )
                      }
                      className="px-2.5 py-1.5 bg-[#1b2230] hover:bg-[#252f44] text-slate-200 rounded text-xs transition-colors cursor-pointer"
                    >
                      −
                    </button>
                    <button
                      onClick={() =>
                        handlePesoChange(
                          cat,
                          pesosCat[cat] + 0.5
                        )
                      }
                      className="px-2.5 py-1.5 bg-[#1b2230] hover:bg-[#252f44] text-slate-200 rounded text-xs transition-colors cursor-pointer"
                    >
                      +
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {sumaPesos !== 100 ? (
              <div className="bg-red-950/40 border border-red-900/50 rounded p-3 text-red-400 text-xs">
                La suma actual de los pesos es <span className="font-bold">{sumaPesos.toFixed(1)}%</span>. Debe ser exactamente 100% para procesar correctamente.
              </div>
            ) : (
              <div className="bg-emerald-950/40 border border-emerald-900/50 rounded p-3 text-emerald-400 text-xs">
                Ponderaciones configuradas correctamente (Suma total exacta: 100%).
              </div>
            )}

            <div className="flex justify-end gap-3 pt-2">
              <button
                onClick={() => {
                  if (sumaPesos !== 100) {
                    alert("Las ponderaciones deben sumar exactamente 100%");
                    return;
                  }
                  setPesosAplicados({ ...pesosCat });
                }}
                className="bg-sky-600 hover:bg-sky-500 text-white text-xs font-semibold px-4 py-2 rounded-lg transition-colors cursor-pointer shadow"
              >
                Aplicar y Calcular
              </button>
              <button
                onClick={() => {
                  const pesosOriginales = {
                    COST: 21.5,
                    LOGI: 18.5,
                    COMM: 20.5,
                    ECON: 16,
                    POLI: 13,
                    CULT: 5,
                    SUST: 5.5
                  };
                  setPesosCat(pesosOriginales);
                  setPesosAplicados(pesosOriginales);
                }}
                className="bg-[#1b2230] hover:bg-[#252f44] text-slate-200 text-xs font-semibold px-4 py-2 rounded-lg transition-colors cursor-pointer border border-[#2d3748]"
              >
                Restablecer Valores
              </button>
            </div>
          </div>
        )}
      </div>

      {/* TABLA GENERAL DE EVALUACIÓN */}
      <div className="bg-[#121620] border border-[#1b2230] rounded-xl p-6 space-y-4 shadow-sm">
        <div>
          <h2 className="text-lg font-bold text-white">
            Tabla General de Evaluación de Países
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Consolidación automática y matricial de COST, LOGI, COMM, ECON, POLI, CULT y SUST
          </p>
        </div>
        <div className="overflow-y-auto max-h-[450px] border border-[#1b2230] rounded-xl">
          <table className="w-full text-xs text-slate-300 border-collapse">
            <thead className="bg-[#0d1017] text-slate-200 uppercase text-[10px] tracking-wider border-b border-[#1b2230] sticky top-0 z-10">
              <tr>
                <th className="p-3">#</th>
                <th className="p-3">País</th>
                <th className="p-3">COST</th>
                <th className="p-3">LOGI</th>
                <th className="p-3">COMM</th>
                <th className="p-3">ECON</th>
                <th className="p-3">POLI</th>
                <th className="p-3">CULT</th>
                <th className="p-3">SUST</th>
                <th className="p-3 text-sky-400">TOTAL</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#1b2230]">
              {datosFinales.map((row, index) => (
                <tr
                  key={row.pais}
                  className="hover:bg-[#181f2d] transition-colors"
                >
                  <td className="p-3 text-slate-500">{index + 1}</td>
                  <td className="p-3 font-semibold text-white flex items-center gap-2">
                    {renderPaisConBandera(row.pais)}
                  </td>
                  <td className="p-3">{row.COST !== null ? row.COST.toFixed(2) : '-'}</td>
                  <td className="p-3">{row.LOGI !== null ? row.LOGI.toFixed(2) : '-'}</td>
                  <td className="p-3">{row.COMM !== null ? row.COMM.toFixed(2) : '-'}</td>
                  <td className="p-3">{row.ECON !== null ? row.ECON.toFixed(2) : '-'}</td>
                  <td className="p-3">{row.POLI !== null ? row.POLI.toFixed(2) : '-'}</td>
                  <td className="p-3">{row.CULT !== null ? row.CULT.toFixed(2) : '-'}</td>
                  <td className="p-3">{row.SUST !== null ? row.SUST.toFixed(2) : '-'}</td>
                  <td className="p-3 font-bold text-sky-400">{row.TOTAL.toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* TABLA RESUMEN — RANKING FINAL */}
      <div className="bg-[#121620] border border-[#1b2230] rounded-xl p-6 space-y-4 shadow-sm">
        <div>
          <h2 className="text-lg font-bold text-white">
            Tabla Resumen — Puntaje Total
          </h2>
          <p className="text-xs text-slate-400 mt-1">Ranking consolidado final ordenado por puntaje global</p>
        </div>
        <div className="overflow-y-auto max-h-[450px] border border-[#1b2230] rounded-xl">
          <table className="w-full text-xs text-slate-300 border-collapse">
            <thead className="bg-[#0d1017] text-slate-200 uppercase text-[10px] tracking-wider border-b border-[#1b2230] sticky top-0 z-10">
              <tr>
                <th className="p-3">Ranking</th>
                <th className="p-3">País</th>
                <th className="p-3 text-sky-400">Puntaje Total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#1b2230]">
              {datosFinales.map((row, index) => (
                <tr
                  key={`ranking-${row.pais}`}
                  className="hover:bg-[#181f2d] transition-colors"
                >
                  <td className="p-3 font-bold text-slate-400">{index + 1}</td>
                  <td className="p-3 font-medium text-white flex items-center gap-2">
                    {renderPaisConBandera(row.pais)}
                  </td>
                  <td className="p-3 font-bold text-sky-400">{row.TOTAL.toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
}
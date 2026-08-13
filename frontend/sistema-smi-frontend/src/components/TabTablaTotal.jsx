import React, { useMemo, useEffect, useState } from 'react';
import { renderPaisConBandera } from './banderas.jsx';

export default function TabTablaTotal({
  datosCosto = [],
  datosLogi = [],
  datosComm = [],
  datosEcon = [],
  datosPoli = [],
  datosCult = [],
  datosSust = [],
  paisOrigen,
  onDatosActualizados
}) {

  const pesosEstandar = {
    COST: 21.5,
    LOGI: 18.5,
    COMM: 20.5,
    ECON: 16.0,
    POLI: 13.0,
    SUST: 5.5,
    CULT: 5.0
  };

  const [pesosCat, setPesosCat] = useState(pesosEstandar);
  const [pesosAplicados, setPesosAplicados] = useState(pesosEstandar);
  const [esVisible, setEsVisible] = useState(false);

  const handlePesoChange = (cat, valor) => {
    setPesosCat(prev => ({
      ...prev,
      [cat]: parseFloat(valor) || 0
    }));
  };

  const sumaPesos = Object.values(pesosCat).reduce((acc, val) => acc + val, 0);

  const datosFinales = useMemo(() => {
    const mapa = {};

    const asegurarPais = (pais) => {
      if (!pais) return null;
      if (!mapa[pais]) {
        mapa[pais] = {
          pais,
          COST: 0,
          LOGI: 0,
          COMM: 0,
          ECON: 0,
          POLI: 0,
          SUST: 0,
          CULT: 0
        };
      }
      return mapa[pais];
    };

    // COST
    datosCosto.forEach(row => {
      const pais = row.pais_nombre || row.Paises || row.pais;
      const item = asegurarPais(pais);
      if (item) {
        item.COST = Number(row.aporteFactorCosto || 0);
      }
    });

    // LOGI
    datosLogi.forEach(row => {
      const pais = row.Paises || row.pais_nombre || row.pais;
      const item = asegurarPais(pais);
      if (item) {
        item.LOGI = Number(row.costoTotal || 0);
      }
    });

    // COMM
    datosComm.forEach(row => {
      const pais = row.Paises || row.pais_nombre || row.pais;
      const item = asegurarPais(pais);
      if (item) {
        item.COMM = Number(row.COMM_total || 0);
      }
    });

    // ECON
    datosEcon.forEach(row => {
      const pais = row.Paises || row.pais_nombre || row.pais;
      const item = asegurarPais(pais);
      if (item) {
        item.ECON = Number(row.Puntaje_ECON_Normalizado || 0);
      }
    });

    // POLI
    datosPoli.forEach(row => {
      const pais = row.Paises || row.pais_nombre || row.pais;
      const item = asegurarPais(pais);
      if (item) {
        item.POLI = Number(row.Puntaje_POLI_Normalizado || 0);
      }
    });

    // SUST
    datosSust.forEach(row => {
      const pais = row.Paises || row.pais_nombre || row.pais;
      const item = asegurarPais(pais);
      if (item) {
        item.SUST = Number(row.aporteFactorSostenibilidad || 0);
      }
    });

    // CULT
    datosCult.forEach(row => {
      const pais = row.Paises || row.pais_nombre || row.pais;
      const item = asegurarPais(pais);
      if (item) {
        item.CULT = Number(row.Puntaje_CULT_Normalizado || 0);
      }
    });

    return Object.values(mapa).map(row => {
      const total = Number(
        (
          row.COST * (pesosAplicados.COST / 100) +
          row.LOGI * (pesosAplicados.LOGI / 100) +
          row.COMM * (pesosAplicados.COMM / 100) +
          row.ECON * (pesosAplicados.ECON / 100) +
          row.POLI * (pesosAplicados.POLI / 100) +
          row.SUST * (pesosAplicados.SUST / 100) +
          row.CULT * (pesosAplicados.CULT / 100)
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
        "6. Sostenibilidad (SUST)": row.SUST,
        "7. Cultura (CULT)": row.CULT,
        "Puntaje Total": total,
        "Puntaje Global – TOTAL": total
      };
    }).sort((a, b) => {
      // 🛡️ REGLA DE ORDENAMIENTO MEJORADA: 
      // Si un país tiene ECON en 0 (indicando falta de datos o penalización), 
      // lo mandamos al fondo de la tabla para que no aparezca de primero injustamente.
      const aTieneEconZero = a.ECON === 0 ? 1 : 0;
      const bTieneEconZero = b.ECON === 0 ? 1 : 0;

      if (aTieneEconZero !== bTieneEconZero) {
        return aTieneEconZero - bTieneEconZero; // Los que tienen 0 en ECON van después
      }

      // Si ambos tienen o no tienen 0, se ordenan normalmente por TOTAL descendente
      return b.TOTAL - a.TOTAL;
    });
  }, [datosCosto, datosLogi, datosComm, datosEcon, datosPoli, datosSust, datosCult, pesosAplicados]);

  const datosFiltrados = useMemo(() => {
    if (!paisOrigen) return datosFinales;
    return datosFinales.filter(item => item.pais.trim().toLowerCase() !== paisOrigen.trim().toLowerCase());
  }, [datosFinales, paisOrigen]);

  useEffect(() => {
    if (onDatosActualizados) {
      onDatosActualizados(datosFiltrados);
    }
  }, [datosFiltrados, onDatosActualizados]);

  return (
    <div className="space-y-10 text-slate-100 font-sans">
      <div className="bg-[#121620] border border-[#1b2230] rounded-xl p-6 space-y-4 shadow-sm">
        <div className="flex justify-between items-center cursor-pointer" onClick={() => setEsVisible(!esVisible)}>
          <div>
            <span className="text-xs uppercase tracking-wider text-sky-400 font-semibold">Módulo de Ponderación</span>
            <h3 className="text-xl font-bold text-white mt-1">Ajuste manual de ponderaciones (IMSFE)</h3>
            <p className="text-xs text-slate-400 mt-1">
              {esVisible ? "Haz clic para ocultar el ajuste de pesos." : "Haz clic para ajustar los pesos de cada categoría."}
            </p>
          </div>
          <button className="text-sky-400 font-bold">{esVisible ? "▲" : "▼"}</button>
        </div>

        {esVisible && (
          <>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              {[
                { label: "COST (%)", cat: "COST" },
                { label: "LOGI (%)", cat: "LOGI" },
                { label: "COMM (%)", cat: "COMM" },
                { label: "ECON (%)", cat: "ECON" },
                { label: "POLI (%)", cat: "POLI" },
                { label: "SUST (%)", cat: "SUST" },
                { label: "CULT (%)", cat: "CULT" }
              ].map(({ label, cat }) => (
                <div key={cat} className="bg-[#0d1017] border border-[#1b2230] rounded-lg p-3">
                  <label className="block text-xs font-semibold mb-2 text-slate-300">{label}</label>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      step="0.5"
                      value={pesosCat[cat]}
                      onChange={(e) => handlePesoChange(cat, e.target.value)}
                      className="flex-1 bg-[#121620] border border-[#1b2230] rounded px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-sky-500"
                    />
                    <button
                      onClick={() => handlePesoChange(cat, pesosCat[cat] - 0.5)}
                      className="px-2.5 py-1.5 bg-[#1b2230] hover:bg-[#252f44] text-slate-200 rounded text-xs transition-colors cursor-pointer"
                    >
                      −
                    </button>
                    <button
                      onClick={() => handlePesoChange(cat, pesosCat[cat] + 0.5)}
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
                La suma actual es {sumaPesos.toFixed(1)}%. Debe ser exactamente 100%.
              </div>
            ) : (
              <div className="bg-emerald-950/40 border border-emerald-900/50 rounded p-3 text-emerald-400 text-xs">
                Ponderaciones válidas (100%).
              </div>
            )}

            <div className="flex justify-end gap-3">
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
                Calcular
              </button>
              <button
                onClick={() => {
                  setPesosCat(pesosEstandar);
                  setPesosAplicados(pesosEstandar);
                }}
                className="bg-[#1b2230] hover:bg-[#252f44] text-slate-200 text-xs font-semibold px-4 py-2 rounded-lg transition-colors cursor-pointer border border-[#2d3748]"
              >
                Reiniciar
              </button>
            </div>
          </>
        )}
      </div>

      {/* TABLA GENERAL */}
      <div className="bg-[#121620] border border-[#1b2230] rounded-xl p-6 space-y-4 shadow-sm">
        <div>
          <h2 className="text-lg font-bold text-white">Tabla General de Evaluación de Países</h2>
          <p className="text-xs text-slate-400 mt-1">Consolidación automática de COST, LOGI, COMM, ECON, POLI, SUST y CULT</p>
        </div>
        <div className="overflow-y-auto h-[450px] border border-[#1b2230] rounded-xl">
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
                <th className="p-3">SUST</th>
                <th className="p-3">CULT</th>
                <th className="p-3 text-sky-400">TOTAL</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#1b2230]">
              {datosFiltrados.map((row, index) => (
                <tr key={row.pais} className="hover:bg-[#181f2d] transition-colors">
                  <td className="p-3 text-slate-500">{index + 1}</td>
                  <td className="p-3 font-semibold text-white flex items-center gap-2">
                    {renderPaisConBandera(row.pais)}
                  </td>
                  <td className="p-3">{row.COST.toFixed(2)}</td>
                  <td className="p-3">{row.LOGI.toFixed(2)}</td>
                  <td className="p-3">{row.COMM.toFixed(2)}</td>
                  <td className="p-3">{row.ECON.toFixed(2)}</td>
                  <td className="p-3">{row.POLI.toFixed(2)}</td>
                  <td className="p-3">{row.SUST.toFixed(2)}</td>
                  <td className="p-3">{row.CULT.toFixed(2)}</td>
                  <td className="p-3 font-bold text-sky-400">{row.TOTAL.toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* RANKING */}
      <div className="bg-[#121620] border border-[#1b2230] rounded-xl p-6 space-y-4 shadow-sm">
        <div>
          <h2 className="text-lg font-bold text-white">Tabla Resumen — Puntaje Total</h2>
          <p className="text-xs text-slate-400 mt-1">Ranking consolidado final por país</p>
        </div>
        <div className="overflow-y-auto h-[450px] border border-[#1b2230] rounded-xl">
          <table className="w-full text-xs text-slate-300 border-collapse">
            <thead className="bg-[#0d1017] text-slate-200 uppercase text-[10px] tracking-wider border-b border-[#1b2230] sticky top-0 z-10">
              <tr>
                <th className="p-3">Ranking</th>
                <th className="p-3">País</th>
                <th className="p-3 text-sky-400">Puntaje Total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#1b2230]">
              {datosFiltrados.map((row, index) => (
                <tr key={`ranking-${row.pais}`} className="hover:bg-[#181f2d] transition-colors">
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
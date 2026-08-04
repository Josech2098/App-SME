import React, { useMemo, useEffect, useState } from 'react';

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

const handlePesoChange = (cat, valor) => {
  setPesosCat(prev => ({
    ...prev,
    [cat]: parseFloat(valor) || 0
  }));
};

const sumaPesos = Object.values(pesosCat)
  .reduce((acc, val) => acc + val, 0);

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
          CULT: 0,
          SUST: 0
        };
      }

      return mapa[pais];
    };

    // COST
    datosCosto.forEach(row => {

      const pais =
        row.pais_nombre ||
        row.Paises ||
        row.pais;

      const item = asegurarPais(pais);

      if (item) {
        item.COST =
          Number(row.aporteFactorCosto || 0);
      }

    });

    // LOGI
    datosLogi.forEach(row => {

      const pais =
        row.Paises ||
        row.pais_nombre ||
        row.pais;

      const item = asegurarPais(pais);

      if (item) {
        item.LOGI =
          Number(row.costoTotal || 0);
      }

    });

    // COMM
    datosComm.forEach(row => {

      const pais =
        row.Paises ||
        row.pais_nombre ||
        row.pais;

      const item = asegurarPais(pais);

      if (item) {
        item.COMM =
          Number(row.COMM_total || 0);
      }

    });

    // ECON
    datosEcon.forEach(row => {

      const pais =
        row.Paises ||
        row.pais_nombre ||
        row.pais;

      const item = asegurarPais(pais);

      if (item) {
        item.ECON =
          Number(row.Puntaje_ECON_Normalizado || 0);
      }

    });

    // POLI
    datosPoli.forEach(row => {

      const pais =
        row.Paises ||
        row.pais_nombre ||
        row.pais;

      const item = asegurarPais(pais);

      if (item) {
        item.POLI =
          Number(row.Puntaje_POLI_Normalizado || 0);
      }

    });

    // CULT
    datosCult.forEach(row => {

      const pais =
        row.Paises ||
        row.pais_nombre ||
        row.pais;

      const item = asegurarPais(pais);

      if (item) {
        item.CULT =
          Number(row.Puntaje_CULT_Normalizado || 0);
      }

    });

    // SUST
    datosSust.forEach(row => {

      const pais =
        row.Paises ||
        row.pais_nombre ||
        row.pais;

      const item = asegurarPais(pais);

      if (item) {
        item.SUST =
          Number(row.aporteFactorSostenibilidad || 0);
      }

    });

    return Object.values(mapa)
      .map(row => {

        const total = Number(
          (
            row.COST * (pesosAplicados.COST / 100) +
            row.LOGI * (pesosAplicados.LOGI / 100) +
            row.COMM * (pesosAplicados.COMM / 100) +
            row.ECON * (pesosAplicados.ECON / 100) +
            row.POLI * (pesosAplicados.POLI / 100) +
            row.CULT * (pesosAplicados.CULT / 100) +
            row.SUST * (pesosAplicados.SUST / 100)
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

  useEffect(() => {

    if (onDatosActualizados) {
      onDatosActualizados(datosFinales);
    }

  }, [datosFinales, onDatosActualizados]);

  return (

    <div className="space-y-10 text-slate-100">
      <div className="bg-[#181a20] border border-slate-800 rounded-xl p-6 space-y-4">

        <div>
          <h3 className="text-xl font-bold text-white">
            Ajuste manual de ponderaciones (IMSFE)
          </h3>

          <p className="text-xs text-slate-400 mt-1">
            Puedes modificar los pesos de cada categoría.
            El total debe sumar exactamente 100%.
          </p>
        </div>

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
              className="bg-[#0d1117] border border-slate-800 rounded-lg p-3"
            >

              <label className="block text-xs font-semibold mb-2">
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
                  className="flex-1 bg-[#181a20] border border-slate-700 rounded px-2 py-1 text-sm"
                />

                <button
                  onClick={() =>
                    handlePesoChange(
                      cat,
                      pesosCat[cat] - 0.5
                    )
                  }
                  className="px-2 py-1 bg-slate-700 rounded"
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
                  className="px-2 py-1 bg-slate-700 rounded"
                >
                  +
                </button>

              </div>

            </div>

          ))}

        </div>

        {sumaPesos !== 100 ? (

          <div className="bg-red-900/20 border border-red-800 rounded p-3 text-red-400 text-xs">
            La suma actual es {sumaPesos.toFixed(1)}%.
            Debe ser exactamente 100%.
          </div>

        ) : (

          <div className="bg-emerald-900/20 border border-emerald-800 rounded p-3 text-emerald-400 text-xs">
            Ponderaciones válidas (100%).
          </div>

        )}

        <div className="flex justify-end gap-3">

          <button
            onClick={() => {

              if (sumaPesos !== 100) {
                alert(
                  "Las ponderaciones deben sumar exactamente 100%"
                );
                return;
              }

              setPesosAplicados({ ...pesosCat });

            }}
            className="bg-emerald-600 hover:bg-emerald-500 text-white font-semibold px-6 py-2 rounded-lg transition-colors"
          >
            Calcular
          </button>

        </div>

      </div>

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
        className="bg-red-600 hover:bg-red-500 text-white font-semibold px-6 py-2 rounded-lg transition-colors"
      >
        Reiniciar
      </button>

      {/* TABLA GENERAL */}

      <div>

        <h2 className="text-2xl font-bold">
          Tabla General de Evaluación de Países
        </h2>

        <p className="text-xs text-slate-400 mt-2">
          Consolidación automática de COST,
          LOGI, COMM, ECON, POLI, CULT y SUST
        </p>

      </div>

      <div className="overflow-y-auto h-[450px] border border-slate-800 rounded-xl">

        <table className="w-full text-xs">

          <thead className="bg-[#181a20] sticky top-0 z-10">

            <tr>

              <th className="p-3">#</th>

              <th className="p-3">
                País
              </th>

              <th className="p-3">COST</th>
              <th className="p-3">LOGI</th>
              <th className="p-3">COMM</th>
              <th className="p-3">ECON</th>
              <th className="p-3">POLI</th>
              <th className="p-3">CULT</th>
              <th className="p-3">SUST</th>

              <th className="p-3 text-emerald-400">
                TOTAL
              </th>

            </tr>

          </thead>

          <tbody>

            {datosFinales.map((row, index) => (

              <tr
                key={row.pais}
                className="border-t border-slate-800 hover:bg-[#16181d]"
              >

                <td className="p-3">
                  {index + 1}
                </td>

                <td className="p-3 font-semibold">
                  {row.pais}
                </td>

                <td className="p-3">
                  {row.COST.toFixed(2)}
                </td>

                <td className="p-3">
                  {row.LOGI.toFixed(2)}
                </td>

                <td className="p-3">
                  {row.COMM.toFixed(2)}
                </td>

                <td className="p-3">
                  {row.ECON.toFixed(2)}
                </td>

                <td className="p-3">
                  {row.POLI.toFixed(2)}
                </td>

                <td className="p-3">
                  {row.CULT.toFixed(2)}
                </td>

                <td className="p-3">
                  {row.SUST.toFixed(2)}
                </td>

                <td className="p-3 font-bold text-emerald-400">
                  {row.TOTAL.toFixed(2)}
                </td>

              </tr>

            ))}

          </tbody>

        </table>

      </div>

      {/* RANKING */}

      <div>

        <h2 className="text-2xl font-bold mb-4">
          Tabla Resumen — Puntaje Total
        </h2>

        <div className="overflow-y-auto h-[450px] border border-slate-800 rounded-xl">

          <table className="w-full text-xs">

            <thead className="bg-[#181a20] sticky top-0 z-10">

              <tr>

                <th className="p-3">
                  Ranking
                </th>

                <th className="p-3">
                  País
                </th>

                <th className="p-3 text-emerald-400">
                  Puntaje Total
                </th>

              </tr>

            </thead>

            <tbody>

              {datosFinales.map((row, index) => (

                <tr
                  key={`ranking-${row.pais}`}
                  className="border-t border-slate-800 hover:bg-[#16181d]"
                >

                  <td className="p-3 font-bold">
                    {index + 1}
                  </td>

                  <td className="p-3">
                    {row.pais}
                  </td>

                  <td className="p-3 font-bold text-emerald-400">
                    {row.TOTAL.toFixed(2)}
                  </td>

                </tr>

              ))}

            </tbody>

          </table>

        </div>

      </div>

    </div>
  );
}
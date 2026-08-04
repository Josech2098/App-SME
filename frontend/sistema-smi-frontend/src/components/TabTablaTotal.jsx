import React, { useMemo, useEffect } from 'react';

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
      .map(row => ({
        ...row,
        TOTAL: Number(
          (
            row.COST +
            row.LOGI +
            row.COMM +
            row.ECON +
            row.POLI +
            row.CULT +
            row.SUST
          ).toFixed(2)
        )
      }))
      .sort((a, b) => b.TOTAL - a.TOTAL);

  }, [
    datosCosto,
    datosLogi,
    datosComm,
    datosEcon,
    datosPoli,
    datosCult,
    datosSust
  ]);

  useEffect(() => {

    if (onDatosActualizados) {
      onDatosActualizados(datosFinales);
    }

  }, [datosFinales, onDatosActualizados]);

  return (

    <div className="space-y-10 text-slate-100">

      <div>
        <h2 className="text-2xl font-bold">
          Tabla General de Evaluación de Países
        </h2>

        <p className="text-xs text-slate-400 mt-2">
          Consolidación automática de COST, LOGI,
          COMM, ECON, POLI, CULT y SUST.
        </p>
      </div>

      <div className="overflow-auto border border-slate-800 rounded-xl">

        <table className="w-full text-xs">

          <thead className="bg-[#181a20] sticky top-0">

            <tr>

              <th className="p-3">#</th>
              <th className="p-3">PAÍS</th>

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
                className="border-t border-slate-800"
              >

                <td className="p-3">
                  {index + 1}
                </td>

                <td className="p-3 font-semibold">
                  {row.pais}
                </td>

                <td className="p-3">{row.COST.toFixed(2)}</td>
                <td className="p-3">{row.LOGI.toFixed(2)}</td>
                <td className="p-3">{row.COMM.toFixed(2)}</td>
                <td className="p-3">{row.ECON.toFixed(2)}</td>
                <td className="p-3">{row.POLI.toFixed(2)}</td>
                <td className="p-3">{row.CULT.toFixed(2)}</td>
                <td className="p-3">{row.SUST.toFixed(2)}</td>

                <td className="p-3 font-bold text-emerald-400">
                  {row.TOTAL.toFixed(2)}
                </td>

              </tr>

            ))}

          </tbody>

        </table>

      </div>

      <div>

        <h2 className="text-2xl font-bold mb-4">
          Tabla Resumen — Puntaje Total
        </h2>

        <div className="overflow-auto border border-slate-800 rounded-xl">

          <table className="w-full text-xs">

            <thead className="bg-[#181a20]">

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
                  className="border-t border-slate-800"
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
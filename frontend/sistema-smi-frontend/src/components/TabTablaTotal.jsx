import React, { useEffect, useMemo } from "react";

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

    const paises = {};

    const asegurarPais = (pais) => {
      if (!pais) return null;

      if (!paises[pais]) {
        paises[pais] = {
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

      return paises[pais];
    };

    datosCosto.forEach((item) => {
      const fila = asegurarPais(item.pais_nombre);
      if (fila) fila.COST = Number(item.aporteFactorCosto || 0);
    });

    datosLogi.forEach((item) => {
      const fila = asegurarPais(item.Paises);
      if (fila) fila.LOGI = Number(item.costoTotal || 0);
    });

    datosComm.forEach((item) => {
      const fila = asegurarPais(item.Paises);
      if (fila) fila.COMM = Number(item.COMM_total || 0);
    });

    datosEcon.forEach((item) => {
      const fila = asegurarPais(item.Paises);
      if (fila) fila.ECON = Number(item.Puntaje_ECON_Normalizado || 0);
    });

    datosPoli.forEach((item) => {
      const fila = asegurarPais(item.Paises);
      if (fila) fila.POLI = Number(item.Puntaje_POLI_Normalizado || 0);
    });

    datosCult.forEach((item) => {
      const fila = asegurarPais(item.Paises);
      if (fila) fila.CULT = Number(item.Puntaje_CULT_Normalizado || 0);
    });

    datosSust.forEach((item) => {
      const fila = asegurarPais(
        item.pais_nombre || item.Paises
      );

      if (fila) {
        fila.SUST = Number(
          item.aporteFactorSostenibilidad || 0
        );
      }
    });

    return Object.values(paises)
      .map((item) => ({
        ...item,
        TOTAL: Number(
          (
            item.COST +
            item.LOGI +
            item.COMM +
            item.ECON +
            item.POLI +
            item.CULT +
            item.SUST
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
    <div className="space-y-6 text-slate-100">

      <div className="border-b border-slate-800 pb-4">
        <h2 className="text-2xl font-bold">
          Tabla Total Consolidada
        </h2>

        <p className="text-xs text-slate-400 mt-1">
          Resultados obtenidos directamente de las
          pestañas COST, LOGI, COMM, ECON,
          POLI, CULT y SUST.
        </p>
      </div>

      <div className="overflow-x-auto border border-slate-800 rounded-lg">

        <table className="w-full text-xs">

          <thead className="bg-[#181a20] sticky top-0">

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

              <th className="p-3 text-red-400">
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

                <td className="p-3 font-medium">
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

    </div>
  );
}
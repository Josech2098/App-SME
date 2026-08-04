import React, { useMemo, useEffect } from "react";

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

  const tablaGlobal = useMemo(() => {

    const mapa = {};

    const crearSiNoExiste = (pais) => {
      if (!mapa[pais]) {
        mapa[pais] = {
          Paises: pais,
          COST: 0,
          LOGI: 0,
          COMM: 0,
          ECON: 0,
          POLI: 0,
          CULT: 0,
          SUST: 0,
          TOTAL: 0
        };
      }
    };

    //------------------------------------------------
    // COSTO
    //------------------------------------------------

    datosCosto.forEach(row => {

      const pais =
        row.pais_nombre ||
        row.Paises;

      crearSiNoExiste(pais);

      mapa[pais].COST =
        Number(row.aporteFactorCosto || 0);
    });

    //------------------------------------------------
    // LOGISTICA
    //------------------------------------------------

    datosLogi.forEach(row => {

      const pais = row.Paises;

      crearSiNoExiste(pais);

      mapa[pais].LOGI =
        Number(row.costoTotal || 0);
    });

    //------------------------------------------------
    // COMERCIAL
    //------------------------------------------------

    datosComm.forEach(row => {

      const pais = row.Paises;

      crearSiNoExiste(pais);

      mapa[pais].COMM =
        Number(row.COMM_total || 0);
    });

    //------------------------------------------------
    // ECONOMIA
    //------------------------------------------------

    datosEcon.forEach(row => {

      const pais = row.Paises;

      crearSiNoExiste(pais);

      mapa[pais].ECON =
        Number(row.Puntaje_ECON_Normalizado || 0);
    });

    //------------------------------------------------
    // POLITICA
    //------------------------------------------------

    datosPoli.forEach(row => {

      const pais = row.Paises;

      crearSiNoExiste(pais);

      mapa[pais].POLI =
        Number(row.Puntaje_POLI_Normalizado || 0);
    });

    //------------------------------------------------
    // CULTURA
    //------------------------------------------------

    datosCult.forEach(row => {

      const pais = row.Paises;

      crearSiNoExiste(pais);

      mapa[pais].CULT =
        Number(row.Puntaje_CULT_Normalizado || 0);
    });

    //------------------------------------------------
    // SOSTENIBILIDAD
    //------------------------------------------------

    datosSust.forEach(row => {

      const pais =
        row.pais_nombre ||
        row.Paises;

      crearSiNoExiste(pais);

      mapa[pais].SUST =
        Number(row.aporteFactorSostenibilidad || 0);
    });

    //------------------------------------------------
    // TOTAL GLOBAL
    //------------------------------------------------

    const resultado = Object.values(mapa)
      .map(item => {

        const total =
          item.COST +
          item.LOGI +
          item.COMM +
          item.ECON +
          item.POLI +
          item.CULT +
          item.SUST;

        return {
          ...item,
          TOTAL: Number(total.toFixed(2))
        };
      })
      .sort((a, b) => b.TOTAL - a.TOTAL);

    return resultado;

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
      onDatosActualizados(tablaGlobal);
    }

  }, [tablaGlobal, onDatosActualizados]);

  return (

    <div className="space-y-10 text-slate-100 font-sans">

      {/* ================================================= */}
      {/* TABLA PRINCIPAL */}
      {/* ================================================= */}

      <div className="space-y-3">

        <h2 className="text-3xl font-bold text-white">

          Tabla General de Evaluación de Países
          <span className="text-red-400 ml-2">
            (Datos Normalizados de Todas las Tabs)
          </span>

        </h2>

        <p className="text-xs text-slate-400">

          Países incluidos:
          {" "}
          <span className="text-white font-bold">
            {tablaGlobal.length}
          </span>

        </p>

        <div className="overflow-auto max-h-[700px] border border-slate-800 rounded-xl">

          <table className="w-full text-xs">

            <thead className="sticky top-0 bg-[#181a20] text-slate-300 z-10">

              <tr>

                <th className="p-3">#</th>
                <th className="p-3 text-left">PAÍSES</th>

                <th className="p-3">1. COST</th>
                <th className="p-3">2. LOGI</th>
                <th className="p-3">3. COMM</th>
                <th className="p-3">4. ECON</th>
                <th className="p-3">5. POLI</th>
                <th className="p-3">6. CULT</th>
                <th className="p-3">7. SUST</th>

                <th className="p-3 text-red-400 font-bold">
                  PUNTAJE GLOBAL
                </th>

              </tr>

            </thead>

            <tbody>

              {tablaGlobal.map((row, index) => (

                <tr
                  key={row.Paises}
                  className="border-b border-slate-800 hover:bg-[#16181d]"
                >

                  <td className="p-3 text-slate-500">
                    {index + 1}
                  </td>

                  <td className="p-3 font-bold text-white">
                    {row.Paises}
                  </td>

                  <td className="p-3">{row.COST}</td>
                  <td className="p-3">{row.LOGI}</td>
                  <td className="p-3">{row.COMM}</td>
                  <td className="p-3">{row.ECON}</td>
                  <td className="p-3">{row.POLI}</td>
                  <td className="p-3">{row.CULT}</td>
                  <td className="p-3">{row.SUST}</td>

                  <td className="p-3 font-bold text-red-400 text-center">
                    {row.TOTAL}
                  </td>

                </tr>

              ))}

            </tbody>

          </table>

        </div>

      </div>

      {/* ================================================= */}
      {/* RESUMEN */}
      {/* ================================================= */}

      <div className="space-y-3">

        <h2 className="text-2xl font-bold text-white">

          Tabla Resumen — Puntaje Ponderado Total

        </h2>

        <p className="text-xs text-slate-400">

          Ranking general ordenado por el puntaje ponderado global.

        </p>

        <div className="overflow-auto max-h-[500px] border border-slate-800 rounded-xl">

          <table className="w-full text-xs">

            <thead className="sticky top-0 bg-[#181a20] text-slate-300 z-10">

              <tr>

                <th className="p-3">RANKING</th>

                <th className="p-3 text-left">
                  PAÍS
                </th>

                <th className="p-3 text-right">
                  PONDERADO TOTAL
                </th>

              </tr>

            </thead>

            <tbody>

              {tablaGlobal.map((row, index) => (

                <tr
                  key={`rank-${row.Paises}`}
                  className="border-b border-slate-800 hover:bg-[#16181d]"
                >

                  <td className="p-3 font-bold text-sky-400">
                    {index + 1}
                  </td>

                  <td className="p-3 font-semibold text-white">
                    {row.Paises}
                  </td>

                  <td className="p-3 text-right font-bold text-red-400">
                    {row.TOTAL}
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
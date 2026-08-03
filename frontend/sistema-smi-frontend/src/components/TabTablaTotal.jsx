import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';

const normalizarTexto = (texto) => {
  if (texto === null || texto === undefined) return '';
  return texto
    .toString()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
    .replace(/\s+/g, ' ');
};

function calcularDistanciaKm(lat1, lon1, lat2, lon2) {
  if (!lat1 || !lon1 || !lat2 || !lon2) return 0;
  const parseCoord = (val) => parseFloat(String(val).replace(',', '.'));
  const l1 = parseCoord(lat1), ln1 = parseCoord(lon1), l2 = parseCoord(lat2), ln2 = parseCoord(lon2);
  if ([l1, ln1, l2, ln2].some((v) => isNaN(v))) return 0;
  const R = 6371;
  const dLat = (l2 - l1) * (Math.PI / 180);
  const dLon = (ln2 - ln1) * (Math.PI / 180);
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(l1 * Math.PI / 180) * Math.cos(l2 * Math.PI / 180) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function calcularDistanciaNautica(lat1, lon1, lat2, lon2) {
  if (lat1 === null || lon1 === null || lat2 === null || lon2 === null) return 0;
  const R = 3440.06;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function limpiarPrecio(val) {
  if (val === null || val === undefined) return 0;
  if (typeof val === 'number') return val > 0 ? val : 0;
  const str = String(val).trim();
  if (str.toLowerCase().includes('no encontrado') || str === '' || str === '0' || str === '$0.00') return 0;
  const numero = parseFloat(str.replace(/[^\d,.-]/g, '').replace(',', '.'));
  return isNaN(numero) || numero <= 0 ? 0 : numero;
}

const A3 = 10;
const normDirecto = (val, max) => (val !== null && val > 0 && max > 0) ? Number((A3 * val / max).toFixed(2)) : null;
const normInverso = (val, min) => (val !== null && val > 0 && min !== null && min > 0) ? Number((A3 * min / val).toFixed(2)) : null;

export default function TabTablaTotal({ paisesDestino, paisOrigen, productoActivo }) {
  const [datosTotales, setDatosTotales] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [errorNotif, setErrorNotif] = useState(null);

  const [pesosCat, setPesosCat] = useState({ COST: 15, LOGI: 15, COMM: 15, ECON: 15, POLI: 15, CULT: 15, SUST: 10 });
  const handlePesoChange = (cat, valor) => setPesosCat((prev) => ({ ...prev, [cat]: parseFloat(valor) || 0 }));
  const sumaPesos = Object.values(pesosCat).reduce((acc, val) => acc + val, 0);

  useEffect(() => {
    async function cargarYProcesarTodo() {
      setCargando(true);
      try {
        const [
          resPaises, resCostoImportacion, resProductos,
          resTabLogi, resPuertos,
          resPenetracion, resLibertad,
          resCostoVida, resDesempleo, resInflacion,
          resFSI, resINRI, resDEIN,
          resGLIN, resCPCI,
          resEmisiones, resIsg
        ] = await Promise.all([
          supabase.from('paises').select('*').order('nombre'),
          supabase.from('costo_importacion').select('*'),
          supabase.from('productos').select('*'),
          supabase.from('tablogi').select('*'),
          supabase.from('puertos').select('*'),
          supabase.from('indicepenetracion').select('*'),
          supabase.from('libertadeconomica').select('*'),
          supabase.from('costodevida').select('*'),
          supabase.from('desempleo').select('*'),
          supabase.from('inflacion').select('*'),
          supabase.from('estadosfragiles').select('*'),
          supabase.from('informeriesgo').select('*'),
          supabase.from('indicedemocracia').select('*'),
          supabase.from('indiceglobalizacion').select('*'),
          supabase.from('indicecorrupcion').select('*'),
          supabase.from('emisiones_carbono').select('*'),
          supabase.from('indice_sostenibilidad_global').select('*'),
        ]);

        const dbPaises = resPaises.data || [];
        if (dbPaises.length === 0) {
          setDatosTotales([]);
          setErrorNotif('No se pudo cargar la tabla "paises" desde Supabase.');
          return;
        }

        const nombresBase = (paisesDestino && paisesDestino.length > 0)
          ? paisesDestino.map((p) => (typeof p === 'string' ? p : (p.nombre || p.pais)))
          : dbPaises.map((p) => p.nombre);

        const paisesFiltrados = dbPaises.filter(p => nombresBase.some(n => normalizarTexto(n) === normalizarTexto(p.nombre)));
        const paisBaseObj = dbPaises.find((p) => normalizarTexto(p.nombre) === normalizarTexto(paisOrigen)) || dbPaises[0];

        // --- 1. COST ---
        let nombreProductoBuscado = '';
        if (typeof productoActivo === 'string') nombreProductoBuscado = productoActivo;
        else if (productoActivo && typeof productoActivo === 'object') {
          nombreProductoBuscado = productoActivo.nombre ?? productoActivo.producto ?? productoActivo.titulo ?? '';
        }
        if (!nombreProductoBuscado) nombreProductoBuscado = 'Botella de vino (Calidad media)';
        const queryLimpia = nombreProductoBuscado.trim().toLowerCase();

        const mapaPrecios = {};
        (resProductos.data || []).forEach((item) => {
          const nombreProd = (item.nombre || item.producto || item.titulo || '').trim().toLowerCase();
          if (nombreProd.includes(queryLimpia) || queryLimpia.includes(nombreProd)) {
            const paisItem = item.pais || item.Pais;
            if (paisItem) {
              const precio = limpiarPrecio(item.precio);
              if (precio > 0) mapaPrecios[normalizarTexto(paisItem)] = precio;
            }
          }
        });

        const costoRaw = dbPaises.map((p) => {
          const key = normalizarTexto(p.nombre);
          const ppd = mapaPrecios[key] ?? null;
          const cicMatch = (resCostoImportacion.data || []).find((c) => normalizarTexto(c.pais || c.pais_nombre) === key);
          const cic = cicMatch ? Number(cicMatch.valor ?? cicMatch.cic ?? null) : null;
          const distKm = calcularDistanciaKm(paisBaseObj?.latitud, paisBaseObj?.longitud, p.latitud, p.longitud);
          const cti = distKm > 0 ? Number((distKm * 0.38).toFixed(2)) : null;
          return { pais: p.nombre, ppd, cti, cic };
        });

        const maxPpd = Math.max(0, ...costoRaw.map((d) => d.ppd).filter((v) => v > 0)) || null;
        const minCti = costoRaw.map((d) => d.cti).filter((v) => v > 0).reduce((a, b) => Math.min(a, b), Infinity);
        const minCtiFinal = isFinite(minCti) ? minCti : null;
        const minCic = costoRaw.map((d) => d.cic).filter((v) => v > 0).reduce((a, b) => Math.min(a, b), Infinity);
        const minCicFinal = isFinite(minCic) ? minCic : null;

        const mapaCost = {};
        costoRaw.forEach((d) => {
          const p1 = normDirecto(d.ppd, maxPpd) ?? 0;
          const p2 = normInverso(d.cti, minCtiFinal) ?? 0;
          const p3 = normInverso(d.cic, minCicFinal) ?? 0;
          const faltan = [d.ppd, d.cti, d.cic].filter((v) => v === null).length;
          
          const valorBruto = faltan === 3 ? 0.5 : (0.44 * p1 + 0.34 * p2 + 0.22 * p3);
          mapaCost[normalizarTexto(d.pais)] = Number((valorBruto * 10).toFixed(2));
        });

        // --- 2. LOGI ---
        const puertoOrigen = (resPuertos.data || []).find((p) => normalizarTexto(p.pais) === normalizarTexto(paisOrigen) && p.principal === 'Y')
          || (resPuertos.data || []).find((p) => normalizarTexto(p.pais) === normalizarTexto(paisOrigen));

        const logiRaw = dbPaises.map((p) => {
          const key = normalizarTexto(p.nombre);
          const match = (resTabLogi.data || []).find((r) => normalizarTexto(r.pais) === key);
          const idl = match && match.lpi !== null ? Number(match.lpi) : null;
          const ccp = match && match.cfr !== null ? Number(match.cfr) : null;
          const puertoDestino = (resPuertos.data || []).find((pt) => normalizarTexto(pt.pais) === key && pt.principal === 'Y')
            || (resPuertos.data || []).find((pt) => normalizarTexto(pt.pais) === key);

          let tti = null;
          if (puertoOrigen && puertoDestino) {
            const distNm = calcularDistanciaNautica(puertoOrigen.latitud, puertoOrigen.longitud, puertoDestino.latitud, puertoDestino.longitud);
            const dias = distNm / 18.5 / 24 + (Number(puertoDestino.manejo_dias) || 0) + (Number(puertoOrigen.manejo_dias) || 0);
            tti = distNm > 0 ? Number(Math.max(1, dias).toFixed(1)) : null;
          }
          return { pais: p.nombre, idl, ccp, tti };
        });

        const maxIdl = Math.max(0, ...logiRaw.map((d) => d.idl).filter((v) => v > 0)) || null;
        const maxCcp = Math.max(0, ...logiRaw.map((d) => d.ccp).filter((v) => v > 0)) || null;
        const minTtiArr = logiRaw.map((d) => d.tti).filter((v) => v > 0);
        const minTti = minTtiArr.length > 0 ? Math.min(...minTtiArr) : null;

        const mapaLogi = {};
        logiRaw.forEach((d) => {
          const p1 = normDirecto(d.idl, maxIdl) ?? 0;
          const p2 = normDirecto(d.ccp, maxCcp) ?? 0;
          const p3 = normInverso(d.tti, minTti) ?? 0;
          const faltan = [d.idl, d.ccp, d.tti].filter((v) => v === null).length;
          mapaLogi[normalizarTexto(d.pais)] = faltan === 3 ? 5.0 : Number((0.185 * p1 + 0.185 * p2 + 0.63 * p3).toFixed(2));
        });

        // --- 3. COMM ---
        const commRaw = dbPaises.map((p, idx) => {
          const key = normalizarTexto(p.nombre);
          const matchIemp = (resPenetracion.data || []).find((r) => normalizarTexto(r.pais || r.nombre || r.Paises) === key);
          const matchIoef = (resLibertad.data || []).find((r) => normalizarTexto(r.pais || r.nombre || r.Paises) === key);
          const extraerValor = (obj) => {
            if (!obj) return null;
            for (const k of Object.keys(obj)) {
              const kn = normalizarTexto(k);
              if (!['id', 'pais', 'nombre', 'created_at'].includes(kn)) {
                const v = Number(obj[k]);
                if (!isNaN(v) && v !== 0) return v;
              }
            }
            return null;
          };
          const ctco = Number((2.0 + idx * 0.1).toFixed(2));
          const iemp = matchIemp ? extraerValor(matchIemp) : null;
          const ioef = matchIoef ? extraerValor(matchIoef) : null;
          return { pais: p.nombre, ctco, iemp, ioef };
        });

        const ctcoVals = commRaw.map((d) => d.ctco);
        const [ctcoMin, ctcoMax] = [Math.min(...ctcoVals), Math.max(...ctcoVals)];
        const iempVals = commRaw.map((d) => d.iemp).filter((v) => v !== null);
        const [iempMin, iempMax] = iempVals.length ? [Math.min(...iempVals), Math.max(...iempVals)] : [0, 1];
        const ioefVals = commRaw.map((d) => d.ioef).filter((v) => v !== null);
        const [ioefMin, ioefMax] = ioefVals.length ? [Math.min(...ioefVals), Math.max(...ioefVals)] : [0, 1];

        const mapaComm = {};
        commRaw.forEach((d) => {
          const ctcoNorm = ctcoMax !== ctcoMin ? Number((A3 * (ctcoMax - d.ctco) / (ctcoMax - ctcoMin)).toFixed(2)) : A3;
          const iempNorm = (d.iemp !== null && iempMax !== iempMin) ? Number((A3 * (d.iemp - iempMin) / (iempMax - iempMin)).toFixed(2)) : 0;
          const ioefNorm = (d.ioef !== null && ioefMax !== ioefMin) ? Number((A3 * (d.ioef - ioefMin) / (ioefMax - ioefMin)).toFixed(2)) : 0;
          mapaComm[normalizarTexto(d.pais)] = (d.iemp === null && d.ioef === null)
            ? 5.0
            : Number((ctcoNorm * 0.465 + iempNorm * 0.25 + ioefNorm * 0.285).toFixed(2));
        });

        // --- 4. ECON ---
        const econRaw = dbPaises.map((p) => {
          const key = normalizarTexto(p.nombre);
          const mCv = (resCostoVida.data || []).find((r) => normalizarTexto(r.pais || r.nombre) === key);
          const mDes = (resDesempleo.data || []).find((r) => normalizarTexto(r.pais || r.nombre) === key);
          const mInf = (resInflacion.data || []).find((r) => normalizarTexto(r.pais || r.nombre) === key);
          const icv = mCv ? Number(mCv.costo_de_vida ?? mCv.icv ?? mCv.valor) : null;
          const tad = mDes ? Number(mDes.tasadesempleo ?? mDes.tasa_desempleo ?? mDes.desempleo) : null;
          const inan = mInf ? Number(mInf.inflacion_anual ?? mInf.inflacion) : null;
          return { pais: p.nombre, icv: isNaN(icv) ? null : icv, tad: isNaN(tad) ? null : tad, inan: isNaN(inan) ? null : inan };
        });

        const minIcv = econRaw.map((d) => d.icv).filter((v) => v > 0).reduce((a, b) => Math.min(a, b), Infinity);
        const minTad = econRaw.map((d) => d.tad).filter((v) => v > 0).reduce((a, b) => Math.min(a, b), Infinity);
        const minInan = econRaw.map((d) => d.inan).filter((v) => v > 0).reduce((a, b) => Math.min(a, b), Infinity);

        const mapaEcon = {};
        econRaw.forEach((d) => {
          const p1 = normInverso(d.icv, isFinite(minIcv) ? minIcv : null) ?? 0;
          const p2 = normInverso(d.inan, isFinite(minInan) ? minInan : null) ?? 0;
          const p3 = normInverso(d.tad, isFinite(minTad) ? minTad : null) ?? 0;
          const faltan = [d.icv, d.inan, d.tad].filter((v) => v === null).length;
          mapaEcon[normalizarTexto(d.pais)] = faltan === 3 ? 5.0 : Number((0.30 * p1 + 0.30 * p2 + 0.40 * p3).toFixed(2));
        });

        // --- 5. POLI ---
        const FSI_min = 19.6, INRI_min = 1.7, DEIN_max = 8.85;
        const mapaPoli = {};
        dbPaises.forEach((p) => {
          const key = normalizarTexto(p.nombre);
          const mFsi = (resFSI.data || []).find((r) => normalizarTexto(r.pais) === key);
          const mInri = (resINRI.data || []).find((r) => normalizarTexto(r.pais) === key);
          const mDein = (resDEIN.data || []).find((r) => normalizarTexto(r.pais) === key);
          const fsi = mFsi ? Number(mFsi.indice_de_estados_fragiles) : null;
          const inri = mInri ? Number(mInri.riesgo) : null;
          const dein = mDein ? Number(mDein.indice_democracia ?? mDein.dein ?? mDein.indice_de_democracia) : null;

          const fsiNorm = normInverso(fsi, FSI_min) ?? 0;
          const inriNorm = normInverso(inri, INRI_min) ?? 0;
          const deinNorm = normDirecto(dein, DEIN_max) ?? 0;
          const faltan = [fsi, inri, dein].filter((v) => v === null || isNaN(v)).length;
          mapaPoli[key] = faltan === 3 ? 5.0 : Number((0.355 * fsiNorm + 0.350 * inriNorm + 0.295 * deinNorm).toFixed(2));
        });

        // --- 6. CULT ---
        const glinVals = (resGLIN.data || []).map((r) => Number(r.indice_globalizacion)).filter((v) => !isNaN(v) && v > 0);
        const maxGlin = glinVals.length ? Math.max(...glinVals) : 100;
        const cpciVals = (resCPCI.data || []).map((r) => Number(r.indice_percepcion_corrupcion)).filter((v) => !isNaN(v) && v > 0);
        const maxCpci = cpciVals.length ? Math.max(...cpciVals) : 100;

        const mapaCult = {};
        dbPaises.forEach((p) => {
          const key = normalizarTexto(p.nombre);
          const mGlin = (resGLIN.data || []).find((r) => normalizarTexto(r.pais) === key);
          const mCpci = (resCPCI.data || []).find((r) => normalizarTexto(r.pais) === key);
          const glin = mGlin ? Number(mGlin.indice_globalizacion) : null;
          const cpci = mCpci ? Number(mCpci.indice_percepcion_corrupcion) : null;
          const glinNorm = normDirecto(glin, maxGlin) ?? 0;
          const cpciNorm = normDirecto(cpci, maxCpci) ?? 0;
          const faltan = [glin, cpci].filter((v) => v === null).length;
          mapaCult[key] = faltan === 2 ? 5.0 : Number((glinNorm * 0.30 + cpciNorm * 0.50).toFixed(2));
        });

        // --- 7. SUST ---
        const edcVals = (resEmisiones.data || []).map((r) => Number(r.emisionescarbono ?? r.edc)).filter((v) => !isNaN(v) && v > 0);
        const minEdc = edcVals.length ? Math.min(...edcVals) : null;
        const isgVals = (resIsg.data || []).map((r) => Number(r.indicesostenibilidadglobal ?? r.isg)).filter((v) => !isNaN(v) && v > 0);
        const maxIsg = isgVals.length ? Math.max(...isgVals) : null;

        const mapaSust = {};
        dbPaises.forEach((p) => {
          const key = normalizarTexto(p.nombre);
          const mEdc = (resEmisiones.data || []).find((r) => normalizarTexto(r.pais) === key);
          const mIsg = (resIsg.data || []).find((r) => normalizarTexto(r.pais) === key);
          const edc = mEdc ? Number(mEdc.emisionescarbono ?? mEdc.edc) : null;
          const isg = mIsg ? Number(mIsg.indicesostenibilidadglobal ?? mIsg.isg) : null;
          const edcNorm = normInverso(isNaN(edc) ? null : edc, minEdc) ?? 0;
          const isgNorm = normDirecto(isNaN(isg) ? null : isg, maxIsg) ?? 0;
          const faltan = [edc, isg].filter((v) => v === null || isNaN(v)).length;
          mapaSust[key] = faltan === 2 ? 5.0 : Number((edcNorm * 0.30 + isgNorm * 0.40).toFixed(2));
        });

        const lista = paisesFiltrados.map((p) => {
          const key = normalizarTexto(p.nombre);
          const val = (mapa) => (mapa[key] !== undefined && mapa[key] !== null) ? mapa[key] : 5.0;
          return {
            Paises: p.nombre,
            "1. Cost (COST)": val(mapaCost),
            "2. Logistical (LOGI)": val(mapaLogi),
            "3. Commercial (COMM)": val(mapaComm),
            "4. Economic (ECON)": val(mapaEcon),
            "5. Political (POLI)": val(mapaPoli),
            "6. Cultura (CULT)": val(mapaCult),
            "7. Sostenibilidad (SUST)": val(mapaSust),
          };
        });

        setDatosTotales(lista);
        setErrorNotif(null);
      } catch (err) {
        console.error("Error al calcular las métricas:", err);
        setErrorNotif("Hubo un problema al calcular automáticamente las métricas: " + err.message);
      } finally {
        setCargando(false);
      }
    }

    cargarYProcesarTodo();
  }, [paisesDestino, paisOrigen, productoActivo]);

  const datosCalculados = datosTotales.map((item) => {
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
    return { ...item, "Puntaje Global – TOTAL": Number(puntajeClampeado.toFixed(2)) };
  }).sort((a, b) => b["Puntaje Global – TOTAL"] - a["Puntaje Global – TOTAL"]);

  const totalPaisesBase = datosTotales.length;
  const paisesIncluidos = datosCalculados.length;

  return (
    <div className="space-y-8 text-slate-100 font-sans">
      <div className="bg-[#181a20] p-6 rounded-xl border border-slate-800 shadow-sm">
        <span className="text-xs uppercase tracking-wider text-red-400 font-semibold">Módulo de Consolidación Global</span>
        <h2 className="text-2xl font-bold text-white mt-1">Visualización de Tablas Totales y Normalizadas</h2>
        <p className="text-xs text-slate-400 mt-1">
          Origen actual: <span className="text-white font-medium">{paisOrigen}</span> | Cruce integral de las 7 pestañas de análisis estratégico.
        </p>
      </div>

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
            Cargando y calculando las métricas normalizadas de cada pestaña...
          </div>
        ) : datosCalculados.length === 0 ? (
          <div className="py-12 text-center text-xs text-slate-400">
            No se encontraron países seleccionados para mostrar en la tabla consolidada. Asegúrate de elegir países destino en el menú principal.
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

      <div className="bg-[#181a20] border border-slate-800 rounded-xl p-6 space-y-4 shadow-sm">
        <div>
          <h3 className="text-lg font-bold text-white">Tabla Resumen — Puntaje Ponderado Total</h3>
          <p className="text-xs text-slate-400 mt-1">
            Ranking general ordenado por el puntaje ponderado global de los mejores mercados destino.
          </p>
        </div>

        {cargando ? (
          <div className="py-8 text-center text-xs text-slate-400">Generando resumen de ranking...</div>
        ) : datosCalculados.length === 0 ? (
          <div className="py-8 text-center text-xs text-slate-400">No hay datos suficientes para mostrar el resumen.</div>
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
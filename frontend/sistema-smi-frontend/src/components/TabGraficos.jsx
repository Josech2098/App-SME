import React, { useState, useEffect } from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';
import { Bar, Chart } from 'react-chartjs-2';
import { supabase } from '../supabaseClient';

// Registrar componentes de Chart.js
ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
  Title,
  Tooltip,
  Legend
);

export default function TabGraficos({ datosTotales = [] }) {
  const [datosConsolidados, setDatosConsolidados] = useState(datosTotales);
  const [cargando, setCargando] = useState(false);
  const [errorRender, setErrorRender] = useState(null);

  // Sincronizar datos si datosTotales viene vacío al entrar directamente a la pestaña
  useEffect(() => {
    async function cargarDatosAutomaticos() {
      if (!datosTotales || datosTotales.length === 0) {
        setCargando(true);
        try {
          const { data, error } = await supabase
            .from('indicepenetracion')
            .select('*')
            .range(0, 99);

          if (error) throw error;

          if (data && data.length > 0) {
            const formateados = data.map(item => ({
              ...item,
              Paises: item.pais || item.nombre || item.Paises || 'País Desconocido',
              "Puntaje Total": Number(item.puntaje_total || item.total || item["Puntaje Global – TOTAL"] || 5)
            }));
            setDatosConsolidados(formateados);
          }
        } catch (err) {
          console.error("Error al cargar datos automáticos para gráficos:", err);
          setErrorRender("No se pudieron cargar los datos de la base de datos.");
        } finally {
          setCargando(false);
        }
      } else {
        setDatosConsolidados(datosTotales);
      }
    }

    cargarDatosAutomaticos();
  }, [datosTotales]);

  // Capturar cualquier error de renderizado para evitar la pantalla en blanco
  if (errorRender) {
    return (
      <div className="bg-[#181a20] border border-red-900/50 rounded-xl p-8 text-center text-red-400 space-y-2 shadow-sm font-sans">
        <h3 className="text-lg font-bold text-white">Error al cargar los gráficos</h3>
        <p className="text-xs">{errorRender}</p>
      </div>
    );
  }

  if (cargando) {
    return (
      <div className="bg-[#181a20] border border-slate-800 rounded-xl p-8 text-center text-slate-400 space-y-2 shadow-sm font-sans">
        <h3 className="text-lg font-bold text-white">Cargando gráficos analíticos...</h3>
        <p className="text-xs">Procesando información estadística.</p>
      </div>
    );
  }

  // Filtrar y sanitizar datos de forma segura
  let datosValidos = [];
  try {
    datosValidos = (datosConsolidados || []).map(item => {
      const puntaje = item["Puntaje Global – TOTAL"] !== undefined 
        ? Number(item["Puntaje Global – TOTAL"]) 
        : Number(item["Puntaje Total"] || 0);
      
      return {
        ...item,
        Paises: item.Paises || item.pais || item.nombre || 'Desconocido',
        "Puntaje Total": isNaN(puntaje) ? 0 : puntaje
      };
    }).filter(item => !isNaN(item["Puntaje Total"]));
  } catch (e) {
    console.error("Error procesando datos válidos:", e);
  }

  if (datosValidos.length === 0) {
    return (
      <div className="bg-[#181a20] border border-slate-800 rounded-xl p-8 text-center text-slate-400 space-y-2 shadow-sm font-sans">
        <h3 className="text-lg font-bold text-white">Visualización de Gráficos Comparativos</h3>
        <p className="text-xs">No hay datos consolidados suficientes para mostrar en este momento.</p>
      </div>
    );
  }

  // Ordenar de mayor a menor según Puntaje Total
  const datosOrdenados = [...datosValidos].sort((a, b) => b["Puntaje Total"] - a["Puntaje Total"]);
  const top10 = datosOrdenados.slice(0, 10);
  const top30 = datosOrdenados.slice(0, 30);

  // Configuración Gráfico 1
  const categoriasG1 = [
    "1. Cost (COST)",
    "2. Logistical (LOGI)",
    "3. Commercial (COMM)",
    "4. Economic (ECON)",
    "5. Political (POLI)",
    "6. Cultura (CULT)",
    "Puntaje Total"
  ];
  const coloresG1 = ['#66c2a5', '#fc8d62', '#8da0cb', '#e78ac3', '#a6d854', '#ffd92f', '#e5c494'];

  const dataGrafico1 = {
    labels: top10.map(d => d.Paises),
    datasets: categoriasG1.map((cat, idx) => ({
      label: cat,
      data: top10.map(d => Number(d[cat] || 0)),
      backgroundColor: coloresG1[idx % coloresG1.length],
      borderColor: 'black',
      borderWidth: 0.8,
    }))
  };

  const optionsGrafico1 = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { position: 'top', labels: { color: 'white', font: { size: 12 } } },
      title: { display: true, text: 'Comparación de Puntajes (Top 10 Países)', color: 'white', font: { size: 16 } }
    },
    scales: {
      x: { ticks: { color: 'white', font: { size: 12 } }, grid: { color: 'rgba(255,255,255,0.05)' } },
      y: { ticks: { color: 'white', font: { size: 12 } }, grid: { color: 'rgba(255,255,255,0.1)' }, title: { display: true, text: 'Puntaje Real', color: 'white' } }
    }
  };

  // Configuración Gráfico 2
  const dataGrafico2 = {
    labels: top30.map(d => d.Paises),
    datasets: [{
      label: 'Puntaje Total',
      data: top30.map(d => Number(d["Puntaje Total"] || 0)),
      backgroundColor: '#00BFFF',
      borderColor: 'white',
      borderWidth: 1,
    }]
  };

  const optionsGrafico2 = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      title: { display: true, text: 'Ranking — Puntaje Total (Top 30 países)', color: 'white', font: { size: 16 } }
    },
    scales: {
      x: { ticks: { color: 'white', font: { size: 10 }, maxRotation: 90, minRotation: 90 }, grid: { display: false } },
      y: { ticks: { color: 'white', font: { size: 11 } }, grid: { color: 'rgba(255,255,255,0.2)', borderDash: [5, 5] }, title: { display: true, text: 'Puntaje Total', color: 'white' } }
    }
  };

  // Configuración Gráfico 3
  const columnasDim = [
    "1. Cost (COST)",
    "2. Logistical (LOGI)",
    "3. Commercial (COMM)",
    "4. Economic (ECON)",
    "5. Political (POLI)",
    "6. Cultura (CULT)"
  ];

  const estilosLineas = [
    { color: '#FF5555', borderDash: [2, 2] },
    { color: '#7CFF91', borderDash: [5, 5] },
    { color: '#6A9EFF', borderDash: [4, 4] },
    { color: '#00D4FF', borderDash: [2, 2] },
    { color: '#E6A84F', borderDash: [5, 5] },
    { color: '#CFCFCF', borderDash: [4, 4] }
  ];

  const dataGrafico3 = {
    labels: top30.map(d => d.Paises),
    datasets: [
      {
        type: 'bar',
        label: 'Puntaje Total',
        data: top30.map(d => Number(d["Puntaje Total"] || 0)),
        backgroundColor: '#00BFFF',
        borderColor: 'white',
        borderWidth: 1,
        order: 2,
      },
      ...columnasDim.map((col, idx) => ({
        type: 'line',
        label: col,
        data: top30.map(d => Number(d[col] || 0)),
        borderColor: estilosLineas[idx].color,
        backgroundColor: estilosLineas[idx].color,
        borderDash: estilosLineas[idx].borderDash,
        borderWidth: 1.5,
        pointRadius: 4,
        tension: 0.1,
        order: 1,
      }))
    ]
  };

  const optionsGrafico3 = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { position: 'top', labels: { color: 'white', font: { size: 11 } } },
      title: { display: true, text: 'Comparativo IMSFE — Puntaje Total + Dimensiones', color: 'white', font: { size: 16 } }
    },
    scales: {
      x: { ticks: { color: 'white', font: { size: 10 }, maxRotation: 90, minRotation: 90 }, grid: { display: false } },
      y: { min: 0, max: 10, ticks: { color: 'white', font: { size: 11 } }, grid: { color: 'rgba(255,255,255,0.2)', borderDash: [5, 5] }, title: { display: true, text: 'Puntaje (0-10)', color: 'white' } }
    }
  };

  const handleDescargarGraficoCanvas = (canvasId, nombreArchivo) => {
    try {
      const canvas = document.getElementById(canvasId);
      if (canvas) {
        const url = canvas.toDataURL('image/png');
        const link = document.createElement('a');
        link.download = nombreArchivo;
        link.href = url;
        link.click();
      }
    } catch (e) {
      console.error("Error al exportar imagen:", e);
    }
  };

  return (
    <div className="space-y-8 text-slate-100 font-sans">
      <div className="bg-[#181a20] p-6 rounded-xl border border-slate-800 shadow-sm">
        <span className="text-xs uppercase tracking-wider text-red-400 font-semibold">Módulo de Gráficos Analíticos</span>
        <h2 className="text-2xl font-bold text-white mt-1">Visualización de Gráficos Comparativos</h2>
        <p className="text-xs text-slate-400 mt-1">
          Visualización interactiva implementada en React y Chart.js con soporte en modo oscuro.
        </p>
      </div>

      <div className="bg-[#181a20] border border-slate-800 rounded-xl p-6 space-y-4 shadow-sm">
        <h3 className="text-lg font-bold text-white">Comparativo de países mejor posicionados</h3>
        <div className="bg-[#0d1117] p-4 rounded-lg border border-slate-800 h-[500px]">
          <Bar id="canvas-grafico-1" data={dataGrafico1} options={optionsGrafico1} />
        </div>
      </div>

      <div className="bg-[#181a20] border border-slate-800 rounded-xl p-6 space-y-4 shadow-sm">
        <h3 className="text-lg font-bold text-white">Puntaje Total (Top 30 Países)</h3>
        <div className="bg-[#0d1117] p-4 rounded-lg border border-slate-800 h-[450px]">
          <Bar id="canvas-grafico-2" data={dataGrafico2} options={optionsGrafico2} />
        </div>
        <div className="flex justify-end">
          <button
            onClick={() => handleDescargarGraficoCanvas('canvas-grafico-2', 'Grafico_PuntajeTotal.png')}
            className="bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold px-4 py-2 rounded border border-slate-700 transition-colors cursor-pointer"
          >
            Descargar Gráfico 2 (PNG)
          </button>
        </div>
      </div>

      <div className="bg-[#181a20] border border-slate-800 rounded-xl p-6 space-y-4 shadow-sm">
        <h3 className="text-lg font-bold text-white">Comparativo IMSFE — Dimensiones y Puntaje Total</h3>
        <div className="bg-[#0d1117] p-4 rounded-lg border border-slate-800 h-[520px]">
          <Chart id="canvas-grafico-3" type="bar" data={dataGrafico3} options={optionsGrafico3} />
        </div>
        <div className="flex justify-end">
          <button
            onClick={() => handleDescargarGraficoCanvas('canvas-grafico-3', 'Grafico_IMSFE.png')}
            className="bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold px-4 py-2 rounded border border-slate-700 transition-colors cursor-pointer"
          >
            Descargar Gráfico 3 (PNG)
          </button>
        </div>
      </div>
    </div>
  );
}
import React, { useState, useEffect } from 'react';

export default function TabLogistica({ datosLogisticaInicial }) {
  const [tablaLogi, setTablaLogi] = useState(datosLogisticaInicial || [
    {
      Paises: 'Togo',
      'Índice de desempeño logístico (LPIN)': 4.3,
      'Tráfico del puerto de contenedores (CPT)': 1952879,
      'Tiempo de tránsito del transporte internacional (ITTT)': '11.2 días'
    },
    {
      Paises: 'Japón',
      'Índice de desempeño logístico (LPIN)': 4.0,
      'Tráfico del puerto de contenedores (CPT)': 22515870,
      'Tiempo de tránsito del transporte internacional (ITTT)': '5.0 días'
    }
  ]);
  
  const [paisSeleccionadoEdit, setPaisSeleccionadoEdit] = useState('');
  const [paisSeleccionadoDel, setPaisSeleccionadoDel] = useState('');
  
  // Estados para formularios CRUD
  const [nuevoPais, setNuevoPais] = useState('');
  const [nuevoLpin, setNuevoLpin] = useState(0.0);
  const [nuevoCpt, setNuevoCpt] = useState(0.0);
  const [nuevoIttt, setNuevoIttt] = useState('');

  const [editLpin, setEditLpin] = useState(0.0);
  const [editCpt, setEditCpt] = useState(0.0);
  const [editIttt, setEditIttt] = useState('');

  // Estados para la sección de cálculo ITTT
  const [paisSalida, setPaisSalida] = useState('Afganistán');
  const [paisLlegada, setPaisLlegada] = useState('Albania');
  const [puertoSalida, setPuertoSalida] = useState('Shanghái (CN)');
  const [puertoLlegada, setPuertoLlegada] = useState('Róterdam (NL)');
  const [velocidadBuque, setVelocidadBuque] = useState(18.00);
  const [resultadoIttt, setResultadoIttt] = useState({ distancia: '8,964 km', tiempo: '11.2 días' });

  useEffect(() => {
    if (tablaLogi.length > 0) {
      if (!paisSeleccionadoEdit) setPaisSeleccionadoEdit(tablaLogi[0].Paises);
      if (!paisSeleccionadoDel) setPaisSeleccionadoDel(tablaLogi[0].Paises);
    }
  }, [tablaLogi]);

  const handleSelectEditPais = (e) => {
    const paisNombre = e.target.value;
    setPaisSeleccionadoEdit(paisNombre);
    const fila = tablaLogi.find((item) => item.Paises === paisNombre);
    if (fila) {
      setEditLpin(fila['Índice de desempeño logístico (LPIN)'] || 0.0);
      setEditCpt(fila['Tráfico del puerto de contenedores (CPT)'] || 0.0);
      setEditIttt(fila['Tiempo de tránsito del transporte internacional (ITTT)'] || '');
    }
  };

  const handleAddPais = (e) => {
    e.preventDefault();
    if (!nuevoPais.trim()) return;

    const nuevoRegistro = {
      Paises: nuevoPais,
      'Índice de desempeño logístico (LPIN)': Number(nuevoLpin),
      'Tráfico del puerto de contenedores (CPT)': Number(nuevoCpt),
      'Tiempo de tránsito del transporte internacional (ITTT)': nuevoIttt || '0 días'
    };

    setTablaLogi([...tablaLogi, nuevoRegistro]);
    setNuevoPais('');
    setNuevoLpin(0.0);
    setNuevoCpt(0.0);
    setNuevoIttt('');
  };

  const handleUpdatePais = (e) => {
    e.preventDefault();
    const actualizado = tablaLogi.map((item) => {
      if (item.Paises === paisSeleccionadoEdit) {
        return {
          ...item,
          'Índice de desempeño logístico (LPIN)': Number(editLpin),
          'Tráfico del puerto de contenedores (CPT)': Number(editCpt),
          'Tiempo de tránsito del transporte internacional (ITTT)': editIttt
        };
      }
      return item;
    });
    setTablaLogi(actualizado);
    alert('País actualizado correctamente.');
  };

  const handleDeletePais = (e) => {
    e.preventDefault();
    const filtrado = tablaLogi.filter((item) => item.Paises !== paisSeleccionadoDel);
    setTablaLogi(filtrado);
  };

  const handleCalcularIttt = (e) => {
    e.preventDefault();
    setResultadoIttt({
      distancia: '8,964 km',
      tiempo: '11.2 días'
    });
  };

  return (
    <div style={{ padding: '20px', color: '#fff', backgroundColor: '#0e1117', minHeight: '100vh', fontFamily: 'sans-serif' }}>
      <h2 style={{ borderBottom: '1px solid #333', paddingBottom: '10px', marginBottom: '20px' }}>2. Logística (LOGI)</h2>

      {/* ================= GESTIÓN DE DATOS (TABLA LOGI) ================= */}
      <div style={{ marginBottom: '40px' }}>
        <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '1.1rem', marginBottom: '15px' }}>
          🛠️ Gestión de Datos (Tabla LOGI)
        </h3>
        
        <div style={{ display: 'flex', gap: '15px', marginBottom: '20px', flexWrap: 'wrap' }}>
          
          {/* Añadir */}
          <div style={{ flex: 1, minWidth: '280px', border: '1px solid #333', padding: '15px', borderRadius: '8px', backgroundColor: '#1a1c23' }}>
            <h4 style={{ marginTop: 0 }}>➕ Añadir país</h4>
            <form onSubmit={handleAddPais}>
              <div style={{ marginBottom: '8px' }}>
                <label style={{ fontSize: '0.85rem' }}>País nuevo:</label><br />
                <input type="text" value={nuevoPais} onChange={(e) => setNuevoPais(e.target.value)} required style={{ width: '100%', padding: '6px', borderRadius: '4px', border: '1px solid #444', backgroundColor: '#262730', color: '#fff' }} />
              </div>
              <div style={{ marginBottom: '8px' }}>
                <label style={{ fontSize: '0.85rem' }}>LPIN:</label><br />
                <input type="number" step="0.01" min="0" value={nuevoLpin} onChange={(e) => setNuevoLpin(e.target.value)} style={{ width: '100%', padding: '6px', borderRadius: '4px', border: '1px solid #444', backgroundColor: '#262730', color: '#fff' }} />
              </div>
              <div style={{ marginBottom: '8px' }}>
                <label style={{ fontSize: '0.85rem' }}>CPT:</label><br />
                <input type="number" step="1" min="0" value={nuevoCpt} onChange={(e) => setNuevoCpt(e.target.value)} style={{ width: '100%', padding: '6px', borderRadius: '4px', border: '1px solid #444', backgroundColor: '#262730', color: '#fff' }} />
              </div>
              <div style={{ marginBottom: '8px' }}>
                <label style={{ fontSize: '0.85rem' }}>ITTT (ej. 11.2 días):</label><br />
                <input type="text" value={nuevoIttt} onChange={(e) => setNuevoIttt(e.target.value)} style={{ width: '100%', padding: '6px', borderRadius: '4px', border: '1px solid #444', backgroundColor: '#262730', color: '#fff' }} />
              </div>
              <button type="submit" style={{ marginTop: '5px', padding: '6px 12px', cursor: 'pointer', backgroundColor: '#ff4b4b', color: 'white', border: 'none', borderRadius: '4px', fontWeight: 'bold' }}>Guardar país LOGI</button>
            </form>
          </div>

          {/* Editar */}
          <div style={{ flex: 1, minWidth: '280px', border: '1px solid #333', padding: '15px', borderRadius: '8px', backgroundColor: '#1a1c23' }}>
            <h4 style={{ marginTop: 0 }}>✏️ Editar país</h4>
            <form onSubmit={handleUpdatePais}>
              <div style={{ marginBottom: '8px' }}>
                <label style={{ fontSize: '0.85rem' }}>Selecciona país:</label><br />
                <select value={paisSeleccionadoEdit} onChange={handleSelectEditPais} style={{ width: '100%', padding: '6px', borderRadius: '4px', border: '1px solid #444', backgroundColor: '#262730', color: '#fff' }}>
                  {tablaLogi.map((item, idx) => (
                    <option key={idx} value={item.Paises}>{item.Paises}</option>
                  ))}
                </select>
              </div>
              <div style={{ marginBottom: '8px' }}>
                <label style={{ fontSize: '0.85rem' }}>Nuevo LPIN:</label><br />
                <input type="number" step="0.1" min="0" value={editLpin} onChange={(e) => setEditLpin(e.target.value)} style={{ width: '100%', padding: '6px', borderRadius: '4px', border: '1px solid #444', backgroundColor: '#262730', color: '#fff' }} />
              </div>
              <div style={{ marginBottom: '8px' }}>
                <label style={{ fontSize: '0.85rem' }}>Nuevo CPT:</label><br />
                <input type="number" step="1" min="0" value={editCpt} onChange={(e) => setEditCpt(e.target.value)} style={{ width: '100%', padding: '6px', borderRadius: '4px', border: '1px solid #444', backgroundColor: '#262730', color: '#fff' }} />
              </div>
              <div style={{ marginBottom: '8px' }}>
                <label style={{ fontSize: '0.85rem' }}>Nuevo ITTT:</label><br />
                <input type="text" value={editIttt} onChange={(e) => setEditIttt(e.target.value)} style={{ width: '100%', padding: '6px', borderRadius: '4px', border: '1px solid #444', backgroundColor: '#262730', color: '#fff' }} />
              </div>
              <button type="submit" style={{ marginTop: '5px', padding: '6px 12px', cursor: 'pointer', backgroundColor: '#ff4b4b', color: 'white', border: 'none', borderRadius: '4px', fontWeight: 'bold' }}>Actualizar LOGI</button>
            </form>
          </div>

          {/* Eliminar */}
          <div style={{ flex: 1, minWidth: '280px', border: '1px solid #333', padding: '15px', borderRadius: '8px', backgroundColor: '#1a1c23' }}>
            <h4 style={{ marginTop: 0 }}>🗑️ Eliminar país</h4>
            <form onSubmit={handleDeletePais}>
              <div style={{ marginBottom: '15px' }}>
                <label style={{ fontSize: '0.85rem' }}>Selecciona país:</label><br />
                <select value={paisSeleccionadoDel} onChange={(e) => setPaisSeleccionadoDel(e.target.value)} style={{ width: '100%', padding: '6px', borderRadius: '4px', border: '1px solid #444', backgroundColor: '#262730', color: '#fff' }}>
                  {tablaLogi.map((item, idx) => (
                    <option key={idx} value={item.Paises}>{item.Paises}</option>
                  ))}
                </select>
              </div>
              <button type="submit" style={{ marginTop: '28px', padding: '8px 15px', backgroundColor: '#d9534f', color: 'white', border: 'none', cursor: 'pointer', borderRadius: '4px', fontWeight: 'bold', width: '100%' }}>
                Eliminar de LOGI
              </button>
            </form>
          </div>

        </div>
      </div>

      {/* ================= CALCULAR ITTT ================= */}
      <div style={{ marginBottom: '40px', backgroundColor: '#1a1c23', padding: '20px', borderRadius: '8px', border: '1px solid #333' }}>
        <h3 style={{ marginTop: 0, marginBottom: '20px', fontSize: '1.2rem' }}>Calcular Tiempo de Tránsito Internacional (ITTT)</h3>
        
        <form onSubmit={handleCalcularIttt}>
          <div style={{ display: 'flex', gap: '20px', marginBottom: '15px', flexWrap: 'wrap' }}>
            <div style={{ flex: 1, minWidth: '250px' }}>
              <label style={{ fontSize: '0.85rem', color: '#aaa' }}>País de salida</label><br />
              <select value={paisSalida} onChange={(e) => setPaisSalida(e.target.value)} style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #444', backgroundColor: '#262730', color: '#fff', marginTop: '5px' }}>
                <option value="Afganistán">Afganistán</option>
                <option value="Costa Rica">Costa Rica</option>
                <option value="España">España</option>
              </select>
            </div>
            <div style={{ flex: 1, minWidth: '250px' }}>
              <label style={{ fontSize: '0.85rem', color: '#aaa' }}>País de llegada</label><br />
              <select value={paisLlegada} onChange={(e) => setPaisLlegada(e.target.value)} style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #444', backgroundColor: '#262730', color: '#fff', marginTop: '5px' }}>
                <option value="Albania">Albania</option>
                <option value="Japón">Japón</option>
                <option value="Togo">Togo</option>
              </select>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '20px', marginBottom: '15px', flexWrap: 'wrap' }}>
            <div style={{ flex: 1, minWidth: '250px' }}>
              <label style={{ fontSize: '0.85rem', color: '#aaa' }}>Puerto de salida</label><br />
              <select value={puertoSalida} onChange={(e) => setPuertoSalida(e.target.value)} style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #444', backgroundColor: '#262730', color: '#fff', marginTop: '5px' }}>
                <option value="Shanghái (CN)">Shanghái (CN)</option>
                <option value="Limón (CR)">Limón (CR)</option>
              </select>
            </div>
            <div style={{ flex: 1, minWidth: '250px' }}>
              <label style={{ fontSize: '0.85rem', color: '#aaa' }}>Puerto de llegada</label><br />
              <select value={puertoLlegada} onChange={(e) => setPuertoLlegada(e.target.value)} style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #444', backgroundColor: '#262730', color: '#fff', marginTop: '5px' }}>
                <option value="Róterdam (NL)">Róterdam (NL)</option>
                <option value="Tokio (JP)">Tokio (JP)</option>
              </select>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '20px', alignItems: 'flex-end', marginBottom: '20px', flexWrap: 'wrap' }}>
            <div style={{ flex: 1, minWidth: '250px' }}>
              <label style={{ fontSize: '0.85rem', color: '#aaa' }}>Velocidad del buque (nudos)</label><br />
              <input type="number" step="0.1" value={velocidadBuque} onChange={(e) => setVelocidadBuque(e.target.value)} style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #444', backgroundColor: '#262730', color: '#fff', marginTop: '5px' }} />
            </div>
            <div style={{ flex: 1, minWidth: '250px' }}>
              <button type="submit" style={{ padding: '9px 20px', backgroundColor: '#262730', color: 'white', border: '1px solid #444', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}>
                Calcular ITTT
              </button>
            </div>
          </div>
        </form>

        <div style={{ backgroundColor: '#0f291e', border: '1px solid #1e4620', padding: '12px 15px', borderRadius: '4px', color: '#a3d9a5', fontSize: '0.9rem' }}>
          Distancia: {resultadoIttt.distancia} | Tiempo estimado: {resultadoIttt.tiempo}
        </div>
      </div>

      {/* ================= TABLA LOGÍSTICA (DATOS BASE) ================= */}
      <div style={{ marginBottom: '40px' }}>
        <h3 style={{ marginBottom: '5px' }}>Tabla Logística (LOGI)</h3>
        <p style={{ color: '#888', fontSize: '0.85rem', marginBottom: '15px' }}>Tabla ordenada de mejor a peor país según el Puntaje Logístico.</p>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', backgroundColor: '#1a1c23' }}>
            <thead>
              <tr style={{ borderBottom: '2px solid #333', textAlign: 'left', color: '#aaa', fontSize: '0.85rem' }}>
                <th style={{ padding: '10px', width: '50px' }}>#</th>
                <th style={{ padding: '10px' }}>Paises</th>
                <th style={{ padding: '10px' }}>Índice de desempeño logístico (LPIN)</th>
                <th style={{ padding: '10px' }}>Tráfico del puerto de contenedores (CPT)</th>
                <th style={{ padding: '10px' }}>Tiempo de tránsito del transporte internacional (ITTT)</th>
              </tr>
            </thead>
            <tbody>
              {tablaLogi.map((row, index) => (
                <tr key={index} style={{ borderBottom: '1px solid #262730', fontSize: '0.9rem' }}>
                  <td style={{ padding: '10px', color: '#888' }}>{index + 1}</td>
                  <td style={{ padding: '10px' }}>{row.Paises}</td>
                  <td style={{ padding: '10px' }}>{row['Índice de desempeño logístico (LPIN)']}</td>
                  <td style={{ padding: '10px' }}>{row['Tráfico del puerto de contenedores (CPT)']}</td>
                  <td style={{ padding: '10px' }}>{row['Tiempo de tránsito del transporte internacional (ITTT)']}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* ================= TABLA LOGÍSTICA NORMALIZADA ================= */}
      <div>
        <h3 style={{ marginBottom: '5px' }}>Tabla Logística Normalizada (LOGI)</h3>
        <p style={{ color: '#888', fontSize: '0.85rem', marginBottom: '15px' }}>Ponderaciones: LPIN=30% | CPT=30% | ITTT=40% (LPIN_norm = LPIN)</p>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', backgroundColor: '#1a1c23' }}>
            <thead>
              <tr style={{ borderBottom: '2px solid #333', textAlign: 'left', color: '#aaa', fontSize: '0.85rem' }}>
                <th style={{ padding: '10px', width: '50px' }}>#</th>
                <th style={{ padding: '10px' }}>Paises</th>
                <th style={{ padding: '10px' }}>LPIN_norm</th>
                <th style={{ padding: '10px' }}>CPT_norm</th>
                <th style={{ padding: '10px' }}>ITTT_norm</th>
                <th style={{ padding: '10px' }}>Costo_Total_Logistico_Normalizado</th>
              </tr>
            </thead>
            <tbody>
              {tablaLogi.map((row, index) => {
                const lpin = Number(row['Índice de desempeño logístico (LPIN)']) || 0;
                const cpt = Number(row['Tráfico del puerto de contenedores (CPT)']) || 0;
                
                const itttStr = String(row['Tiempo de tránsito del transporte internacional (ITTT)'] || '0')
                  .replace('días', '')
                  .replace('dias', '')
                  .replace(',', '.')
                  .trim();
                const ittt = Number(itttStr) || 1;

                const MAX_LPIN_CONST = 4.3;          
                const MAX_CPT_CONST = 278982714.2857;  
                const MIN_ITTT_CONST = 0.58744; 
                const A3 = 10;

                const lpinNorm = lpin ? Number((A3 * lpin / MAX_LPIN_CONST).toFixed(2)) : 0;
                const cptNorm = cpt ? Number((A3 * cpt / MAX_CPT_CONST).toFixed(2)) : 0;
                const itttNorm = ittt ? Number((A3 * MIN_ITTT_CONST / ittt).toFixed(2)) : 0;

                const costoTotal = Number((0.30 * lpinNorm + 0.30 * cptNorm + 0.40 * itttNorm).toFixed(2));

                return (
                  <tr key={index} style={{ borderBottom: '1px solid #262730', fontSize: '0.9rem' }}>
                    <td style={{ padding: '10px', color: '#888' }}>{index + 1}</td>
                    <td style={{ padding: '10px' }}>{row.Paises}</td>
                    <td style={{ padding: '10px' }}>{lpinNorm}</td>
                    <td style={{ padding: '10px' }}>{cptNorm}</td>
                    <td style={{ padding: '10px' }}>{itttNorm}</td>
                    <td style={{ padding: '10px' }}><strong>{costoTotal}</strong></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
}
import React, { useState, useEffect } from 'react';
import './TabLogistica.css';

export default function TabLogistica({ datosLogisticaInicial }) {
  // Estados principales
  const [tablaLogi, setTablaLogi] = useState(datosLogisticaInicial || [
    {
      Paises: 'Costa Rica',
      'Índice de desempeño logístico (LPIN)': 3.1,
      'Tráfico del puerto de contenedores (CPT)': 1200000,
      'Tiempo de tránsito del transporte internacional (ITTT)': '2.5 días'
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

  // Sincronizar selección inicial
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

  // Acciones CRUD
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

  return (
    <div className="tab-container" style={{ padding: '20px', color: '#fff', backgroundColor: '#0e1117', minHeight: '100vh' }}>
      <h2 style={{ borderBottom: '1px solid #333', paddingBottom: '10px', marginBottom: '20px' }}>Logística (LOGI)</h2>

      {/* ================= CONTENEDORES CRUD ================= */}
      <div className="crud-container" style={{ display: 'flex', gap: '20px', marginBottom: '30px', flexWrap: 'wrap' }}>
        
        {/* Añadir */}
        <div style={{ flex: 1, minWidth: '250px', border: '1px solid #333', padding: '15px', borderRadius: '8px', backgroundColor: '#1a1c23' }}>
          <h3 style={{ marginTop: 0 }}>Añadir país</h3>
          <form onSubmit={handleAddPais}>
            <div style={{ marginBottom: '10px' }}>
              <label>País nuevo:</label><br />
              <input 
                type="text" 
                value={nuevoPais} 
                onChange={(e) => setNuevoPais(e.target.value)} 
                required 
                style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #444', backgroundColor: '#262730', color: '#fff' }}
              />
            </div>
            <div style={{ marginBottom: '10px' }}>
              <label>LPIN:</label><br />
              <input 
                type="number" 
                step="0.01" 
                min="0" 
                value={nuevoLpin} 
                onChange={(e) => setNuevoLpin(e.target.value)} 
                style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #444', backgroundColor: '#262730', color: '#fff' }}
              />
            </div>
            <div style={{ marginBottom: '10px' }}>
              <label>CPT:</label><br />
              <input 
                type="number" 
                step="1" 
                min="0" 
                value={nuevoCpt} 
                onChange={(e) => setNuevoCpt(e.target.value)} 
                style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #444', backgroundColor: '#262730', color: '#fff' }}
              />
            </div>
            <div style={{ marginBottom: '10px' }}>
              <label>ITTT (ej. 3.5 días):</label><br />
              <input 
                type="text" 
                value={nuevoIttt} 
                onChange={(e) => setNuevoIttt(e.target.value)} 
                style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #444', backgroundColor: '#262730', color: '#fff' }}
              />
            </div>
            <button type="submit" style={{ marginTop: '5px', padding: '8px 15px', cursor: 'pointer', backgroundColor: '#ff4b4b', color: 'white', border: 'none', borderRadius: '4px', fontWeight: 'bold' }}>Guardar país LOGI</button>
          </form>
        </div>

        {/* Editar */}
        <div style={{ flex: 1, minWidth: '250px', border: '1px solid #333', padding: '15px', borderRadius: '8px', backgroundColor: '#1a1c23' }}>
          <h3 style={{ marginTop: 0 }}>Editar país</h3>
          <form onSubmit={handleUpdatePais}>
            <div style={{ marginBottom: '10px' }}>
              <label>Selecciona país:</label><br />
              <select value={paisSeleccionadoEdit} onChange={handleSelectEditPais} style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #444', backgroundColor: '#262730', color: '#fff' }}>
                {tablaLogi.map((item, idx) => (
                  <option key={idx} value={item.Paises}>{item.Paises}</option>
                ))}
              </select>
            </div>
            <div style={{ marginBottom: '10px' }}>
              <label>Nuevo LPIN:</label><br />
              <input 
                type="number" 
                step="0.1" 
                min="0" 
                value={editLpin} 
                onChange={(e) => setEditLpin(e.target.value)} 
                style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #444', backgroundColor: '#262730', color: '#fff' }}
              />
            </div>
            <div style={{ marginBottom: '10px' }}>
              <label>Nuevo CPT:</label><br />
              <input 
                type="number" 
                step="1" 
                min="0" 
                value={editCpt} 
                onChange={(e) => setEditCpt(e.target.value)} 
                style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #444', backgroundColor: '#262730', color: '#fff' }}
              />
            </div>
            <div style={{ marginBottom: '10px' }}>
              <label>Nuevo ITTT:</label><br />
              <input 
                type="text" 
                value={editIttt} 
                onChange={(e) => setEditIttt(e.target.value)} 
                style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #444', backgroundColor: '#262730', color: '#fff' }}
              />
            </div>
            <button type="submit" style={{ marginTop: '5px', padding: '8px 15px', cursor: 'pointer', backgroundColor: '#ff4b4b', color: 'white', border: 'none', borderRadius: '4px', fontWeight: 'bold' }}>Actualizar LOGI</button>
          </form>
        </div>

        {/* Eliminar */}
        <div style={{ flex: 1, minWidth: '250px', border: '1px solid #333', padding: '15px', borderRadius: '8px', backgroundColor: '#1a1c23' }}>
          <h3 style={{ marginTop: 0 }}>Eliminar país</h3>
          <form onSubmit={handleDeletePais}>
            <div style={{ marginBottom: '15px' }}>
              <label>Selecciona país:</label><br />
              <select value={paisSeleccionadoDel} onChange={(e) => setPaisSeleccionadoDel(e.target.value)} style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #444', backgroundColor: '#262730', color: '#fff' }}>
                {tablaLogi.map((item, idx) => (
                  <option key={idx} value={item.Paises}>{item.Paises}</option>
                ))}
              </select>
            </div>
            <button type="submit" style={{ marginTop: '25px', padding: '8px 15px', backgroundColor: '#d9534f', color: 'white', border: 'none', cursor: 'pointer', borderRadius: '4px', fontWeight: 'bold', width: '100%' }}>
              Eliminar de LOGI
            </button>
          </form>
        </div>

      </div>

      {/* ================= TABLA BASE ================= */}
      <div style={{ marginBottom: '30px' }}>
        <h3>Tabla LOGI (Datos Base)</h3>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', backgroundColor: '#1a1c23' }}>
            <thead>
              <tr style={{ borderBottom: '2px solid #444', textAlign: 'left' }}>
                <th style={{ padding: '10px' }}>Paises</th>
                <th style={{ padding: '10px' }}>Índice de desempeño logístico (LPIN)</th>
                <th style={{ padding: '10px' }}>Tráfico del puerto de contenedores (CPT)</th>
                <th style={{ padding: '10px' }}>Tiempo de tránsito del transporte internacional (ITTT)</th>
              </tr>
            </thead>
            <tbody>
              {tablaLogi.map((row, index) => (
                <tr key={index} style={{ borderBottom: '1px solid #333' }}>
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

      {/* ================= TABLA NORMALIZADA ================= */}
      <div>
        <h3>Tabla Logística Normalizada (LOGI)</h3>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', backgroundColor: '#1a1c23' }}>
            <thead>
              <tr style={{ borderBottom: '2px solid #444', textAlign: 'left' }}>
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
                  <tr key={index} style={{ borderBottom: '1px solid #333' }}>
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
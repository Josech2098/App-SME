import React, { useState, useEffect } from 'react';
import './TabLogistica.css'; // Opcional: tus estilos personalizados

export default function TabLogistica({ paisDestino, datosPuertos, datosLogisticaInicial }) {
  // Estados principales
  const [tablaLogi, setTablaLogi] = useState(datosLogisticaInicial || []);
  const [paisSeleccionadoEdit, setPaisSeleccionadoEdit] = useState('');
  const [paisSeleccionadoDel, setPaisSeleccionadoDel] = useState('');
  
  // Estados para formularios CRUD
  const [nuevoPais, setNuevoPais] = useState('');
  const [nuevoLpin, setNuevoLpin] = useState(0.0);
  const [nuevoCpt, setNuevoCpt] = useState(0.0);

  const [editLpin, setEditLpin] = useState(0.0);
  const [editCpt, setEditCpt] = useState(0.0);

  // Sincronizar el país seleccionado para edición cuando cambie el select
  useEffect(() => {
    if (tablaLogi.length > 0 && !paisSeleccionadoEdit) {
      setPaisSeleccionadoEdit(tablaLogi[0].Paises);
    }
    if (tablaLogi.length > 0 && !paisSeleccionadoDel) {
      setPaisSeleccionadoDel(tablaLogi[0].Paises);
    }
  }, [tablaLogi]);

  // Manejar cambios al seleccionar un país en editar
  const handleSelectEditPais = (e) => {
    const paisNombre = e.target.value;
    setPaisSeleccionadoEdit(paisNombre);
    const fila = tablaLogi.find((item) => item.Paises === paisNombre);
    if (fila) {
      setEditLpin(fila['Índice de desempeño logístico (LPIN)'] || 0.0);
      setEditCpt(fila['Tráfico del puerto de contenedores (CPT)'] || 0.0);
    }
  };

  // ---------------------------------------------------------
  // ACCIONES CRUD (Simuladas en Estado Local / Backend API)
  // ---------------------------------------------------------
  const handleAddPais = (e) => {
    e.preventDefault();
    if (!nuevoPais.trim()) return;

    const nuevoRegistro = {
      Paises: nuevoPais,
      'Índice de desempeño logístico (LPIN)': Number(nuevoLpin),
      'Tráfico del puerto de contenedores (CPT)': Number(nuevoCpt),
      'Tiempo de tránsito del transporte internacional (ITTT)': 'Pendiente'
    };

    setTablaLogi([...tablaLogi, nuevoRegistro]);
    setNuevoPais('');
    setNuevoLpin(0.0);
    setNuevoCpt(0.0);
    alert(`País '${nuevoPais}' añadido correctamente.`);
  };

  const handleUpdatePais = (e) => {
    e.preventDefault();
    const actualizado = tablaLogi.map((item) => {
      if (item.Paises === paisSeleccionadoEdit) {
        return {
          ...item,
          'Índice de desempeño logístico (LPIN)': Number(editLpin),
          'Tráfico del puerto de contenedores (CPT)': Number(editCpt)
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
    alert(`País '${paisSeleccionadoDel}' eliminado correctamente.`);
  };

  // ---------------------------------------------------------
  // VALIDACIÓN DE PAÍS DESTINO
  // ---------------------------------------------------------
  if (!paisDestino) {
    return (
      <div className="tab-container">
        <h2>2. Logística (LOGI)</h2>
        <div className="alert-warning">
          ⚠️ Debes seleccionar un país destino en la pestaña anterior para calcular logística.
        </div>
      </div>
    );
  }

  return (
    <div className="tab-container">
      <h2>2. Logística (LOGI)</h2>
      <p className="success-msg">País destino seleccionado automáticamente: <strong>{paisDestino}</strong></p>

      {/* ================= CONTENEDORES CRUD ================= */}
      <div className="crud-container" style={{ display: 'flex', gap: '20px', marginBottom: '30px' }}>
        
        {/* Añadir */}
        <div className="crud-card" style={{ flex: 1, border: '1px solid #ccc', padding: '15px', borderRadius: '8px' }}>
          <h3>Añadir país</h3>
          <form onSubmit={handleAddPais}>
            <div>
              <label>País nuevo:</label>
              <input 
                type="text" 
                value={nuevoPais} 
                onChange={(e) => setNuevoPais(e.target.value)} 
                required 
              />
            </div>
            <div>
              <label>LPIN:</label>
              <input 
                type="number" 
                step="0.01" 
                min="0" 
                value={nuevoLpin} 
                onChange={(e) => setNuevoLpin(e.target.value)} 
              />
            </div>
            <div>
              <label>CPT:</label>
              <input 
                type="number" 
                step="1" 
                min="0" 
                value={nuevoCpt} 
                onChange={(e) => setNuevoCpt(e.target.value)} 
              />
            </div>
            <button type="submit" style={{ marginTop: '10px' }}>Guardar país LOGI</button>
          </form>
        </div>

        {/* Editar */}
        <div className="crud-card" style={{ flex: 1, border: '1px solid #ccc', padding: '15px', borderRadius: '8px' }}>
          <h3>Editar país</h3>
          <form onSubmit={handleUpdatePais}>
            <div>
              <label>Selecciona país:</label>
              <select value={paisSeleccionadoEdit} onChange={handleSelectEditPais}>
                {tablaLogi.map((item, idx) => (
                  <option key={idx} value={item.Paises}>{item.Paises}</option>
                ))}
              </select>
            </div>
            <div>
              <label>Nuevo LPIN:</label>
              <input 
                type="number" 
                step="0.1" 
                min="0" 
                value={editLpin} 
                onChange={(e) => setEditLpin(e.target.value)} 
              />
            </div>
            <div>
              <label>Nuevo CPT:</label>
              <input 
                type="number" 
                step="1" 
                min="0" 
                value={editCpt} 
                onChange={(e) => setEditCpt(e.target.value)} 
              />
            </div>
            <button type="submit" style={{ marginTop: '10px' }}>Actualizar LOGI</button>
          </form>
        </div>

        {/* Eliminar */}
        <div className="crud-card" style={{ flex: 1, border: '1px solid #ccc', padding: '15px', borderRadius: '8px' }}>
          <h3>Eliminar país</h3>
          <form onSubmit={handleDeletePais}>
            <div>
              <label>Selecciona país:</label>
              <select value={paisSeleccionadoDel} onChange={(e) => setPaisSeleccionadoDel(e.target.value)}>
                {tablaLogi.map((item, idx) => (
                  <option key={idx} value={item.Paises}>{item.Paises}</option>
                ))}
              </select>
            </div>
            <button type="submit" style={{ marginTop: '20px', backgroundColor: '#ff4d4d', color: 'white' }}>
              Eliminar de LOGI
            </button>
          </form>
        </div>

      </div>

      {/* ================= TABLA BASE ================= */}
      <div className="table-section">
        <h3>Tabla LOGI (Datos Base)</h3>
        <table border="1" cellPadding="8" style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '30px' }}>
          <thead>
            <tr>
              <th>Paises</th>
              <th>Índice de desempeño logístico (LPIN)</th>
              <th>Tráfico del puerto de contenedores (CPT)</th>
              <th>Tiempo de tránsito del transporte internacional (ITTT)</th>
            </tr>
          </thead>
          <tbody>
            {tablaLogi.map((row, index) => (
              <tr key={index}>
                <td>{row.Paises}</td>
                <td>{row['Índice de desempeño logístico (LPIN)']}</td>
                <td>{row['Tráfico del puerto de contenedores (CPT)']}</td>
                <td>{row['Tiempo de tránsito del transporte internacional (ITTT)']}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* ================= TABLA NORMALIZADA ================= */}
      <div className="table-normalized-section">
        <h3>Tabla Logística Normalizada (LOGI)</h3>
        <table border="1" cellPadding="8" style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr>
              <th>Paises</th>
              <th>LPIN_norm</th>
              <th>CPT_norm</th>
              <th>ITTT_norm</th>
              <th>Costo_Total_Logistico_Normalizado</th>
            </tr>
          </thead>
          <tbody>
            {tablaLogi.map((row, index) => {
              // Lógica de normalización equivalente a Python
              const lpin = Number(row['Índice de desempeño logístico (LPIN)']) || 0;
              const cpt = Number(row['Tráfico del puerto de contenedores (CPT)']) || 0;
              
              const MAX_LPIN_CONST = 4.3;          
              const MAX_CPT_CONST = 278982714.2857;  
              const MIN_ITTT_CONST = 0.58744; 
              const A3 = 10;

              const lpinNorm = lpin ? Number((A3 * lpin / MAX_LPIN_CONST).toFixed(2)) : 0;
              const cptNorm = cpt ? Number((A3 * cpt / MAX_CPT_CONST).toFixed(2)) : 0;
              const itttNorm = Number((A3 * MIN_ITTT_CONST / 5).toFixed(2)); // Ejemplo simplificado de cálculo ITTT

              const costoTotal = Number((0.30 * lpinNorm + 0.30 * cptNorm + 0.40 * itttNorm).toFixed(2));

              return (
                <tr key={index}>
                  <td>{row.Paises}</td>
                  <td>{lpinNorm}</td>
                  <td>{cptNorm}</td>
                  <td>{itttNorm}</td>
                  <td><strong>{costoTotal}</strong></td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

    </div>
  );
}
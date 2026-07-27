# main.py
from fastapi import FastAPI, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional, List, Dict, Any
from sqlalchemy import create_engine, text
import pandas as pd
import os

app = FastAPI(title="Sistema SMI API")

# Permitir solicitudes desde el Frontend de React
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],  # Puerto por defecto de Vite
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 1. Conexión a Base de Datos (PostgreSQL / Supabase)
DATABASE_URL = os.getenv(
    "DATABASE_URL", 
    "postgresql://postgres.biiybglgprqijpkmzztn:Sukppj412000@aws-0-eu-central-1.pooler.supabase.com:6543/postgres"
)

engine = create_engine(
    DATABASE_URL,
    pool_size=5,
    max_overflow=10,
    pool_pre_ping=True,
    connect_args={"connect_timeout": 10}
)

# Modelos Pydantic para validar datos de entrada
class ProductoCreate(BaseModel):
    codigo_hs: Optional[str] = None
    nombre: str
    categoria: Optional[str] = None


# --- ENDPOINTS ---

# 2. Cargar lista de productos
@app.get("/api/productos")
def listar_productos():
    try:
        query = text("SELECT id, codigo_hs, nombre, categoria FROM productos ORDER BY nombre ASC;")
        with engine.connect() as conn:
            df = pd.read_sql(query, conn)
            # Reemplazar valores NaN por None para evitar JSONs inválidos
            df = df.where(pd.notnull(df), None)
            return df.to_dict(orient="records")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error en la BD: {str(e)}")

# 3. Insertar un nuevo producto
@app.post("/api/productos", status_code=status.HTTP_201_CREATED)
def crear_producto(producto: ProductoCreate):
    if not producto.nombre.strip():
        raise HTTPException(status_code=400, detail="El nombre del producto es obligatorio.")
    
    try:
        query = text("""
            INSERT INTO productos (codigo_hs, nombre, categoria)
            VALUES (:codigo_hs, :nombre, :categoria);
        """)
        with engine.begin() as conn:
            conn.execute(query, {
                "codigo_hs": producto.codigo_hs.strip() if producto.codigo_hs else None,
                "nombre": producto.nombre.strip(),
                "categoria": producto.categoria.strip() if producto.categoria else None
            })
        return {"mensaje": f"Producto '{producto.nombre}' creado exitosamente"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error al guardar: {str(e)}")

# 4. Cargar matriz del producto
@app.get("/api/productos/{producto_id}/matriz")
def obtener_matriz_producto(producto_id: int):
    try:
        query = text("""
            SELECT 
                p.nombre AS "Paises",
                ppc.precio_origen AS "PPAO",
                ppc."impuesto_importación" AS "INTC",
                ppc.costo_embalaje AS "CEBC",
                ip.distancia_km, 
                ip.costo_transporte, 
                ip.arancel_porcentaje,
                ip.inra, ip.inan, ip.dgdp, 
                ip.fsi, ip.inri, ip.dein,
                ip.glin, ip.cpci, ip.cudi
            FROM paises p
            LEFT JOIN producto_pais_costos ppc 
                ON p.id = ppc.pais_id AND ppc.producto_id = :prod_id
            LEFT JOIN indicadores_pais ip 
                ON p.id = ip.pais_id
            ORDER BY p.nombre ASC;
        """)
        with engine.connect() as conn:
            df = pd.read_sql(query, conn, params={"prod_id": producto_id})
            df = df.where(pd.notnull(df), None)
            return df.to_dict(orient="records")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error al obtener matriz: {str(e)}")
    
    # Muestra un mensaje simple al entrar a http://127.0.0.1:8000/
@app.get("/")
def home():
    return {"mensaje": "API del Sistema SMI en ejecución. Visita /docs para la documentación."}
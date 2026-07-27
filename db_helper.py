import streamlit as st
import pandas as pd
from sqlalchemy import create_engine, text

# 1. Configuración del motor de conexión a Supabase
@st.cache_resource
def get_db_engine():
    connection_url = None
    
    # Intentar obtener credenciales de st.secrets de manera segura
    try:
        if "DATABASE_URL" in st.secrets:
            connection_url = st.secrets["DATABASE_URL"]
        elif "postgres" in st.secrets:
            db_cfg = st.secrets["postgres"]
            connection_url = f"postgresql://{db_cfg['user']}:{db_cfg['password']}@{db_cfg['host']}:{db_cfg['port']}/{db_cfg['database']}"
    except Exception:
        # Si Streamlit falla al buscar secrets.toml en Windows, capturamos el error
        connection_url = None

    # Si no se obtuvieron de secrets, usar la URL de respaldo directo
    if not connection_url:
        connection_url = "postgresql://postgres.biiybglgprqijpkmzztn:Sukppj412000@aws-0-eu-central-1.pooler.supabase.com:6543/postgres"

    try:
        return create_engine(
            connection_url,
            pool_size=5,
            max_overflow=10,
            pool_pre_ping=True,
            connect_args={"connect_timeout": 10}
        )
    except Exception as e:
        st.error(f"❌ Error al conectar con Supabase: {e}")
        st.stop()

# 2. Cargar lista de productos
@st.cache_data(ttl=300)
def cargar_productos():
    try:
        engine = get_db_engine()
        query = text("SELECT id, codigo_hs, nombre, categoria FROM productos ORDER BY nombre ASC;")
        with engine.connect() as conn:
            return pd.read_sql(query, conn)
    except Exception as e:
        st.error(f"Error al cargar productos desde la base de datos: {e}")
        return pd.DataFrame()

# 3. Cargar matriz del producto
@st.cache_data(ttl=60)
def cargar_matriz_producto(producto_id):
    try:
        engine = get_db_engine()
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
            return pd.read_sql(query, conn, params={"prod_id": producto_id})
    except Exception as e:
        st.error(f"Error al cargar la matriz del producto: {e}")
        return pd.DataFrame()

# 4. Insertar un nuevo producto
def insertar_producto(codigo_hs, nombre, categoria):
    engine = get_db_engine()
    query = text("""
        INSERT INTO productos (codigo_hs, nombre, categoria)
        VALUES (:codigo_hs, :nombre, :categoria);
    """)
    with engine.begin() as conn:
        conn.execute(query, {
            "codigo_hs": codigo_hs,
            "nombre": nombre,
            "categoria": categoria
        })
// Diccionario de códigos ISO de dos letras para cada país
const codigosISO = {
  'Albania': 'al',
  'Alemania': 'de',
  'Antigua y Barbuda': 'ag',
  'Argentina': 'ar',
  'Armenia': 'am',
  'Australia': 'au',
  'Austria': 'at',
  'Bangladés': 'bd',
  'España': 'es',
  'Colombia': 'co',
  'México': 'mx',
  'Chile': 'cl',
  'Perú': 'pe',
  'Estados Unidos': 'us',
  'Francia': 'fr',
  'Italia': 'it',
  'China': 'cn',
  'Japón': 'jp',
  'Brasil': 'br',
  'Ecuador': 'ec',
  'Costa Rica': 'cr',
  'Panamá': 'pa',
  'Angola': 'ao',
  'Nigeria': 'ng',
  'Vietnam': 'vn',
  'Serbia': 'rs',
  'Ucrania': 'ua',
  'Bosnia y Herzegovina': 'ba',
  'República Checa': 'cz',
  'Tanzania': 'tz',
  'Camboya': 'kh',
  // Puedes añadir más países de tu base de datos aquí
};

export const obtenerCodigoISO = (nombrePais) => {
  if (!nombrePais) return null;
  const normalizado = nombrePais.trim();
  return codigosISO[normalizado] || null;
};

export const renderPaisConBandera = (nombrePais) => {
  if (!nombrePais) return '';
  const codigo = obtenerCodigoISO(nombrePais);

  if (!codigo) {
    return (
      <span className="inline-flex items-center gap-2">
        <span>🏳️</span>
        <span>{nombrePais}</span>
      </span>
    );
  }

  return (
    <span className="inline-flex items-center gap-2">
      <img 
        src={`https://flagcdn.com/20x15/${codigo}.png`} 
        alt={nombrePais} 
        className="w-5 h-3.5 object-cover rounded-[2px] shadow-sm inline-block"
      />
      <span>{nombrePais}</span>
    </span>
  );
};
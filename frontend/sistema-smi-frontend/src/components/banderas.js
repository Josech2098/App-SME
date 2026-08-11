export const obtenerBandera = (nombrePais) => {
  if (!nombrePais) return '🏳️';
  const normalizado = nombrePais.trim();
  const banderas = {
    'España': '🇪🇸',
    'Colombia': '🇨🇴',
    'México': '🇲🇽',
    'Argentina': '🇦🇷',
    'Chile': '🇨🇱',
    'Perú': '🇵🇪',
    'Estados Unidos': '🇺🇸',
    'Francia': '🇫🇷',
    'Alemania': '🇩🇪',
    'Italia': '🇮🇹',
    'China': '🇨🇳',
    'Japón': '🇯🇵',
    'Brasil': '🇧🇷',
    'Ecuador': '🇪🇨',
    'Costa Rica': '🇨🇷',
    'Panamá': '🇵🇦',
    'Angola': '🇦🇴',
    'Nigeria': '🇳🇬',
    'Vietnam': '🇻🇳',
    'Serbia': '🇷🇸',
    'Ucrania': '🇺🇦',
    'Bosnia y Herzegovina': '🇧🇦',
    'República Checa': '🇨🇿',
    'Tanzania': '🇹🇿',
    'Camboya': '🇰🇭',
    // Puedes añadir más países de tu base de datos aquí
  };
  return banderas[normalizado] || '🏳️';
};

export const renderPaisConBandera = (nombrePais) => {
  return `${obtenerBandera(nombrePais)} ${nombrePais || ''}`;
};
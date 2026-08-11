// Diccionario completo de países en español a sus códigos ISO (minúsculas)
const codigosISO = {
  // A
  'afganistán': 'af', 'albania': 'al', 'alemania': 'de', 'andorra': 'ad', 'angola': 'ao',
  'antigua y barbuda': 'ag', 'arabia saudita': 'sa', 'argelia': 'dz', 'argentina': 'ar',
  'armenia': 'am', 'australia': 'au', 'austria': 'at', 'azerbaiyán': 'az',
  // B
  'bahamas': 'bs', 'bangladés': 'bd', 'barbados': 'bb', 'barréin': 'bh', 'bélgica': 'be',
  'belice': 'bz', 'benín': 'bj', 'bielorrusia': 'by', 'birmania': 'mm', 'bolivia': 'bo',
  'bosnia y herzegovina': 'ba', 'botsuana': 'bw', 'brasil': 'br', 'Brunéi': 'bn',
  'bulgaria': 'bg', 'burkina faso': 'bf', 'burundi': 'bi', 'bután': 'bt',
  // C
  'cabo verde': 'cv', 'camboya': 'kh', 'camerún': 'cm', 'canadá': 'ca', 'catar': 'qa',
  'chad': 'td', 'chile': 'cl', 'china': 'cn', 'chipre': 'cy', 'ciudad del vaticano': 'va',
  'colombia': 'co', 'comoras': 'km', 'corea del norte': 'kp', 'corea del sur': 'kr',
  'cota de marfil': 'ci', 'costa rica': 'cr', 'croacia': 'hr', 'cuba': 'cu',
  // D
  'dinamarca': 'dk', 'dominica': 'dm', 'republica dominicana': 'do',
  // E
  'ecuador': 'ec', 'egipto': 'eg', 'el salvador': 'sv', 'emiratos árabes unidos': 'ae',
  'eritrea': 'er', 'eslovaquia': 'sk', 'eslovenia': 'si', 'españa': 'es',
  'estados unidos': 'us', 'estonia': 'ee', 'etiopía': 'et',
  // F
  'filipinas': 'ph', 'finlandia': 'fi', 'fiyi': 'fj', 'francia': 'fr',
  // G
  'gabón': 'ga', 'gambia': 'gm', 'georgia': 'ge', 'ghana': 'gh', 'granada': 'gd',
  'grecia': 'gr', 'guatemala': 'gt', 'guinea': 'gn', 'guinea ecuatorial': 'gq',
  'guinea-bissau': 'gw', 'guyana': 'gy',
  // H
  'haití': 'ht', 'honduras': 'hn', 'hungría': 'hu',
  // I
  'india': 'in', 'indonesia': 'id', 'irak': 'iq', 'irán': 'ir', 'irlanda': 'ie',
  'islandia': 'is', 'isillas marshall': 'mh', 'islas salomón': 'sb', 'israel': 'il',
  'italia': 'it',
  // J
  'jamaica': 'jm', 'japón': 'jp', 'jordania': 'jo',
  // K
  'kazajistán': 'kz', 'kenia': 'ke', 'kirguistán': 'kg', 'kiribati': 'ki', 'kuwait': 'kw',
  // L
  'laos': 'la', 'lesoto': 'ls', 'letonia': 'lv', 'líbano': 'lb', 'liberia': 'lr',
  'libia': 'ly', 'liechtenstein': 'li', 'lituania': 'lt', 'luxemburgo': 'lu',
  // M
  'macedonia del norte': 'mk', 'madagascar': 'mg', 'malasia': 'my', 'malaui': 'mw',
  'maldivas': 'mv', 'malí': 'ml', 'malta': 'mt', 'marruecos': 'ma', 'mauricio': 'mu',
  'mauritania': 'mr', 'méxico': 'mx', 'micronesia': 'fm', 'moldavia': 'md', 'mónaco': 'mc',
  'mongolia': 'mn', 'montenegro': 'me', 'mozambique': 'mz',
  // N
  'namibia': 'na', 'nauru': 'nr', 'nepal': 'np', 'nicaragua': 'ni', 'níger': 'ne',
  'nigeria': 'ng', 'noruega': 'no', 'nueva zelanda': 'nz',
  // O
  'omán': 'om',
  // P
  'países bajos': 'nl', 'pakistán': 'pk', 'palaos': 'pw', 'panamá': 'pa',
  'papúa nueva guinea': 'pg', 'paraguay': 'py', 'perú': 'pe', 'polonia': 'pl',
  'portugal': 'pt', 'reino unido': 'gb',
  // R
  'república centroafricana': 'cf', 'república checa': 'cz',
  'república del congo': 'cg', 'república democrática del congo': 'cd',
  'ruanda': 'rw', 'rumania': 'ro', 'rusia': 'ru',
  // S
  'samoa': 'ws', 'san cristóbal y nieves': 'kn', 'san marino': 'sm',
  'san vicente y las granadinas': 'vc', 'santa lucía': 'lc', 'santo tomé y príncipe': 'st',
  'senegal': 'sn', 'serbia': 'rs', 'seychelles': 'sc', 'sierra leona': 'sl',
  'singapur': 'sg', 'siria': 'sy', 'somalia': 'so', 'sri lanka': 'lk',
  'suazilandia': 'sz', 'sudáfrica': 'za', 'sudán': 'sd', 'sudán del sur': 'ss',
  'suecia': 'se', 'suiza': 'ch', 'surinam': 'sr',
  // T
  'tailandia': 'th', 'tanzania': 'tz', 'tayikistán': 'tj', 'timor oriental': 'tl',
  'togo': 'tg', 'tonga': 'to', 'trinidad y tobago': 'tt', 'túnez': 'tn',
  'turkmenistán': 'tm', 'turquía': 'tr', 'tuvalu': 'tv',
  // U
  'ucrania': 'ua', 'uganda': 'ug', 'uruguay': 'uy', 'uzbekistán': 'uz',
  // V
  'vanuatu': 'vu', 'venezuela': 've', 'vietnam': 'vn',
  // Y
  'yemen': 'ye',
  // Z
  'zambia': 'zm', 'zimbabue': 'zw'
};

export const obtenerCodigoISO = (nombrePais) => {
  if (!nombrePais) return null;
  const normalizado = nombrePais.trim().toLowerCase();
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
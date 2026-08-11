// Diccionario completo con 200+ países y territorios mapeados a sus códigos ISO
const codigosISO = {
  // A
  'afganistán': 'af', 'albania': 'al', 'alemania': 'de', 'andorra': 'ad', 'angola': 'ao',
  'antigua y barbuda': 'ag', 'arabia saudita': 'sa', 'argelia': 'dz', 'argentina': 'ar',
  'armenia': 'am', 'australia': 'au', 'austria': 'at', 'azerbaiyán': 'az',
  // B
  'bahamas': 'bs', 'bangladés': 'bd', 'bangladesh': 'bd', 'barbados': 'bb', 'baréin': 'bh', 'bélgica': 'be',
  'belice': 'bz', 'benín': 'bj', 'bielorrusia': 'by', 'birmania': 'mm', 'bolivia': 'bo',
  'bosnia y herzegovina': 'ba', 'botsuana': 'bw', 'brasil': 'br', 'brunéi': 'bn',
  'bulgaria': 'bg', 'burkina faso': 'bf', 'burundi': 'bi', 'bután': 'bt',
  // C
  'cabo verde': 'cv', 'camboya': 'kh', 'camerún': 'cm', 'canadá': 'ca', 'catar': 'qa',
  'chad': 'td', 'chile': 'cl', 'china': 'cn', 'chipre': 'cy', 'ciudad del vaticano': 'va',
  'colombia': 'co', 'comoras': 'km', 'corea del norte': 'kp', 'corea del sur': 'kr',
  'costa de marfil': 'ci', 'costa rica': 'cr', 'croacia': 'hr', 'cuba': 'cu',
  // D
  'dinamarca': 'dk', 'dominica': 'dm', 'republica dominicana': 'do', 'república dominicana': 'do',
  // E
  'ecuador': 'ec', 'egipto': 'eg', 'el salvador': 'sv', 'emiratos árabes unidos': 'ae',
  'eritrea': 'er', 'eslovaquia': 'sk', 'eslovenia': 'si', 'españa': 'es',
  'estados unidos': 'us', 'estonia': 'ee', 'esuatini': 'sz', 'etiopía': 'et',
  // F
  'filipinas': 'ph', 'finlandia': 'fi', 'fiyi': 'fj', 'francia': 'fr',
  // G
  'gabón': 'ga', 'gambia': 'gm', 'georgia': 'ge', 'ghana': 'gh', 'gibraltar': 'gi',
  'granada': 'gd', 'grecia': 'gr', 'groenlandia': 'gl', 'guatemala': 'gt',
  'guinea': 'gn', 'guinea ecuatorial': 'gq', 'guinea-bisáu': 'gw', 'guyana': 'gy',
  // H
  'haití': 'ht', 'honduras': 'hn', 'hong kong': 'hk', 'hungría': 'hu',
  // I
  'india': 'in', 'indonesia': 'id', 'irak': 'iq', 'irán': 'ir', 'irlanda': 'ie',
  'islandia': 'is', 'islas cook': 'ck', 'islas marshall': 'mh', 'islas salomón': 'sb',
  'israel': 'il', 'italia': 'it',
  // J
  'jamaica': 'jm', 'japón': 'jp', 'jordania': 'jo',
  // K
  'kazajistán': 'kz', 'kenia': 'ke', 'kirguistán': 'kg', 'kiribati': 'ki', 'kosovo': 'xk', 'kuwait': 'kw',
  // L
  'laos': 'la', 'lesoto': 'ls', 'letonia': 'lv', 'líbano': 'lb', 'liberia': 'lr',
  'libia': 'ly', 'liechtenstein': 'li', 'lituania': 'lt', 'luxemburgo': 'lu',
  // M
  'macao': 'mo', 'macedonia del norte': 'mk', 'madagascar': 'mg', 'malasia': 'my',
  'malaui': 'mw', 'maldivas': 'mv', 'malí': 'ml', 'malta': 'mt', 'marruecos': 'ma',
  'mauricio': 'mu', 'mauritania': 'mr', 'méxico': 'mx', 'micronesia': 'fm',
  'moldavia': 'md', 'mónaco': 'mc', 'mongolia': 'mn', 'montenegro': 'me', 'mozambique': 'mz',
  'myanmar': 'mm',
  // N
  'namibia': 'na', 'nauru': 'nr', 'nepal': 'np', 'nicaragua': 'ni', 'níger': 'ne',
  'nigeria': 'ng', 'niue': 'nu', 'noruega': 'no', 'nueva zelanda': 'nz',
  // O
  'omán': 'om',
  // P
  'países bajos': 'nl', 'pakistán': 'pk', 'palaos': 'pw', 'palestina': 'ps',
  'panamá': 'pa', 'papúa nueva guinea': 'pg', 'paraguay': 'py', 'perú': 'pe',
  'polonia': 'pl', 'portugal': 'pt', 'puerto rico': 'pr',
  // R
  'reino unido': 'gb', 'república centroafricana': 'cf', 'república checa': 'cz',
  'república del congo': 'cg', 'república democrática del congo': 'cd',
  'rumania': 'ro', 'rumanía': 'ro', 'ruanda': 'rw', 'rusia': 'ru',
  // S
  'sahara occidental': 'eh', 'samoa': 'ws', 'san cristóbal y nieves': 'kn', 'san marino': 'sm',
  'san vicente y las granadinas': 'vc', 'santa lucía': 'lc', 'santa sede (ciudad del vaticano)': 'va',
  'santo tomé y príncipe': 'st', 'senegal': 'sn', 'serbia': 'rs', 'seychelles': 'sc',
  'sierra leona': 'sl', 'singapur': 'sg', 'siria': 'sy', 'somalia': 'so',
  'sri lanka': 'lk', 'suazilandia': 'sz', 'sudáfrica': 'za', 'sudán': 'sd',
  'sudán del sur': 'ss', 'suecia': 'se', 'suiza': 'ch', 'surinam': 'sr',
  // T
  'tailandia': 'th', 'taiwán': 'tw', 'tanzania': 'tz', 'tayikistán': 'tj',
  'timor oriental': 'tl', 'togo': 'tg', 'tonga': 'to', 'trinidad y tobago': 'tt',
  'túnez': 'tn', 'turkmenistán': 'tm', 'turquía': 'tr', 'tuvalu': 'tv',
  // U
  'ucrania': 'ua', 'uganda': 'ug', 'uruguay': 'uy', 'uzbekistán': 'uz',
  // V
  'vanuatu': 'vu', 'venezuela': 've', 'vietnam': 'vn',
  // Y
  'yemen': 'ye', 'yibuti': 'dj',
  // Z
  'zambia': 'zm', 'zimbabue': 'zw'
};

export const obtenerCodigoISO = (nombrePais) => {
  if (!nombrePais) return null;
  const normalizado = nombrePais.toString().trim().toLowerCase();
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
        className="w-5 h-3.5 object-cover rounded-[2px] shadow-sm inline-block shrink-0"
      />
      <span>{nombrePais}</span>
    </span>
  );
};
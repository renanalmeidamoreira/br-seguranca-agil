// === BASE DE DADOS DE CIDADES BRASILEIRAS — SYNAPSE v2 ===
// Estrutura padronizada:
//   COORD_MAP:    chave normalizada (minúscula, sem UF) → { lat, lng, uf, pais }
//   CITY_ALIASES: variações comuns/erros de digitação → chave canônica
//
// Notas críticas:
//   1) normalizeCity remove sufixos "/UF", "-UF", ", UF" para evitar colisões
//      (ex.: "Ipatinga/MG" não pode casar com a UF "pa" → Belém/PA).
//   2) findCoordsLocal IGNORA chaves de 2 letras (UFs) no partial-match.
//   3) formatCityWithUF gera "Cidade-UF" para autocomplete e exportações.
//   4) Suporta lookup por "Cidade-UF" desambiguando homônimos
//      (ex.: "Visconde do Rio Branco-MG" vs "Rio Branco-AC").

export interface CityCoord {
  lat: number;
  lng: number;
  uf: string;
  pais: string;
}

// === ALIASES (variações comuns sem acento, abreviações, nomes de plantas) ===
export const CITY_ALIASES: Record<string, string> = {
  // Variações sem acento
  'visconde rio branco': 'visconde do rio branco',
  'sto antonio amparo': 'santo antônio do amparo',
  'sto antonio padua': 'santo antônio de pádua',
  'pa de minas': 'pará de minas',
  'sao paulo': 'são paulo',
  'sao luis': 'são luís',
  'cuiaba': 'cuiabá',
  'goiania': 'goiânia',
  'belem': 'belém',
  'florianopolis': 'florianópolis',
  'vitoria': 'vitória',
  'maceio': 'maceió',
  'joao pessoa': 'joão pessoa',
  'patrocinio': 'patrocínio',
  'vicosa': 'viçosa',
  'uba': 'ubá',
  'manhuacu': 'manhuaçu',
  'matipo': 'matipó',
  'brasilia': 'brasília',
  'aparecida': 'aparecida de goiânia',
  // === Aliases de plantas/unidades (PLANTA ≠ LOCAL, mas ajuda fallback) ===
  'usina ipatinga': 'ipatinga',
  'planta ipatinga': 'ipatinga',
};

// === COORD_MAP — formato { lat, lng, uf, pais } ===
// UFs (chaves 2 letras) ficam separadas para fallback de capital, mas são
// IGNORADAS pelo partial-match (ver findCoordsLocal).
export const COORD_MAP: Record<string, CityCoord> = {
  // === CAPITAIS ===
  'são paulo': { lat: -23.5505, lng: -46.6333, uf: 'SP', pais: 'Brasil' },
  'rio de janeiro': { lat: -22.9068, lng: -43.1729, uf: 'RJ', pais: 'Brasil' },
  'belo horizonte': { lat: -19.9208, lng: -43.9378, uf: 'MG', pais: 'Brasil' },
  'curitiba': { lat: -25.4284, lng: -49.2733, uf: 'PR', pais: 'Brasil' },
  'porto alegre': { lat: -30.0346, lng: -51.2177, uf: 'RS', pais: 'Brasil' },
  'salvador': { lat: -12.9714, lng: -38.5014, uf: 'BA', pais: 'Brasil' },
  'recife': { lat: -8.0476, lng: -34.8770, uf: 'PE', pais: 'Brasil' },
  'fortaleza': { lat: -3.7172, lng: -38.5434, uf: 'CE', pais: 'Brasil' },
  'brasília': { lat: -15.7942, lng: -47.8822, uf: 'DF', pais: 'Brasil' },
  'manaus': { lat: -3.1190, lng: -60.0217, uf: 'AM', pais: 'Brasil' },
  'goiânia': { lat: -16.6869, lng: -49.2648, uf: 'GO', pais: 'Brasil' },
  'belém': { lat: -1.4558, lng: -48.5039, uf: 'PA', pais: 'Brasil' },
  'florianópolis': { lat: -27.5954, lng: -48.5480, uf: 'SC', pais: 'Brasil' },
  'vitória': { lat: -20.3155, lng: -40.3128, uf: 'ES', pais: 'Brasil' },
  'natal': { lat: -5.7945, lng: -35.2110, uf: 'RN', pais: 'Brasil' },
  'campo grande': { lat: -20.4486, lng: -54.6295, uf: 'MS', pais: 'Brasil' },
  'maceió': { lat: -9.6498, lng: -35.7089, uf: 'AL', pais: 'Brasil' },
  'teresina': { lat: -5.0892, lng: -42.8019, uf: 'PI', pais: 'Brasil' },
  'são luís': { lat: -2.5307, lng: -44.3068, uf: 'MA', pais: 'Brasil' },
  'joão pessoa': { lat: -7.1195, lng: -34.8450, uf: 'PB', pais: 'Brasil' },
  'cuiabá': { lat: -15.6014, lng: -56.0979, uf: 'MT', pais: 'Brasil' },
  'aracaju': { lat: -10.9472, lng: -37.0731, uf: 'SE', pais: 'Brasil' },
  'palmas': { lat: -10.1845, lng: -48.3336, uf: 'TO', pais: 'Brasil' },
  'macapá': { lat: 0.0356, lng: -51.0705, uf: 'AP', pais: 'Brasil' },
  'rio branco': { lat: -9.9747, lng: -67.8243, uf: 'AC', pais: 'Brasil' },
  'porto velho': { lat: -8.7619, lng: -63.9039, uf: 'RO', pais: 'Brasil' },
  'boa vista': { lat: 2.8235, lng: -60.6758, uf: 'RR', pais: 'Brasil' },

  // === MG — cidades industriais e do dataset SYNAPSE ===
  'ipatinga': { lat: -19.4693, lng: -42.5625, uf: 'MG', pais: 'Brasil' },
  'central de minas': { lat: -18.7758, lng: -41.3122, uf: 'MG', pais: 'Brasil' },
  'visconde do rio branco': { lat: -21.0056, lng: -42.8519, uf: 'MG', pais: 'Brasil' },
  'castelo': { lat: -20.6033, lng: -41.2003, uf: 'ES', pais: 'Brasil' },
  'patrocínio': { lat: -18.9436, lng: -46.9925, uf: 'MG', pais: 'Brasil' },
  'leopoldina': { lat: -21.5319, lng: -42.6431, uf: 'MG', pais: 'Brasil' },
  'contagem': { lat: -19.9320, lng: -44.0539, uf: 'MG', pais: 'Brasil' },
  'pará de minas': { lat: -19.8606, lng: -44.6086, uf: 'MG', pais: 'Brasil' },
  'santana de cataguases': { lat: -21.3942, lng: -42.7022, uf: 'MG', pais: 'Brasil' },
  'juiz de fora': { lat: -21.7621, lng: -43.3502, uf: 'MG', pais: 'Brasil' },
  'santo antônio do amparo': { lat: -20.9408, lng: -44.9197, uf: 'MG', pais: 'Brasil' },
  'ponte nova': { lat: -20.4153, lng: -42.9081, uf: 'MG', pais: 'Brasil' },
  'natividade': { lat: -21.0383, lng: -41.9711, uf: 'RJ', pais: 'Brasil' },
  'viçosa': { lat: -20.7546, lng: -42.8825, uf: 'MG', pais: 'Brasil' },
  'ubá': { lat: -21.1208, lng: -42.9425, uf: 'MG', pais: 'Brasil' },
  'santo antônio de pádua': { lat: -21.5400, lng: -42.1819, uf: 'RJ', pais: 'Brasil' },
  'itabirito': { lat: -20.2519, lng: -43.8025, uf: 'MG', pais: 'Brasil' },
  'cataguases': { lat: -21.3942, lng: -42.7022, uf: 'MG', pais: 'Brasil' },
  'manhuaçu': { lat: -20.2575, lng: -42.0286, uf: 'MG', pais: 'Brasil' },
  'matipó': { lat: -20.2872, lng: -42.3414, uf: 'MG', pais: 'Brasil' },
  'espera feliz': { lat: -20.6517, lng: -41.9100, uf: 'MG', pais: 'Brasil' },
  'martins soares': { lat: -20.2725, lng: -41.8800, uf: 'MG', pais: 'Brasil' },
  'montes claros': { lat: -16.7286, lng: -43.8581, uf: 'MG', pais: 'Brasil' },
  'cambuquira': { lat: -21.8533, lng: -45.2961, uf: 'MG', pais: 'Brasil' },
  'governador valadares': { lat: -18.8511, lng: -41.9492, uf: 'MG', pais: 'Brasil' },
  'coronel fabriciano': { lat: -19.5183, lng: -42.6286, uf: 'MG', pais: 'Brasil' },
  'timóteo': { lat: -19.5817, lng: -42.6442, uf: 'MG', pais: 'Brasil' },
  'santana do paraíso': { lat: -19.3711, lng: -42.5483, uf: 'MG', pais: 'Brasil' },
  'caratinga': { lat: -19.7900, lng: -42.1378, uf: 'MG', pais: 'Brasil' },
  'uberlândia': { lat: -18.9186, lng: -48.2772, uf: 'MG', pais: 'Brasil' },
  'uberaba': { lat: -19.7472, lng: -47.9381, uf: 'MG', pais: 'Brasil' },
  'divinópolis': { lat: -20.1389, lng: -44.8839, uf: 'MG', pais: 'Brasil' },
  'sete lagoas': { lat: -19.4658, lng: -44.2469, uf: 'MG', pais: 'Brasil' },
  'betim': { lat: -19.9678, lng: -44.1986, uf: 'MG', pais: 'Brasil' },
  'nova lima': { lat: -19.9856, lng: -43.8467, uf: 'MG', pais: 'Brasil' },
  'ribeirão das neves': { lat: -19.7672, lng: -44.0867, uf: 'MG', pais: 'Brasil' },
  'ouro preto': { lat: -20.3856, lng: -43.5036, uf: 'MG', pais: 'Brasil' },
  'mariana': { lat: -20.3778, lng: -43.4172, uf: 'MG', pais: 'Brasil' },
  'itabira': { lat: -19.6189, lng: -43.2267, uf: 'MG', pais: 'Brasil' },
  'são joão del rei': { lat: -21.1356, lng: -44.2614, uf: 'MG', pais: 'Brasil' },
  'barbacena': { lat: -21.2258, lng: -43.7736, uf: 'MG', pais: 'Brasil' },
  'lavras': { lat: -21.2450, lng: -45.0008, uf: 'MG', pais: 'Brasil' },
  'poços de caldas': { lat: -21.7878, lng: -46.5614, uf: 'MG', pais: 'Brasil' },
  'pouso alegre': { lat: -22.2300, lng: -45.9367, uf: 'MG', pais: 'Brasil' },
  'varginha': { lat: -21.5519, lng: -45.4306, uf: 'MG', pais: 'Brasil' },
  'teófilo otoni': { lat: -17.8578, lng: -41.5061, uf: 'MG', pais: 'Brasil' },
  'unaí': { lat: -16.3578, lng: -46.9056, uf: 'MG', pais: 'Brasil' },
  'paracatu': { lat: -17.2222, lng: -46.8711, uf: 'MG', pais: 'Brasil' },
  'araguari': { lat: -18.6481, lng: -48.1872, uf: 'MG', pais: 'Brasil' },
  'araxá': { lat: -19.5933, lng: -46.9408, uf: 'MG', pais: 'Brasil' },
  'patos de minas': { lat: -18.5789, lng: -46.5183, uf: 'MG', pais: 'Brasil' },
  'conselheiro lafaiete': { lat: -20.6597, lng: -43.7858, uf: 'MG', pais: 'Brasil' },
  'itaúna': { lat: -20.0794, lng: -44.5764, uf: 'MG', pais: 'Brasil' },
  'formiga': { lat: -20.4644, lng: -45.4267, uf: 'MG', pais: 'Brasil' },
  'curvelo': { lat: -18.7569, lng: -44.4308, uf: 'MG', pais: 'Brasil' },

  // === SP — principais cidades ===
  'campinas': { lat: -22.9099, lng: -47.0626, uf: 'SP', pais: 'Brasil' },
  'são josé dos campos': { lat: -23.2237, lng: -45.9009, uf: 'SP', pais: 'Brasil' },
  'santos': { lat: -23.9608, lng: -46.3331, uf: 'SP', pais: 'Brasil' },
  'guarulhos': { lat: -23.4628, lng: -46.5333, uf: 'SP', pais: 'Brasil' },
  'osasco': { lat: -23.5328, lng: -46.7917, uf: 'SP', pais: 'Brasil' },
  'sorocaba': { lat: -23.5015, lng: -47.4526, uf: 'SP', pais: 'Brasil' },
  'ribeirão preto': { lat: -21.1775, lng: -47.8103, uf: 'SP', pais: 'Brasil' },
  'são bernardo do campo': { lat: -23.6914, lng: -46.5645, uf: 'SP', pais: 'Brasil' },
  'santo andré': { lat: -23.6634, lng: -46.5383, uf: 'SP', pais: 'Brasil' },
  'são josé do rio preto': { lat: -20.8113, lng: -49.3758, uf: 'SP', pais: 'Brasil' },
  'piracicaba': { lat: -22.7253, lng: -47.6492, uf: 'SP', pais: 'Brasil' },
  'bauru': { lat: -22.3147, lng: -49.0608, uf: 'SP', pais: 'Brasil' },
  'jundiaí': { lat: -23.1864, lng: -46.8842, uf: 'SP', pais: 'Brasil' },
  'mogi das cruzes': { lat: -23.5225, lng: -46.1881, uf: 'SP', pais: 'Brasil' },
  'taubaté': { lat: -23.0264, lng: -45.5553, uf: 'SP', pais: 'Brasil' },
  'limeira': { lat: -22.5647, lng: -47.4017, uf: 'SP', pais: 'Brasil' },
  'suzano': { lat: -23.5425, lng: -46.3108, uf: 'SP', pais: 'Brasil' },

  // === RJ ===
  'niterói': { lat: -22.8833, lng: -43.1036, uf: 'RJ', pais: 'Brasil' },
  'duque de caxias': { lat: -22.7858, lng: -43.3056, uf: 'RJ', pais: 'Brasil' },
  'nova iguaçu': { lat: -22.7592, lng: -43.4511, uf: 'RJ', pais: 'Brasil' },
  'são gonçalo': { lat: -22.8268, lng: -43.0533, uf: 'RJ', pais: 'Brasil' },
  'campos dos goytacazes': { lat: -21.7625, lng: -41.3181, uf: 'RJ', pais: 'Brasil' },
  'petrópolis': { lat: -22.5050, lng: -43.1789, uf: 'RJ', pais: 'Brasil' },
  'volta redonda': { lat: -22.5236, lng: -44.1042, uf: 'RJ', pais: 'Brasil' },
  'macaé': { lat: -22.3706, lng: -41.7864, uf: 'RJ', pais: 'Brasil' },

  // === PR / SC / RS ===
  'londrina': { lat: -23.3105, lng: -51.1628, uf: 'PR', pais: 'Brasil' },
  'maringá': { lat: -23.4253, lng: -51.9386, uf: 'PR', pais: 'Brasil' },
  'foz do iguaçu': { lat: -25.5478, lng: -54.5882, uf: 'PR', pais: 'Brasil' },
  'cascavel': { lat: -24.9558, lng: -53.4553, uf: 'PR', pais: 'Brasil' },
  'ponta grossa': { lat: -25.0950, lng: -50.1619, uf: 'PR', pais: 'Brasil' },
  'caxias do sul': { lat: -29.1678, lng: -51.1794, uf: 'RS', pais: 'Brasil' },
  'pelotas': { lat: -31.7649, lng: -52.3370, uf: 'RS', pais: 'Brasil' },
  'santa maria': { lat: -29.6842, lng: -53.8069, uf: 'RS', pais: 'Brasil' },
  'joinville': { lat: -26.3045, lng: -48.8487, uf: 'SC', pais: 'Brasil' },
  'blumenau': { lat: -26.9194, lng: -49.0661, uf: 'SC', pais: 'Brasil' },
  'chapecó': { lat: -27.0967, lng: -52.6181, uf: 'SC', pais: 'Brasil' },
  'criciúma': { lat: -28.6775, lng: -49.3697, uf: 'SC', pais: 'Brasil' },

  // === ES / BA / outras ===
  'cariacica': { lat: -20.2639, lng: -40.4197, uf: 'ES', pais: 'Brasil' },
  'serra': { lat: -20.1289, lng: -40.3078, uf: 'ES', pais: 'Brasil' },
  'vila velha': { lat: -20.3297, lng: -40.2925, uf: 'ES', pais: 'Brasil' },
  'linhares': { lat: -19.3939, lng: -40.0678, uf: 'ES', pais: 'Brasil' },
  'colatina': { lat: -19.5394, lng: -40.6306, uf: 'ES', pais: 'Brasil' },
  'feira de santana': { lat: -12.2667, lng: -38.9667, uf: 'BA', pais: 'Brasil' },
  'camamu': { lat: -13.9408, lng: -39.1031, uf: 'BA', pais: 'Brasil' },
  'ilhéus': { lat: -14.7889, lng: -39.0489, uf: 'BA', pais: 'Brasil' },
  'itabuna': { lat: -14.7858, lng: -39.2803, uf: 'BA', pais: 'Brasil' },
  'vitória da conquista': { lat: -14.8611, lng: -40.8442, uf: 'BA', pais: 'Brasil' },
  'aparecida de goiânia': { lat: -16.8219, lng: -49.2572, uf: 'GO', pais: 'Brasil' },
  'anápolis': { lat: -16.3267, lng: -48.9528, uf: 'GO', pais: 'Brasil' },
  'rio verde': { lat: -17.7972, lng: -50.9264, uf: 'GO', pais: 'Brasil' },
  'santa teresa': { lat: -19.9356, lng: -40.5972, uf: 'ES', pais: 'Brasil' },
  'canoinhas': { lat: -26.1772, lng: -50.3886, uf: 'SC', pais: 'Brasil' },
};

export const MG_CENTER: [number, number] = [-18.5, -44.5];

// === HELPERS ===

function titleCase(s: string): string {
  return s
    .split(' ')
    .map(w => (w.length <= 2 ? w : w.charAt(0).toUpperCase() + w.slice(1)))
    .join(' ');
}

// Remove sufixos "/UF", "-UF", ", UF" e normaliza espaços/acentos.
export function normalizeCity(text: string): string {
  if (!text) return '';
  let s = text.toLowerCase().trim();
  s = s.replace(/\s*[\/\-,]\s*[a-zçãáéíóúâêô]{2}\s*$/i, '');
  s = s.replace(/\s+[a-z]{2}\s*$/i, m => {
    const uf = m.trim();
    return COORD_MAP[uf] ? '' : m;
  });
  s = s.split(',')[0].trim();
  s = s.replace(/\s+/g, ' ');
  if (CITY_ALIASES[s]) s = CITY_ALIASES[s];
  return s;
}

// Extrai UF de "Cidade-UF" / "Cidade/UF" / "Cidade, UF". Retorna '' se não houver.
export function extractUF(text: string): string {
  if (!text) return '';
  const m = text.match(/[\/\-,]\s*([A-Za-z]{2})\s*$/);
  return m ? m[1].toUpperCase() : '';
}

// Formata "cidade-uf" canônico (ex.: "Ipatinga-MG") a partir de uma chave do COORD_MAP.
export function formatCityWithUF(cityKey: string): string {
  const data = COORD_MAP[cityKey];
  if (!data) return titleCase(cityKey);
  return `${titleCase(cityKey)}-${data.uf}`;
}

// === Lookup robusto: retorna [lat, lng] aceitando "Cidade", "Cidade-UF", "Cidade/UF" ===
export function findCoordsLocal(text: string): [number, number] | null {
  if (!text) return null;
  const uf = extractUF(text);
  const normalized = normalizeCity(text);
  if (!normalized) return null;

  // Match exato + UF (desambigua homônimos: "rio branco" AC vs "visconde do rio branco" MG)
  if (uf && COORD_MAP[normalized] && COORD_MAP[normalized].uf === uf) {
    const c = COORD_MAP[normalized];
    return [c.lat, c.lng];
  }
  if (COORD_MAP[normalized]) {
    const c = COORD_MAP[normalized];
    return [c.lat, c.lng];
  }
  // Partial-match seguro: ignora UFs (chaves de 2 letras) e prioriza match com UF compatível
  const candidates: { key: string; data: CityCoord }[] = [];
  for (const [key, data] of Object.entries(COORD_MAP)) {
    if (key.length <= 2) continue;
    if (normalized.includes(key) || key.includes(normalized)) {
      candidates.push({ key, data });
    }
  }
  if (candidates.length === 0) return null;
  if (uf) {
    const ufMatch = candidates.find(c => c.data.uf === uf);
    if (ufMatch) return [ufMatch.data.lat, ufMatch.data.lng];
  }
  return [candidates[0].data.lat, candidates[0].data.lng];
}

// === LISTA PARA AUTOCOMPLETE — formato "Cidade-UF" com UF visível ===
export interface KnownCity {
  key: string;          // chave normalizada no COORD_MAP
  display: string;      // "Cidade-UF" pronto para preencher o campo
  city: string;         // "Cidade" Title Case
  uf: string;           // "MG"
}

export const KNOWN_CITIES_FULL: KnownCity[] = Object.entries(COORD_MAP)
  .filter(([k]) => k.length > 2) // remove UFs
  .map(([key, data]) => ({
    key,
    display: `${titleCase(key)}-${data.uf}`,
    city: titleCase(key),
    uf: data.uf,
  }))
  .sort((a, b) => a.display.localeCompare(b.display, 'pt-BR'));

// Mantido para compatibilidade com o autocomplete antigo (lista de strings simples)
export const KNOWN_CITIES: string[] = KNOWN_CITIES_FULL.map(c => c.display);

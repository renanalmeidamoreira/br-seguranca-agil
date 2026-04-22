// === NOVA FUNCIONALIDADE: Base compartilhada de cidades para autocomplete e mapa ===
// Coordenadas conhecidas (offline) e aliases comuns. Usado pelo Heatmap e pelo
// CityAutocomplete do CaseForm para garantir que o local lançado já caia
// corretamente nas cidades reconhecidas pelo mapa.

export const CITY_ALIASES: Record<string, string> = {
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
};

export const COORD_MAP: Record<string, [number, number]> = {
  'são paulo': [-23.55, -46.63], 'sp': [-23.55, -46.63],
  'rio de janeiro': [-22.91, -43.17], 'rj': [-22.91, -43.17],
  'belo horizonte': [-19.92, -43.94], 'mg': [-19.92, -43.94],
  'curitiba': [-25.43, -49.27], 'pr': [-25.43, -49.27],
  'porto alegre': [-30.03, -51.23], 'rs': [-30.03, -51.23],
  'salvador': [-12.97, -38.51], 'ba': [-12.97, -38.51],
  'recife': [-8.05, -34.87], 'pe': [-8.05, -34.87],
  'fortaleza': [-3.72, -38.53], 'ce': [-3.72, -38.53],
  'brasília': [-15.79, -47.88], 'df': [-15.79, -47.88],
  'manaus': [-3.12, -60.02], 'am': [-3.12, -60.02],
  'goiânia': [-16.68, -49.26], 'go': [-16.68, -49.26],
  'belém': [-1.46, -48.50], 'pa': [-1.46, -48.50],
  'campinas': [-22.91, -47.06],
  'florianópolis': [-27.60, -48.55], 'sc': [-27.60, -48.55],
  'vitória': [-20.32, -40.34], 'es': [-20.32, -40.34],
  'natal': [-5.79, -35.21], 'rn': [-5.79, -35.21],
  'campo grande': [-20.44, -54.65], 'ms': [-20.44, -54.65],
  'maceió': [-9.67, -35.74], 'al': [-9.67, -35.74],
  'teresina': [-5.09, -42.80], 'pi': [-5.09, -42.80],
  'são luís': [-2.53, -44.28], 'ma': [-2.53, -44.28],
  'joão pessoa': [-7.12, -34.86], 'pb': [-7.12, -34.86],
  'cuiabá': [-15.60, -56.10], 'mt': [-15.60, -56.10],
  'aracaju': [-10.91, -37.07], 'se': [-10.91, -37.07],
  // Cidades específicas do dataset Synapse (MG e demais)
  'visconde do rio branco': [-21.01, -42.84],
  'castelo': [-20.61, -41.20],
  'patrocínio': [-18.94, -46.99],
  'leopoldina': [-21.53, -42.64],
  'canoinhas': [-26.18, -50.39],
  'contagem': [-19.93, -44.05],
  'pará de minas': [-19.86, -44.61],
  'santana de cataguases': [-21.39, -42.70],
  'juiz de fora': [-21.76, -43.35],
  'santo antônio do amparo': [-20.94, -44.92],
  'camamu': [-13.94, -39.10],
  'ponte nova': [-20.41, -42.91],
  'natividade': [-21.03, -41.97],
  'viçosa': [-20.75, -42.88],
  'ubá': [-21.12, -42.94],
  'santa teresa': [-19.94, -40.59],
  'santo antônio de pádua': [-21.54, -42.18],
  'itabirito': [-20.25, -43.80],
  'duque de caxias': [-22.78, -43.31],
  'cataguases': [-21.39, -42.70],
  'manhuaçu': [-20.25, -42.03],
  'matipó': [-20.29, -42.34],
  'espera feliz': [-20.65, -41.91],
  'martins soares': [-20.27, -41.88],
  'montes claros': [-16.73, -43.86],
  'cambuquira': [-21.85, -45.30],
  'governador valadares': [-18.85, -41.95],
};

export const MG_CENTER: [number, number] = [-18.5, -44.5];

// Capitalização Title Case respeitando acentos
function titleCase(s: string): string {
  return s
    .split(' ')
    .map(w => (w.length <= 2 ? w : w.charAt(0).toUpperCase() + w.slice(1)))
    .join(' ');
}

export function normalizeCity(text: string): string {
  if (!text) return '';
  let s = text.toLowerCase().trim();
  s = s.replace(/[-,]\s*[a-z]{2}\s*$/i, '');
  s = s.split(',')[0].trim();
  s = s.replace(/\s+/g, ' ');
  if (CITY_ALIASES[s]) s = CITY_ALIASES[s];
  return s;
}

export function findCoordsLocal(text: string): [number, number] | null {
  if (!text) return null;
  const normalized = normalizeCity(text);
  if (COORD_MAP[normalized]) return COORD_MAP[normalized];
  for (const [key, coords] of Object.entries(COORD_MAP)) {
    if (normalized.includes(key) || key.includes(normalized)) return coords;
  }
  return null;
}

// Lista de cidades base (sem UFs duplicadas) para autocomplete
export const KNOWN_CITIES: string[] = Array.from(
  new Set(
    Object.keys(COORD_MAP)
      .filter(k => k.length > 2) // remove UFs como 'sp', 'mg'
      .map(titleCase)
  )
).sort((a, b) => a.localeCompare(b, 'pt-BR'));

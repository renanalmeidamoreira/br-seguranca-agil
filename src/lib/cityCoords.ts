// === NOVA FUNCIONALIDADE: Base compartilhada de cidades para autocomplete e mapa ===
// Coordenadas conhecidas (offline) + aliases comuns. Usado pelo Heatmap e pelo
// CityAutocomplete do CaseForm para garantir que o local lançado já caia
// corretamente nas cidades reconhecidas pelo mapa.
//
// === CORREÇÃO CRÍTICA: LOCALIZAÇÃO IPATINGA / SEPARAÇÃO PLANTA ≠ LOCAL ===
// Antes: "Ipatinga/MG" -> normalizava para "ipatinga/mg" e o partial-match
// encontrava a UF "pa" (Pará/Belém) dentro da string, plotando o ponto no PA.
// Agora:
//   1) normalizeCity remove sufixos "/UF", "-UF" e ", UF" (com ou sem espaço).
//   2) findCoordsLocal IGNORA chaves de 2 letras (UFs) ao fazer partial-match,
//      evitando colisões absurdas (Ipatinga -> PA, Catalão -> AL, etc.).
//   3) COORD_MAP expandido com Ipatinga e várias cidades industriais de MG.

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
  // === Aliases de plantas/unidades comuns no SYNAPSE ===
  'usina ipatinga': 'ipatinga',
  'planta ipatinga': 'ipatinga',
  'central de minas': 'central de minas',
};

export const COORD_MAP: Record<string, [number, number]> = {
  // === Capitais ===
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
  'palmas': [-10.18, -48.33], 'to': [-10.18, -48.33],
  'macapá': [0.04, -51.07], 'ap': [0.04, -51.07],
  'rio branco': [-9.97, -67.81], 'ac': [-9.97, -67.81],
  'porto velho': [-8.76, -63.90], 'ro': [-8.76, -63.90],
  'boa vista': [2.82, -60.67], 'rr': [2.82, -60.67],

  // === MG — cidades industriais e do dataset SYNAPSE (CORREÇÃO IPATINGA) ===
  'ipatinga': [-19.4693, -42.5625],
  'central de minas': [-18.7758, -41.3122],
  'visconde do rio branco': [-21.01, -42.84],
  'castelo': [-20.61, -41.20],
  'patrocínio': [-18.94, -46.99],
  'leopoldina': [-21.53, -42.64],
  'contagem': [-19.93, -44.05],
  'pará de minas': [-19.86, -44.61],
  'santana de cataguases': [-21.39, -42.70],
  'juiz de fora': [-21.7621, -43.3502],
  'santo antônio do amparo': [-20.94, -44.92],
  'ponte nova': [-20.41, -42.91],
  'natividade': [-21.03, -41.97],
  'viçosa': [-20.75, -42.88],
  'ubá': [-21.12, -42.94],
  'santo antônio de pádua': [-21.54, -42.18],
  'itabirito': [-20.25, -43.80],
  'cataguases': [-21.39, -42.70],
  'manhuaçu': [-20.25, -42.03],
  'matipó': [-20.29, -42.34],
  'espera feliz': [-20.65, -41.91],
  'martins soares': [-20.27, -41.88],
  'montes claros': [-16.73, -43.86],
  'cambuquira': [-21.85, -45.30],
  'governador valadares': [-18.85, -41.95],
  'coronel fabriciano': [-19.52, -42.63],
  'timóteo': [-19.58, -42.64],
  'santana do paraíso': [-19.37, -42.55],
  'caratinga': [-19.79, -42.14],
  'uberlândia': [-18.92, -48.28],
  'uberaba': [-19.75, -47.93],
  'divinópolis': [-20.14, -44.88],
  'sete lagoas': [-19.46, -44.25],
  'betim': [-19.97, -44.20],
  'nova lima': [-19.98, -43.84],
  'ribeirão das neves': [-19.77, -44.09],
  'ouro preto': [-20.39, -43.51],
  'mariana': [-20.38, -43.42],
  'itabira': [-19.62, -43.23],
  'são joão del rei': [-21.13, -44.26],
  'barbacena': [-21.23, -43.77],
  'lavras': [-21.25, -45.00],
  'poços de caldas': [-21.79, -46.56],
  'pouso alegre': [-22.23, -45.94],
  'varginha': [-21.55, -45.43],
  'teófilo otoni': [-17.86, -41.51],
  'unaí': [-16.36, -46.91],
  'paracatu': [-17.22, -46.87],

  // === Outras cidades comuns no Brasil ===
  'campinas': [-22.91, -47.06],
  'são josé dos campos': [-23.22, -45.90],
  'santos': [-23.96, -46.33],
  'guarulhos': [-23.46, -46.53],
  'osasco': [-23.53, -46.79],
  'sorocaba': [-23.50, -47.46],
  'ribeirão preto': [-21.17, -47.81],
  'niterói': [-22.88, -43.10],
  'duque de caxias': [-22.78, -43.31],
  'nova iguaçu': [-22.76, -43.45],
  'são gonçalo': [-22.83, -43.05],
  'londrina': [-23.31, -51.16],
  'maringá': [-23.42, -51.93],
  'caxias do sul': [-29.17, -51.18],
  'pelotas': [-31.77, -52.34],
  'joinville': [-26.30, -48.85],
  'blumenau': [-26.92, -49.07],
  'feira de santana': [-12.27, -38.97],
  'camamu': [-13.94, -39.10],
  'santa teresa': [-19.94, -40.59],
  'canoinhas': [-26.18, -50.39],
};

export const MG_CENTER: [number, number] = [-18.5, -44.5];

// Capitalização Title Case respeitando acentos
function titleCase(s: string): string {
  return s
    .split(' ')
    .map(w => (w.length <= 2 ? w : w.charAt(0).toUpperCase() + w.slice(1)))
    .join(' ');
}

// === CORREÇÃO CRÍTICA: normalização robusta de "Cidade/UF", "Cidade - UF", "Cidade, UF" ===
export function normalizeCity(text: string): string {
  if (!text) return '';
  let s = text.toLowerCase().trim();
  // Remove sufixos de UF em qualquer separador: "/", "-", ",", " "
  s = s.replace(/\s*[\/\-,]\s*[a-zçãáéíóúâêô]{2}\s*$/i, '');
  // Caso ainda sobre " mg" / " sp" no fim (sem separador)
  s = s.replace(/\s+[a-z]{2}\s*$/i, m => {
    const uf = m.trim();
    return COORD_MAP[uf] ? '' : m; // só remove se for UF reconhecida
  });
  s = s.split(',')[0].trim();
  s = s.replace(/\s+/g, ' ');
  if (CITY_ALIASES[s]) s = CITY_ALIASES[s];
  return s;
}

// === CORREÇÃO CRÍTICA: partial-match seguro (ignora chaves de 2 letras = UFs) ===
export function findCoordsLocal(text: string): [number, number] | null {
  if (!text) return null;
  const normalized = normalizeCity(text);
  if (!normalized) return null;
  if (COORD_MAP[normalized]) return COORD_MAP[normalized];
  for (const [key, coords] of Object.entries(COORD_MAP)) {
    // Pula UFs (2 letras) — evita "ipatinga" casar com "pa"
    if (key.length <= 2) continue;
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

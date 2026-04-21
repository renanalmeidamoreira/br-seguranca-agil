// === MAPA DE CALOR === Seção de heatmap de ocorrências
import { useMemo, useState, useEffect } from 'react';
import { MapContainer, TileLayer, useMap, CircleMarker, Tooltip } from 'react-leaflet';
import type { CaseData } from '@/lib/localDB';
import { Sun, Moon } from 'lucide-react';
import 'leaflet/dist/leaflet.css';

// === NOVA FUNCIONALIDADE: Normalização de cidades MG / aliases comuns ===
const CITY_ALIASES: Record<string, string> = {
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

// Coordenadas conhecidas (offline) — base estática.
const COORD_MAP: Record<string, [number, number]> = {
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

// Centro padrão de Minas Gerais (fallback solicitado)
const MG_CENTER: [number, number] = [-18.5, -44.5];

// === IMPORTAÇÃO E EXIBIÇÃO DOS CASOS DO JSON ===
// Normaliza nome de cidade removendo UF e sufixos: "VISCONDE DO RIO BRANCO-MG" -> "visconde do rio branco"
function normalizeCity(text: string): string {
  if (!text) return '';
  let s = text.toLowerCase().trim();
  s = s.replace(/[-,]\s*[a-z]{2}\s*$/i, '');
  s = s.split(',')[0].trim();
  s = s.replace(/\s+/g, ' ');
  // Aplica aliases conhecidos
  if (CITY_ALIASES[s]) s = CITY_ALIASES[s];
  return s;
}

function findCoordsLocal(text: string): [number, number] | null {
  if (!text) return null;
  const normalized = normalizeCity(text);
  if (COORD_MAP[normalized]) return COORD_MAP[normalized];
  for (const [key, coords] of Object.entries(COORD_MAP)) {
    if (normalized.includes(key) || key.includes(normalized)) return coords;
  }
  return null;
}

// === NOVA FUNCIONALIDADE: Geocoding Nominatim com cache em localStorage ===
const GEOCODE_CACHE_KEY = 'synapse_geocode_cache_v1';
function loadGeocodeCache(): Record<string, [number, number] | null> {
  try { return JSON.parse(localStorage.getItem(GEOCODE_CACHE_KEY) || '{}'); }
  catch { return {}; }
}
function saveGeocodeCache(cache: Record<string, [number, number] | null>) {
  try { localStorage.setItem(GEOCODE_CACHE_KEY, JSON.stringify(cache)); } catch {}
}

async function geocodeNominatim(query: string): Promise<[number, number] | null> {
  try {
    const url = `https://nominatim.openstreetmap.org/search?format=json&limit=1&countrycodes=br&q=${encodeURIComponent(query + ', Brasil')}`;
    const res = await fetch(url, { headers: { 'Accept': 'application/json' } });
    if (!res.ok) return null;
    const data = await res.json();
    if (Array.isArray(data) && data[0]?.lat && data[0]?.lon) {
      return [parseFloat(data[0].lat), parseFloat(data[0].lon)];
    }
    return null;
  } catch (e) {
    console.warn('Nominatim geocoding falhou:', e);
    return null;
  }
}

// === NOVA FUNCIONALIDADE: Escala de cores proporcional (verde→amarelo→vermelho) ===
function intensityColor(ratio: number): string {
  // ratio 0..1
  const r = Math.max(0, Math.min(1, ratio));
  if (r < 0.34) return '#22c55e';        // verde
  if (r < 0.67) return '#eab308';        // amarelo
  if (r < 0.85) return '#f97316';        // laranja
  return '#ef4444';                       // vermelho
}

// HeatLayer component using leaflet.heat
function HeatLayer({ points }: { points: [number, number, number][] }) {
  const map = useMap();

  useEffect(() => {
    if (points.length === 0) return;
    const L = (window as any).L;
    if (!L || !L.heatLayer) return;
    const heat = L.heatLayer(points, {
      radius: 35,
      blur: 25,
      maxZoom: 10,
      max: Math.max(...points.map(p => p[2]), 1),
      gradient: { 0.2: '#22c55e', 0.4: '#84cc16', 0.6: '#eab308', 0.8: '#f97316', 1.0: '#ef4444' },
    }).addTo(map);
    return () => { map.removeLayer(heat); };
  }, [map, points]);

  return null;
}

interface Props {
  cases: CaseData[];
}

interface CityPoint {
  name: string;
  lat: number;
  lng: number;
  count: number;
}

export default function HeatmapSection({ cases }: Props) {
  const [viewMode, setViewMode] = useState<'unit' | 'local'>('local');
  const [yearFilter, setYearFilter] = useState<string>('all');
  const [leafletHeatLoaded, setLeafletHeatLoaded] = useState(false);
  // === NOVA FUNCIONALIDADE: Modo claro/escuro do mapa ===
  const [mapTheme, setMapTheme] = useState<'dark' | 'light'>('dark');
  // Cache de geocoding dinâmico (Nominatim)
  const [geocodeCache, setGeocodeCache] = useState<Record<string, [number, number] | null>>(() => loadGeocodeCache());

  // Load leaflet.heat dynamically
  useEffect(() => {
    if ((window as any).L?.heatLayer) { setLeafletHeatLoaded(true); return; }
    const script = document.createElement('script');
    script.src = 'https://unpkg.com/leaflet.heat@0.2.0/dist/leaflet-heat.js';
    script.onload = () => setLeafletHeatLoaded(true);
    document.head.appendChild(script);
    return () => { try { document.head.removeChild(script); } catch {} };
  }, []);

  const years = useMemo(() => {
    const ySet = new Set<string>();
    cases.forEach(c => {
      if (c.DATA) {
        const m = c.DATA.match(/(\d{4})/);
        if (m) ySet.add(m[1]);
      }
    });
    return Array.from(ySet).sort().reverse();
  }, [cases]);

  const filteredCases = useMemo(() => {
    if (yearFilter === 'all') return cases;
    return cases.filter(c => c.DATA && c.DATA.includes(yearFilter));
  }, [cases, yearFilter]);

  // Agrupa por cidade/unidade
  const groupedRaw = useMemo(() => {
    const grouped: Record<string, number> = {};
    filteredCases.forEach(c => {
      const key = (viewMode === 'unit' ? c.UNIDADE : c.LOCAL) || '';
      if (key.trim()) grouped[key.trim()] = (grouped[key.trim()] || 0) + 1;
    });
    return grouped;
  }, [filteredCases, viewMode]);

  // === NOVA FUNCIONALIDADE: Resolve coordenadas (cache local → COORD_MAP → Nominatim) ===
  useEffect(() => {
    const missing: string[] = [];
    Object.keys(groupedRaw).forEach(name => {
      const norm = normalizeCity(name);
      if (!norm) return;
      if (COORD_MAP[norm]) return;
      // partial match
      const partial = Object.keys(COORD_MAP).some(k => norm.includes(k) || k.includes(norm));
      if (partial) return;
      if (norm in geocodeCache) return;
      missing.push(norm);
    });
    if (missing.length === 0) return;

    let cancelled = false;
    (async () => {
      const updates: Record<string, [number, number] | null> = {};
      for (const name of missing) {
        const coords = await geocodeNominatim(name);
        if (cancelled) return;
        updates[name] = coords;
        if (!coords) console.warn(`[Heatmap] Cidade não geocodificada: "${name}" — usando centro de MG.`);
        // pequeno delay para respeitar rate limit do Nominatim (~1 req/s)
        await new Promise(r => setTimeout(r, 1100));
      }
      if (cancelled || Object.keys(updates).length === 0) return;
      setGeocodeCache(prev => {
        const merged = { ...prev, ...updates };
        saveGeocodeCache(merged);
        return merged;
      });
    })();

    return () => { cancelled = true; };
  }, [groupedRaw, geocodeCache]);

  const cityPoints: CityPoint[] = useMemo(() => {
    const points: CityPoint[] = [];
    for (const [name, count] of Object.entries(groupedRaw)) {
      const local = findCoordsLocal(name);
      if (local) {
        points.push({ name, lat: local[0], lng: local[1], count });
        continue;
      }
      const norm = normalizeCity(name);
      const cached = geocodeCache[norm];
      if (cached) {
        points.push({ name, lat: cached[0], lng: cached[1], count });
      } else {
        // Fallback: centro de MG (com pequeno jitter para não empilhar)
        const jitter = (Math.random() - 0.5) * 0.3;
        points.push({ name, lat: MG_CENTER[0] + jitter, lng: MG_CENTER[1] + jitter, count });
      }
    }
    return points;
  }, [groupedRaw, geocodeCache]);

  const heatPoints: [number, number, number][] = useMemo(
    () => cityPoints.map(p => [p.lat, p.lng, p.count]),
    [cityPoints]
  );

  const maxCount = useMemo(
    () => cityPoints.reduce((m, p) => Math.max(m, p.count), 1),
    [cityPoints]
  );

  if (!leafletHeatLoaded) {
    return (
      <div className="bg-card p-6 rounded-lg">
        <h2 className="text-lg font-semibold text-primary mb-4">🗺️ Mapa de Calor de Ocorrências</h2>
        <p className="text-muted-foreground text-sm">Carregando mapa...</p>
      </div>
    );
  }

  // === Tile URLs (claro/escuro) ===
  const tileUrl = mapTheme === 'dark'
    ? 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png'
    : 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';

  return (
    <div className="bg-card p-6 rounded-lg relative" style={{ zIndex: 1 }}>
      <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
        <h2 className="text-lg font-semibold text-primary">🗺️ Mapa de Calor de Ocorrências</h2>
        <div className="flex items-center gap-3 flex-wrap">
          <select
            value={viewMode}
            onChange={e => setViewMode(e.target.value as 'unit' | 'local')}
            className="text-sm rounded-lg px-3 py-1.5 bg-secondary border-border border text-foreground"
          >
            <option value="local">Por Cidade/Local</option>
            <option value="unit">Por Unidade/Planta</option>
          </select>
          <select
            value={yearFilter}
            onChange={e => setYearFilter(e.target.value)}
            className="text-sm rounded-lg px-3 py-1.5 bg-secondary border-border border text-foreground"
          >
            <option value="all">Todos os anos</option>
            {years.map(y => <option key={y} value={y}>{y}</option>)}
          </select>
          {/* === NOVA FUNCIONALIDADE: Toggle de tema do mapa === */}
          <button
            onClick={() => setMapTheme(t => t === 'dark' ? 'light' : 'dark')}
            className="text-sm flex items-center gap-1.5 rounded-lg px-3 py-1.5 bg-secondary border-border border text-foreground hover:bg-secondary/70"
            title={mapTheme === 'dark' ? 'Mudar para modo claro' : 'Mudar para modo escuro'}
          >
            {mapTheme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            {mapTheme === 'dark' ? 'Claro' : 'Escuro'}
          </button>
        </div>
      </div>
      <div className="rounded-lg overflow-hidden border border-border" style={{ height: 500, position: 'relative', zIndex: 1 }}>
        <MapContainer
          key={mapTheme}
          center={[-18, -44]}
          zoom={5}
          style={{ height: '100%', width: '100%' }}
          scrollWheelZoom
        >
          <TileLayer
            attribution='&copy; OpenStreetMap / CARTO'
            url={tileUrl}
          />
          <HeatLayer points={heatPoints} />
          {/* === Círculos proporcionais por cidade com escala de cores === */}
          {cityPoints.map((p, i) => {
            const ratio = p.count / maxCount;
            const radius = Math.max(6, Math.sqrt(ratio) * 28);
            const color = intensityColor(ratio);
            return (
              <CircleMarker
                key={`${p.name}-${i}`}
                center={[p.lat, p.lng]}
                radius={radius}
                pathOptions={{
                  color,
                  fillColor: color,
                  fillOpacity: 0.55,
                  weight: 2,
                }}
              >
                <Tooltip direction="top" offset={[0, -4]} opacity={1}>
                  <div className="text-xs">
                    <strong>{p.name}</strong>
                    <br />
                    {p.count} ocorrência{p.count !== 1 ? 's' : ''}
                  </div>
                </Tooltip>
              </CircleMarker>
            );
          })}
        </MapContainer>
      </div>
      {/* Legenda da escala de cores */}
      <div className="flex items-center gap-4 mt-3 text-xs text-muted-foreground">
        <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full" style={{ background: '#22c55e' }} /> Baixa</span>
        <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full" style={{ background: '#eab308' }} /> Média</span>
        <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full" style={{ background: '#f97316' }} /> Alta</span>
        <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full" style={{ background: '#ef4444' }} /> Crítica</span>
      </div>
      {cityPoints.length > 0 && (
        <p className="text-muted-foreground text-xs mt-2">
          {cityPoints.length} {viewMode === 'local' ? 'localidades' : 'unidades'} mapeadas •
          maior concentração: <strong className="text-foreground">{cityPoints.reduce((a, b) => a.count > b.count ? a : b).name}</strong>
          {' '}({maxCount} casos)
        </p>
      )}
      {cityPoints.length === 0 && (
        <p className="text-muted-foreground text-sm mt-3 text-center">
          Nenhuma ocorrência encontrada para os filtros selecionados.
        </p>
      )}
    </div>
  );
}

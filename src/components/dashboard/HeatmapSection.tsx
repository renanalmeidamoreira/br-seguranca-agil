// === MAPA DE CALOR === Seção de heatmap de ocorrências
import { useMemo, useState, useEffect } from 'react';
import { MapContainer, TileLayer, useMap, CircleMarker, Tooltip } from 'react-leaflet';
import type { CaseData } from '@/lib/localDB';
import 'leaflet/dist/leaflet.css';

// Coordenadas aproximadas de cidades/estados brasileiros (com normalização)
const COORD_MAP: Record<string, [number, number]> = {
  'são paulo': [-23.55, -46.63],
  'sao paulo': [-23.55, -46.63],
  'sp': [-23.55, -46.63],
  'rio de janeiro': [-22.91, -43.17],
  'rj': [-22.91, -43.17],
  'belo horizonte': [-19.92, -43.94],
  'mg': [-19.92, -43.94],
  'curitiba': [-25.43, -49.27],
  'pr': [-25.43, -49.27],
  'porto alegre': [-30.03, -51.23],
  'rs': [-30.03, -51.23],
  'salvador': [-12.97, -38.51],
  'ba': [-12.97, -38.51],
  'recife': [-8.05, -34.87],
  'pe': [-8.05, -34.87],
  'fortaleza': [-3.72, -38.53],
  'ce': [-3.72, -38.53],
  'brasília': [-15.79, -47.88],
  'brasilia': [-15.79, -47.88],
  'df': [-15.79, -47.88],
  'manaus': [-3.12, -60.02],
  'am': [-3.12, -60.02],
  'goiânia': [-16.68, -49.26],
  'goiania': [-16.68, -49.26],
  'go': [-16.68, -49.26],
  'belém': [-1.46, -48.50],
  'belem': [-1.46, -48.50],
  'pa': [-1.46, -48.50],
  'campinas': [-22.91, -47.06],
  'florianópolis': [-27.60, -48.55],
  'florianopolis': [-27.60, -48.55],
  'sc': [-27.60, -48.55],
  'vitória': [-20.32, -40.34],
  'vitoria': [-20.32, -40.34],
  'es': [-20.32, -40.34],
  'natal': [-5.79, -35.21],
  'rn': [-5.79, -35.21],
  'campo grande': [-20.44, -54.65],
  'ms': [-20.44, -54.65],
  'maceió': [-9.67, -35.74],
  'maceio': [-9.67, -35.74],
  'al': [-9.67, -35.74],
  'teresina': [-5.09, -42.80],
  'pi': [-5.09, -42.80],
  'são luís': [-2.53, -44.28],
  'sao luis': [-2.53, -44.28],
  'ma': [-2.53, -44.28],
  'joão pessoa': [-7.12, -34.86],
  'joao pessoa': [-7.12, -34.86],
  'pb': [-7.12, -34.86],
  'cuiabá': [-15.60, -56.10],
  'cuiaba': [-15.60, -56.10],
  'mt': [-15.60, -56.10],
  'aracaju': [-10.91, -37.07],
  'se': [-10.91, -37.07],
  // Cidades específicas do dataset Synapse
  'visconde do rio branco': [-21.01, -42.84],
  'castelo': [-20.61, -41.20],
  'patrocínio': [-18.94, -46.99],
  'patrocinio': [-18.94, -46.99],
  'leopoldina': [-21.53, -42.64],
  'canoinhas': [-26.18, -50.39],
  'contagem': [-19.93, -44.05],
  'pará de minas': [-19.86, -44.61],
  'para de minas': [-19.86, -44.61],
  'santana de cataguases': [-21.39, -42.70],
  'juiz de fora': [-21.76, -43.35],
  'santo antônio do amparo': [-20.94, -44.92],
  'santo antonio do amparo': [-20.94, -44.92],
  'camamu': [-13.94, -39.10],
  'ponte nova': [-20.41, -42.91],
  'natividade': [-21.03, -41.97],
  'viçosa': [-20.75, -42.88],
  'vicosa': [-20.75, -42.88],
  'ubá': [-21.12, -42.94],
  'uba': [-21.12, -42.94],
  'santa teresa': [-19.94, -40.59],
  'santo antônio de pádua': [-21.54, -42.18],
  'santo antonio de padua': [-21.54, -42.18],
  'itabirito': [-20.25, -43.80],
  'duque de caxias': [-22.78, -43.31],
  'cataguases': [-21.39, -42.70],
  'manhuaçu': [-20.25, -42.03],
  'manhuacu': [-20.25, -42.03],
  'matipó': [-20.29, -42.34],
  'matipo': [-20.29, -42.34],
  'espera feliz': [-20.65, -41.91],
  'martins soares': [-20.27, -41.88],
  'montes claros': [-16.73, -43.86],
  'cambuquira': [-21.85, -45.30],
  'governador valadares': [-18.85, -41.95],
};

// === IMPORTAÇÃO E EXIBIÇÃO DOS CASOS DO JSON ===
// Normaliza nome de cidade removendo UF e sufixos: "VISCONDE DO RIO BRANCO-MG" -> "visconde do rio branco"
function normalizeCity(text: string): string {
  if (!text) return '';
  let s = text.toLowerCase().trim();
  // Remove sufixo -UF
  s = s.replace(/[-,]\s*[a-z]{2}\s*$/i, '');
  // Pega primeira parte antes da vírgula (ex.: "UBARI, UBÁ" -> "ubari")
  s = s.split(',')[0].trim();
  return s;
}

function findCoords(text: string): [number, number] | null {
  if (!text) return null;
  const normalized = normalizeCity(text);
  if (COORD_MAP[normalized]) return COORD_MAP[normalized];
  // Tenta correspondência parcial
  for (const [key, coords] of Object.entries(COORD_MAP)) {
    if (normalized.includes(key) || key.includes(normalized)) return coords;
  }
  return null;
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
      gradient: { 0.2: '#22d3ee', 0.4: '#3b82f6', 0.6: '#f59e0b', 0.8: '#f97316', 1.0: '#ef4444' },
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
        // Suporta "2024-06-26" ou "26/06/2024"
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

  // === IMPORTAÇÃO E EXIBIÇÃO DOS CASOS DO JSON ===
  // Agrupa por cidade/unidade e calcula raio proporcional
  const cityPoints: CityPoint[] = useMemo(() => {
    const grouped: Record<string, number> = {};
    filteredCases.forEach(c => {
      const key = (viewMode === 'unit' ? c.UNIDADE : c.LOCAL) || '';
      if (key.trim()) grouped[key.trim()] = (grouped[key.trim()] || 0) + 1;
    });

    const points: CityPoint[] = [];
    const fallbackCenter: [number, number] = [-14.24, -51.93];
    let idx = 0;
    for (const [name, count] of Object.entries(grouped)) {
      const coords = findCoords(name);
      if (coords) {
        points.push({ name, lat: coords[0], lng: coords[1], count });
      } else {
        const offset = idx * 1.5;
        points.push({
          name,
          lat: fallbackCenter[0] + (offset % 5) - 2,
          lng: fallbackCenter[1] + Math.floor(offset / 5) * 1.5 - 3,
          count,
        });
        idx++;
      }
    }
    return points;
  }, [filteredCases, viewMode]);

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

  return (
    <div className="bg-card p-6 rounded-lg relative" style={{ zIndex: 1 }}>
      <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
        <h2 className="text-lg font-semibold text-primary">🗺️ Mapa de Calor de Ocorrências</h2>
        <div className="flex items-center gap-3">
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
        </div>
      </div>
      <div className="rounded-lg overflow-hidden border border-border" style={{ height: 500, position: 'relative', zIndex: 1 }}>
        <MapContainer
          center={[-18, -44]}
          zoom={5}
          style={{ height: '100%', width: '100%' }}
          scrollWheelZoom
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          <HeatLayer points={heatPoints} />
          {/* === Círculos proporcionais por cidade === */}
          {cityPoints.map((p, i) => {
            // Escala proporcional: sqrt para diferenças visualmente claras
            const radius = Math.max(6, Math.sqrt(p.count / maxCount) * 28);
            return (
              <CircleMarker
                key={`${p.name}-${i}`}
                center={[p.lat, p.lng]}
                radius={radius}
                pathOptions={{
                  color: '#ef4444',
                  fillColor: '#f97316',
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
      {cityPoints.length > 0 && (
        <p className="text-muted-foreground text-xs mt-3">
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

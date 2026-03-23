// === MAPA DE CALOR === Seção de heatmap de ocorrências
import { useMemo, useState, useEffect } from 'react';
import { MapContainer, TileLayer, useMap } from 'react-leaflet';
import type { CaseData } from '@/lib/localDB';
import 'leaflet/dist/leaflet.css';

// Coordenadas aproximadas de cidades/estados brasileiros
const COORD_MAP: Record<string, [number, number]> = {
  'são paulo': [-23.55, -46.63],
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
  'df': [-15.79, -47.88],
  'manaus': [-3.12, -60.02],
  'am': [-3.12, -60.02],
  'goiânia': [-16.68, -49.26],
  'go': [-16.68, -49.26],
  'belém': [-1.46, -48.50],
  'pa': [-1.46, -48.50],
  'campinas': [-22.91, -47.06],
  'florianópolis': [-27.60, -48.55],
  'sc': [-27.60, -48.55],
  'vitória': [-20.32, -40.34],
  'es': [-20.32, -40.34],
  'natal': [-5.79, -35.21],
  'rn': [-5.79, -35.21],
  'campo grande': [-20.44, -54.65],
  'ms': [-20.44, -54.65],
  'maceió': [-9.67, -35.74],
  'al': [-9.67, -35.74],
  'teresina': [-5.09, -42.80],
  'pi': [-5.09, -42.80],
  'são luís': [-2.53, -44.28],
  'ma': [-2.53, -44.28],
  'joão pessoa': [-7.12, -34.86],
  'pb': [-7.12, -34.86],
  'cuiabá': [-15.60, -56.10],
  'mt': [-15.60, -56.10],
  'aracaju': [-10.91, -37.07],
  'se': [-10.91, -37.07],
};

function findCoords(text: string): [number, number] | null {
  if (!text) return null;
  const lower = text.toLowerCase().trim();
  for (const [key, coords] of Object.entries(COORD_MAP)) {
    if (lower.includes(key)) return coords;
  }
  // Default: slight random offset around Brazil center
  return null;
}

// HeatLayer component using leaflet.heat
function HeatLayer({ points }: { points: [number, number, number][] }) {
  const map = useMap();

  useEffect(() => {
    if (points.length === 0) return;
    // @ts-ignore - leaflet.heat adds L.heatLayer
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

export default function HeatmapSection({ cases }: Props) {
  const [viewMode, setViewMode] = useState<'unit' | 'local'>('unit');
  const [yearFilter, setYearFilter] = useState<string>('all');
  const [leafletHeatLoaded, setLeafletHeatLoaded] = useState(false);

  // Load leaflet.heat dynamically
  useEffect(() => {
    const script = document.createElement('script');
    script.src = 'https://unpkg.com/leaflet.heat@0.2.0/dist/leaflet-heat.js';
    script.onload = () => setLeafletHeatLoaded(true);
    document.head.appendChild(script);
    return () => { document.head.removeChild(script); };
  }, []);

  const years = useMemo(() => {
    const ySet = new Set<string>();
    cases.forEach(c => {
      if (c.DATA) ySet.add(c.DATA.substring(0, 4));
    });
    return Array.from(ySet).sort().reverse();
  }, [cases]);

  const filteredCases = useMemo(() => {
    if (yearFilter === 'all') return cases;
    return cases.filter(c => c.DATA?.startsWith(yearFilter));
  }, [cases, yearFilter]);

  const heatPoints = useMemo(() => {
    const grouped: Record<string, number> = {};
    filteredCases.forEach(c => {
      const key = viewMode === 'unit' ? (c.UNIDADE || '') : (c.LOCAL || '');
      if (key) grouped[key] = (grouped[key] || 0) + 1;
    });

    const points: [number, number, number][] = [];
    const fallbackCenter: [number, number] = [-14.24, -51.93];
    let idx = 0;
    for (const [name, count] of Object.entries(grouped)) {
      const coords = findCoords(name);
      if (coords) {
        points.push([coords[0], coords[1], count]);
      } else {
        // Spread unknown locations around Brazil center
        const offset = idx * 1.5;
        points.push([fallbackCenter[0] + (offset % 5) - 2, fallbackCenter[1] + Math.floor(offset / 5) * 1.5 - 3, count]);
        idx++;
      }
    }
    return points;
  }, [filteredCases, viewMode]);

  if (!leafletHeatLoaded) {
    return (
      <div className="bg-card p-6 rounded-lg">
        <h2 className="text-lg font-semibold text-primary mb-4">🗺️ Mapa de Calor de Ocorrências</h2>
        <p className="text-muted-foreground text-sm">Carregando mapa...</p>
      </div>
    );
  }

  return (
    <div className="bg-card p-6 rounded-lg">
      <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
        <h2 className="text-lg font-semibold text-primary">🗺️ Mapa de Calor de Ocorrências</h2>
        <div className="flex items-center gap-3">
          <select
            value={viewMode}
            onChange={e => setViewMode(e.target.value as 'unit' | 'local')}
            className="text-sm rounded-lg px-3 py-1.5 bg-secondary border-border border text-foreground"
          >
            <option value="unit">Por Unidade/Planta</option>
            <option value="local">Por Local/Estado</option>
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
      <div className="rounded-lg overflow-hidden border border-border" style={{ height: 500 }}>
        <MapContainer
          center={[-14.24, -51.93]}
          zoom={4}
          style={{ height: '100%', width: '100%' }}
          scrollWheelZoom
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          <HeatLayer points={heatPoints} />
        </MapContainer>
      </div>
      {heatPoints.length === 0 && (
        <p className="text-muted-foreground text-sm mt-3 text-center">
          Nenhuma ocorrência encontrada para os filtros selecionados.
        </p>
      )}
    </div>
  );
}

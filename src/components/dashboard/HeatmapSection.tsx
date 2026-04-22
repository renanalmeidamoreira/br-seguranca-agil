// === MAPA DE CALOR === Seção de heatmap de ocorrências
import { useMemo, useState, useEffect } from 'react';
import { MapContainer, TileLayer, useMap, CircleMarker, Tooltip } from 'react-leaflet';
import type { CaseData } from '@/lib/localDB';
import { Sun, Moon } from 'lucide-react';
import 'leaflet/dist/leaflet.css';
// === NOVA FUNCIONALIDADE: Base compartilhada de cidades (também usada no autocomplete) ===
import { COORD_MAP, MG_CENTER, normalizeCity, findCoordsLocal } from '@/lib/cityCoords';


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

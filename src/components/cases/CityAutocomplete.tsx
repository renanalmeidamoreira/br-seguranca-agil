// === AUTOCOMPLETE DE CIDADES BRASILEIRAS — SYNAPSE v2 ===
// Sugere cidades no formato "Cidade-UF" a partir do COORD_MAP + locais já lançados.
// Tooltip de ajuda com exemplos. Geocodificação Nominatim para cidades novas
// (com cache em localStorage), permitindo que o usuário registre uma cidade
// inédita e ela já caia corretamente no mapa de calor na próxima atualização.

import { useMemo, useState, useRef, useEffect } from 'react';
import { KNOWN_CITIES_FULL, normalizeCity, COORD_MAP, extractUF } from '@/lib/cityCoords';
import { MapPin, HelpCircle, Loader2, Globe } from 'lucide-react';

interface Props {
  value: string;
  onChange: (value: string) => void;
  existingLocals?: string[];
  className?: string;
  required?: boolean;
  placeholder?: string;
}

interface Suggestion {
  display: string;     // texto que vai para o input (ex.: "Ipatinga-MG")
  label: string;       // texto mostrado na lista
  uf?: string;
  remote?: boolean;    // true = veio do Nominatim
}

// Cache global de geocoding via Nominatim (compartilhado com HeatmapSection)
const GEOCODE_CACHE_KEY = 'synapse_geocode_cache_v1';
function loadCache(): Record<string, [number, number] | null> {
  try { return JSON.parse(localStorage.getItem(GEOCODE_CACHE_KEY) || '{}'); }
  catch { return {}; }
}
function saveCache(c: Record<string, [number, number] | null>) {
  try { localStorage.setItem(GEOCODE_CACHE_KEY, JSON.stringify(c)); } catch {}
}

interface NominatimHit {
  display: string;     // ex.: "Ubá-MG"
  city: string;
  uf: string;
  lat: number;
  lng: number;
}

async function searchNominatim(query: string): Promise<NominatimHit[]> {
  try {
    const url = `https://nominatim.openstreetmap.org/search?format=json&addressdetails=1&limit=5&countrycodes=br&q=${encodeURIComponent(query)}`;
    const res = await fetch(url, { headers: { 'Accept': 'application/json' } });
    if (!res.ok) return [];
    const data = await res.json();
    if (!Array.isArray(data)) return [];
    const hits: NominatimHit[] = [];
    const seen = new Set<string>();
    for (const item of data) {
      const addr = item.address || {};
      const city = addr.city || addr.town || addr.village || addr.municipality || addr.county;
      const stateCode = (addr['ISO3166-2-lvl4'] || '').replace('BR-', '') || '';
      if (!city || !stateCode) continue;
      const key = `${city}-${stateCode}`.toLowerCase();
      if (seen.has(key)) continue;
      seen.add(key);
      hits.push({
        display: `${city}-${stateCode}`,
        city,
        uf: stateCode,
        lat: parseFloat(item.lat),
        lng: parseFloat(item.lon),
      });
    }
    return hits;
  } catch (e) {
    console.warn('Nominatim autocomplete falhou:', e);
    return [];
  }
}

export default function CityAutocomplete({
  value,
  onChange,
  existingLocals = [],
  className = '',
  required,
  placeholder = 'Ex.: Ipatinga-MG',
}: Props) {
  const [open, setOpen] = useState(false);
  const [highlight, setHighlight] = useState(0);
  const [showHelp, setShowHelp] = useState(false);
  const [remoteHits, setRemoteHits] = useState<NominatimHit[]>([]);
  const [loadingRemote, setLoadingRemote] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<number | null>(null);

  // Combina cidades conhecidas + locais já lançados (preserva variações).
  const localOptions = useMemo<Suggestion[]>(() => {
    const seen = new Set<string>();
    const out: Suggestion[] = [];

    // 1) Cidades já lançadas em casos/riscos — preserva grafia do usuário
    existingLocals.forEach(name => {
      if (!name) return;
      const n = normalizeCity(name);
      if (!n || seen.has(n)) return;
      seen.add(n);
      const uf = extractUF(name) || COORD_MAP[n]?.uf || '';
      out.push({ display: name, label: name, uf });
    });

    // 2) Base oficial COORD_MAP no formato "Cidade-UF"
    KNOWN_CITIES_FULL.forEach(c => {
      if (seen.has(c.key)) return;
      seen.add(c.key);
      out.push({ display: c.display, label: c.display, uf: c.uf });
    });

    return out;
  }, [existingLocals]);

  const localSuggestions = useMemo<Suggestion[]>(() => {
    const q = value.trim().toLowerCase();
    if (!q) return localOptions.slice(0, 8);
    const nq = normalizeCity(q);
    return localOptions
      .filter(opt => {
        const no = normalizeCity(opt.display);
        return no.includes(nq) || opt.display.toLowerCase().includes(q);
      })
      .slice(0, 8);
  }, [value, localOptions]);

  // === Geocodificação Nominatim para cidades não mapeadas ===
  useEffect(() => {
    if (debounceRef.current) window.clearTimeout(debounceRef.current);
    const q = value.trim();
    if (q.length < 3) { setRemoteHits([]); return; }
    if (localSuggestions.length >= 3) { setRemoteHits([]); return; }

    debounceRef.current = window.setTimeout(async () => {
      setLoadingRemote(true);
      const hits = await searchNominatim(q);
      setLoadingRemote(false);
      // Persiste no cache para o heatmap reusar
      if (hits.length) {
        const cache = loadCache();
        hits.forEach(h => {
          const k = normalizeCity(h.city);
          if (k && !(k in cache)) cache[k] = [h.lat, h.lng];
        });
        saveCache(cache);
      }
      setRemoteHits(hits);
    }, 450);

    return () => { if (debounceRef.current) window.clearTimeout(debounceRef.current); };
  }, [value, localSuggestions.length]);

  const remoteSuggestions = useMemo<Suggestion[]>(
    () => remoteHits
      .filter(h => !localSuggestions.some(s => normalizeCity(s.display) === normalizeCity(h.city)))
      .map(h => ({ display: h.display, label: h.display, uf: h.uf, remote: true })),
    [remoteHits, localSuggestions],
  );

  const suggestions = useMemo(
    () => [...localSuggestions, ...remoteSuggestions].slice(0, 10),
    [localSuggestions, remoteSuggestions],
  );

  // Fecha ao clicar fora
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
        setShowHelp(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const select = (s: Suggestion) => {
    onChange(s.display);
    setOpen(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!open || suggestions.length === 0) return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHighlight(h => Math.min(h + 1, suggestions.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlight(h => Math.max(h - 1, 0));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      select(suggestions[highlight]);
    } else if (e.key === 'Escape') {
      setOpen(false);
    }
  };

  return (
    <div ref={containerRef} className="relative">
      <div className="relative">
        <input
          type="text"
          value={value}
          onChange={e => { onChange(e.target.value); setOpen(true); setHighlight(0); }}
          onFocus={() => setOpen(true)}
          onKeyDown={handleKeyDown}
          className={className}
          required={required}
          placeholder={placeholder}
          autoComplete="off"
          aria-describedby="city-autocomplete-help"
        />
        {/* === TOOLTIP DE AJUDA === */}
        <button
          type="button"
          onMouseEnter={() => setShowHelp(true)}
          onMouseLeave={() => setShowHelp(false)}
          onFocus={() => setShowHelp(true)}
          onBlur={() => setShowHelp(false)}
          className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-primary"
          aria-label="Ajuda sobre formato de cidade"
          tabIndex={-1}
        >
          <HelpCircle className="w-4 h-4" />
        </button>
        {showHelp && (
          <div
            id="city-autocomplete-help"
            role="tooltip"
            className="absolute right-0 top-full mt-1 z-50 w-64 rounded-md border border-border bg-popover p-3 text-xs text-popover-foreground shadow-lg"
          >
            <p className="font-semibold mb-1">Formato recomendado: <span className="text-primary">Cidade-UF</span></p>
            <ul className="space-y-0.5">
              <li>• Ipatinga-MG</li>
              <li>• Visconde do Rio Branco-MG</li>
              <li>• Aparecida de Goiânia-GO</li>
            </ul>
            <p className="mt-2 text-muted-foreground">Cidades novas são buscadas automaticamente no OpenStreetMap.</p>
          </div>
        )}
      </div>

      {open && (suggestions.length > 0 || loadingRemote) && (
        <ul
          className="absolute z-50 left-0 right-0 mt-1 max-h-72 overflow-auto rounded-lg border border-border bg-popover shadow-lg"
          role="listbox"
        >
          {suggestions.map((s, i) => (
            <li
              key={`${s.display}-${i}`}
              role="option"
              aria-selected={i === highlight}
              onMouseDown={(e) => { e.preventDefault(); select(s); }}
              onMouseEnter={() => setHighlight(i)}
              className={`flex items-center gap-2 px-3 py-2 text-sm cursor-pointer ${
                i === highlight ? 'bg-accent text-accent-foreground' : 'text-foreground'
              }`}
            >
              {s.remote
                ? <Globe className="w-3.5 h-3.5 text-info shrink-0" />
                : <MapPin className="w-3.5 h-3.5 text-primary shrink-0" />}
              <span className="truncate flex-1">{s.label}</span>
              {s.remote && <span className="text-[10px] uppercase text-muted-foreground">OSM</span>}
            </li>
          ))}
          {loadingRemote && (
            <li className="flex items-center gap-2 px-3 py-2 text-xs text-muted-foreground">
              <Loader2 className="w-3.5 h-3.5 animate-spin" /> Buscando cidades…
            </li>
          )}
        </ul>
      )}
    </div>
  );
}

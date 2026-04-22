// === NOVA FUNCIONALIDADE: Autocomplete de cidades para o campo LOCAL ===
// Sugere cidades já conhecidas (do COORD_MAP) + as que já existem nos casos atuais.
// Ao escolher uma sugestão, o nome cai exatamente como o mapa reconhece, garantindo
// que a ocorrência entre no agrupamento correto e o mapa atualize automaticamente.

import { useMemo, useState, useRef, useEffect } from 'react';
import { KNOWN_CITIES, normalizeCity } from '@/lib/cityCoords';
import { MapPin } from 'lucide-react';

interface Props {
  value: string;
  onChange: (value: string) => void;
  existingLocals?: string[];
  className?: string;
  required?: boolean;
  placeholder?: string;
}

export default function CityAutocomplete({
  value,
  onChange,
  existingLocals = [],
  className = '',
  required,
  placeholder = 'Digite a cidade...',
}: Props) {
  const [open, setOpen] = useState(false);
  const [highlight, setHighlight] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);

  // Combina cidades conhecidas + locais já lançados (preserva variações), sem duplicar pela forma normalizada
  const allOptions = useMemo(() => {
    const seen = new Set<string>();
    const out: string[] = [];
    [...existingLocals, ...KNOWN_CITIES].forEach(name => {
      if (!name) return;
      const n = normalizeCity(name);
      if (!n || seen.has(n)) return;
      seen.add(n);
      out.push(name);
    });
    return out;
  }, [existingLocals]);

  const suggestions = useMemo(() => {
    const q = value.trim().toLowerCase();
    if (!q) return allOptions.slice(0, 8);
    const nq = normalizeCity(q);
    return allOptions
      .filter(opt => {
        const no = normalizeCity(opt);
        return no.includes(nq) || opt.toLowerCase().includes(q);
      })
      .slice(0, 8);
  }, [value, allOptions]);

  // Fecha ao clicar fora
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const select = (city: string) => {
    onChange(city);
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
      />
      {open && suggestions.length > 0 && (
        <ul
          className="absolute z-50 left-0 right-0 mt-1 max-h-60 overflow-auto rounded-lg border border-border bg-popover shadow-lg"
          role="listbox"
        >
          {suggestions.map((city, i) => (
            <li
              key={city}
              role="option"
              aria-selected={i === highlight}
              onMouseDown={(e) => { e.preventDefault(); select(city); }}
              onMouseEnter={() => setHighlight(i)}
              className={`flex items-center gap-2 px-3 py-2 text-sm cursor-pointer ${
                i === highlight ? 'bg-accent text-accent-foreground' : 'text-foreground'
              }`}
            >
              <MapPin className="w-3.5 h-3.5 text-primary shrink-0" />
              <span className="truncate">{city}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

// === NOVA FUNCIONALIDADE: MINI-MAPA NOS CARTÕES DE PLANTA ===
// Exibe a localização geográfica da planta no cartão de risco com cor
// proporcional ao GUT médio (verde/amarelo/vermelho).
import { useMemo } from 'react';
import { MapContainer, TileLayer, CircleMarker, Tooltip } from 'react-leaflet';
import { findCoordsLocal, MG_CENTER } from '@/lib/cityCoords';
import 'leaflet/dist/leaflet.css';

interface Props {
  plant: string;
  avgGut: number;
}

// Escala de cores para risco (GUT)
function gutColor(avg: number): string {
  if (avg <= 2) return '#22c55e';   // verde
  if (avg <= 4) return '#eab308';   // amarelo
  return '#ef4444';                  // vermelho
}

export default function PlantMiniMap({ plant, avgGut }: Props) {
  const coords = useMemo(() => findCoordsLocal(plant) || MG_CENTER, [plant]);
  const color = gutColor(avgGut);

  return (
    <div
      className="rounded-md overflow-hidden border border-border"
      style={{ height: 110, position: 'relative', zIndex: 0 }}
      onClick={(e) => e.stopPropagation()}
    >
      <MapContainer
        key={`${plant}-${avgGut}`}
        center={coords}
        zoom={6}
        zoomControl={false}
        attributionControl={false}
        scrollWheelZoom={false}
        dragging={false}
        doubleClickZoom={false}
        touchZoom={false}
        style={{ height: '100%', width: '100%', cursor: 'pointer' }}
      >
        <TileLayer url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png" />
        <CircleMarker
          center={coords}
          radius={10}
          pathOptions={{ color, fillColor: color, fillOpacity: 0.7, weight: 2 }}
        >
          <Tooltip direction="top" opacity={1}>
            <div className="text-xs">
              <strong>{plant}</strong>
              <br />
              GUT médio: {avgGut.toFixed(1)}
            </div>
          </Tooltip>
        </CircleMarker>
      </MapContainer>
    </div>
  );
}

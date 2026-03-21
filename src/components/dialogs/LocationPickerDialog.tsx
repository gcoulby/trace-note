import { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { MapPin, Search, X } from 'lucide-react';
import type { NodeLocation } from '../../types';

interface Props {
  initial?: NodeLocation;
  onConfirm: (loc: NodeLocation) => void;
  onClose: () => void;
}

// Custom round pin icon — avoids default-marker asset-resolution issues in Vite
function makePinIcon() {
  return L.divIcon({
    html: `<div style="width:14px;height:14px;background:#dc2626;border:2.5px solid #fff;border-radius:50%;box-shadow:0 1px 6px rgba(0,0,0,.55)"></div>`,
    iconSize: [14, 14],
    iconAnchor: [7, 7],
    className: '',
  });
}

type NominatimResult = { lat: string; lon: string; display_name: string };

export function LocationPickerDialog({ initial, onConfirm, onClose }: Props) {
  const mapDivRef = useRef<HTMLDivElement>(null);
  const mapRef    = useRef<L.Map | null>(null);
  const markerRef = useRef<L.Marker | null>(null);

  const [location, setLocation] = useState<NodeLocation | null>(initial ?? null);
  const [search, setSearch]     = useState('');
  const [searching, setSearching] = useState(false);
  const [searchErr, setSearchErr] = useState('');

  // Initialise Leaflet map once
  useEffect(() => {
    if (!mapDivRef.current) return;

    const center: L.LatLngTuple = initial ? [initial.lat, initial.lng] : [20, 0];
    const zoom = initial ? 14 : 2;

    const map = L.map(mapDivRef.current, { center, zoom });

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
      subdomains: ['a', 'b', 'c'],
    }).addTo(map);

    // Place initial marker
    if (initial) {
      markerRef.current = L.marker([initial.lat, initial.lng], {
        icon: makePinIcon(),
        draggable: true,
      }).addTo(map);
      markerRef.current.on('dragend', () => {
        if (!markerRef.current) return;
        const { lat, lng } = markerRef.current.getLatLng();
        setLocation((prev) => ({ ...prev, lat, lng }));
      });
    }

    // Click to place / move marker
    map.on('click', (e: L.LeafletMouseEvent) => {
      const { lat, lng } = e.latlng;
      setLocation((prev) => ({ ...(prev ?? {}), lat, lng }));
      if (markerRef.current) {
        markerRef.current.setLatLng([lat, lng]);
      } else {
        markerRef.current = L.marker([lat, lng], { icon: makePinIcon(), draggable: true }).addTo(map);
        markerRef.current.on('dragend', () => {
          if (!markerRef.current) return;
          const pos = markerRef.current.getLatLng();
          setLocation((prev) => ({ ...(prev ?? {}), lat: pos.lat, lng: pos.lng }));
        });
      }
    });

    mapRef.current = map;
    return () => {
      map.remove();
      mapRef.current = null;
      markerRef.current = null;
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSearch = async () => {
    const q = search.trim();
    if (!q) return;
    setSearching(true);
    setSearchErr('');
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(q)}&limit=1`,
        { headers: { 'Accept-Language': 'en' } },
      );
      const results = (await res.json()) as NominatimResult[];
      if (!results.length) { setSearchErr('No results'); return; }
      const { lat, lon, display_name } = results[0];
      const newLoc: NodeLocation = { lat: parseFloat(lat), lng: parseFloat(lon), label: display_name };
      setLocation(newLoc);
      if (mapRef.current) {
        mapRef.current.setView([newLoc.lat, newLoc.lng], 14);
        if (markerRef.current) {
          markerRef.current.setLatLng([newLoc.lat, newLoc.lng]);
        } else {
          markerRef.current = L.marker([newLoc.lat, newLoc.lng], {
            icon: makePinIcon(), draggable: true,
          }).addTo(mapRef.current);
          markerRef.current.on('dragend', () => {
            if (!markerRef.current) return;
            const pos = markerRef.current.getLatLng();
            setLocation((prev) => ({ ...(prev ?? {}), lat: pos.lat, lng: pos.lng }));
          });
        }
      }
    } catch {
      setSearchErr('Search failed — check network');
    } finally {
      setSearching(false);
    }
  };

  const clearLocation = () => {
    setLocation(null);
    if (markerRef.current) {
      markerRef.current.remove();
      markerRef.current = null;
    }
  };

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50">
      <div className="bg-[#161b22] border border-[#30363d] rounded-lg w-[680px] h-[540px] flex flex-col shadow-2xl overflow-hidden">

        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-[#30363d] shrink-0">
          <div className="flex items-center gap-2">
            <MapPin size={14} className="text-amber-400" />
            <span className="text-[11px] uppercase tracking-wider text-[#8b949e] font-mono">Location Picker</span>
          </div>
          <button onClick={onClose} className="text-[#8b949e] hover:text-[#e6edf3]"><X size={14} /></button>
        </div>

        {/* Search */}
        <div className="flex gap-2 px-4 py-2.5 border-b border-[#21262d] shrink-0">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') void handleSearch(); }}
            placeholder="Search for a place…"
            className="flex-1 bg-[#0d1117] border border-[#30363d] rounded px-3 py-1.5 text-sm text-[#e6edf3] placeholder-[#484f58] focus:outline-none focus:border-amber-400/60"
          />
          <button
            onClick={() => void handleSearch()}
            disabled={searching}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs bg-[#21262d] text-[#8b949e] hover:text-[#e6edf3] rounded border border-[#30363d] hover:border-[#484f58] transition-colors disabled:opacity-50"
          >
            <Search size={12} />
            {searching ? 'Searching…' : 'Search'}
          </button>
        </div>

        {searchErr && (
          <div className="px-4 py-1.5 text-xs text-red-400 border-b border-[#21262d] shrink-0">{searchErr}</div>
        )}

        {/* Map — isolation: isolate keeps Leaflet's high z-index controls inside this stacking ctx */}
        <div className="flex-1 min-h-0" style={{ isolation: 'isolate' }}>
          <div ref={mapDivRef} className="w-full h-full" />
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-4 py-3 border-t border-[#30363d] shrink-0 gap-4">
          <div className="flex-1 min-w-0">
            {location ? (
              <div className="space-y-1.5">
                <div className="text-[10px] font-mono text-[#6e7681]">
                  {location.lat.toFixed(5)}, {location.lng.toFixed(5)}
                </div>
                <input
                  type="text"
                  value={location.label ?? ''}
                  onChange={(e) => setLocation((prev) => prev ? { ...prev, label: e.target.value } : null)}
                  placeholder="Label (optional)"
                  className="w-full bg-[#0d1117] border border-[#30363d] rounded px-2 py-1 text-xs text-[#e6edf3] placeholder-[#484f58] focus:outline-none focus:border-amber-400/60"
                />
              </div>
            ) : (
              <span className="text-[11px] text-[#484f58]">Click the map to place a pin</span>
            )}
          </div>

          <div className="flex gap-2 shrink-0">
            {location && (
              <button
                onClick={clearLocation}
                className="px-3 py-1.5 text-xs text-red-400 hover:text-red-300 border border-red-400/30 hover:border-red-400/60 rounded transition-colors"
              >
                Clear
              </button>
            )}
            <button
              onClick={onClose}
              className="px-3 py-1.5 text-xs text-[#8b949e] hover:text-[#e6edf3] border border-[#30363d] hover:border-[#484f58] rounded transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={() => { if (location) onConfirm(location); }}
              disabled={!location}
              className="px-3 py-1.5 text-xs bg-amber-400 text-[#0d1117] font-semibold rounded hover:bg-amber-300 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              Set Location
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

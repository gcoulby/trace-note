/** Converts lat/lng + zoom to OSM tile x,y coordinates. */
export function latLngToTileXY(lat: number, lng: number, z: number): { x: number; y: number } {
  const n = Math.pow(2, z);
  const x = Math.floor(((lng + 180) / 360) * n);
  const latRad = (lat * Math.PI) / 180;
  const y = Math.floor(
    ((1 - Math.log(Math.tan(latRad) + 1 / Math.cos(latRad)) / Math.PI) / 2) * n,
  );
  return { x, y };
}

/** Returns the OSM tile URL for a given lat/lng at a given zoom level. */
export function osmTileUrl(lat: number, lng: number, z = 14): string {
  const { x, y } = latLngToTileXY(lat, lng, z);
  return `https://tile.openstreetmap.org/${z}/${x}/${y}.png`;
}

/**
 * Returns the position of a lat/lng pin within its tile image, as a percentage
 * (0–100) from the top-left of the tile. Use for CSS `left`/`top` on the pin overlay.
 */
export function pinPercentInTile(
  lat: number,
  lng: number,
  z: number,
): { px: number; py: number } {
  const n = Math.pow(2, z);
  const latRad = (lat * Math.PI) / 180;
  const tileX = ((lng + 180) / 360) * n;
  const tileY = ((1 - Math.log(Math.tan(latRad) + 1 / Math.cos(latRad)) / Math.PI) / 2) * n;
  return {
    px: (tileX - Math.floor(tileX)) * 100,
    py: (tileY - Math.floor(tileY)) * 100,
  };
}

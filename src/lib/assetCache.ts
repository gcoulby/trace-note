// In-memory cache: assetId → object URL (for display — never stored in Zustand)
const _urls = new Map<string, string>();

export function cacheAsset(assetId: string, buffer: ArrayBuffer, mimeType: string): string {
  const existing = _urls.get(assetId);
  if (existing) return existing;
  const url = URL.createObjectURL(new Blob([buffer], { type: mimeType }));
  _urls.set(assetId, url);
  return url;
}

export function getCachedAsset(assetId: string): string | undefined {
  return _urls.get(assetId);
}

export function invalidateAsset(assetId: string): void {
  const url = _urls.get(assetId);
  if (url) URL.revokeObjectURL(url);
  _urls.delete(assetId);
}

export function clearAssetCache(): void {
  _urls.forEach((url) => URL.revokeObjectURL(url));
  _urls.clear();
}

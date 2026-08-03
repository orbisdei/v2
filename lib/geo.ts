// Small shared geo-math helpers. Split out of app/admin/SitesPanel.tsx so
// components/admin/CoordinateVerification.tsx can use the exact same
// distance logic instead of a second copy.

export function haversineMeters(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371000;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export function distanceBadgeClass(meters: number): string {
  if (meters < 50) return 'bg-green-100 text-green-800';
  if (meters < 500) return 'bg-yellow-100 text-yellow-800';
  if (meters < 2000) return 'bg-orange-100 text-orange-800';
  return 'bg-red-100 text-red-800';
}

export function formatDistance(meters: number): string {
  if (meters < 1000) return `${Math.round(meters)}m`;
  return `${(meters / 1000).toFixed(1)}km`;
}

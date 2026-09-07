/**
 * Geolocation & Haversine Distance Utility
 * Strictly mirrors the PostgreSQL calculate_distance_km() PL/pgSQL function
 * Project: CareLink Healthcare Platform
 */

const EARTH_RADIUS_KM = 6371.0;

function toRadians(degrees: number): number {
  return (degrees * Math.PI) / 180.0;
}

/**
 * Calculates the great-circle distance between two points on the Earth's surface
 * using the Haversine formula.
 *
 * @param lat1 Latitude of point 1 (in decimal degrees)
 * @param lon1 Longitude of point 1 (in decimal degrees)
 * @param lat2 Latitude of point 2 (in decimal degrees)
 * @param lon2 Longitude of point 2 (in decimal degrees)
 * @returns Distance in kilometers rounded to 2 decimal places, or null if coordinates are missing.
 */
export function calculateDistanceKm(
  lat1: number | null | undefined,
  lon1: number | null | undefined,
  lat2: number | null | undefined,
  lon2: number | null | undefined
): number | null {
  if (
    lat1 === null ||
    lat1 === undefined ||
    lon1 === null ||
    lon1 === undefined ||
    lat2 === null ||
    lat2 === undefined ||
    lon2 === null ||
    lon2 === undefined
  ) {
    return null;
  }

  const dLat = toRadians(lat2 - lat1);
  const dLon = toRadians(lon2 - lon1);

  const a =
    Math.sin(dLat / 2.0) * Math.sin(dLat / 2.0) +
    Math.cos(toRadians(lat1)) *
      Math.cos(toRadians(lat2)) *
      Math.sin(dLon / 2.0) *
      Math.sin(dLon / 2.0);

  const c = 2.0 * Math.asin(Math.sqrt(a));

  return Math.round(EARTH_RADIUS_KM * c * 100) / 100;
}

/**
 * Formats distance for user display (e.g., "850 m" or "4.2 km")
 */
export function formatDistance(distanceKm: number | null | undefined): string {
  if (distanceKm === null || distanceKm === undefined) {
    return 'Distance inconnue';
  }
  if (distanceKm < 1) {
    return `${Math.round(distanceKm * 1000)} m`;
  }
  return `${distanceKm.toFixed(1)} km`;
}

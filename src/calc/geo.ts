/** Outils géographiques : repère local plan (x vers l'est, y vers le nord, en mètres), comme l'écran de la voiture. */
export const D2R = Math.PI / 180;
export const KY = 110540.0;
export const kxOf = (lat: number) => 111320.0 * Math.cos(lat * D2R);

/** Distance en mètres entre deux points (projection locale, suffisante à quelques km). */
export function distM(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const kx = kxOf((lat1 + lat2) / 2);
  const dx = (lon2 - lon1) * kx;
  const dy = (lat2 - lat1) * KY;
  return Math.sqrt(dx * dx + dy * dy);
}

/** Cap en degrés (0 = nord, sens horaire) de 1 vers 2. */
export function capDeg(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const kx = kxOf((lat1 + lat2) / 2);
  const dx = (lon2 - lon1) * kx;
  const dy = (lat2 - lat1) * KY;
  return (Math.atan2(dx, dy) / D2R + 360) % 360;
}

const POINTS = ['N', 'NE', 'E', 'SE', 'S', 'SO', 'O', 'NO'];
export const pointCardinal = (deg: number) => POINTS[Math.round((((deg % 360) + 360) % 360) / 45) % 8];

/** Niveau reçu en pourcentage : −100 dBm = 0 %, −40 dBm = 100 % (cahier des charges, « Calculs »). */
export function niveauPct(dbm: number): number | null {
  if (dbm <= -128 || Number.isNaN(dbm)) return null; // −128 = voie muette
  return Math.round(Math.min(100, Math.max(0, ((dbm + 100) / 60) * 100)));
}

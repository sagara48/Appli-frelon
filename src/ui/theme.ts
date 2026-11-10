/** Couleurs et tailles de la maquette validée. */
export const C = {
  encre: '#14202E',
  fond: '#F4F5F0',
  carte: '#FFFFFF',
  accent: '#E8A317',
  discret: '#5B6672',
  ligne: '#DDE1D8',
  ok: '#2F7D4F',
  alerte: '#B3412E',
  ecarte: '#B9BFB3',
  oeil: '#2E6DB3',
  portatif: '#7A4FB3',
};
export const R = { carte: 14, puce: 999 };
export const police = { titre: 22, normal: 15, petit: 13, mini: 11 };

/** Libellé de la qualité d'un relèvement (0–100). */
export const libelleQualite = (q: number) => (q >= 70 ? 'bonne' : q >= 45 ? 'moyenne' : 'faible');

/** « Avant-droit de la voiture (+38°) » à partir de la direction relative (0 = avant, sens horaire). */
export function libelleRelatif(rel: number): string {
  const r = ((rel % 360) + 360) % 360;
  const cote = ['Avant', 'Avant-droit', 'Droite', 'Arrière-droit', 'Arrière', 'Arrière-gauche', 'Gauche', 'Avant-gauche'][Math.round(r / 45) % 8];
  const signe = r > 180 ? r - 360 : r;
  return `${cote} de la voiture (${signe >= 0 ? '+' : ''}${Math.round(signe)}°)`;
}

export const VOIES = ['Avant', 'Droite', 'Arrière', 'Gauche', 'Omni'];

/** Nombre de voies en service : le toit envoie un masque (bit 0 = avant … bit 3 = gauche). */
export const nbVoies = (masque: number) => [0, 1, 2, 3].filter((b) => masque & (1 << b)).length;

export const fmtAge = (s: number) => (s < 60 ? `${Math.round(s)} s` : s < 3600 ? `${Math.round(s / 60)} min` : `${Math.round(s / 3600)} h`);
export const fmtDist = (m: number) => (m < 1000 ? `${Math.round(m)} m` : `${(m / 1000).toFixed(m < 10000 ? 2 : 1).replace('.', ',')} km`);
export const fmtCoord = (lat: number, lon: number) =>
  `${Math.abs(lat).toFixed(5).replace('.', ',')} ${lat >= 0 ? 'N' : 'S'} · ${Math.abs(lon).toFixed(5).replace('.', ',')} ${lon >= 0 ? 'E' : 'O'}`;
export const idTag = (id: number) => String(id).padStart(3, '0');

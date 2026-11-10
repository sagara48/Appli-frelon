/**
 * Décodage des lignes envoyées par la carte chef du toit (service UART Nordic, une ligne par message).
 * Format identique à celui que lit l'écran de la voiture (data.c) et au journal de la carte SD.
 */
export const NV = 4; // voies directives ; l'indice 4 = antenne omni

export type LigneS = {
  kind: 'S'; battPct: number; vbat: number; charge: boolean; usb: boolean; voiesOk: number; sats: number;
  lat: number; lon: number; cap: number; vitesse: number; nReleves: number; utc: number; calN: number;
};
export type LigneR = {
  kind: 'R'; utc: number; tag: number; seq: number; r: number[]; rel: number; abs: number; q: number;
  lat: number; lon: number; cap: number; vitesse: number; pile: number;
};
export type LigneC = { kind: 'C'; fwd: number; beam: number; gains: number[]; vmin: number };
export type LigneK =
  | { kind: 'K'; type: 'POS' | 'GO' | 'NID' }
  | { kind: 'K'; type: 'ERR'; message: string }
  | { kind: 'K'; type: 'MAJ'; cible: string; n: number }
  | { kind: 'K'; type: 'RESULTAT'; fwd: number; beam: number; gains: number[]; errDeg: number; n: number };
export type LigneN = { kind: 'N'; tag: number; lat: number; lon: number; errM: number };
export type LigneToit = LigneS | LigneR | LigneC | LigneK | LigneN;

const num = (s: string | undefined) => (s === undefined || s === '' ? NaN : Number(s));

export function parseToit(ligne: string): LigneToit | null {
  const f = ligne.trim().split(',');
  switch (f[0]) {
    case 'S':
      if (f.length < 12) return null;
      return {
        kind: 'S', battPct: num(f[1]), vbat: num(f[2]), charge: f[3] === '1', usb: f[4] === '1', voiesOk: num(f[5]),
        sats: num(f[6]), lat: num(f[7]), lon: num(f[8]), cap: num(f[9]), vitesse: num(f[10]), nReleves: num(f[11]),
        utc: f.length > 12 ? num(f[12]) : 0, calN: f.length > 13 ? num(f[13]) : -1,
      };
    case 'R':
      // R,utc,id,seq,r0,r1,r2,r3,r4,rel,abs,q,lat,lon,cap,vitesse,batt
      if (f.length < 17) return null;
      return {
        kind: 'R', utc: num(f[1]), tag: num(f[2]), seq: num(f[3]), r: [4, 5, 6, 7, 8].map((i) => num(f[i])),
        rel: num(f[9]), abs: num(f[10]), q: num(f[11]), lat: num(f[12]), lon: num(f[13]), cap: num(f[14]),
        vitesse: num(f[15]), pile: num(f[16]),
      };
    case 'C':
      if (f.length < 8) return null;
      return { kind: 'C', fwd: num(f[1]), beam: num(f[2]), gains: [3, 4, 5, 6].map((i) => num(f[i])), vmin: num(f[7]) };
    case 'K':
      if (f[1] === 'POS' || f[1] === 'GO' || f[1] === 'NID') return { kind: 'K', type: f[1] };
      if (f[1] === 'ERR') return { kind: 'K', type: 'ERR', message: f.slice(2).join(',') };
      if (f[1] === 'MAJ') return { kind: 'K', type: 'MAJ', cible: f[2] ?? '', n: num(f[3]) };
      if (f.length >= 9)
        return { kind: 'K', type: 'RESULTAT', fwd: num(f[1]), beam: num(f[2]), gains: [3, 4, 5, 6].map((i) => num(f[i])), errDeg: num(f[7]), n: num(f[8]) };
      return null;
    case 'N':
      // N,P,tag,lat,lon,err : nid calculé par le portatif, relayé par le toit
      if (f.length < 6) return null;
      return { kind: 'N', tag: num(f[2]), lat: num(f[3]), lon: num(f[4]), errM: num(f[5]) };
    default:
      return null;
  }
}

/** Commandes acceptées par le toit (phone.c). */
export const cmdToit = {
  cfg: () => 'cfg',
  fwd: (deg: number) => `fwd ${deg.toFixed(0)}`,
  beam: (deg: number) => `beam ${deg.toFixed(0)}`,
  gain: (voie: number, db: number) => `gain ${voie} ${db.toFixed(1)}`,
  vmin: (kmh: number) => `vmin ${kmh.toFixed(1)}`,
  auto: (min: number) => `auto ${min.toFixed(0)}`,
  calpos: () => 'calpos',
  cal: (tag: number) => `cal ${tag}`,
  calfin: () => 'calfin',
  nid: (lat: number, lon: number, errM: number, tag: number) => `nid ${lat.toFixed(7)} ${lon.toFixed(7)} ${errM.toFixed(0)} ${tag}`,
  maj: () => 'maj',
  reset: () => 'reset',
  off: () => 'off',
};

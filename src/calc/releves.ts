/**
 * Relèvements gardés par tag pour la triangulation : portage de add_line() et nest_estimate() de l'écran (data.c).
 * - un relèvement retenu tous les 15 m au moins (sinon on accumule le même point à l'arrêt) ;
 * - qualité d'au moins 40 et direction absolue connue ;
 * - les relèvements incohérents (reflets) sont marqués « écartés » par 3 passes de moindres carrés robustes.
 */
import { D2R, KY, distM, kxOf } from './geo';

export const MAX_LIGNES = 64;
export type Ligne = { lat: number; lon: number; absDeg: number; q: number; t: number; ecartee: boolean };

export function ajouterReleve(lignes: Ligne[], lat: number, lon: number, absDeg: number, q: number, t: number): Ligne[] {
  if (absDeg < 0 || q < 40 || lat === 0) return lignes;
  const res = lignes.slice();
  const der = res[res.length - 1];
  if (der && distM(lat, lon, der.lat, der.lon) < 15) {
    if (q > der.q) res[res.length - 1] = { ...der, absDeg, q };
  } else {
    if (res.length === MAX_LIGNES) res.shift();
    res.push({ lat, lon, absDeg, q, t, ecartee: false });
  }
  marquerEcartees(res);
  return res;
}

function resoudre(L: Ligne[], la0: number, lo0: number, kx: number): { x: number; y: number } | null {
  let A11 = 0, A12 = 0, A22 = 0, b1 = 0, b2 = 0, amin = 400, amax = -400, n = 0;
  for (const l of L) {
    if (l.ecartee) continue;
    const x = (l.lon - lo0) * kx, y = (l.lat - la0) * KY, a = l.absDeg * D2R;
    const nx = Math.cos(a), ny = -Math.sin(a), w = l.q / 100 + 0.1;
    A11 += w * nx * nx; A12 += w * nx * ny; A22 += w * ny * ny;
    const c = nx * x + ny * y;
    b1 += w * nx * c; b2 += w * ny * c;
    amin = Math.min(amin, l.absDeg); amax = Math.max(amax, l.absDeg);
    n++;
  }
  const det = A11 * A22 - A12 * A12;
  if (n < 3 || Math.abs(det) < 1e-6 || amax - amin < 15) return null;
  return { x: (A22 * b1 - A12 * b2) / det, y: (A11 * b2 - A12 * b1) / det };
}

/** Marque les relèvements aberrants (modifie le tableau). */
export function marquerEcartees(L: Ligne[]): void {
  for (const l of L) l.ecartee = false;
  if (L.length < 3) return;
  const la0 = L[0].lat, lo0 = L[0].lon, kx = kxOf(la0);
  for (let pass = 0; pass < 3; pass++) {
    const p = resoudre(L, la0, lo0, kx);
    if (!p) return;
    const d: number[] = [];
    for (const l of L) {
      if (l.ecartee) continue;
      const a = l.absDeg * D2R, x = (l.lon - lo0) * kx, y = (l.lat - la0) * KY;
      d.push(Math.abs((p.x - x) * Math.cos(a) - (p.y - y) * Math.sin(a)));
    }
    if (!d.length) return;
    d.sort((a, b) => a - b);
    const lim = Math.max(3 * 1.4826 * d[Math.floor(d.length / 2)], 60);
    let change = false;
    for (const l of L) {
      if (l.ecartee) continue;
      const a = l.absDeg * D2R, x = (l.lon - lo0) * kx, y = (l.lat - la0) * KY, dx = p.x - x, dy = p.y - y;
      const derriere = dx * Math.sin(a) + dy * Math.cos(a) < -50; // le nid serait derrière le relevé
      if (Math.abs(dx * Math.cos(a) - dy * Math.sin(a)) > lim || derriere) { l.ecartee = true; change = true; }
    }
    if (!change) break;
  }
}

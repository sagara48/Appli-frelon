/**
 * Portage TypeScript de estim.c (écran de la voiture) : fusion de toutes les sources et temps d'aller-retour.
 * Même algorithme, mêmes constantes, pour que l'appli et l'écran donnent le même nid.
 */
import { D2R, KY, kxOf } from './geo';

export type ELine = { lat: number; lon: number; deg: number; sigDeg: number; w: number }; // relèvement
export type EPoint = { lat: number; lon: number; err: number; w: number }; // estimation ponctuelle
export type ERing = { lat: number; lon: number; r: number; sig: number; w: number }; // anneau d'aller-retour
export type FRes = { ok: boolean; lat: number; lon: number; errM: number };

const fail: FRes = { ok: false, lat: 0, lon: 0, errM: 0 };

export function estFuse(L: ELine[], P: EPoint[], Rin: ERing[]): FRes {
  const R = Rin.slice(0, 8);
  const nl = L.length, np = P.length, nr = R.length;
  if (nl + np + nr === 0 || nl > 200 || np > 32) return fail;
  const la0 = np ? P[0].lat : nl ? L[0].lat : R[0].lat;
  const lo0 = np ? P[0].lon : nl ? L[0].lon : R[0].lon;
  const kx = kxOf(la0);
  const grx = R.map((r) => (r.lon - lo0) * kx), gry = R.map((r) => (r.lat - la0) * KY);
  const lx = L.map((l) => (l.lon - lo0) * kx), ly = L.map((l) => (l.lat - la0) * KY);
  const px = P.map((p) => (p.lon - lo0) * kx), py = P.map((p) => (p.lat - la0) * KY);
  const la = L.map((l) => l.deg * D2R), lsin = la.map(Math.sin), lcos = la.map(Math.cos);
  const ltan = L.map((l) => Math.tan(l.sigDeg * D2R));

  const cost = (x: number, y: number): number => {
    let c = 0;
    for (let i = 0; i < nr; i++) {
      const d = Math.hypot(x - grx[i], y - gry[i]);
      const e = (d - R[i].r) / Math.max(R[i].sig, 10);
      c += R[i].w * Math.min(e * e, 9);
    }
    for (let i = 0; i < nl; i++) {
      const dx = x - lx[i], dy = y - ly[i];
      const along = dx * lsin[i] + dy * lcos[i], perp = dx * lcos[i] - dy * lsin[i];
      let t: number;
      if (along < -20) t = 9; // le nid serait derrière : rejeté
      else {
        const sg = Math.max(15, Math.abs(along) * ltan[i]);
        t = Math.min((perp * perp) / (sg * sg), 9); // plafonné : un relèvement faux ne tire pas tout
      }
      c += L[i].w * t;
    }
    for (let i = 0; i < np; i++) {
      const dx = x - px[i], dy = y - py[i], e = Math.max(P[i].err, 3);
      c += P[i].w * Math.min(((dx * dx + dy * dy) / (e * e)) * 4, 25); // err = 2 sigma
    }
    return c;
  };

  // assez d'information ? un point, ou deux relèvements croisés à plus de 15°
  let crossed = false;
  for (let i = 0; i < nl && !crossed; i++)
    for (let j = i + 1; j < nl; j++)
      if (Math.abs(Math.sin((L[i].deg - L[j].deg) * D2R)) > 0.26) { crossed = true; break; }
  if (np === 0 && !crossed && !(nr >= 1 && nl >= 1) && nr < 2) return fail;

  // zone de recherche : points + intersections de relèvements, ±200 m
  let xmin = 1e9, xmax = -1e9, ymin = 1e9, ymax = -1e9, ns = 0;
  const seed = (x: number, y: number) => {
    if (Math.abs(x) < 3000 && Math.abs(y) < 3000) {
      xmin = Math.min(xmin, x); xmax = Math.max(xmax, x); ymin = Math.min(ymin, y); ymax = Math.max(ymax, y); ns++;
    }
  };
  for (let i = 0; i < np; i++) seed(px[i], py[i]);
  const step = nl > 40 ? Math.floor(nl / 40) : 1;
  for (let i = 0; i < nl; i += step)
    for (let j = i + step; j < nl; j += step) {
      const ux = lsin[i], uy = lcos[i], vx = lsin[j], vy = lcos[j];
      const det = ux * -vy - uy * -vx;
      if (Math.abs(det) < 0.26) continue;
      const bx = lx[j] - lx[i], by = ly[j] - ly[i];
      const t = (bx * -vy - by * -vx) / det, u = (ux * by - uy * bx) / det;
      if (t > 0 && u > 0) seed(lx[i] + t * ux, ly[i] + t * uy);
    }
  for (let i = 0; i < nr; i++) { seed(grx[i] - R[i].r, gry[i] - R[i].r); seed(grx[i] + R[i].r, gry[i] + R[i].r); }
  if (!ns) return fail;
  xmin -= 200; xmax += 200; ymin -= 200; ymax += 200;
  const W = xmax - xmin, H = ymax - ymin, cs = Math.max(4, Math.max(W, H) / 120);
  const nx = Math.floor(W / cs) + 1, ny = Math.floor(H / cs) + 1;
  const grid = new Float64Array(nx * ny);
  let best = 1e30, bi = 0, bj = 0;
  for (let j = 0; j < ny; j++)
    for (let i = 0; i < nx; i++) {
      const c = cost(xmin + i * cs, ymin + j * cs);
      grid[j * nx + i] = c;
      if (c < best) { best = c; bi = i; bj = j; }
    }
  let fx = xmin + bi * cs, fy = ymin + bj * cs, fb = best;
  for (let dy = -cs; dy <= cs; dy += 1)
    for (let dx = -cs; dx <= cs; dx += 1) {
      const c = cost(xmin + bi * cs + dx, ymin + bj * cs + dy);
      if (c < fb) { fb = c; fx = xmin + bi * cs + dx; fy = ymin + bj * cs + dy; }
    }
  // incertitude : zone où le coût dépasse le minimum de moins de 6 (95 %, 2 paramètres)
  let inreg = 0, far2 = 0;
  for (let j = 0; j < ny; j++)
    for (let i = 0; i < nx; i++)
      if (grid[j * nx + i] - fb < 6) {
        inreg++;
        const ddx = xmin + i * cs - fx, ddy = ymin + j * cs - fy;
        far2 = Math.max(far2, ddx * ddx + ddy * ddy);
      }
  let err = Math.max(Math.sqrt((inreg * cs * cs) / Math.PI), 0.85 * Math.sqrt(far2));
  if (inreg <= 9) {
    inreg = 0; far2 = 0;
    for (let dy = -2 * cs; dy <= 2 * cs; dy += 1)
      for (let dx = -2 * cs; dx <= 2 * cs; dx += 1)
        if (cost(fx + dx, fy + dy) - fb < 6) { inreg++; far2 = Math.max(far2, dx * dx + dy * dy); }
    err = Math.max(Math.sqrt(inreg / Math.PI), 0.85 * Math.sqrt(far2));
  }
  if (err < 3) err = 3;
  return { ok: true, errM: err, lat: la0 + fy / KY, lon: lo0 + fx / kx };
}

/* ---------- temps d'aller-retour à l'appât → distance du nid ---------- */
export const RT_V_DEF = 3.4; // m/s
export const RT_P_DEF = 55; // s passées au nid
export type RtRes = { ok: boolean; r: number; sig: number; nUsed: number; tMin: number };

export function estRoundtrip(tripsS: number[], v = RT_V_DEF, p = RT_P_DEF): RtRes {
  const t = tripsS.filter((s) => s >= 40 && s <= 2400).slice(0, 32).sort((a, b) => a - b); // 40 s .. 40 min
  const m = t.length;
  if (!m) return { ok: false, r: 0, sig: 0, nUsed: 0, tMin: 0 };
  let k = 0;
  if (m >= 3) for (k = 0; k < m - 1; k++) if (t[k + 1] <= t[k] * 1.3) break;
  if (k >= m - 1) k = 0;
  const tm = t[k];
  const fly = Math.max(tm - p, 10);
  const r = (v * fly) / 2;
  const sv = 0.2 * r, sp = (v * 30) / 2;
  let sig = Math.sqrt(sv * sv + sp * sp);
  if (m === 1) sig *= 1.5;
  else if (m >= 3) sig *= 0.85;
  return { ok: true, r, sig: Math.max(sig, 25), nUsed: m, tMin: tm };
}

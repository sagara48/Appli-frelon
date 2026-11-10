/**
 * Fusion de toutes les sources d'un tag → une seule estimation du nid (portage de compute() dans fusion.c).
 * Sources prises en compte dans cette version : relèvements du toit, directions à l'œil, nids du portatif.
 * Les anneaux du chrono à l'appât s'ajouteront avec l'écran Chrono.
 */
import { estFuse, type ELine, type EPoint, type ERing, type FRes } from './estim';
import type { Ligne } from './releves';

export type DirectionOeil = { lat: number; lon: number; deg: number };
export type PointPortatif = { lat: number; lon: number; errM: number };
export type Sources = { lignes: Ligne[]; oeil: DirectionOeil[]; portatif: PointPortatif[]; anneaux?: ERing[] };

export type Fusion = FRes & { nVoiture: number; nOeil: number; nPortatif: number; nAnneaux: number };

export function fusionner(s: Sources): Fusion {
  const L: ELine[] = [];
  const nCar = s.lignes.filter((l) => !l.ecartee).length;
  const wCar = nCar > 8 ? 8 / nCar : 1; // relevés voiture corrélés entre eux : poids total plafonné
  for (const l of s.lignes)
    L.push({ lat: l.lat, lon: l.lon, deg: l.absDeg, sigDeg: 10, w: wCar * (0.3 + (0.7 * l.q) / 100) * (l.ecartee ? 0.3 : 1) });
  for (const v of s.oeil) L.push({ lat: v.lat, lon: v.lon, deg: v.deg, sigDeg: 15, w: 1 }); // à l'œil : ±15°
  const P: EPoint[] = s.portatif.map((p) => ({ lat: p.lat, lon: p.lon, err: p.errM, w: 1 }));
  const R = s.anneaux ?? [];
  const f = estFuse(L, P, R);
  return { ...f, nVoiture: s.lignes.length, nOeil: s.oeil.length, nPortatif: s.portatif.length, nAnneaux: R.length };
}

/**
 * État partagé de l'appli. Toutes les sources (simulation, toit Bluetooth) passent par recevoirLigneToit(),
 * exactement comme l'écran de la voiture traite les lignes reçues.
 */
import { useRef, useSyncExternalStore } from 'react';
import { parseToit, type LigneC, type LigneS } from '../proto/toit';
import { ajouterReleve, type Ligne } from '../calc/releves';
import { fusionner, type DirectionOeil, type Fusion, type PointPortatif } from '../calc/fusion';

export type TagEtat = {
  id: number;
  r: number[]; // dBm des 5 voies (4 directives + omni), −128 = muette
  rel: number; abs: number; q: number; pile: number;
  dernierMs: number; nReleves: number;
  lignes: Ligne[]; oeil: DirectionOeil[]; portatif: PointPortatif[];
  fusion: Fusion | null;
};
export type PointTrajet = { lat: number; lon: number };
export type Source = 'aucune' | 'simulation' | 'toit';
export type EtatConnexion = 'arrete' | 'recherche' | 'connecte' | 'erreur';

export type Etat = {
  source: Source;
  connexion: EtatConnexion;
  message: string;
  horlogeMs: number; // temps de la source (ms depuis le départ en simulation, Date.now() en direct)
  toit: LigneS | null;
  config: LigneC | null;
  tags: Record<number, TagEtat>;
  trajet: PointTrajet[];
  tagChoisi: number | null;
  vitesseSim: number;
  evenements: string[];
};

const initial = (): Etat => ({
  source: 'aucune', connexion: 'arrete', message: '', horlogeMs: 0, toit: null, config: null, tags: {}, trajet: [],
  tagChoisi: null, vitesseSim: 10, evenements: [],
});

let etat: Etat = initial();
const abonnes = new Set<() => void>();
let notifPrevue = false;

function publier() {
  // regroupe les rafales de lignes (la simulation en accéléré en envoie beaucoup d'un coup)
  if (notifPrevue) return;
  notifPrevue = true;
  setTimeout(() => { notifPrevue = false; abonnes.forEach((f) => f()); }, 50);
}
function maj(f: (e: Etat) => Etat) { etat = f(etat); publier(); }

export const store = {
  get: () => etat,
  abonner: (f: () => void) => { abonnes.add(f); return () => abonnes.delete(f); },
  set: (p: Partial<Etat>) => maj((e) => ({ ...e, ...p })),
  remettreAZero: (garder: Partial<Etat> = {}) => maj((e) => ({ ...initial(), vitesseSim: e.vitesseSim, tagChoisi: e.tagChoisi, ...garder })),
  choisirTag: (id: number | null) => maj((e) => ({ ...e, tagChoisi: id })),
  evenement: (txt: string) => maj((e) => ({ ...e, evenements: [txt, ...e.evenements].slice(0, 50) })),
};

function egalSuperficiel(a: unknown, b: unknown): boolean {
  if (Object.is(a, b)) return true;
  if (typeof a !== 'object' || typeof b !== 'object' || !a || !b || Array.isArray(a) !== Array.isArray(b)) return false;
  const ka = Object.keys(a), kb = Object.keys(b);
  return ka.length === kb.length && ka.every((k) => Object.is((a as any)[k], (b as any)[k]));
}

/** Lit une partie de l'état ; le composant ne se redessine que si cette partie change (comparaison superficielle). */
export function useEtat<T>(sel: (e: Etat) => T): T {
  const cache = useRef<{ v: T } | null>(null);
  const lire = () => {
    const v = sel(etat);
    if (cache.current && egalSuperficiel(cache.current.v, v)) return cache.current.v;
    cache.current = { v };
    return v;
  };
  return useSyncExternalStore(store.abonner, lire, lire);
}

function tagVide(id: number): TagEtat {
  return { id, r: [-128, -128, -128, -128, -128], rel: -1, abs: -1, q: 0, pile: -1, dernierMs: 0, nReleves: 0, lignes: [], oeil: [], portatif: [], fusion: null };
}

const MAX_TRAJET = 4000;

/** Une ligne du toit (texte brut), horodatée par la source. */
export function recevoirLigneToit(texte: string, tMs: number) {
  const l = parseToit(texte);
  if (!l) return;
  maj((e) => {
    const n: Etat = { ...e, horlogeMs: tMs };
    switch (l.kind) {
      case 'S': {
        n.toit = l;
        if (l.lat !== 0) {
          const der = e.trajet[e.trajet.length - 1];
          if (!der || Math.abs(der.lat - l.lat) > 2e-5 || Math.abs(der.lon - l.lon) > 2e-5)
            n.trajet = [...e.trajet.slice(-MAX_TRAJET + 1), { lat: l.lat, lon: l.lon }];
        }
        break;
      }
      case 'R': {
        const t = e.tags[l.tag] ?? tagVide(l.tag);
        const lignes = ajouterReleve(t.lignes, l.lat, l.lon, l.abs, l.q, tMs);
        const nt: TagEtat = { ...t, r: l.r, rel: l.rel, abs: l.abs, q: l.q, pile: l.pile, dernierMs: tMs, nReleves: t.nReleves + 1, lignes };
        if (lignes !== t.lignes) nt.fusion = fusionner(nt);
        n.tags = { ...e.tags, [l.tag]: nt };
        if (n.tagChoisi === null) n.tagChoisi = l.tag;
        break;
      }
      case 'C': n.config = l; break;
      case 'N': {
        const t = e.tags[l.tag] ?? tagVide(l.tag);
        const nt = { ...t, portatif: [...t.portatif, { lat: l.lat, lon: l.lon, errM: l.errM }] };
        nt.fusion = fusionner(nt);
        n.tags = { ...e.tags, [l.tag]: nt };
        n.evenements = [`Nid du portatif reçu pour le tag ${l.tag}`, ...e.evenements].slice(0, 50);
        break;
      }
      case 'K':
        if (l.type === 'ERR') n.evenements = [`Toit : ${l.message}`, ...e.evenements].slice(0, 50);
        break;
    }
    return n;
  });
}

/** Direction de vol notée à l'œil (écran « Cap à l'œil », ou événement VIS de la simulation). */
export function ajouterDirectionOeil(tag: number, d: DirectionOeil) {
  maj((e) => {
    const t = e.tags[tag] ?? tagVide(tag);
    const nt = { ...t, oeil: [...t.oeil, d] };
    nt.fusion = fusionner(nt);
    return { ...e, tags: { ...e.tags, [tag]: nt }, evenements: [`Direction à l'œil ajoutée au tag ${tag}`, ...e.evenements].slice(0, 50) };
  });
}

/** Âge en secondes de la dernière réception d'un tag, selon l'horloge de la source. */
export const ageS = (e: Etat, t: TagEtat) => Math.max(0, (e.horlogeMs - t.dernierMs) / 1000);

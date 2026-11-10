/**
 * Mode simulation : rejoue une sortie enregistrée (journal de la carte SD du toit) avec son horodatage,
 * en temps réel ou en accéléré. Sert à développer et à s'entraîner sans matériel.
 */
import { SORTIE_SIMULEE } from '../sim/sortieSimulee';
import { ajouterDirectionOeil, recevoirLigneToit, store } from '../store/store';

type Evt = { t: number; corps: string };
let evts: Evt[] | null = null;
let idx = 0;
let tSim = 0;
let minuterie: ReturnType<typeof setInterval> | null = null;
let dernierReel = 0;

function charger(): Evt[] {
  if (evts) return evts;
  evts = [];
  for (const brut of SORTIE_SIMULEE.split('\n')) {
    const m = /^@(\d+),(.*)$/.exec(brut);
    if (m) evts.push({ t: Number(m[1]), corps: m[2] });
  }
  return evts;
}

export const dureeSimulationMs = () => { const e = charger(); return e.length ? e[e.length - 1].t : 0; };

function traiter(ev: Evt) {
  const f = ev.corps.split(',');
  if (f[0] === 'D') return; // nacelle drone : pas dans cette version
  if (f[0] === 'E') {
    if (f[1] === 'VIS') ajouterDirectionOeil(Number(f[2]), { lat: Number(f[3]), lon: Number(f[4]), deg: Number(f[5]) });
    else if (f[1] === 'LACHER') store.evenement(`Tag ${f[2]} lâché`);
    else if (f[1] === 'NID') store.evenement(`Fin de la sortie (nid du tag ${f[2]} trouvé)`);
    return;
  }
  recevoirLigneToit(ev.corps, ev.t);
}

function tic() {
  const e = charger();
  const maintenant = Date.now();
  tSim += (maintenant - dernierReel) * store.get().vitesseSim;
  dernierReel = maintenant;
  while (idx < e.length && e[idx].t <= tSim) traiter(e[idx++]);
  if (idx >= e.length) {
    arreterSimulation();
    store.set({ message: 'Sortie simulée terminée' });
  }
}

export function demarrerSimulation() {
  arreterSimulation();
  charger();
  idx = 0; tSim = 0; dernierReel = Date.now();
  store.remettreAZero({ source: 'simulation', connexion: 'connecte', message: 'Simulation en cours' });
  minuterie = setInterval(tic, 200);
}

export function arreterSimulation() {
  if (minuterie) clearInterval(minuterie);
  minuterie = null;
  if (store.get().source === 'simulation') store.set({ connexion: 'arrete' });
}

export const simulationActive = () => minuterie !== null;
export const avancementSimulation = () => { const d = dureeSimulationMs(); return d ? Math.min(1, tSim / d) : 0; };

/** Rejoue la sortie simulée dans les calculs de l'appli et compare au vrai nid. Lancer : npm run test:calculs */
import { SORTIE_SIMULEE } from '../src/sim/sortieSimulee';
import { parseToit } from '../src/proto/toit';
import { ajouterReleve, type Ligne } from '../src/calc/releves';
import { fusionner, type DirectionOeil } from '../src/calc/fusion';
import { distM, niveauPct } from '../src/calc/geo';
import { estRoundtrip } from '../src/calc/estim';

const VRAIS: Record<number, [number, number]> = { 7: [45.0483716, 3.8839642], 12: [45.0547042, 3.8780927] };
const lignes: Record<number, Ligne[]> = {};
const oeil: Record<number, DirectionOeil[]> = {};
let nR = 0, nS = 0;
for (const brut of SORTIE_SIMULEE.split('\n')) {
  const m = /^@(\d+),(.*)$/.exec(brut);
  if (!m) continue;
  const t = Number(m[1]), corps = m[2];
  if (corps.startsWith('E,VIS,')) {
    const f = corps.split(',');
    (oeil[+f[2]] ??= []).push({ lat: +f[3], lon: +f[4], deg: +f[5] });
    continue;
  }
  const l = parseToit(corps);
  if (l?.kind === 'R') { nR++; lignes[l.tag] = ajouterReleve(lignes[l.tag] ?? [], l.lat, l.lon, l.abs, l.q, t); }
  if (l?.kind === 'S') nS++;
}
console.log(`lignes R ${nR}, S ${nS}`);
let ok = true;
for (const tag of [7, 12]) {
  const L = lignes[tag] ?? [];
  const f = fusionner({ lignes: L, oeil: oeil[tag] ?? [], portatif: [] });
  const [la, lo] = VRAIS[tag];
  const e = f.ok ? distM(f.lat, f.lon, la, lo) : NaN;
  console.log(`tag ${tag}: ${L.length} relevés (${L.filter((x) => x.ecartee).length} écartés), ${f.nOeil} à l'œil → ` +
    (f.ok ? `nid ${f.lat.toFixed(6)},${f.lon.toFixed(6)} ±${f.errM.toFixed(0)} m, écart au vrai ${e.toFixed(0)} m` : 'pas de nid'));
  if (!f.ok || e > Math.max(60, f.errM)) ok = false;
}
// contrôles simples
const chk = (c: boolean, msg: string) => { if (!c) { ok = false; console.log('ÉCHEC', msg); } };
chk(niveauPct(-100) === 0 && niveauPct(-40) === 100 && niveauPct(-70) === 50 && niveauPct(-128) === null, 'niveauPct');
const rt = estRoundtrip([300, 320, 900]);
chk(rt.ok && Math.abs(rt.r - (3.4 * 245) / 2) < 1, 'estRoundtrip');
console.log(ok ? 'OK' : 'ÉCHEC');
process.exit(ok ? 0 : 1);

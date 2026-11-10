/** Décodage des lignes JSON du récepteur portatif (phone.c du portatif) et ses commandes. */
export type PortatifSt = {
  type: 'st'; tag: number; rssi: number; raw: number; trend: number; age: number; hdg: number;
  fix: number; lat: number; lon: number; sats: number; bat: number; lna: number;
};
export type PortatifTag = { type: 'tag'; id: number; rssi: number; age: number; lat: number; lon: number };
export type PortatifNid = { type: 'nest'; lat: number; lon: number; err: number };
export type LignePortatif = PortatifSt | PortatifTag | PortatifNid;

export function parsePortatif(ligne: string): LignePortatif | null {
  try {
    const o = JSON.parse(ligne.trim());
    if (o && (o.type === 'st' || o.type === 'tag' || o.type === 'nest')) return o as LignePortatif;
  } catch {}
  return null;
}

export const cmdPortatif = {
  tag: (id: number) => `tag ${id}`,
  son: (on: boolean) => `son ${on ? 1 : 0}`,
  lna: (m: 'auto' | 'on' | 'off' | 'att') => `lna ${m}`,
  rfcal: () => 'rfcal',
  gps: (a: 'int' | 'ext') => `gps ${a}`,
  enroll: () => 'enroll',
  sweep: () => 'sweep',
  fix: () => 'fix',
  off: () => 'off',
};

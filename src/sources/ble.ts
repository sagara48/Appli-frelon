/**
 * Liaison Bluetooth avec le toit (« TOIT-Frelons ») et le portatif (« RX-Frelons »), service UART Nordic.
 * Le module natif n'existe que dans l'APK (pas dans Expo Go) : il est chargé à la demande.
 */
import { PermissionsAndroid, Platform } from 'react-native';
import type { BleManager, Device, Subscription } from 'react-native-ble-plx';
import { recevoirLigneToit, store } from '../store/store';

export const NUS = '6e400001-b5a3-f393-e0a9-e50e24dcca9e';
const NUS_RX = '6e400002-b5a3-f393-e0a9-e50e24dcca9e'; // écriture vers l'appareil
const NUS_TX = '6e400003-b5a3-f393-e0a9-e50e24dcca9e'; // notifications de l'appareil
export const NOM_TOIT = 'TOIT-Frelons';
export const NOM_PORTATIF = 'RX-Frelons';

let manager: BleManager | null = null;
function ble(): BleManager {
  if (!manager) {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { BleManager: M } = require('react-native-ble-plx') as typeof import('react-native-ble-plx');
    manager = new M();
  }
  return manager;
}

async function permissions(): Promise<boolean> {
  if (Platform.OS !== 'android') return true;
  const P = PermissionsAndroid.PERMISSIONS;
  const r = await PermissionsAndroid.requestMultiple([P.BLUETOOTH_SCAN, P.BLUETOOTH_CONNECT, P.ACCESS_FINE_LOCATION]);
  return Object.values(r).every((v) => v === PermissionsAndroid.RESULTS.GRANTED);
}

const b64enc = (s: string) => btoa(s);
const b64dec = (s: string) => atob(s);

/** Une liaison UART : reconstitue les lignes (un message peut en contenir plusieurs ou une moitié). */
export class LiaisonUart {
  private device: Device | null = null;
  private sub: Subscription | null = null;
  private tampon = '';
  constructor(private nom: string, private surLigne: (l: string) => void, private surEtat: (etat: 'recherche' | 'connecte' | 'arrete' | 'erreur', msg: string) => void) {}

  async connecter(delaiMs = 15000) {
    if (!(await permissions())) { this.surEtat('erreur', 'Autorisations Bluetooth refusées'); return; }
    const m = ble();
    this.surEtat('recherche', `Recherche de ${this.nom}…`);
    const trouve = await new Promise<Device | null>((ok) => {
      const fin = setTimeout(() => { m.stopDeviceScan(); ok(null); }, delaiMs);
      m.startDeviceScan(null, { allowDuplicates: false }, (err, d) => {
        if (err) { clearTimeout(fin); m.stopDeviceScan(); this.surEtat('erreur', err.message); ok(null); return; }
        if (d && (d.name === this.nom || d.localName === this.nom)) { clearTimeout(fin); m.stopDeviceScan(); ok(d); }
      });
    });
    if (!trouve) { this.surEtat('erreur', `${this.nom} introuvable : allumé et à portée ?`); return; }
    try {
      const d = await trouve.connect({ requestMTU: 247 });
      await d.discoverAllServicesAndCharacteristics();
      this.device = d;
      this.sub = d.monitorCharacteristicForService(NUS, NUS_TX, (err, c) => {
        if (err) { this.surEtat('erreur', err.message); return; }
        if (c?.value) this.recevoir(b64dec(c.value));
      });
      d.onDisconnected(() => { this.device = null; this.surEtat('arrete', `${this.nom} déconnecté`); });
      this.surEtat('connecte', `Connecté à ${this.nom}`);
    } catch (e) {
      this.surEtat('erreur', `Connexion impossible : ${(e as Error).message}`);
    }
  }

  private recevoir(txt: string) {
    this.tampon += txt;
    let i: number;
    while ((i = this.tampon.indexOf('\n')) >= 0) {
      const l = this.tampon.slice(0, i).replace(/\r$/, '');
      this.tampon = this.tampon.slice(i + 1);
      if (l) this.surLigne(l);
    }
    if (this.tampon.length > 2000) this.tampon = '';
  }

  async envoyer(cmd: string) {
    if (!this.device) throw new Error(`${this.nom} non connecté`);
    await this.device.writeCharacteristicWithResponseForService(NUS, NUS_RX, b64enc(cmd + '\n'));
  }

  async deconnecter() {
    this.sub?.remove(); this.sub = null;
    if (this.device) await this.device.cancelConnection().catch(() => {});
    this.device = null;
    this.surEtat('arrete', '');
  }

  get connecte() { return this.device !== null; }
}

export const toit = new LiaisonUart(
  NOM_TOIT,
  (l) => recevoirLigneToit(l, Date.now()),
  (connexion, message) => store.set({ connexion, message }),
);

export async function connecterToit() {
  store.remettreAZero({ source: 'toit' });
  await toit.connecter();
  if (toit.connecte) await toit.envoyer('cfg').catch(() => {});
}

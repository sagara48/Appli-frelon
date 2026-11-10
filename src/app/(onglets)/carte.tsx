/** Écran Carte (É2) : trajet, relèvements, directions à l'œil, nid estimé et son cercle d'incertitude. */
import React, { useMemo, useState } from 'react';
import { Alert, Pressable, ScrollView, Text, View, useWindowDimensions } from 'react-native';
import Svg, { Circle, G, Line, Path, Polyline, Rect, Text as T } from 'react-native-svg';
import { BandeauToit, Bouton, Carte as Bloc, ChoixTag, Titre, Vide, s } from '@/ui/composants';
import { C, fmtCoord, fmtDist, idTag, police } from '@/ui/theme';
import { store, useEtat } from '@/store/store';
import { KY, capDeg, distM, kxOf, pointCardinal } from '@/calc/geo';
import { cmdToit } from '@/proto/toit';
import { toit } from '@/sources/ble';
import { enregistrerNid } from '@/db';

type Calques = { voiture: boolean; ecartes: boolean; oeil: boolean; portatif: boolean; trajet: boolean };

export default function CarteEcran() {
  const { width } = useWindowDimensions();
  const e = useEtat((x) => ({ tags: x.tags, tagChoisi: x.tagChoisi, trajet: x.trajet, toit: x.toit, source: x.source }));
  const t = e.tagChoisi !== null ? e.tags[e.tagChoisi] : undefined;
  const [zoom, setZoom] = useState(1);
  const [calques, setCalques] = useState<Calques>({ voiture: true, ecartes: true, oeil: true, portatif: true, trajet: true });
  const W = width - 32, H = Math.round(W * 1.1);
  const f = t?.fusion?.ok ? t.fusion : null;
  const pos = e.toit && e.toit.lat ? e.toit : null;

  // emprise : nid + origines des relèvements + position actuelle ; repère local centré
  const vue = useMemo(() => {
    const pts: [number, number][] = [];
    if (f) pts.push([f.lat, f.lon]);
    t?.lignes.forEach((l) => pts.push([l.lat, l.lon]));
    t?.oeil.forEach((o) => pts.push([o.lat, o.lon]));
    t?.portatif.forEach((p) => pts.push([p.lat, p.lon]));
    if (pos) pts.push([pos.lat, pos.lon]);
    if (!pts.length) e.trajet.slice(-200).forEach((p) => pts.push([p.lat, p.lon]));
    if (!pts.length) return null;
    const lat0 = pts.reduce((a, p) => a + p[0], 0) / pts.length;
    const kx = kxOf(lat0);
    let la1 = 1e9, la2 = -1e9, lo1 = 1e9, lo2 = -1e9;
    for (const [la, lo] of pts) { la1 = Math.min(la1, la); la2 = Math.max(la2, la); lo1 = Math.min(lo1, lo); lo2 = Math.max(lo2, lo); }
    const cLat = f ? f.lat : (la1 + la2) / 2, cLon = f ? f.lon : (lo1 + lo2) / 2;
    // demi-étendue en mètres autour du centre, avec 15 % de marge
    const ext = Math.max(
      Math.abs(la2 - cLat) * KY, Math.abs(cLat - la1) * KY, Math.abs(lo2 - cLon) * kx * (H / W), Math.abs(cLon - lo1) * kx * (H / W), 150,
    ) * 1.15;
    return { cLat, cLon, kx, mParPx: (2 * ext) / H };
  }, [f?.lat, f?.lon, t?.lignes, t?.oeil, t?.portatif, pos?.lat, pos?.lon, e.trajet.length, W, H]);

  if (!t || !vue) {
    return (
      <ScrollView style={s.ecran} contentContainerStyle={s.contenu}>
        <BandeauToit />
        <Bloc><Vide titre="Rien à afficher" texte="La carte se remplit dès que le toit relève un tag." /></Bloc>
      </ScrollView>
    );
  }

  const m = vue.mParPx / zoom;
  const X = (lon: number) => W / 2 + ((lon - vue.cLon) * vue.kx) / m;
  const Y = (lat: number) => H / 2 - ((lat - vue.cLat) * KY) / m;
  const longRayon = Math.hypot(W, H) * m; // les relèvements sont tracés jusqu'au bord
  const rayon = (lat: number, lon: number, deg: number) => {
    const a = (deg * Math.PI) / 180;
    return { x1: X(lon), y1: Y(lat), x2: X(lon) + (Math.sin(a) * longRayon) / m, y2: Y(lat) - (Math.cos(a) * longRayon) / m };
  };
  const echelle = choisirEchelle(m * W * 0.3);
  const trajetPts = e.trajet.map((p) => `${X(p.lon).toFixed(1)},${Y(p.lat).toFixed(1)}`).join(' ');
  const nUtiles = t.lignes.filter((l) => !l.ecartee).length, nEcartes = t.lignes.length - nUtiles;
  const capNid = f && pos ? capDeg(pos.lat, pos.lon, f.lat, f.lon) : null;
  const distNid = f && pos ? distM(pos.lat, pos.lon, f.lat, f.lon) : null;
  const nSources = f ? [f.nVoiture > 0, f.nOeil > 0, f.nPortatif > 0, f.nAnneaux > 0].filter(Boolean).length : 0;

  const bascule = (k: keyof Calques) => setCalques((c) => ({ ...c, [k]: !c[k] }));

  const envoyer = async () => {
    if (!f) return;
    if (e.source === 'simulation') { Alert.alert('Simulation', `En sortie réelle, le nid du tag ${idTag(t.id)} serait envoyé au portatif par le toit.`); return; }
    try { await toit.envoyer(cmdToit.nid(f.lat, f.lon, f.errM, t.id)); store.evenement(`Nid du tag ${idTag(t.id)} envoyé au portatif`); }
    catch (err) { Alert.alert('Envoi impossible', (err as Error).message); }
  };
  const noter = () => {
    if (!f) return;
    try { enregistrerNid(t.id, f.lat, f.lon, f.errM); Alert.alert('Carnet', `Nid du tag ${idTag(t.id)} ajouté au carnet.`); }
    catch (err) { Alert.alert('Carnet', (err as Error).message); }
  };

  return (
    <ScrollView style={s.ecran} contentContainerStyle={s.contenu}>
      <ChoixTag />
      <View style={[s.ligne, { justifyContent: 'space-between' }]}>
        <Text style={{ fontSize: police.titre, fontWeight: '800', color: C.encre }}>Tag {idTag(t.id)}</Text>
        <Text style={s.discret}>{nUtiles} relèvements{nEcartes ? ` · ${nEcartes} écartés` : ''}</Text>
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
        <Filtre actif={calques.voiture} couleur={C.accent} txt={`Voiture (${nUtiles})`} onPress={() => bascule('voiture')} />
        <Filtre actif={calques.ecartes} couleur={C.ecarte} txt={`Écartés (${nEcartes})`} onPress={() => bascule('ecartes')} />
        <Filtre actif={calques.oeil} couleur={C.oeil} txt={`À l'œil (${t.oeil.length})`} onPress={() => bascule('oeil')} />
        <Filtre actif={calques.portatif} couleur={C.portatif} txt={`Portatif (${t.portatif.length})`} onPress={() => bascule('portatif')} />
        <Filtre actif={calques.trajet} couleur={C.discret} txt="Trajet" onPress={() => bascule('trajet')} />
      </ScrollView>

      <View style={{ borderRadius: 14, overflow: 'hidden', borderWidth: 1, borderColor: C.ligne }}>
        <Svg width={W} height={H}>
          <Rect x={0} y={0} width={W} height={H} fill="#EEF0E8" />
          {calques.trajet && e.trajet.length > 1 && <Polyline points={trajetPts} fill="none" stroke={C.discret} strokeWidth={2} opacity={0.45} />}
          {t.lignes.map((l, i) => {
            if (l.ecartee ? !calques.ecartes : !calques.voiture) return null;
            const r = rayon(l.lat, l.lon, l.absDeg);
            return (
              <G key={`l${i}`}>
                <Line {...r} stroke={l.ecartee ? C.ecarte : C.accent} strokeWidth={l.ecartee ? 1 : 1.5} strokeDasharray={l.ecartee ? '4 4' : undefined} opacity={l.ecartee ? 0.8 : 0.35 + (0.5 * l.q) / 100} />
                <Circle cx={r.x1} cy={r.y1} r={2.5} fill={l.ecartee ? C.ecarte : C.accent} />
              </G>
            );
          })}
          {calques.oeil && t.oeil.map((o, i) => {
            const r = rayon(o.lat, o.lon, o.deg);
            return (
              <G key={`o${i}`}>
                <Line {...r} stroke={C.oeil} strokeWidth={2} strokeDasharray="8 4" />
                <Circle cx={r.x1} cy={r.y1} r={4} fill={C.oeil} />
              </G>
            );
          })}
          {calques.portatif && t.portatif.map((p, i) => (
            <G key={`p${i}`}>
              <Circle cx={X(p.lon)} cy={Y(p.lat)} r={Math.max(p.errM / m, 4)} fill={C.portatif} opacity={0.15} />
              <Circle cx={X(p.lon)} cy={Y(p.lat)} r={4} fill={C.portatif} />
            </G>
          ))}
          {f && (
            <G>
              <Circle cx={X(f.lon)} cy={Y(f.lat)} r={Math.max(f.errM / m, 6)} fill={C.accent} opacity={0.18} stroke={C.accent} strokeWidth={2} />
              <Circle cx={X(f.lon)} cy={Y(f.lat)} r={7} fill={C.encre} stroke="#fff" strokeWidth={2.5} />
              <T x={X(f.lon) + 12} y={Y(f.lat) - 10} fontSize={13} fontWeight="700" fill={C.encre}>Nid ± {Math.round(f.errM)} m</T>
            </G>
          )}
          {pos && (
            <G transform={`rotate(${pos.cap} ${X(pos.lon)} ${Y(pos.lat)})`}>
              <Path d={`M${X(pos.lon)},${Y(pos.lat) - 11} L${X(pos.lon) + 7},${Y(pos.lat) + 8} L${X(pos.lon)},${Y(pos.lat) + 4} L${X(pos.lon) - 7},${Y(pos.lat) + 8} Z`} fill={C.encre} stroke="#fff" strokeWidth={1.5} />
            </G>
          )}
          {/* nord et échelle */}
          <G>
            <Path d={`M${W - 24},14 L${W - 18},30 L${W - 24},26 L${W - 30},30 Z`} fill={C.encre} />
            <T x={W - 24} y={44} fontSize={12} fontWeight="700" fill={C.encre} textAnchor="middle">N</T>
          </G>
          <G>
            <Line x1={14} y1={H - 16} x2={14 + echelle / m} y2={H - 16} stroke={C.encre} strokeWidth={3} />
            <Line x1={14} y1={H - 22} x2={14} y2={H - 10} stroke={C.encre} strokeWidth={2} />
            <Line x1={14 + echelle / m} y1={H - 22} x2={14 + echelle / m} y2={H - 10} stroke={C.encre} strokeWidth={2} />
            <T x={14 + echelle / m / 2} y={H - 26} fontSize={12} fill={C.encre} textAnchor="middle">{fmtDist(echelle)}</T>
          </G>
        </Svg>
        <View style={{ position: 'absolute', right: 10, bottom: 10, gap: 8 }}>
          <Rond txt="+" onPress={() => setZoom((z) => Math.min(z * 1.6, 40))} />
          <Rond txt="−" onPress={() => setZoom((z) => Math.max(z / 1.6, 0.3))} />
          <Rond txt="⤢" onPress={() => setZoom(1)} />
        </View>
      </View>

      {f ? (
        <Bloc>
          <Titre>Nid estimé · {nSources > 1 ? `${nSources} sources concordantes` : 'relèvements de la voiture'}</Titre>
          <View style={[s.ligne, { justifyContent: 'space-between' }]}>
            <Chiffre k="Distance" v={distNid !== null ? fmtDist(distNid) : '—'} />
            <Chiffre k="Cap" v={capNid !== null ? `${Math.round(capNid)}° ${pointCardinal(capNid)}` : '—'} />
            <Chiffre k="Précision" v={`± ${Math.round(f.errM)} m`} />
          </View>
          <Text style={[s.discret, { marginTop: 8 }]}>{fmtCoord(f.lat, f.lon)}</Text>
          <View style={[s.ligne, { gap: 10, marginTop: 12 }]}>
            <Bouton titre="Envoyer au portatif" plein onPress={envoyer} />
            <Bouton titre="Ajouter au carnet" onPress={noter} />
          </View>
        </Bloc>
      ) : (
        <Bloc>
          <Vide titre="Pas encore de nid" texte="Il faut au moins deux relèvements qui se croisent nettement (plus de 15°). Faites le tour de la zone." />
        </Bloc>
      )}
      <BandeauToit />
    </ScrollView>
  );
}

function choisirEchelle(m: number) {
  const pas = [10, 20, 50, 100, 200, 250, 500, 1000, 2000, 5000];
  return pas.reduce((b, p) => (p <= m ? p : b), 10);
}

function Filtre({ actif, couleur, txt, onPress }: { actif: boolean; couleur: string; txt: string; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={[s.puce, s.ligne, { gap: 6, opacity: actif ? 1 : 0.45 }]}>
      <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: couleur }} />
      <Text style={{ color: C.encre, fontSize: police.petit }}>{txt}</Text>
    </Pressable>
  );
}

function Rond({ txt, onPress }: { txt: string; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: C.carte, borderWidth: 1, borderColor: C.ligne, alignItems: 'center', justifyContent: 'center' }}>
      <Text style={{ fontSize: 20, color: C.encre, fontWeight: '700' }}>{txt}</Text>
    </Pressable>
  );
}

function Chiffre({ k, v }: { k: string; v: string }) {
  return (
    <View>
      <Text style={s.discret}>{k}</Text>
      <Text style={{ fontSize: police.normal + 1, fontWeight: '700', color: C.encre, fontVariant: ['tabular-nums'] }}>{v}</Text>
    </View>
  );
}

import React from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View, type ViewStyle } from 'react-native';
import { C, R, idTag, nbVoies, police } from './theme';
import { store, useEtat } from '../store/store';

export function Carte({ children, style }: { children: React.ReactNode; style?: ViewStyle }) {
  return <View style={[s.carte, style]}>{children}</View>;
}

export function Titre({ children }: { children: React.ReactNode }) {
  return <Text style={s.titreSection}>{children}</Text>;
}

export function Bouton({ titre, onPress, plein, desactive }: { titre: string; onPress: () => void; plein?: boolean; desactive?: boolean }) {
  return (
    <Pressable onPress={onPress} disabled={desactive} style={({ pressed }) => [s.bouton, plein && s.boutonPlein, (pressed || desactive) && { opacity: 0.6 }]}>
      <Text style={[s.boutonTxt, plein && { color: C.encre }]}>{titre}</Text>
    </Pressable>
  );
}

/** Bandeau d'état du toit, en haut des écrans Direct et Carte. */
export function BandeauToit() {
  const { source, connexion, message, toit } = useEtat((e) => ({ source: e.source, connexion: e.connexion, message: e.message, toit: e.toit }));
  const ok = connexion === 'connecte';
  const titre = source === 'simulation' ? (ok ? 'Simulation en cours' : 'Simulation arrêtée') : ok ? 'Toit connecté' : connexion === 'recherche' ? 'Recherche du toit…' : 'Toit non connecté';
  return (
    <View style={s.bandeau}>
      <View style={s.ligne}>
        <View style={[s.pastille, { backgroundColor: ok ? C.ok : connexion === 'recherche' ? C.accent : C.alerte }]} />
        <Text style={s.bandeauTitre}>{titre}</Text>
      </View>
      {toit ? (
        <View style={[s.ligne, { marginTop: 6, flexWrap: 'wrap', gap: 14 }]}>
          <Info k="Batterie" v={`${toit.battPct} %${toit.charge ? ' ⚡' : ''}`} />
          <Info k="GPS" v={toit.lat ? `${toit.sats} sat.` : 'pas de position'} />
          <Info k="Vitesse" v={`${Math.round(toit.vitesse)} km/h`} />
          <Info k="Voies" v={`${nbVoies(toit.voiesOk)} / 4`} />
        </View>
      ) : (
        !!message && <Text style={{ color: '#A9B4BF', fontSize: police.petit, marginTop: 4 }}>{message}</Text>
      )}
    </View>
  );
}

function Info({ k, v }: { k: string; v: string }) {
  return (
    <Text style={s.info}>
      <Text style={{ color: '#A9B4BF' }}>{k} </Text>
      {v}
    </Text>
  );
}

/** Puces de choix du tag suivi. */
export function ChoixTag() {
  const ids = useEtat((e) => Object.keys(e.tags).map(Number).sort((a, b) => a - b).join(','));
  const choisi = useEtat((e) => e.tagChoisi);
  const liste = ids ? ids.split(',').map(Number) : [];
  if (!liste.length) return null;
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingVertical: 4 }}>
      <Text style={[s.discret, { alignSelf: 'center', marginRight: 2 }]}>TAG</Text>
      {liste.map((id) => (
        <Pressable key={id} onPress={() => store.choisirTag(id)} style={[s.puce, id === choisi && s.puceActive]}>
          <Text style={[s.puceTxt, id === choisi && { color: C.encre, fontWeight: '700' }]}>{idTag(id)}</Text>
        </Pressable>
      ))}
    </ScrollView>
  );
}

export function Vide({ titre, texte }: { titre: string; texte: string }) {
  return (
    <View style={{ alignItems: 'center', padding: 32, gap: 8 }}>
      <Text style={{ fontSize: police.normal + 2, fontWeight: '700', color: C.encre }}>{titre}</Text>
      <Text style={[s.discret, { textAlign: 'center', lineHeight: 20 }]}>{texte}</Text>
    </View>
  );
}

export const s = StyleSheet.create({
  ecran: { flex: 1, backgroundColor: C.fond },
  contenu: { padding: 16, gap: 12, paddingBottom: 32 },
  carte: { backgroundColor: C.carte, borderRadius: R.carte, padding: 14, borderWidth: 1, borderColor: C.ligne },
  titreSection: { fontSize: police.mini, fontWeight: '700', letterSpacing: 1, color: C.discret, textTransform: 'uppercase', marginBottom: 8 },
  ligne: { flexDirection: 'row', alignItems: 'center' },
  pastille: { width: 10, height: 10, borderRadius: 5, marginRight: 8 },
  bandeau: { backgroundColor: C.encre, borderRadius: R.carte, padding: 14 },
  bandeauTitre: { color: '#fff', fontSize: police.normal, fontWeight: '700' },
  info: { color: '#fff', fontSize: police.petit },
  discret: { color: C.discret, fontSize: police.petit },
  puce: { paddingHorizontal: 14, paddingVertical: 7, borderRadius: R.puce, borderWidth: 1, borderColor: C.ligne, backgroundColor: C.carte },
  puceActive: { backgroundColor: C.accent, borderColor: C.accent },
  puceTxt: { color: C.encre, fontSize: police.normal, fontVariant: ['tabular-nums'] },
  bouton: { flex: 1, paddingVertical: 12, borderRadius: 10, borderWidth: 1, borderColor: C.encre, alignItems: 'center' },
  boutonPlein: { backgroundColor: C.accent, borderColor: C.accent },
  boutonTxt: { color: C.encre, fontWeight: '700', fontSize: police.normal },
});

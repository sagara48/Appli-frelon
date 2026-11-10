/** Écran Direct (É1) : où est le tag suivi, en ce moment. */
import { useRouter } from 'expo-router';
import { useKeepAwake } from 'expo-keep-awake';
import React from 'react';
import { ScrollView, Text, View, useWindowDimensions } from 'react-native';
import { Boussole } from '@/ui/Boussole';
import { BandeauToit, Bouton, Carte, ChoixTag, Titre, Vide, s } from '@/ui/composants';
import { C, VOIES, fmtAge, fmtDist, idTag, libelleQualite, libelleRelatif, police } from '@/ui/theme';
import { ageS, useEtat } from '@/store/store';
import { capDeg, distM, niveauPct, pointCardinal } from '@/calc/geo';

export default function Direct() {
  useKeepAwake(); // l'écran reste allumé pendant la conduite
  const router = useRouter();
  const { width } = useWindowDimensions();
  const e = useEtat((x) => x);
  const t = e.tagChoisi !== null ? e.tags[e.tagChoisi] : undefined;

  if (e.source === 'aucune') {
    return (
      <ScrollView style={s.ecran} contentContainerStyle={s.contenu}>
        <BandeauToit />
        <Vide titre="Aucune source" texte="Connectez le toit ou lancez la sortie simulée depuis l'onglet Réglages." />
        <Bouton titre="Aller aux réglages" plein onPress={() => router.navigate('/reglages')} />
      </ScrollView>
    );
  }

  const age = t ? ageS(e, t) : 0;
  const ancien = age > 10;
  const abs = t && t.abs >= 0 ? t.abs : null;
  const f = t?.fusion?.ok ? t.fusion : null;
  const pos = e.toit && e.toit.lat ? e.toit : null;
  const capNid = f && pos ? capDeg(pos.lat, pos.lon, f.lat, f.lon) : null;
  const distNid = f && pos ? distM(pos.lat, pos.lon, f.lat, f.lon) : null;

  return (
    <ScrollView style={s.ecran} contentContainerStyle={s.contenu}>
      <BandeauToit />
      <ChoixTag />
      {!t ? (
        <Carte><Vide titre="En écoute…" texte="Aucun tag entendu pour l'instant. Roulez dans la zone du lâcher." /></Carte>
      ) : (
        <>
          <Carte style={{ alignItems: 'center' }}>
            <Boussole taille={Math.min(width - 60, 340)} abs={abs} cap={pos ? pos.cap : null} capNid={capNid} ancien={ancien} />
            <View style={[s.ligne, { gap: 10, marginTop: 4 }]}>
              <Text style={{ fontSize: 44, fontWeight: '800', color: ancien ? C.discret : C.encre, fontVariant: ['tabular-nums'] }}>
                {abs !== null ? `${Math.round(abs)}°` : '—'}
              </Text>
              {abs !== null && <Text style={{ fontSize: 26, fontWeight: '700', color: C.accent }}>{pointCardinal(abs)}</Text>}
            </View>
            <Text style={[s.discret, { textAlign: 'center' }]}>
              {ancien ? `Dernier signal il y a ${fmtAge(age)}` : t.rel >= 0 ? `${libelleRelatif(t.rel)} · qualité ${libelleQualite(t.q)}` : 'Direction inconnue'}
            </Text>
          </Carte>

          <Carte>
            <Titre>Niveaux reçus · % du signal</Titre>
            {VOIES.map((v, k) => {
              const p = niveauPct(t.r[k]);
              const max = Math.max(...t.r.slice(0, 4));
              return (
                <View key={v} style={[s.ligne, { marginVertical: 4 }]}>
                  <Text style={{ width: 70, color: C.encre, fontSize: police.petit }}>{v}</Text>
                  <View style={{ flex: 1, height: 10, borderRadius: 5, backgroundColor: C.fond, overflow: 'hidden' }}>
                    <View style={{ width: `${p ?? 0}%`, height: '100%', backgroundColor: k < 4 && t.r[k] === max && !ancien ? C.accent : C.encre, opacity: ancien ? 0.35 : 1 }} />
                  </View>
                  <Text style={{ width: 44, textAlign: 'right', color: C.encre, fontVariant: ['tabular-nums'] }}>{p === null ? '—' : p}</Text>
                </View>
              );
            })}
          </Carte>

          <Carte>
            <View style={[s.ligne, { justifyContent: 'space-between' }]}>
              <Chiffre k="Relèvements" v={`${t.nReleves}`} />
              <Chiffre k="Dernier signal" v={`il y a ${fmtAge(age)}`} />
              <Chiffre k="Pile du tag" v={t.pile >= 0 ? `${t.pile} %` : '—'} />
            </View>
          </Carte>

          {f && (
            <Carte style={{ borderColor: C.accent, borderWidth: 2 }}>
              <Titre>Nid estimé · tag {idTag(t.id)}</Titre>
              <View style={[s.ligne, { justifyContent: 'space-between' }]}>
                <Chiffre k="Distance" v={distNid !== null ? fmtDist(distNid) : '—'} />
                <Chiffre k="Cap" v={capNid !== null ? `${Math.round(capNid)}° ${pointCardinal(capNid)}` : '—'} />
                <Chiffre k="Précision" v={`± ${Math.round(f.errM)} m`} />
              </View>
              <View style={{ marginTop: 12 }}><Bouton titre="Voir sur la carte" onPress={() => router.navigate('/carte')} /></View>
            </Carte>
          )}
        </>
      )}
      {e.evenements.length > 0 && <Text style={[s.discret, { textAlign: 'center' }]}>{e.evenements[0]}</Text>}
    </ScrollView>
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

/** Réglages (É5, partie source) : choisir entre le toit en Bluetooth et la sortie simulée. */
import React, { useEffect, useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { BandeauToit, Bouton, Carte, Titre, s } from '@/ui/composants';
import { C, police } from '@/ui/theme';
import { store, useEtat } from '@/store/store';
import { arreterSimulation, avancementSimulation, demarrerSimulation, dureeSimulationMs, simulationActive } from '@/sources/simulation';
import { connecterToit, toit } from '@/sources/ble';

const VITESSES = [1, 10, 30];

export default function Reglages() {
  const { source, connexion, vitesseSim, message, config } = useEtat((e) => ({
    source: e.source, connexion: e.connexion, vitesseSim: e.vitesseSim, message: e.message, config: e.config,
  }));
  const [avance, setAvance] = useState(0);
  useEffect(() => {
    const i = setInterval(() => setAvance(avancementSimulation()), 500);
    return () => clearInterval(i);
  }, []);
  const simEnCours = source === 'simulation' && connexion === 'connecte';
  const toitConnecte = source === 'toit' && connexion === 'connecte';

  return (
    <ScrollView style={s.ecran} contentContainerStyle={s.contenu}>
      <BandeauToit />

      <Carte>
        <Titre>Toit de la voiture</Titre>
        <Text style={[s.discret, { marginBottom: 12 }]}>Le téléphone se connecte au boîtier « TOIT-Frelons » en Bluetooth. Allumez le toit avant.</Text>
        {toitConnecte ? (
          <Bouton titre="Déconnecter le toit" onPress={() => toit.deconnecter()} />
        ) : (
          <Bouton titre={connexion === 'recherche' ? 'Recherche…' : 'Connecter le toit'} plein desactive={connexion === 'recherche'}
            onPress={() => { arreterSimulation(); connecterToit(); }} />
        )}
        {source === 'toit' && !!message && <Text style={[s.discret, { marginTop: 8 }]}>{message}</Text>}
        {config && (
          <Text style={[s.discret, { marginTop: 8 }]}>
            Avant de la voiture : {config.fwd}° · ouverture {config.beam}° · vitesse mini {config.vmin} km/h
          </Text>
        )}
      </Carte>

      <Carte>
        <Titre>Sortie simulée</Titre>
        <Text style={[s.discret, { marginBottom: 12 }]}>
          Rejoue une vraie sortie enregistrée ({Math.round(dureeSimulationMs() / 60000)} min, tags 007 et 012) pour essayer l'appli sans matériel.
        </Text>
        <View style={[s.ligne, { gap: 8, marginBottom: 12 }]}>
          <Text style={[s.discret, { marginRight: 4 }]}>Vitesse</Text>
          {VITESSES.map((v) => (
            <Pressable key={v} onPress={() => store.set({ vitesseSim: v })} style={[s.puce, v === vitesseSim && s.puceActive]}>
              <Text style={[s.puceTxt, v === vitesseSim && { fontWeight: '700' }]}>×{v}</Text>
            </Pressable>
          ))}
        </View>
        {simEnCours || simulationActive() ? (
          <Bouton titre="Arrêter la simulation" onPress={arreterSimulation} />
        ) : (
          <Bouton titre="Lancer la sortie simulée" plein onPress={() => { toit.deconnecter(); demarrerSimulation(); }} />
        )}
        {source === 'simulation' && (
          <View style={{ marginTop: 12 }}>
            <View style={{ height: 6, borderRadius: 3, backgroundColor: C.fond, overflow: 'hidden' }}>
              <View style={{ width: `${Math.round(avance * 100)}%`, height: '100%', backgroundColor: C.accent }} />
            </View>
            <Text style={[s.discret, { marginTop: 6, fontSize: police.mini }]}>{Math.round(avance * 100)} % de la sortie · {message}</Text>
          </View>
        )}
      </Carte>
    </ScrollView>
  );
}

import React from 'react';
import { ScrollView } from 'react-native';
import { Carte, Vide, s } from '@/ui/composants';

export default function Ecran() {
  return (
    <ScrollView style={s.ecran} contentContainerStyle={s.contenu}>
      <Carte><Vide titre="Chrono : à venir" texte="Chronomètre des allers-retours à l'appât : prochaine étape du développement." /></Carte>
    </ScrollView>
  );
}

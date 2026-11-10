import React from 'react';
import { ScrollView } from 'react-native';
import { Carte, Vide, s } from '@/ui/composants';

export default function Ecran() {
  return (
    <ScrollView style={s.ecran} contentContainerStyle={s.contenu}>
      <Carte><Vide titre="Portatif : à venir" texte="Connexion au récepteur portatif, son et chasse à pied : prochaine étape du développement." /></Carte>
    </ScrollView>
  );
}

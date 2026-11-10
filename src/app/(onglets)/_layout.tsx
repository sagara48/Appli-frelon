import { Tabs } from 'expo-router/js-tabs';
import React from 'react';
import Svg, { Circle, Path } from 'react-native-svg';
import { C } from '@/ui/theme';

type IconeProps = { color: any; size: number };
const trait = (color: any) => ({ stroke: color, strokeWidth: 2, fill: 'none', strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const });

const icones: Record<string, (p: IconeProps) => React.ReactNode> = {
  index: ({ color, size }) => (
    <Svg width={size} height={size} viewBox="0 0 24 24"><Circle cx={12} cy={12} r={9} {...trait(color)} /><Path d="M12 5 L15 13 L12 11.5 L9 13 Z" fill={color} /></Svg>
  ),
  carte: ({ color, size }) => (
    <Svg width={size} height={size} viewBox="0 0 24 24"><Path d="M3 6 L9 4 L15 6 L21 4 L21 18 L15 20 L9 18 L3 20 Z M9 4 L9 18 M15 6 L15 20" {...trait(color)} /></Svg>
  ),
  portatif: ({ color, size }) => (
    <Svg width={size} height={size} viewBox="0 0 24 24"><Path d="M8 3 H16 V21 H8 Z M10 7 H14 M12 17 h0.01" {...trait(color)} /></Svg>
  ),
  chrono: ({ color, size }) => (
    <Svg width={size} height={size} viewBox="0 0 24 24"><Circle cx={12} cy={13} r={8} {...trait(color)} /><Path d="M12 9 V13 L15 15 M10 2 H14" {...trait(color)} /></Svg>
  ),
  reglages: ({ color, size }) => (
    <Svg width={size} height={size} viewBox="0 0 24 24"><Path d="M4 7 H20 M4 17 H20" {...trait(color)} /><Circle cx={9} cy={7} r={2.5} {...trait(color)} fill={C.carte} /><Circle cx={15} cy={17} r={2.5} {...trait(color)} fill={C.carte} /></Svg>
  ),
};

const ONGLETS: [string, string][] = [['index', 'Direct'], ['carte', 'Carte'], ['portatif', 'Portatif'], ['chrono', 'Chrono'], ['reglages', 'Réglages']];

export default function Onglets() {
  return (
    <Tabs
      screenOptions={{
        headerStyle: { backgroundColor: C.fond },
        headerShadowVisible: false,
        headerTitleStyle: { color: C.encre, fontWeight: '700' },
        tabBarActiveTintColor: C.encre,
        tabBarInactiveTintColor: C.discret,
        tabBarStyle: { backgroundColor: C.carte, borderTopColor: C.ligne },
        sceneStyle: { backgroundColor: C.fond },
      }}
    >
      {ONGLETS.map(([nom, titre]) => (
        <Tabs.Screen key={nom} name={nom} options={{ title: titre, tabBarIcon: icones[nom] }} />
      ))}
    </Tabs>
  );
}

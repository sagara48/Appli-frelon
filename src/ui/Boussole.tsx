/** Boussole nord en haut : flèche du relèvement (cône ±12°), voiture orientée selon son cap, repère du nid estimé. */
import React from 'react';
import Svg, { Circle, G, Line, Path, Polygon, Text as T } from 'react-native-svg';
import { C } from './theme';

const rad = (d: number) => (d * Math.PI) / 180;
const pt = (cx: number, cy: number, r: number, deg: number) => [cx + r * Math.sin(rad(deg)), cy - r * Math.cos(rad(deg))] as const;

export function Boussole({ taille, abs, cap, capNid, ancien }: { taille: number; abs: number | null; cap: number | null; capNid: number | null; ancien: boolean }) {
  const c = taille / 2, r = c - 22;
  const graduations = [];
  for (let d = 0; d < 360; d += 10) {
    const [x1, y1] = pt(c, c, r, d), [x2, y2] = pt(c, c, r - (d % 90 === 0 ? 12 : d % 30 === 0 ? 8 : 4), d);
    graduations.push(<Line key={d} x1={x1} y1={y1} x2={x2} y2={y2} stroke={d % 90 === 0 ? C.encre : C.discret} strokeWidth={d % 90 === 0 ? 2 : 1} />);
  }
  const lettres = (['N', 'E', 'S', 'O'] as const).map((l, i) => {
    const [x, y] = pt(c, c, r + 12, i * 90);
    return <T key={l} x={x} y={y + 5} fontSize={14} fontWeight="700" fill={l === 'N' ? C.alerte : C.encre} textAnchor="middle">{l}</T>;
  });
  let cone = null, fleche = null;
  if (abs !== null) {
    const [ax, ay] = pt(c, c, r - 16, abs - 12), [bx, by] = pt(c, c, r - 16, abs + 12);
    cone = <Path d={`M${c},${c} L${ax},${ay} A${r - 16},${r - 16} 0 0 1 ${bx},${by} Z`} fill={C.accent} opacity={ancien ? 0.12 : 0.25} />;
    const [px, py] = pt(c, c, r - 18, abs), [lx, ly] = pt(c, c, r - 40, abs - 7), [rx, ry] = pt(c, c, r - 40, abs + 7);
    fleche = (
      <G opacity={ancien ? 0.4 : 1}>
        <Line x1={c} y1={c} x2={px} y2={py} stroke={C.accent} strokeWidth={5} strokeLinecap="round" />
        <Polygon points={`${px},${py} ${lx},${ly} ${rx},${ry}`} fill={C.accent} />
      </G>
    );
  }
  let nid = null;
  if (capNid !== null) {
    const [nx, ny] = pt(c, c, r - 4, capNid);
    nid = <Circle cx={nx} cy={ny} r={7} fill={C.carte} stroke={C.encre} strokeWidth={2.5} />;
  }
  // voiture : rectangle arrondi vu de dessus, orientée selon le cap GPS
  const voiture = cap !== null && (
    <G transform={`rotate(${cap} ${c} ${c})`}>
      <Path d={`M${c - 9},${c - 16} Q${c},${c - 22} ${c + 9},${c - 16} L${c + 9},${c + 15} Q${c},${c + 18} ${c - 9},${c + 15} Z`} fill={C.encre} />
      <Path d={`M${c - 6},${c - 10} L${c + 6},${c - 10} L${c + 5},${c - 4} L${c - 5},${c - 4} Z`} fill="#9FB3C8" />
    </G>
  );
  return (
    <Svg width={taille} height={taille}>
      <Circle cx={c} cy={c} r={r} fill={C.carte} stroke={C.ligne} strokeWidth={2} />
      <Circle cx={c} cy={c} r={r * 0.55} fill="none" stroke={C.ligne} strokeDasharray="3 5" />
      {graduations}
      {lettres}
      {cone}
      {nid}
      {fleche}
      {voiture || <Circle cx={c} cy={c} r={6} fill={C.encre} />}
    </Svg>
  );
}

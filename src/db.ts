/** Journal local SQLite : relèvements et nids, pour le bilan et l'historique (cahier des charges, « Données »). */
import * as SQLite from 'expo-sqlite';

let db: SQLite.SQLiteDatabase | null = null;

export function base(): SQLite.SQLiteDatabase {
  if (db) return db;
  db = SQLite.openDatabaseSync('frelons.db');
  db.execSync(`
    PRAGMA journal_mode = WAL;
    CREATE TABLE IF NOT EXISTS sortie (id INTEGER PRIMARY KEY AUTOINCREMENT, debut INTEGER NOT NULL, fin INTEGER, source TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS releve (id INTEGER PRIMARY KEY AUTOINCREMENT, sortie INTEGER NOT NULL, t INTEGER NOT NULL, tag INTEGER NOT NULL,
      lat REAL, lon REAL, abs REAL, q INTEGER, r0 REAL, r1 REAL, r2 REAL, r3 REAL, r4 REAL);
    CREATE TABLE IF NOT EXISTS nid (id INTEGER PRIMARY KEY AUTOINCREMENT, tag INTEGER NOT NULL, t INTEGER NOT NULL, lat REAL NOT NULL, lon REAL NOT NULL,
      err REAL, etat TEXT NOT NULL DEFAULT 'estime', note TEXT);
    CREATE INDEX IF NOT EXISTS releve_sortie ON releve(sortie, tag);
  `);
  return db;
}

export function nouvelleSortie(source: string): number {
  const r = base().runSync('INSERT INTO sortie (debut, source) VALUES (?, ?)', Date.now(), source);
  return Number(r.lastInsertRowId);
}

export function enregistrerNid(tag: number, lat: number, lon: number, err: number, etat: 'estime' | 'trouve' | 'detruit' = 'estime') {
  base().runSync('INSERT INTO nid (tag, t, lat, lon, err, etat) VALUES (?, ?, ?, ?, ?, ?)', tag, Date.now(), lat, lon, err, etat);
}

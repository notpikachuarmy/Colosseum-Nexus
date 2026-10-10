// Modelo de equipos: guardar, importar/exportar y validar.
import {Teams, toID} from 'pkmn-sim';
import {dex, storage} from './util';
import {INFO} from './mod';

export interface SetPkm {
  name: string; species: string; item: string; ability: string; moves: string[];
  nature: string; evs: {[k: string]: number}; ivs: {[k: string]: number};
  level: number; gender: string; shiny: boolean; teraType: string;
}
export interface Equipo { id: string; nombre: string; formato: 'singles' | 'doubles'; sets: SetPkm[]; }

const KEY = 'arena.equipos.v1';
const STATS = ['hp', 'atk', 'def', 'spa', 'spd', 'spe'];

export function nuevoSet(species: string): SetPkm {
  const sp = dex().species.get(species);
  return {
    name: '', species: sp.name, item: '', ability: sp.abilities[0] || '', moves: [],
    nature: 'Hardy', evs: Object.fromEntries(STATS.map(s => [s, 0])), ivs: Object.fromEntries(STATS.map(s => [s, 31])),
    level: 100, gender: '', shiny: false, teraType: sp.types[0],
  };
}

export function cargarEquipos(): Equipo[] { return storage.get<Equipo[]>(KEY, []); }
export function guardarEquipos(eq: Equipo[]) { storage.set(KEY, eq); }
export function nuevoId() { return Math.random().toString(36).slice(2, 10); }

/** Movimientos que puede aprender una especie (incluye preevoluciones y forma base). */
export function movimientosDe(species: string): string[] {
  const d = dex();
  let sp = d.species.get(species);
  const out = new Set<string>();
  const seen = new Set<string>();
  while (sp && sp.exists && !seen.has(sp.id)) {
    seen.add(sp.id);
    let ls = (d.data.Learnsets as any)[sp.id]?.learnset;
    if (!ls && sp.baseSpecies !== sp.name) ls = (d.data.Learnsets as any)[toID(sp.changesFrom || sp.baseSpecies)]?.learnset;
    if (ls) for (const m of Object.keys(ls)) out.add(m);
    const prevo = sp.prevo || (sp.baseSpecies !== sp.name ? d.species.get(sp.baseSpecies).prevo : '');
    if (!prevo) break;
    sp = d.species.get(prevo);
  }
  out.delete('sketch');
  return [...out].filter(m => {
    const mv = d.moves.get(m);
    return mv.exists && !mv.isZ && !mv.isMax && mv.isNonstandard !== 'CAP' && mv.isNonstandard !== 'LGPE';
  });
}

export function exportarEquipo(eq: Equipo): string {
  const sets = eq.sets.map(s => ({...s, name: s.name || s.species}));
  return Teams.export(sets as any);
}

export function importarTexto(texto: string): SetPkm[] {
  const d = dex();
  const t = Teams.import(texto) || [];
  return t.map((s: any) => {
    const base = nuevoSet(s.species);
    const sp = d.species.get(s.species);
    return {
      ...base,
      name: s.name && s.name !== s.species ? s.name : '',
      species: sp.exists ? sp.name : s.species,
      item: s.item || '',
      ability: s.ability || base.ability,
      moves: (s.moves || []).slice(0, 4).map((m: string) => d.moves.get(m).exists ? d.moves.get(m).name : m),
      nature: s.nature || 'Hardy',
      evs: {...base.evs, ...(s.evs || {})},
      ivs: {...base.ivs, ...(s.ivs || {})},
      level: s.level || 100,
      gender: s.gender || '',
      shiny: !!s.shiny,
      teraType: s.teraType || base.teraType,
    };
  });
}

/** Devuelve una lista de problemas (vacía si el equipo es válido). */
export function validarEquipo(eq: Equipo): string[] {
  const d = dex();
  const errs: string[] = [];
  if (!eq.sets.length) errs.push('El equipo está vacío.');
  if (eq.formato === 'doubles' && eq.sets.length < 2) errs.push('Para dobles necesitas al menos 2 Pokémon.');
  const vistos = new Set<string>();
  for (const s of eq.sets) {
    const sp = d.species.get(s.species);
    const n = s.name || s.species;
    if (!sp.exists) { errs.push(`${n}: el Pokémon no existe.`); continue; }
    if (sp.battleOnly) errs.push(`${n}: esa forma solo aparece en combate.`);
    // Tus versiones cuentan como Pokémon distintos del original (Lapras y Lapras-Custom pueden ir juntos)
    const clave = INFO.custom.has(sp.id) ? sp.id : sp.baseSpecies;
    if (vistos.has(clave)) errs.push(`${n}: no puedes repetir Pokémon (cláusula de especie).`);
    vistos.add(clave);
    if (!s.moves.filter(Boolean).length) errs.push(`${n}: necesita al menos un movimiento.`);
    const legales = new Set(movimientosDe(sp.name));
    for (const m of s.moves.filter(Boolean)) {
      const mv = d.moves.get(m);
      if (!mv.exists) errs.push(`${n}: el movimiento "${m}" no existe.`);
      else if (!legales.has(mv.id)) errs.push(`${n}: no puede aprender ${mv.name}.`);
    }
    const habs = Object.values(sp.abilities).map(a => toID(a as string));
    if (s.ability && !habs.includes(toID(s.ability))) errs.push(`${n}: no puede tener la habilidad ${s.ability}.`);
    if (s.item && !d.items.get(s.item).exists) errs.push(`${n}: el objeto "${s.item}" no existe.`);
    const total = Object.values(s.evs).reduce((a, b) => a + (b || 0), 0);
    if (total > 510) errs.push(`${n}: los EVs suman ${total} (máximo 510).`);
    if (sp.requiredItem && toID(s.item) !== toID(sp.requiredItem) && !sp.battleOnly) {
      errs.push(`${n}: necesita llevar ${sp.requiredItem}.`);
    }
  }
  return errs;
}

/** Equipo listo para el simulador */
export function paraSimulador(eq: Equipo) {
  const usados = new Set<string>();
  return eq.sets.map(s => {
    const sp = dex().species.get(s.species);
    let name = s.name || sp.baseSpecies;
    if (usados.has(name)) name = `${sp.baseSpecies.slice(0, 17)}★`;
    let k = 2;
    while (usados.has(name)) name = `${sp.baseSpecies.slice(0, 15)} ${k++}`;
    usados.add(name);
    return {...s, name};
  });
}

export function empaquetar(eq: Equipo): string {
  return Teams.pack(paraSimulador(eq) as any);
}

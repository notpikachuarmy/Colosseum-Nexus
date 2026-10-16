// Modelo de equipos: guardar, importar/exportar y validar.
import {tr} from './idioma';
import {Teams, toID} from 'pkmn-sim';
import {dex, storage} from './util';
import {INFO} from './mod';

export interface SetPkm {
  name: string; species: string; item: string; ability: string; moves: string[];
  nature: string; evs: {[k: string]: number}; ivs: {[k: string]: number};
  level: number; gender: string; shiny: boolean; teraType: string; gigantamax?: boolean;
}
export interface Equipo { id: string; nombre: string; formato: 'singles' | 'doubles' | 'draft'; sets: SetPkm[]; }
/** Máximo de Pokémon: 6 en equipos normales, 12 en plantillas de draft */
export const maxPokemon = (eq: Equipo) => eq.formato === 'draft' ? 12 : 6;

/**
 * Cláusula de especie: qué cuenta como "el mismo Pokémon".
 * - Las formas regionales cuentan como especies distintas (Diglett y Diglett-Alola pueden ir juntos).
 * - Tus versiones de oficiales también (Lapras y Lapras-Custom, Diglett-Custom y Diglett-Alola...).
 * - Las formas de tus Fakemon también (Railspike y Railspike-Ballesta).
 * - El resto de formas oficiales sí cuentan como el mismo (Rotom y Rotom-Lavado...).
 */
const REGIONALES = new Set(['Alola', 'Galar', 'Hisui', 'Paldea']);
export function claveEspecie(especie: string): string {
  const sp = dex().species.get(especie);
  if (!sp.exists) return toID(especie);
  const partes = (sp.forme || '').split('-').filter(p => REGIONALES.has(p));
  if (INFO.versiones.has(sp.id) || (sp.changesFrom && INFO.versiones.has(toID(sp.changesFrom)))) partes.push('Custom');
  // Formas de tus Fakemon (Railspike-Ballesta...) también cuentan como distintas
  else if (INFO.custom.has(sp.id) && sp.forme && !sp.battleOnly) partes.push(sp.forme);
  return [toID(sp.baseSpecies), ...partes].join('-');
}

const KEY = 'cnx.equipos.v1';
const STATS = ['hp', 'atk', 'def', 'spa', 'spd', 'spe'];

export function nuevoSet(species: string): SetPkm {
  const sp = dex().species.get(species);
  return {
    name: '', species: sp.name, item: objetosRequeridos(sp)[0] || '', ability: sp.abilities[0] || '', moves: [],
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
  const quitar = INFO.quitarTipos[sp.id] || [];
  const propio = sp.id;
  while (sp && sp.exists && !seen.has(sp.id)) {
    seen.add(sp.id);
    let ls = (d.data.Learnsets as any)[sp.id]?.learnset;
    if (!ls && sp.baseSpecies !== sp.name) ls = (d.data.Learnsets as any)[toID(sp.changesFrom || sp.baseSpecies)]?.learnset;
    // Los tipos de "quitarTipos" no se heredan de las preevoluciones
    if (ls) for (const m of Object.keys(ls)) {
      if (sp.id !== propio && quitar.length && quitar.includes(d.moves.get(m).type)) continue;
      out.add(m);
    }
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
      gigantamax: !!s.gigantamax,
    };
  });
}

/** Devuelve una lista de problemas (vacía si el equipo es válido). */
export function validarEquipo(eq: Equipo): string[] {
  const d = dex();
  const errs: string[] = [];
  if (!eq.sets.length) errs.push(tr('El equipo está vacío.', 'The team is empty.'));
  if (eq.formato === 'doubles' && eq.sets.length < 2) errs.push(tr('Para dobles necesitas al menos 2 Pokémon.', 'Doubles needs at least 2 Pokémon.'));
  if (eq.formato !== 'draft' && eq.sets.length > 6) errs.push(tr('Tiene más de 6 Pokémon: úsalo como plantilla de draft.', 'It has more than 6 Pokémon: use it as a draft roster.'));
  const vistos = new Set<string>();
  for (const s of eq.sets) {
    const sp = d.species.get(s.species);
    const n = s.name || s.species;
    if (!sp.exists) { errs.push(tr(`${n}: el Pokémon no existe.`, `${n}: this Pokémon doesn't exist.`)); continue; }
    if (sp.battleOnly) errs.push(tr(`${n}: esa forma solo aparece en combate.`, `${n}: that forme only appears in battle.`));
    // Formas regionales y tus versiones cuentan como Pokémon distintos (ver claveEspecie)
    const clave = claveEspecie(sp.name);
    if (vistos.has(clave)) errs.push(tr(`${n}: no puedes repetir Pokémon (cláusula de especie).`, `${n}: you can't repeat Pokémon (species clause).`));
    vistos.add(clave);
    if (!s.moves.filter(Boolean).length) errs.push(tr(`${n}: necesita al menos un movimiento.`, `${n}: needs at least one move.`));
    const legales = new Set(movimientosDe(sp.name));
    for (const m of s.moves.filter(Boolean)) {
      const mv = d.moves.get(m);
      if (!mv.exists) errs.push(tr(`${n}: el movimiento "${m}" no existe.`, `${n}: the move "${m}" doesn't exist.`));
      else if (!legales.has(mv.id)) errs.push(tr(`${n}: no puede aprender ${mv.name}.`, `${n}: can't learn ${mv.name}.`));
    }
    const habs = Object.values(sp.abilities).map(a => toID(a as string));
    if (s.ability && !habs.includes(toID(s.ability))) errs.push(tr(`${n}: no puede tener la habilidad ${s.ability}.`, `${n}: can't have the ability ${s.ability}.`));
    if (s.item && !d.items.get(s.item).exists) errs.push(tr(`${n}: el objeto "${s.item}" no existe.`, `${n}: the item "${s.item}" doesn't exist.`));
    const total = Object.values(s.evs).reduce((a, b) => a + (b || 0), 0);
    if (total > 510) errs.push(tr(`${n}: los EVs suman ${total} (máximo 510).`, `${n}: EVs add up to ${total} (max 510).`));
    const req = objetosRequeridos(sp);
    if (req.length && !sp.battleOnly && !req.map(toID).includes(toID(s.item))) {
      errs.push(tr(`${n}: necesita llevar ${req.join(' o ')} para tener esa forma.`, `${n}: must hold ${req.join(' or ')} to be in that forme.`));
    }
  }
  return errs;
}

/** Equipo listo para el simulador */
/** Objetos que necesita una forma (Arceus-Fuego -> Tabla Llama, Silvally-Agua -> Disco Agua...) */
export function objetosRequeridos(sp: any): string[] {
  return sp.requiredItems || (sp.requiredItem ? [sp.requiredItem] : []);
}

/** Ajusta la forma al objeto: Arceus + Tabla Llama -> Arceus-Fire (como hace Showdown) */
export function formaPorObjeto(species: string, item: string): string {
  const d = dex();
  const sp = d.species.get(species);
  if (!sp.exists || !item) return species;
  const base = d.species.get(sp.baseSpecies);
  const it = toID(item);
  if (objetosRequeridos(sp).map(toID).includes(it)) return sp.name;
  for (const f of [base.name, ...(base.otherFormes || [])]) {
    const fs = d.species.get(f);
    if (fs.exists && !fs.battleOnly && objetosRequeridos(fs).map(toID).includes(it)) return fs.name;
  }
  return species;
}

export function paraSimulador(eq: Equipo) {
  const usados = new Set<string>();
  return eq.sets.map(s => {
    const sp = dex().species.get(s.species);
    let name = s.name || sp.baseSpecies;
    if (usados.has(name)) name = `${sp.baseSpecies.slice(0, 17)}★`;
    let k = 2;
    while (usados.has(name)) name = `${sp.baseSpecies.slice(0, 15)} ${k++}`;
    usados.add(name);
    return {...s, name, species: formaPorObjeto(s.species, s.item)};
  });
}

export function empaquetar(eq: Equipo): string {
  return Teams.pack(paraSimulador(eq) as any);
}

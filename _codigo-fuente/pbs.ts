// Exportar los datos personalizados al formato PBS de Pokémon Essentials v21.
import {tr} from './idioma';
import {toID} from 'pkmn-sim';
import {INFO} from './mod';
import {dex} from './util';
import {movimientosDe} from './equipos';

const W: any = (globalThis as any).window || globalThis;
const sinTildes = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '');
export const idPBS = (s: string) => toID(sinTildes(s || '')).toUpperCase();

const STATS_PBS: {[k: string]: string} = {hp: 'HP', atk: 'ATTACK', def: 'DEFENSE', spe: 'SPEED', spa: 'SPECIAL_ATTACK', spd: 'SPECIAL_DEFENSE'};
const OBJETIVOS: {[k: string]: string} = {
  normal: 'NearOther', any: 'Other', self: 'User', adjacentAlly: 'NearAlly', adjacentAllyOrSelf: 'UserOrNearAlly',
  adjacentFoe: 'NearFoe', allAdjacentFoes: 'AllNearFoes', allAdjacent: 'AllNearOthers', all: 'BothSides',
  foeSide: 'FoeSide', allySide: 'UserSide', allyTeam: 'UserSide', randomNormal: 'RandomNearFoe', scripted: 'None', allies: 'UserAndAllies',
};
const FLAGS: {[k: string]: string} = {
  contact: 'Contact', protect: 'CanProtect', mirror: 'CanMirrorMove', sound: 'Sound', punch: 'Punching', bite: 'Biting',
  slicing: 'Slicing', pulse: 'Pulse', bullet: 'Bomb', powder: 'Powder', dance: 'Dance', wind: 'Wind', reflectable: 'CanMagicCoat',
  snatch: 'CanSnatch', defrost: 'ThawsUser',
};

function idMovimiento(m: string) {
  const mv = dex().moves.get(m);
  const datos = W.DATOS_MOVIMIENTOS?.[mv.name];
  return datos?.idPBS || idPBS(mv.name);
}
function idObjeto(n: string) {
  const it = dex().items.get(n);
  const datos = W.DATOS_OBJETOS?.[it.name];
  if (datos?.idPBS) return datos.idPBS;
  return INFO.spritesObjeto[it.id] && INFO.objetos.has(it.id) ? INFO.spritesObjeto[it.id].toUpperCase().replace(/[^A-Z0-9]/g, '') : idPBS(it.name);
}
function idHabilidad(n: string) {
  const a = dex().abilities.get(n);
  return W.DATOS_HABILIDADES?.[a.name]?.idPBS || idPBS(a.name);
}
/** Proporción de sexos en el formato de Essentials */
function sexos(sp: any) {
  if (sp.gender === 'N') return 'Genderless';
  if (sp.gender === 'M') return 'AlwaysMale';
  if (sp.gender === 'F') return 'AlwaysFemale';
  const f = sp.genderRatio?.F ?? 0.5;
  return f <= 0.125 ? 'FemaleOneEighth' : f <= 0.25 ? 'Female25Percent' : f <= 0.5 ? 'Female50Percent' : f <= 0.75 ? 'Female75Percent' : 'FemaleSevenEighths';
}
/** Una línea de texto para PBS (sin saltos) */
const unaLinea = (s: string) => String(s || '').replace(/\s*\n\s*/g, ' ').trim();

/** Nivel al que aprende un movimiento según los datos oficiales (si lo tiene). */
function nivelOficial(codes: string[]): number | null {
  let mejor: number | null = null, gen = -1;
  for (const c of codes || []) {
    const m = /^(\d)L(\d+)$/.exec(c);
    if (m && +m[1] >= gen) { gen = +m[1]; mejor = +m[2]; }
  }
  return mejor;
}

interface EntradaPBS { cab: string; nombre: string; sp: any; datos: any; forma?: string }

function entradas(): EntradaPBS[] {
  const d = dex();
  const out: EntradaPBS[] = [];
  const formas = new Map<string, number>();
  for (const p of W.DATOS_POKEMON || []) {
    if (p.editar) continue;
    let sp = d.species.get(p.nombre);
    // Las versiones (Lapras) están como Lapras-Custom
    if (!INFO.custom.has(sp.id) || sp.name !== p.nombre && p.base && toID(p.base) === toID(p.nombre)) {
      const v = [...INFO.custom].map(id => d.species.get(id)).find(x => x.baseSpecies === p.nombre && INFO.nombresForma[x.id] && !x.battleOnly);
      if (v) sp = v;
    }
    if (!sp.exists) continue;
    const esVersion = !!(p.base && toID(p.base) === toID(p.nombre));
    if (esVersion || !sp.forme || sp.baseForme) {
      out.push({cab: `[${idPBS(esVersion ? p.nombre : sp.name)}]`, nombre: esVersion ? p.nombre : sp.name, sp, datos: p});
    } else {
      // Formas alternativas -> pokemon_forms.txt
      const base = idPBS(sp.baseSpecies);
      const oficiales = (d.species.get(sp.baseSpecies).otherFormes || []).filter((f: string) => !INFO.custom.has(toID(f))).length;
      const n = (formas.get(base) ?? oficiales) + 1;
      formas.set(base, n);
      out.push({cab: `[${base},${n}]`, nombre: sp.baseSpecies, sp, datos: p, forma: p.nombreForma || sp.forme});
    }
  }
  return out;
}

function lineasPokemon(e: EntradaPBS, conCabecera = true): string[] {
  const d = dex();
  const sp = e.sp;
  const L: string[] = ['#-------------------------------'];
  if (conCabecera) L.push(e.cab);
  if (e.forma) L.push(`FormName = ${sp.isMega ? 'Mega ' + sp.baseSpecies + (/-Mega-([XY])$/.exec(sp.name)?.[1] ? ' ' + /-Mega-([XY])$/.exec(sp.name)![1] : '') : e.datos.nombreFormaEN || e.forma}`);
  else L.push(`Name = ${e.nombre}`);
  L.push(`Types = ${sp.types.map((t: string) => t.toUpperCase()).join(',')}`);
  const bs = sp.baseStats;
  L.push(`BaseStats = ${[bs.hp, bs.atk, bs.def, bs.spe, bs.spa, bs.spd].join(',')}`);
  if (!e.forma) {
    L.push(`GenderRatio = ${sexos(sp)}`);
    L.push('GrowthRate = Medium');
    const bst = Object.values(bs as {[k: string]: number}).reduce((a, b) => a + b, 0);
    L.push(`BaseExp = ${Math.round(bst * 0.35)}`);
  }
  const mayor = Object.entries(bs as {[k: string]: number}).sort((a, b) => b[1] - a[1])[0][0];
  L.push(`EVs = ${STATS_PBS[mayor]},${sp.nfe ? 1 : 2}`);
  if (!e.forma) { L.push('CatchRate = 45'); L.push('Happiness = 70'); }
  const habs = [...new Set([sp.abilities[0], sp.abilities[1]].filter(Boolean).map(idHabilidad))];
  L.push(`Abilities = ${habs.join(',')}`);
  if (sp.abilities.H) L.push(`HiddenAbilities = ${idHabilidad(sp.abilities.H)}`);
  // Movimientos: por nivel (oficiales con su nivel; los tuyos repartidos por potencia) y el resto como tutor
  if (!sp.battleOnly) {
    const ls = (d.data.Learnsets as any)[sp.id]?.learnset || {};
    const todos = movimientosDe(sp.name);
    const nivel: [number, string][] = [];
    const propios: any[] = [];
    const huevo = new Set<string>();
    for (const m of Object.keys(ls)) {
      const codes: string[] = ls[m] || [];
      if (codes.length === 1 && codes[0] === '9L1') { propios.push(d.moves.get(m)); continue; } // añadido por ti
      const lv = nivelOficial(codes);
      if (lv !== null) nivel.push([lv, m]);
      else if (codes.some(c => /^\dE/.test(c))) huevo.add(m);
    }
    if (!nivel.length) {
      // Pokémon nuevo: los 4 primeros a nivel 1 y el resto cada 4 niveles, de menos a más potencia
      const vistos = new Set(propios.map((m: any) => m.id));
      const base = [...propios, ...todos.filter(m => !vistos.has(m)).map(m => d.moves.get(m))].slice(0, 18);
      base.sort((x: any, y: any) => (x.basePower || 30) - (y.basePower || 30))
        .forEach((mv: any, i: number) => nivel.push([i < 4 ? 1 : 1 + (i - 3) * 4, mv.id]));
    }
    nivel.sort((a, b) => a[0] - b[0]);
    const enNivel = new Set(nivel.map(x => x[1]));
    if (nivel.length) L.push(`Moves = ${nivel.map(([lv, m]) => `${lv},${idMovimiento(m)}`).join(',')}`);
    const tutor = todos.filter(m => !enNivel.has(m) && !huevo.has(m)).map(idMovimiento);
    if (tutor.length) L.push(`TutorMoves = ${tutor.join(',')}`);
    const deHuevo = [...huevo].filter(m => !enNivel.has(m)).map(idMovimiento);
    if (deHuevo.length && !sp.prevo) L.push(`EggMoves = ${deHuevo.join(',')}`);
  }
  if (sp.requiredItem && sp.battleOnly) L.push(`MegaStone = ${idObjeto(sp.requiredItem)}`);
  if (!e.forma) {
    L.push(`EggGroups = ${(sp.eggGroups || ['Undiscovered']).map((g: string) => g.replace(/\s/g, '')).join(',')}`);
    L.push('HatchSteps = 5120');
  }
  L.push(`Height = ${(sp.heightm || 1).toFixed(1)}`);
  L.push(`Weight = ${(sp.weightkg || 20).toFixed(1)}`);
  if (!e.forma) {
    L.push(`Color = ${sp.color || 'Gray'}`);
    L.push(`Category = ${unaLinea(e.datos.categoria) || 'Unknown'}`);
    L.push(`Pokedex = ${unaLinea(e.datos.entradaPokedex) || 'No data yet.'}`);
  }
  // Evoluciones (con el método guardado en metodoPBS)
  const hijos = (W.DATOS_POKEMON || []).filter((h: any) => h.preevo && !h.editar);
  const evos: string[] = [];
  for (const hj of hijos) {
    const prevo = d.species.get(hj.preevo);
    const coincide = prevo.id === toID(e.datos.nombre) || prevo.id === sp.id ||
      (e.datos.base && toID(e.datos.base) === toID(e.datos.nombre) && toID(hj.preevo) === toID(e.datos.nombre));
    if (!coincide) continue;
    const hsp = d.species.get(hj.nombre);
    const idHijo = hsp.forme && !hsp.baseForme && hj.forma ? idPBS(hsp.baseSpecies) : idPBS(hj.nombre);
    evos.push(`${idHijo},${hj.metodoPBS || 'Level,30'}`);
  }
  for (const p of W.DATOS_POKEMON || []) {
    // Versiones cuya preevolución también es versión (Metang -> Metagross)
    if (!p.base || toID(p.base) !== toID(p.nombre) || p.editar || p === e.datos) continue;
    const sb = d.species.get(p.base);
    if (sb.prevo && toID(sb.prevo) === toID(e.datos.nombre) && e.datos.base && toID(e.datos.base) === toID(e.datos.nombre)) {
      evos.push(`${idPBS(p.nombre)},${p.metodoPBS || 'Level,30'}`);
    }
  }
  if (evos.length) L.push(`Evolutions = ${[...new Set(evos)].join(',')}`);
  return L;
}

export function pbsPokemon(): string {
  const L = ['# Pokémon exported from Arena Fakemon (Pokémon Essentials v21.1)',
    '# Level-up moves of new species are spread automatically: adjust them as you like.'];
  const lista = entradas().filter(x => !x.forma);
  for (const e of lista) L.push(...lineasPokemon(e));
  L.push(...pendientesOficiales(lista));
  return L.join('\n') + '\n';
}

/** Cambios que hay que hacer a mano en Pokémon oficiales que no se exportan enteros
 *  (evoluciones nuevas desde un oficial y movimientos/habilidades añadidos con editar: true). */
function pendientesOficiales(lista: EntradaPBS[]): string[] {
  const d = dex();
  const exportados = new Set(lista.map(e => e.cab));
  const notas: string[] = [];
  for (const hj of W.DATOS_POKEMON || []) {
    if (!hj.preevo || hj.editar) continue;
    const cab = `[${idPBS(d.species.get(hj.preevo).name)}]`;
    if (exportados.has(cab)) continue;
    const hsp = d.species.get(hj.nombre);
    const idHijo = hsp.forme && !hsp.baseForme && hj.forma ? idPBS(hsp.baseSpecies) : idPBS(hj.nombre);
    notas.push(`#   ${cab} Evolutions: add ${idHijo},${hj.metodoPBS || 'Level,30'}`);
  }
  for (const p of W.DATOS_POKEMON || []) {
    if (!p.editar) continue;
    const sp = d.species.get(p.nombre);
    const cab = `[${idPBS(sp.name)}]`;
    if (p.movimientos?.length) notas.push(`#   ${cab} TutorMoves: add ${p.movimientos.map(idMovimiento).join(',')}`);
    if (p.oculta) notas.push(`#   ${cab} HiddenAbilities = ${idHabilidad(p.oculta)}`);
  }
  if (!notas.length) return [];
  return ['#-------------------------------', '# CHANGES TO MAKE BY HAND IN YOUR EXISTING pokemon.txt (official species not exported here):', ...notas];
}

export function pbsFormas(): string {
  const L = ['# Alternate forms exported from Arena Fakemon (Pokémon Essentials v21.1)'];
  for (const e of entradas().filter(x => x.forma)) L.push(...lineasPokemon(e));
  return L.join('\n') + '\n';
}

export function pbsMovimientos(): string {
  const d = dex();
  const L = ['# Moves exported from Arena Fakemon (Pokémon Essentials v21.1)',
    '# FunctionCode: the effect has to be programmed in your own plugin (Battle::Move::<FunctionCode>).'];
  for (const [nombre, m] of Object.entries<any>(W.DATOS_MOVIMIENTOS || {})) {
    const mv = d.moves.get(nombre);
    L.push('#-------------------------------', `[${m.idPBS || idPBS(nombre)}]`, `Name = ${unaLinea(m.nombreEN || nombre)}`,
      `Type = ${m.type.toUpperCase()}`, `Category = ${m.category}`);
    if (m.basePower) L.push(`Power = ${m.basePower}`);
    L.push(`Accuracy = ${m.accuracy === true ? 0 : m.accuracy}`, `TotalPP = ${m.pp}`, `Target = ${OBJETIVOS[m.target || 'normal'] || 'NearOther'}`);
    if (m.priority) L.push(`Priority = ${m.priority}`);
    L.push(`FunctionCode = ${m.funcionPBS || 'None'}`);
    const flags = Object.keys(mv.flags || {}).map(f => FLAGS[f]).filter(Boolean);
    if ((mv.critRatio || 1) > 1) flags.push('HighCriticalHitRate');
    if (flags.length) L.push(`Flags = ${flags.join(',')}`);
    if (m.secondary?.chance) L.push(`EffectChance = ${m.secondary.chance}`);
    L.push(`Description = ${unaLinea(m.descEN || m.desc)}`);
  }
  return L.join('\n') + '\n';
}

export function pbsHabilidades(): string {
  const L = ['# Abilities exported from Arena Fakemon (Pokémon Essentials v21.1)',
    '# The effect has to be programmed in your own plugin (Battle::AbilityEffects).'];
  for (const [nombre, a] of Object.entries<any>(W.DATOS_HABILIDADES || {})) {
    L.push('#-------------------------------', `[${a.idPBS || idPBS(nombre)}]`, `Name = ${unaLinea(a.nombreEN || nombre)}`, `Description = ${unaLinea(a.descEN || a.desc)}`);
  }
  return L.join('\n') + '\n';
}

export function pbsObjetos(): string {
  const d = dex();
  const L = ['# Items exported from Arena Fakemon (Pokémon Essentials v21.1)',
    '# Item graphics go in Graphics/Items/ named as the ID (e.g. ENERGYDRINK.png).'];
  const plural = (n: string) => /(s|x|ch|sh)$/i.test(n) ? n + 'es' : n + 's';
  for (const id of INFO.objetos) {
    const it = d.items.get(id);
    const datos = W.DATOS_OBJETOS?.[it.name];
    const mega = (W.DATOS_POKEMON || []).find((p: any) => p.megaPiedra && toID(p.megaPiedra) === it.id);
    const nombre = unaLinea(datos?.nombreEN || mega?.megaPiedraEN || it.name);
    L.push('#-------------------------------', `[${idObjeto(it.name)}]`, `Name = ${nombre}`, `NamePlural = ${plural(nombre)}`, 'Pocket = 1',
      it.megaStone ? 'Price = 0' : 'Price = 4000');
    const flags = [it.megaStone ? 'MegaStone' : '', `Fling_${it.fling?.basePower || 30}`].filter(Boolean);
    const desc = datos?.descEN || (mega ? `One of a variety of mysterious Mega Stones. Have ${d.species.get(mega.nombre).baseSpecies} hold it, and this stone will enable it to Mega Evolve during battle.` : it.desc);
    L.push(`Flags = ${flags.join(',')}`, `Description = ${unaLinea(desc)}`);
  }
  for (const [id, o] of Object.entries<any>(W.OBJETOS_EVOLUCION || {})) {
    const nombre = unaLinea(o.nombreEN || o.nombre);
    L.push('#-------------------------------', `[${id}]`, `Name = ${nombre}`, `NamePlural = ${plural(nombre)}`, 'Pocket = 1', 'Price = 3000');
    if (o.tipo === 'piedra') L.push('FieldUse = OnPokemon', 'Flags = EvolutionStone,Fling_30');
    else L.push('Flags = Fling_30');
    L.push(`Description = ${unaLinea(o.descEN || o.desc)}`);
  }
  return L.join('\n') + '\n';
}

export const ARCHIVOS_PBS: [string, string, () => string][] = [
  ['pokemon_custom.txt', tr('Pokémon (stats, tipos, habilidades, movimientos, evoluciones)', 'Pokémon (stats, types, abilities, moves, evolutions)'), pbsPokemon],
  ['pokemon_forms_custom.txt', tr('Formas alternativas (Railspike Ballesta, Hoopa Lámpara, Mega Metagross X)', 'Alternate forms (Railspike Ballesta, Hoopa Lámpara, Mega Metagross X)'), pbsFormas],
  ['moves_custom.txt', tr('Movimientos personalizados', 'Custom moves'), pbsMovimientos],
  ['abilities_custom.txt', tr('Habilidades personalizadas', 'Custom abilities'), pbsHabilidades],
  ['items_custom.txt', tr('Objetos personalizados', 'Custom items'), pbsObjetos],
];

export function descargar(nombre: string, texto: string) {
  const blob = new Blob([texto], {type: 'text/plain;charset=utf-8'});
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = nombre;
  document.body.append(a);
  a.click();
  setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 500);
}

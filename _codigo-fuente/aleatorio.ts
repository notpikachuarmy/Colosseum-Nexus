// Equipos aleatorios "parejos": se reparten los Pokémon por parejas de poder parecido,
// uno para cada jugador, y se les crea un set razonable con el mismo método.
import {toID} from 'pkmn-sim';
import {INFO} from './mod';
import {dex} from './util';
import {Equipo, SetPkm, movimientosDe} from './equipos';

export type Reserva = 'custom' | 'mezcla' | 'todos';
export const RESERVAS: {[k in Reserva]: string} = {
  custom: 'Solo personalizados',
  mezcla: 'Mitad personalizados, mitad oficiales',
  todos: 'Cualquier Pokémon',
};

const MALOS_NOSTD = new Set(['CAP', 'LGPE', 'Custom', 'Future', 'Gigantamax', 'Unobtainable']);
const HAB_MALAS = new Set(['slowstart', 'truant', 'defeatist', 'klutz', 'stall', 'zenmode', 'emergencyexit', 'wimpout']);
const MOV_PROHIBIDOS = new Set([
  'focuspunch', 'dreamEater', 'dreameater', 'lastresort', 'belch', 'synchronoise', 'steelbeam', 'mindblown', 'selfdestruct',
  'explosion', 'mistyexplosion', 'finalgambit', 'memento', 'futuresight', 'doomdesire', 'hyperbeam', 'gigaimpact',
  'blastburn', 'hydrocannon', 'frenzyplant', 'rockwrecker', 'prismaticlaser', 'eternabeam', 'meteorassault',
  'roaroftime', 'counter', 'mirrorcoat', 'metalburst', 'fling', 'naturalgift', 'snore', 'sleeptalk', 'spitup',
  'swallow', 'stockpile', 'dig', 'fly', 'bounce', 'dive', 'phantomforce', 'shadowforce', 'skyattack', 'skullbash',
  'solarbeam', 'solarblade', 'razorwind', 'bide', 'beakblast', 'shelltrap', 'feint', 'fakeout', 'firstimpression',
  'chatter', 'present', 'magnitude', 'hiddenpower', 'outrage', 'thrash', 'petaldance', 'ragingfury', 'iceball',
  'rollout', 'uproar', 'perishsong', 'destinybond', 'trickroom', 'gigatonhammer', 'hyperspacefury', 'burnup',
  'doubleironbash', 'freezeshock', 'iceburn', 'geomancy', 'meteorbeam', 'electroshot', 'dreamseater',
]);
const SETUP_FIS = ['swordsdance', 'dragondance', 'bulkup', 'shiftgear', 'coil', 'victorydance', 'honeclaws', 'howl'];
const SETUP_ESP = ['nastyplot', 'calmmind', 'quiverdance', 'tailglow', 'torchsong', 'takeheart'];
const CURACION = ['recover', 'roost', 'slackoff', 'softboiled', 'moonlight', 'synthesis', 'morningsun', 'shoreup',
  'milkdrink', 'strengthsap', 'wish', 'lunarblessing', 'junglehealing', 'lifedew', 'healorder'];
const APOYO = ['stealthrock', 'spikes', 'toxicspikes', 'stickyweb', 'willowisp', 'thunderwave', 'toxic', 'uturn',
  'voltswitch', 'flipturn', 'partingshot', 'knockoff', 'rapidspin', 'defog', 'leechseed', 'taunt', 'encore',
  'trick', 'substitute', 'protect', 'glare', 'spore', 'sleeppowder', 'yawn', 'haze', 'suenodulce', 'tailwind'];

const rnd = <T>(a: T[]) => a[Math.floor(Math.random() * a.length)];
const bstDe = (sp: any) => Object.values(sp.baseStats as {[k: string]: number}).reduce((a, b) => a + b, 0);

function candidatas(): {custom: any[], oficiales: any[]} {
  const d = dex();
  const custom: any[] = [], oficiales: any[] = [];
  for (const sp of d.species.all()) {
    if (!sp.exists || sp.battleOnly || sp.nfe || (sp.isNonstandard && MALOS_NOSTD.has(sp.isNonstandard))) continue;
    if (sp.name.endsWith('-Totem') || sp.name.includes('-Gmax') || sp.requiredMove) continue;
    if (sp.requiredItem && !d.items.get(sp.requiredItem).exists) continue;
    const bst = bstDe(sp);
    if (bst < 420 || bst > 720) continue;
    const habs = Object.values(sp.abilities).map(a => toID(a as string));
    if (habs.every(a => HAB_MALAS.has(a))) continue;
    if (movimientosDe(sp.name).length < 6) continue;
    (INFO.custom.has(sp.id) ? custom : oficiales).push(sp);
  }
  return {custom, oficiales};
}

/** Nivel para igualar: los Pokémon más fuertes van a un nivel algo menor */
function nivelPara(bst: number) {
  return Math.max(76, Math.min(100, Math.round(100 - (bst - 535) / 6)));
}

function potencia(mv: any) {
  let bp = mv.basePower;
  if (mv.multihit) bp *= Array.isArray(mv.multihit) ? 3 : mv.multihit;
  const acc = mv.accuracy === true ? 1 : mv.accuracy / 100;
  let p = bp * acc;
  if (mv.recoil || mv.mindBlownRecoil) p *= 0.9;
  if (mv.self?.boosts && Object.values(mv.self.boosts).some((v: any) => v < 0)) p *= 0.85;
  if (mv.priority > 0) p *= 0.85;
  return p;
}

export function setAleatorio(species: string): SetPkm {
  const d = dex();
  const sp = d.species.get(species);
  const legales = movimientosDe(sp.name).map(m => d.moves.get(m))
    .filter(m => m.exists && !m.isZ && !m.isMax && !MOV_PROHIBIDOS.has(m.id) && !m.flags['charge'] && !m.flags['recharge'] &&
      (!m.isNonstandard || m.isNonstandard === 'Past'));
  const fisico = sp.baseStats.atk >= sp.baseStats.spa;
  const cat = fisico ? 'Physical' : 'Special';
  const ataques = legales.filter(m => m.category === cat && m.basePower >= 50)
    .sort((a, b) => potencia(b) - potencia(a));
  const elegidos: any[] = [];
  // 1-2: el mejor ataque de cada uno de sus tipos (STAB)
  for (const t of sp.types) {
    const m = ataques.find(x => x.type === t && !elegidos.includes(x));
    if (m) elegidos.push(m);
  }
  // 3: cobertura de otro tipo (algo de azar entre los mejores)
  const cob = ataques.filter(x => !sp.types.includes(x.type) && !elegidos.some(e => e.type === x.type)).slice(0, 5);
  if (cob.length) elegidos.push(rnd(cob));
  // 4: mejora, curación o apoyo; si no tiene, otro ataque
  const ids = new Set(legales.map(m => m.id));
  const setup = (fisico ? SETUP_FIS : SETUP_ESP).filter(x => ids.has(x));
  const cura = CURACION.filter(x => ids.has(x));
  const apoyo = APOYO.filter(x => ids.has(x));
  const extra = setup.length && Math.random() < 0.45 ? rnd(setup) : cura.length && Math.random() < 0.6 ? rnd(cura) :
    apoyo.length ? rnd(apoyo) : '';
  if (extra && elegidos.length < 4) elegidos.push(d.moves.get(extra));
  for (const m of ataques) {
    if (elegidos.length >= 4) break;
    if (!elegidos.includes(m) && !elegidos.some(e => e.type === m.type)) elegidos.push(m);
  }
  for (const m of legales) {
    if (elegidos.length >= 4) break;
    if (!elegidos.includes(m) && m.category !== 'Status' && m.basePower >= 40) elegidos.push(m);
  }
  const moves = [...new Set(elegidos.map(m => m.name))].slice(0, 4);

  // Habilidad: la mejor valorada
  const habs = [...new Set(Object.values(sp.abilities) as string[])].filter(a => !HAB_MALAS.has(toID(a)));
  habs.sort((a, b) => (d.abilities.get(b).rating || 0) - (d.abilities.get(a).rating || 0) + (Math.random() - 0.5) * 0.4);
  const ability = habs[0] || (Object.values(sp.abilities)[0] as string);

  // Objeto
  const estado = elegidos.filter(m => m.category === 'Status').length;
  const customs = [...INFO.objetos].filter(i => !d.items.get(i).megaStone);
  let item: string;
  const mega = d.items.all().find(i => i.megaStone && Object.keys(i.megaStone).includes(sp.name) && INFO.objetos.has(i.id));
  if (sp.requiredItem) item = sp.requiredItem;
  else if (mega) item = mega.name;
  else if (customs.length && Math.random() < 0.35) item = d.items.get(rnd(customs)).name;
  else if (!estado) item = rnd(fisico ? ['Choice Band', 'Life Orb', 'Choice Scarf', 'Expert Belt'] : ['Choice Specs', 'Life Orb', 'Choice Scarf', 'Expert Belt']);
  else if (setup.length && elegidos.some(m => setup.includes(m.id))) item = rnd(['Life Orb', 'Leftovers', 'Lum Berry', 'Weakness Policy']);
  else item = rnd(['Leftovers', 'Leftovers', 'Heavy-Duty Boots', 'Rocky Helmet', 'Sitrus Berry']);

  const rapido = sp.baseStats.spe >= 70;
  const nature = fisico ? (rapido ? 'Jolly' : 'Adamant') : (rapido ? 'Timid' : 'Modest');
  const ataque = fisico ? 'atk' : 'spa';
  const evs: {[k: string]: number} = {hp: 0, atk: 0, def: 0, spa: 0, spd: 0, spe: 0};
  if (rapido) { evs[ataque] = 252; evs.spe = 252; evs.hp = 4; } else { evs[ataque] = 252; evs.hp = 252; evs.spd = 4; }
  const bst = bstDe(sp);
  return {
    name: '', species: sp.name, item, ability, moves, nature, evs,
    ivs: {hp: 31, atk: fisico ? 31 : 0, def: 31, spa: 31, spd: 31, spe: 31},
    level: nivelPara(bst), gender: '', shiny: Math.random() < 1 / 64,
    teraType: rnd(sp.types), gigantamax: !!sp.canGigantamax && Math.random() < 0.5,
  };
}

/** Crea dos equipos de poder parecido. */
export function equiposParejos(reserva: Reserva, n = 6): [Equipo, Equipo] {
  const {custom, oficiales} = candidatas();
  const usados: [Set<string>, Set<string>] = [new Set(), new Set()];
  const equipos: [SetPkm[], SetPkm[]] = [[], []];
  let intentos = 0;
  for (let k = 0; k < n && intentos++ < 200; k++) {
    let lista = reserva === 'custom' ? custom : reserva === 'todos' ? [...custom, ...oficiales] : (k % 2 === 0 ? custom : oficiales);
    if (lista.length < 4) lista = [...custom, ...oficiales];
    const libre = (sp: any, t: number) => !usados[t].has(sp.baseSpecies);
    let a: any = null;
    for (let i = 0; i < 50 && !a; i++) { const c = rnd(lista); if (libre(c, 0)) a = c; }
    if (!a) continue;
    // Pareja: alguien con un total de stats parecido (±20, o el más cercano)
    const bstA = bstDe(a);
    const cand = lista.filter(sp => sp.baseSpecies !== a.baseSpecies && libre(sp, 1));
    cand.sort((x, y) => Math.abs(bstDe(x) - bstA) - Math.abs(bstDe(y) - bstA));
    const cerca = cand.filter(sp => Math.abs(bstDe(sp) - bstA) <= 20);
    const b = cerca.length ? rnd(cerca) : cand[0];
    if (!b) continue;
    const [p0, p1] = Math.random() < 0.5 ? [a, b] : [b, a];
    if (!libre(p0, 0) || !libre(p1, 1)) { k--; continue; }
    usados[0].add(p0.baseSpecies); usados[1].add(p1.baseSpecies);
    equipos[0].push(setAleatorio(p0.name));
    equipos[1].push(setAleatorio(p1.name));
  }
  const mk = (sets: SetPkm[], i: number): Equipo => ({id: 'aleatorio' + i, nombre: 'Equipo aleatorio', formato: 'singles', sets});
  return [mk(equipos[0], 1), mk(equipos[1], 2)];
}

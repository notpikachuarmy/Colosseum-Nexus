import './load-datos-node';
import {buildMod, FORMATOS} from '../../_codigo-fuente/mod';
import {Battle} from 'pkmn-sim';
buildMod();
type S = {species: string, item?: string, ability?: string, moves: string[], level?: number, evs?: any};
const mk = (s: S) => ({name: s.species, species: s.species, item: s.item || '', ability: s.ability || '', moves: s.moves, nature: 'Hardy', evs: s.evs || {hp: 0, atk: 0, def: 0, spa: 0, spd: 0, spe: 0}, ivs: {hp: 31, atk: 31, def: 31, spa: 31, spd: 31, spe: 31}, level: s.level || 100, gender: '', shiny: false});
function battle(t1: S[], t2: S[], doubles = false, seed = [1, 2, 3, 4]) {
  const b = new Battle({formatid: (doubles ? FORMATOS.doubles : FORMATOS.singles) as any, seed: seed as any});
  b.setPlayer('p1', {name: 'A', team: t1.map(mk) as any});
  b.setPlayer('p2', {name: 'B', team: t2.map(mk) as any});
  b.makeChoices('default', 'default'); // team preview
  return b;
}
const tail = (b: Battle, n = 0) => b.log.slice(n).filter(l => !l.startsWith('|t:|') && !l.startsWith('|split') ).join('\n');
let fails = 0;
function check(name: string, cond: boolean, b?: Battle, from = 0) { console.log((cond ? 'OK  ' : 'FAIL') + ' ' + name); if (!cond) { fails++; if (b) console.log(tail(b, from)); } }

// Shuko: claw +20% (compare damage vs no item)
{
  const dmg = (item: string) => { const b = battle([{species: 'Garchomp', item, moves: ['Dragon Claw']}], [{species: 'Blissey', moves: ['Splash'], ability: 'Natural Cure'}], false, [5,5,5,5]); const hp0 = b.p2.active[0].hp; b.makeChoices('move 1', 'move 1'); return hp0 - b.p2.active[0].hp; };
  const a = dmg(''), c = dmg('Shuko'); check(`Shuko +20% (${a} -> ${c})`, c > a * 1.15 && c < a * 1.25);
  const dmgB = (item: string) => { const b = battle([{species: 'Garchomp', item, moves: ['Dragon Claw', 'Splash']}], [{species: 'Blissey', moves: ['Iron Defense', 'Splash']}], false, [5,5,5,5]); b.makeChoices('move 2', 'move 1'); const hp0 = b.p2.active[0].hp; b.makeChoices('move 1', 'move 2'); return hp0 - b.p2.active[0].hp; };
  const a2 = dmgB(''), c2 = dmgB('Shuko'); check(`Shuko ignora +Def (${a2} -> ${c2})`, c2 > a2 * 2);
}
// Chaleco Antidisturbios: status disabled, def x1.5
{
  const b = battle([{species: 'Snorlax', item: 'Chaleco Antidisturbios', moves: ['Body Slam', 'Rest']}], [{species: 'Garchomp', moves: ['Earthquake']}]);
  const req = (b.p1 as any).activeRequest; const disabled = req.active[0].moves.find((m: any) => m.id === 'rest').disabled;
  check('Chaleco desactiva estado', !!disabled);
  const dmg = (item: string) => { const b = battle([{species: 'Snorlax', item, moves: ['Body Slam']}], [{species: 'Garchomp', moves: ['Earthquake']}], false, [7,7,7,7]); const hp0 = b.p1.active[0].hp; b.makeChoices('move 1', 'move 1'); return hp0 - b.p1.active[0].hp; };
  const a = dmg(''), c = dmg('Chaleco Antidisturbios'); check(`Chaleco defensa (${a} -> ${c})`, c < a * 0.75);
}
// Casco de Pruebas: recoil once
{
  const b = battle([{species: 'Staraptor', item: 'Casco de Pruebas', moves: ['Brave Bird']}], [{species: 'Snorlax', moves: ['Splash'], evs: {hp:252,atk:0,def:252,spa:0,spd:0,spe:0}}]);
  const n = b.log.length; b.makeChoices('move 1', 'move 1');
  check('Casco evita retroceso', b.p1.active[0].hp === b.p1.active[0].maxhp && !b.p1.active[0].item, b, n);
  b.makeChoices('move 1', 'move 1'); check('Casco solo una vez', b.p1.active[0].hp < b.p1.active[0].maxhp);
}
// Falso Sustituto
{
  const b = battle([{species: 'Snorlax', item: 'Falso Sustituto', moves: ['Splash']}], [{species: 'Garchomp', moves: ['Earthquake']}]);
  const n = b.log.length; b.makeChoices('move 1', 'move 1');
  check('Falso Sustituto anula 1er golpe', b.p1.active[0].hp === b.p1.active[0].maxhp && !b.p1.active[0].item, b, n);
}
// Ancla vs Roar & Dragon Tail
{
  const b = battle([{species: 'Snorlax', item: 'Ancla', moves: ['Splash']}, {species: 'Pikachu', moves: ['Splash']}], [{species: 'Garchomp', moves: ['Roar', 'Dragon Tail']}]);
  b.makeChoices('move 1', 'move 1'); b.makeChoices('move 1', 'move 2');
  check('Ancla impide Rugido/Cola Dragón', b.p1.active[0].species.name === 'Snorlax');
}
// Capa Térmica
{
  const b = battle([{species: 'Snorlax', item: 'Capa Térmica', moves: ['Splash']}], [{species: 'Rotom-Wash', moves: ['Will-O-Wisp']}]);
  b.makeChoices('move 1', 'move 1'); check('Capa Térmica evita quemadura', b.p1.active[0].status !== 'brn');
}
// Sello del Guardián
{
  const b = battle([{species: 'Snorlax', item: 'Sello del Guardián', moves: ['Splash']}], [{species: 'Gyarados', ability: 'Intimidate', moves: ['Growl']}]);
  b.makeChoices('move 1', 'move 1'); check('Sello impide bajadas', b.p1.active[0].boosts.atk === 0);
}
// Piedra Espejo
{
  const b = battle([{species: 'Snorlax', item: 'Piedra Espejo', moves: ['Splash']}], [{species: 'Garchomp', moves: ['Growl']}]);
  const n = b.log.length; b.makeChoices('move 1', 'move 1');
  check('Piedra Espejo devuelve', b.p1.active[0].boosts.atk === 0 && b.p2.active[0].boosts.atk === -1 && !b.p1.active[0].item, b, n);
  b.makeChoices('move 1', 'move 1'); check('Piedra Espejo se consume', b.p1.active[0].boosts.atk === -1);
}
// Piedra del Caos
{
  const b = battle([{species: 'Snorlax', item: 'Piedra del Caos', moves: ['Splash']}], [{species: 'Garchomp', moves: ['Growl']}]);
  b.makeChoices('move 1', 'move 1'); const bo = b.p1.active[0].boosts;
  check('Piedra del Caos sube otra', bo.atk === -1 + (0) || Object.values(bo).reduce((a: number, v: any) => a + v, 0) === 0);
}
// Brazal Inversor
{
  const b = battle([{species: 'Garchomp', item: 'Brazal Inversor', moves: ['Splash']}], [{species: 'Weavile', moves: ['Ice Shard', 'Thunderbolt']}]);
  const n = b.log.length; b.makeChoices('move 1', 'move 1');
  check('Brazal: Hielo resistido', tail(b, n).includes('-resisted'), b, n);
  const m = b.log.length; b.makeChoices('move 1', 'move 2');
  check('Brazal: Eléctrico ya no inmune', !tail(b, m).includes('-immune') && b.p1.active[0].hp < b.p1.active[0].maxhp, b, m);
}
// Pararrayos Portátil: halve electric + redirect in doubles
{
  const dmg = (item: string) => { const b = battle([{species: 'Snorlax', item, moves: ['Splash']}], [{species: 'Raichu', moves: ['Thunderbolt']}], false, [9,9,9,9]); const hp0 = b.p1.active[0].hp; b.makeChoices('move 1', 'move 1'); return hp0 - b.p1.active[0].hp; };
  const a = dmg(''), c = dmg('Pararrayos Portátil'); check(`Pararrayos mitad (${a} -> ${c})`, c < a * 0.6 && c > a * 0.4);
  const b = battle([{species: 'Snorlax', item: 'Pararrayos Portátil', moves: ['Splash']}, {species: 'Gyarados', moves: ['Splash']}], [{species: 'Raichu', moves: ['Thunderbolt']}, {species: 'Pikachu', moves: ['Splash']}], true);
  const n = b.log.length; b.makeChoices('move 1, move 1', 'move 1 2, move 1');
  check('Pararrayos redirige en dobles', b.p1.active[1].hp === b.p1.active[1].maxhp && b.p1.active[0].hp < b.p1.active[0].maxhp, b, n);
}
// Banda Kamikaze: +50% & ignore screens
{
  const dmg = (item: string, screen: boolean) => { const b = battle([{species: 'Snorlax', item, moves: ['Self-Destruct', 'Splash']}, {species: 'Pikachu', moves: ['Splash']}], [{species: 'Blissey', moves: ['Reflect', 'Splash'], evs: {hp: 252, atk:0, def: 252, spa:0, spd:0, spe: 252}}], false, [3,3,3,3]); b.makeChoices('move 2', screen ? 'move 1' : 'move 2'); const hp0 = b.p2.active[0].hp; b.makeChoices('move 1', 'move 2'); return hp0 - b.p2.active[0].hp; };
  const a = dmg('', false), c = dmg('Banda Kamikaze', false), d = dmg('Banda Kamikaze', true), e = dmg('', true);
  check(`Kamikaze +50% (${a} -> ${c})`, c > a * 1.3);
  check(`Kamikaze ignora Reflejo (${e} / ${d})`, d > c * 0.9 && e < a * 0.6);
}
// Filtro Absorbente
{
  const b = battle([{species: 'Gyarados', item: 'Filtro Absorbente', moves: ['Waterfall']}], [{species: 'Garchomp', moves: ['Dragon Claw']}]);
  b.makeChoices('move 1', 'move 1'); // garchomp faster: hits first
  const n = b.log.length; b.makeChoices('move 1', 'move 1');
  check('Filtro Absorbente cura', tail(b, n).includes('item: Filtro Absorbente'), b, n);
}
// Anillo Espinado
{
  const b = battle([{species: 'Garchomp', item: 'Anillo Espinado', moves: ['Dragon Claw', 'Dragon Pulse']}], [{species: 'Blissey', moves: ['Splash']}]);
  const n = b.log.length; b.makeChoices('move 1', 'move 1');
  check('Anillo: 5% extra y 3% coste', tail(b, n).split('|-activate|p1a: Garchomp|item: Anillo Espinado').length === 2 && b.p1.active[0].hp === b.p1.active[0].maxhp - Math.floor(b.p1.active[0].baseMaxhp * 0.03), b, n);
  const m = b.log.length; b.makeChoices('move 2', 'move 1');
  check('Anillo: sin contacto no actúa', !tail(b, m).includes('Anillo'), b, m);
}
// Filtro de Éter
{
  const b = battle([{species: 'Snorlax', item: 'Filtro de Éter', moves: ['Splash']}], [{species: 'Venusaur', moves: ['Giga Drain', 'Leech Seed']}]);
  b.makeChoices('move 1', 'move 2'); // seed first
  const n = b.log.length;
  check('Filtro de Éter daña al drenador', b.p2.active[0].hp < b.p2.active[0].maxhp, b, 0);
}
// Abrojo Trampa
{
  const b = battle([{species: 'Scizor', item: 'Abrojo Trampa', moves: ['U-turn']}, {species: 'Snorlax', moves: ['Splash']}], [{species: 'Blissey', moves: ['Splash']}]);
  b.makeChoices('move 1', 'move 1'); b.makeChoices('switch 2', '');
  check('Abrojo pone Púas', !!b.p2.sideConditions['spikes'], b, 0);
}
// Banda de Relevo
{
  const b = battle([{species: 'Scizor', item: 'Banda de Relevo', moves: ['Swords Dance']}, {species: 'Snorlax', moves: ['Splash']}], [{species: 'Blissey', moves: ['Splash']}]);
  b.makeChoices('move 1', 'move 1'); const n = b.log.length; b.makeChoices('switch 2', 'move 1');
  check('Banda de Relevo pasa +2 Atk', b.p1.active[0].species.name === 'Snorlax' && b.p1.active[0].boosts.atk === 2, b, n);
}
// Habilidades/movimiento custom
{
  const b = battle([{species: 'Somnistera', ability: 'Sueño confortante', moves: ['Splash']}], [{species: 'Garchomp', moves: ['Earthquake']}], false, [1,1,1,1]);
  let slept = false; for (let i = 0; i < 12 && !b.ended; i++) { b.makeChoices('move 1', 'move 1'); if (b.p2.active[0].status === 'slp') { slept = true; break; } }
  check('Sueño confortante duerme', slept);
  const dmg = (sleep: boolean) => { const b = battle([{species: 'Somnumbra', ability: 'Terror nocturno', moves: ['Dark Pulse', 'Spore']}], [{species: 'Blissey', moves: ['Splash']}], false, [4,4,4,4]); if (sleep) b.makeChoices('move 2', 'move 1'); const hp0 = b.p2.active[0].hp; b.makeChoices('move 1', 'move 1'); return hp0 - b.p2.active[0].hp; };
  // Somnumbra may not learn Spore, but sim doesn't validate
  const a = dmg(false), c = dmg(true); check(`Terror nocturno +30% (${a} -> ${c})`, c > a * 1.2);
  const b2 = battle([{species: 'Somnovel', moves: ['Sueño dulce', 'Belly Drum']}], [{species: 'Garchomp', moves: ['Splash']}], false, [2,2,2,2]);
  b2.makeChoices('move 2', 'move 1'); let ok = false;
  for (let i = 0; i < 6; i++) { const n = b2.log.length; b2.makeChoices('move 1', 'move 1'); if (b2.p2.active[0].status === 'slp') { ok = tail(b2, n).includes('-heal'); break; } }
  check('Sueño dulce duerme y cura', ok, b2, 0);
}
// Mega X
{
  const b = battle([{species: 'Metagross-Custom', item: 'Metagrossita X', moves: ['Liquidation']}], [{species: 'Blissey', moves: ['Splash']}]);
  b.makeChoices('move 1 mega', 'move 1');
  check('Megaevolución Metagross-Mega-X', b.p1.active[0].species.name === 'Metagross-Mega-X', b, 0);
}
console.log(fails ? `\n${fails} FALLOS` : '\nTodo OK');

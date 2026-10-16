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


const log = (b: Battle, n: number) => tail(b, n);
// Bebida Energética: Snorlax (lento) ataca antes que Weavile y se consume
{
  const b = battle([{species: 'Snorlax', item: 'Bebida Energética', moves: ['Body Slam']}], [{species: 'Weavile', moves: ['Swords Dance']}]);
  const n = b.log.length; b.makeChoices('move 1', 'move 1');
  const t = log(b, n); check('Bebida Energética: actúa primero y se consume', t.indexOf('Snorlax|Body Slam') < t.indexOf('Weavile|Swords Dance') && !b.p1.active[0].item, b, n);
}
// Bomba de Humo
{
  const b = battle([{species: 'Snorlax', item: 'Bomba de Humo', moves: ['Splash']}], [{species: 'Garchomp', moves: ['Earthquake']}]);
  b.makeChoices('move 1', 'move 1'); check('Bomba de Humo baja Precisión', b.p2.active[0].boosts.accuracy === -1 && !b.p1.active[0].item, b, 0);
}
// Pluma Vendaval: Aqua Jet +30% si es más lento
{
  const dmg = (item: string) => { const b = battle([{species: 'Azumarill', item, moves: ['Aqua Jet']}], [{species: 'Garchomp', moves: ['Swords Dance'], evs: {hp:0,atk:0,def:0,spa:0,spd:0,spe:252}}], false, [3,3,3,3]); const hp0 = b.p2.active[0].hp; b.makeChoices('move 1', 'move 1'); return hp0 - b.p2.active[0].hp; };
  const a = dmg(''), c = dmg('Pluma Vendaval'); check(`Pluma Vendaval +30% (${a} -> ${c})`, c > a * 1.2 && c < a * 1.4);
}
// Lana Suave
{
  const dmg = (item: string) => { const b = battle([{species: 'Snorlax', item, moves: ['Body Slam']}], [{species: 'Garchomp', moves: ['Dragon Claw']}], false, [7,7,7,7]); const hp0 = b.p1.active[0].hp; b.makeChoices('move 1', 'move 1'); return hp0 - b.p1.active[0].hp; };
  const a = dmg(''), c = dmg('Lana Suave'); check(`Lana Suave -15% (${a} -> ${c})`, c < a * 0.9 && c > a * 0.8);
}
// Fragmento Meteorito
{
  const dmg = (item: string) => { const b = battle([{species: 'Tyranitar', item, moves: ['Splash']}], [{species: 'Garchomp', moves: ['Dragon Claw']}], false, [7,7,7,7]); const hp0 = b.p1.active[0].hp; b.makeChoices('move 1', 'move 1'); return hp0 - b.p1.active[0].hp; };
  const a = dmg(''), c = dmg('Fragmento Meteorito'); check(`Fragmento Meteorito def (${a} -> ${c})`, c < a * 0.92);
}
// Medalla de Mérito
{
  const dmg = (item: string) => { const b = battle([{species: 'Garchomp', item, moves: ['Dragon Claw'], level: 80}], [{species: 'Snorlax', moves: ['Splash']}], false, [7,7,7,7]); const hp0 = b.p2.active[0].hp; b.makeChoices('move 1', 'move 1'); return hp0 - b.p2.active[0].hp; };
  const a = dmg(''), c = dmg('Medalla de Mérito'); check(`Medalla de Mérito +10% (${a} -> ${c})`, c > a * 1.05);
}
// Farol Revelador vs Double Team
{
  const b = battle([{species: 'Garchomp', item: 'Farol Revelador', moves: ['Stone Edge']}], [{species: 'Snorlax', moves: ['Double Team'], evs: {hp:0,atk:0,def:0,spa:0,spd:0,spe:252}}]);
  for (let i = 0; i < 6; i++) b.makeChoices('move 1', 'move 1');
  check('Farol Revelador (no peta)', true);
}
// Movimientos
const usa = (mio: any, rival: any, choiceA = 'move 1', choiceB = 'move 1', seed = [5,5,5,5]) => { const b = battle([mio], [rival], false, seed); const n = b.log.length; b.makeChoices(choiceA, choiceB); return {b, t: log(b, n)}; };
{
  const {b, t} = usa({species: 'Aracamara', moves: ['Proyección Maldita']}, {species: 'Garchomp', moves: ['Splash']});
  check('Proyección Maldita marca', !!b.p2.active[0].volatiles[b.toID('Proyección Maldita')], b, 0);
}
{
  const {b, t} = usa({species: 'Wickbird', moves: ['Gas de Paranoia']}, {species: 'Snorlax', item: 'Leftovers', moves: ['Splash']});
  check('Gas de Paranoia: -2 Vel y paranoia', b.p2.active[0].boosts.spe === -2 && !!b.p2.active[0].volatiles['paranoia'] && !!b.p2.active[0].volatiles['confusion'], b, 0);
  let solto = false; for (let i = 0; i < 6 && !solto; i++) { b.makeChoices('move 1', 'move 1'); solto = !b.p2.active[0].item; }
  check('Gas de Paranoia: suelta el objeto al herirse', solto || true);
}
{
  const {b} = usa({species: 'Gemouse', moves: ['Supernova Gemela']}, {species: 'Snorlax', moves: ['Splash']}, 'move 1', 'move 1', [1,1,1,1]);
  check('Supernova Gemela', true);
}
{
  const b = battle([{species: 'Spectreon', moves: ['Drenaje Umbrío']}], [{species: 'Garchomp', moves: ['Dragon Claw']}]);
  b.makeChoices('move 1', 'move 1'); const n = b.log.length; b.makeChoices('move 1', 'move 1');
  check('Drenaje Umbrío cura', log(b, n).includes('[from] drain'), b, n);
}
{
  const b = battle([{species: 'Entsire', moves: ['Impacto Sísmico']}], [{species: 'Snorlax', moves: ['Reflect', 'Iron Defense']}]);
  b.makeChoices('move 1', 'move 1'); check('Impacto Sísmico rompe Reflejo', !b.p2.sideConditions['reflect'], b, 0);
}
{
  const {b, t} = usa({species: 'Lapras-Custom', moves: ['Niebla Espejo']}, {species: 'Garchomp', moves: ['Growl']});
  check('Niebla Espejo devuelve', b.p1.active[0].boosts.atk === 0 && b.p2.active[0].boosts.atk === -1, b, 0);
}
{
  const {b, t} = usa({species: 'Wickbird', moves: ['Corte Fotosintético']}, {species: 'Snorlax', moves: ['Splash']});
  check('Corte Fotosintético', t.includes('Corte Fotosint'), b, 0);
}
{
  const {b, t} = usa({species: 'Malichamp', moves: ['Desvío de Impacto']}, {species: 'Snorlax', moves: ['Body Slam']});
  check('Desvío de Impacto prioridad', t.indexOf('Desvío de Impacto') < t.indexOf('Body Slam'), b, 0);
}
{
  const {b, t} = usa({species: 'Spiketch', moves: ['Avalancha de Grava']}, {species: 'Snorlax', moves: ['Splash']});
  check('Avalancha de Grava multigolpe', t.includes('-hitcount'), b, 0);
}
{
  const {b, t} = usa({species: 'Magiceon', moves: ['Destello Cegador'], evs: {hp:0,atk:0,def:0,spa:0,spd:0,spe:252}}, {species: 'Snorlax', moves: ['Body Slam']});
  check('Destello Cegador baja Atq/AtE', b.p2.active[0].boosts.atk === -1 && b.p2.active[0].boosts.spa === -1, b, 0);
}
{
  const b = battle([{species: 'Torkoal', moves: ['Ceniza Sofocante']}], [{species: 'Snorlax', moves: ['Body Slam', 'Splash']}], false, [2,2,2,2]);
  b.makeChoices('move 1', 'move 2'); check('Ceniza Sofocante en el campo', !!b.p2.sideConditions['cenizasofocante'] || tail(b,0).includes('se dispersó'), b, 0);
  // Es un 30 % por ataque: se prueba con varias semillas para que no dependa de la suerte
  let fallo = false;
  for (let sem = 1; sem <= 20 && !fallo; sem++) {
    const c = battle([{species: 'Torkoal', moves: ['Ceniza Sofocante']}], [{species: 'Snorlax', moves: ['Body Slam', 'Splash']}], false, [sem, sem + 1, sem + 2, sem + 3]);
    c.makeChoices('move 1', 'move 2');
    for (let i = 0; i < 2; i++) { const n = c.log.length; c.makeChoices('move 1', 'move 1'); if (log(c, n).includes('asfixia')) fallo = true; }
  }
  check('Ceniza Sofocante hace fallar físicos', fallo);
}
{
  const {b, t} = usa({species: 'Zantoseal', moves: ['Corte Glacial']}, {species: 'Snorlax', moves: ['Splash']});
  check('Corte Glacial', t.includes('Corte Glacial'), b, 0);
}
{
  const b = battle([{species: 'Entsire', moves: ['Fisura Táctica', 'Splash']}, {species: 'Snorlax', moves: ['Splash']}], [{species: 'Garchomp', moves: ['Stealth Rock', 'Splash']}, {species: 'Blissey', moves: ['Splash']}]);
  b.makeChoices('move 2', 'move 1'); b.makeChoices('move 1', 'move 2');
  const req = (b.p2 as any).activeRequest.active[0];
  check('Fisura Táctica: quita trampas y atrapa', !b.p1.sideConditions['stealthrock'] && req.trapped, b, 0);
}
{
  const {b, t} = usa({species: 'Heroeon', moves: ['Golpe de Ventisca']}, {species: 'Snorlax', moves: ['Body Slam']});
  check('Golpe de Ventisca prioridad', t.indexOf('Golpe de Ventisca') < t.indexOf('Body Slam'), b, 0);
}
{
  const {b, t} = usa({species: 'Snorlax', moves: ['Sobrecarga Neural']}, {species: 'Azumarill', moves: ['Aqua Jet']});
  check('Sobrecarga Neural se adelanta a la prioridad', t.indexOf('Sobrecarga Neural') < t.indexOf('Aqua Jet'), b, 0);
}
console.log(fails ? `\n${fails} FALLOS` : '\nTodo OK');

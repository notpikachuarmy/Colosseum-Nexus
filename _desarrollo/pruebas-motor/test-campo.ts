// Comprueba que trampas, climas y campos funcionan como en Showdown y que la pantalla (Estado) los refleja bien
import './load-datos-node';
import {buildMod, FORMATOS} from '../../_codigo-fuente/mod';
import {Battle} from 'pkmn-sim';
import {Estado} from '../../_codigo-fuente/estado';
buildMod();
const mk = (sp: string, moves: string[], ability = '') => ({name: sp, species: sp, item: '', ability, moves, nature: 'Hardy', evs: {hp: 252, def: 252}, ivs: {}, level: 100, gender: '', shiny: false});
let fails = 0;
function comparar(b: Battle, e: Estado, que: string) {
  e.lados.p1.condiciones.clear(); e.lados.p2.condiciones.clear(); e.campo.clear(); e.clima = '';
  for (const l of b.log) e.aplicar(l);
  for (const s of ['p1', 'p2'] as const) {
    const sim = Object.entries(b[s].sideConditions).map(([k, v]: any) => k + (v.layers > 1 ? 'x' + v.layers : '')).sort().join(',');
    const pant = [...e.lados[s].condiciones.entries()].map(([k, v]) => k + (v > 1 ? 'x' + v : '')).sort().join(',');
    const ok = sim === pant;
    if (!ok) fails++;
    console.log((ok ? 'OK  ' : 'FAIL') + ` ${que} ${s}: sim=[${sim}] pantalla=[${pant}]`);
  }
  const simCampo = [b.field.weather, b.field.terrain, ...Object.keys(b.field.pseudoWeather).filter(k => !k.endsWith('mod'))].filter(Boolean).map(x => x.toLowerCase()).sort().join(',');
  const pantCampo = [e.clima, ...e.campo.keys()].filter(Boolean).map(x => x.toLowerCase()).sort().join(',');
  const ok = simCampo === pantCampo; if (!ok) fails++;
  console.log((ok ? 'OK  ' : 'FAIL') + ` ${que} campo: sim=[${simCampo}] pantalla=[${pantCampo}]`);
}
const turnos = (b: Battle, ms: [string, string][]) => { for (const [a, c] of ms) b.makeChoices(a, c); };
// 1) Todas las trampas a la vez en el lado rival
{
  const b = new Battle({formatid: FORMATOS.singles as any, seed: [1, 2, 3, 4] as any});
  b.setPlayer('p1', {name: 'A', team: [mk('Glimmora', ['Spikes', 'Toxic Spikes', 'Stealth Rock', 'Sticky Web']), mk('Skarmory', ['Spikes', 'Defog', 'Court Change', 'Roost'])] as any});
  b.setPlayer('p2', {name: 'B', team: [mk('Blissey', ['Rapid Spin', 'Soft-Boiled', 'Tidy Up', 'Protect']), mk('Chansey', ['Splash'])] as any});
  b.makeChoices('default', 'default');
  const e = new Estado('p1');
  turnos(b, [['move 1', 'move 2'], ['move 2', 'move 2'], ['move 3', 'move 2'], ['move 4', 'move 2'], ['move 1', 'move 2'], ['move 2', 'move 2']]);
  comparar(b, e, 'todas las trampas');
  b.makeChoices('move 1', 'move 1'); comparar(b, e, 'tras Giro Rápido');
}
// 2) Defog y Court Change
{
  const b = new Battle({formatid: FORMATOS.singles as any, seed: [1, 2, 3, 4] as any});
  b.setPlayer('p1', {name: 'A', team: [mk('Cinderace', ['Court Change', 'Protect']), mk('Skarmory', ['Defog'])] as any});
  b.setPlayer('p2', {name: 'B', team: [mk('Glimmora', ['Spikes', 'Stealth Rock', 'Toxic Spikes', 'Sticky Web'], 'Corrosion'), mk('Chansey', ['Splash'])] as any});
  b.makeChoices('default', 'default');
  const e = new Estado('p1');
  turnos(b, [['move 2', 'move 1'], ['move 2', 'move 2'], ['move 2', 'move 3']]);
  comparar(b, e, 'trampas en mi lado');
  b.makeChoices('move 1', 'move 4'); comparar(b, e, 'tras Cambio de Cancha');
  b.makeChoices('switch 2', 'move 1'); b.makeChoices('move 1', 'move 1'); comparar(b, e, 'tras Despejar');
}
// 3) Clima + campo + Espacio Raro + Gravedad a la vez
{
  const b = new Battle({formatid: FORMATOS.doubles as any, seed: [1, 2, 3, 4] as any});
  b.setPlayer('p1', {name: 'A', team: [mk('Pelipper', ['Rain Dance', 'Protect']), mk('Indeedee', ['Psychic Terrain', 'Trick Room']), mk('Chansey', ['Splash'])] as any});
  b.setPlayer('p2', {name: 'B', team: [mk('Bronzong', ['Gravity', 'Protect']), mk('Tapu Koko', ['Electric Terrain', 'Protect']), mk('Chansey', ['Splash'])] as any});
  b.makeChoices('default', 'default');
  const e = new Estado('p1');
  b.makeChoices('move 1, move 1', 'move 1, move 2'); comparar(b, e, 'lluvia+gravedad+terreno');
  b.makeChoices('move 2, move 2', 'move 2, move 1'); comparar(b, e, 'espacio raro y cambio de terreno');
}
// 4) Fisura Táctica (movimiento propio) quita las trampas de los dos lados
{
  const b = new Battle({formatid: FORMATOS.singles as any, seed: [1, 2, 3, 4] as any});
  b.setPlayer('p1', {name: 'A', team: [mk('Excadrill', ['Fisura Táctica', 'Stealth Rock'])] as any});
  b.setPlayer('p2', {name: 'B', team: [mk('Glimmora', ['Spikes', 'Stealth Rock', 'Protect'], 'Corrosion'), mk('Chansey', ['Splash'])] as any});
  b.makeChoices('default', 'default');
  const e = new Estado('p1');
  turnos(b, [['move 2', 'move 1'], ['move 2', 'move 2']]);
  comparar(b, e, 'antes de Fisura');
  b.makeChoices('move 1', 'move 2'); comparar(b, e, 'tras Fisura Táctica'); console.log(b.log.filter(l => /fisura|Fisura|sideend/.test(l)).join('\n'));
}
console.log(fails ? fails + ' FALLOS' : 'Todo OK');
// 5) Trampa Mental
{
  const b = new Battle({formatid: FORMATOS.singles as any, seed: [1, 2, 3, 4] as any});
  b.setPlayer('p1', {name: 'A', team: [mk('Espathra', ['Trampa Mental', 'Spikes', 'Stealth Rock', 'Court Change'])] as any});
  b.setPlayer('p2', {name: 'B', team: [mk('Snorlax', ['Splash', 'Rapid Spin']), mk('Umbreon', ['Splash']), mk('Corviknight', ['Defog'])] as any});
  b.makeChoices('default', 'default');
  const e = new Estado('p1');
  b.makeChoices('move 1', 'move 1'); b.makeChoices('move 2', 'move 1'); comparar(b, e, 'Trampa Mental + Púas');
  b.makeChoices('move 3', 'switch 2'); console.log('Umbreon (Siniestro) confuso?', !!b.p2.active[0].volatiles.confusion);
  b.makeChoices('move 3', 'switch 3'); console.log('Corviknight (volador, no toca suelo) confuso?', !!b.p2.active[0].volatiles.confusion);
  b.makeChoices('move 3', 'switch 2');
  const sn = b.p2.active[0]; console.log(sn.name, 'confuso al entrar?', !!sn.volatiles.confusion);
  b.makeChoices('move 3', 'move 2'); comparar(b, e, 'tras Giro Rápido de Snorlax');
  console.log(b.log.filter(l => /Trampa Mental|sideend/.test(l)).join('\n'));
}
console.log(fails ? fails + ' FALLOS (fin)' : 'Todo OK (fin)');
// 6) Despejar, Cambio de Cancha y Limpieza General con Trampa Mental
for (const [mov, quien] of [['Defog', 'p2'], ['Court Change', 'p1'], ['Tidy Up', 'p2']] as const) {
  const b = new Battle({formatid: FORMATOS.singles as any, seed: [1, 2, 3, 4] as any});
  b.setPlayer('p1', {name: 'A', team: [mk('Espathra', ['Trampa Mental', 'Court Change', 'Splash'], 'Own Tempo')] as any});
  b.setPlayer('p2', {name: 'B', team: [mk('Maushold', ['Defog', 'Tidy Up', 'Splash'], 'Own Tempo')] as any});
  b.makeChoices('default', 'default');
  b.makeChoices('move 1', 'move 3');
  const antes = !!b.p2.sideConditions.trampamental;
  if (mov === 'Court Change') b.makeChoices('move 2', 'move 3');
  else b.makeChoices('move 3', mov === 'Defog' ? 'move 1' : 'move 2');
  const e = new Estado('p1');
  console.log(mov, 'antes', antes, 'después p2:', Object.keys(b.p2.sideConditions), 'p1:', Object.keys(b.p1.sideConditions)); comparar(b, e, mov);
}

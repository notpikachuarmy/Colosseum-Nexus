// Lugia Oscuro y sus movimientos oscuros
import './load-datos-node';
import {buildMod, FORMATOS} from '../../_codigo-fuente/mod';
import {Battle} from 'pkmn-sim';
import {movimientosDe} from '../../_codigo-fuente/equipos';
import {nombreVisible} from '../../_codigo-fuente/util';
const d = buildMod();
type S = {species: string, item?: string, ability?: string, moves: string[]};
const mk = (s: S) => ({name: s.species, species: s.species, item: s.item || '', ability: s.ability || '', moves: s.moves, nature: 'Hardy', evs: {}, ivs: {}, level: 100, gender: '', shiny: false});
function battle(t1: S[], t2: S[], seed = [1, 2, 3, 4]) {
  const b = new Battle({formatid: FORMATOS.singles as any, seed: seed as any});
  b.setPlayer('p1', {name: 'A', team: t1.map(mk) as any}); b.setPlayer('p2', {name: 'B', team: t2.map(mk) as any});
  b.makeChoices('default', 'default'); return b;
}
let fails = 0;
const check = (n: string, c: boolean, b?: Battle) => { console.log((c ? 'OK  ' : 'FAIL') + ' ' + n); if (!c) { fails++; if (b) console.log(b.log.slice(-20).join('\n')); } };
const sp = d.species.get('Lugia-Oscuro');
check('existe, Psíquico/Volador', sp.exists && sp.types.join() === 'Psychic,Flying');
check('se ve como «Lugia Oscuro»: ' + nombreVisible('Lugia-Oscuro'), nombreVisible('Lugia-Oscuro') === 'Lugia Oscuro');
check('Presión / Multiescamas', Object.values(sp.abilities).includes('Pressure') && Object.values(sp.abilities).includes('Multiscale'));
const bst = (s: string) => Object.values(d.species.get(s).baseStats).reduce((a: number, b: any) => a + b, 0);
check(`más fuerte que Lugia (${bst('Lugia-Oscuro')} > ${bst('Lugia')})`, bst('Lugia-Oscuro') > bst('Lugia'));
const movs = movimientosDe('Lugia-Oscuro');
check('aprende los 4 oscuros y los de Lugia (Aerochorro, Psíquico)', ['Soplo Oscuro', 'Muda Oscura', 'Ocaso Oscuro', 'Tifón Oscuro', 'Aeroblast', 'Psychic'].every(m => movs.includes(d.moves.get(m).id)));
check('Lugia Jagara no aprende los oscuros', !movimientosDe('Lugia-Custom').includes('soplooscuro'));
check('no se pueden copiar con Esquema', !!(d.moves.get('Soplo Oscuro').flags as any).nosketch);
// Daño: golpea a fantasmas y no hay supereficaz/poco eficaz
{ const b = battle([{species: 'Lugia-Oscuro', moves: ['Tifón Oscuro']}], [{species: 'Gengar', moves: ['Splash']}]);
  b.makeChoices('move 1', 'move 1');
  check('Tifón Oscuro golpea a un Fantasma', b.p2.active[0].hp < b.p2.active[0].maxhp && !b.log.some(l => l.includes('-immune')), b);
  check('sin supereficaz ni poco eficaz', !b.log.some(l => /-supereffective|-resisted/.test(l)), b); }
// ×1,3 contra normales y ×0,5 contra oscuros: comparar daño contra un Lugia Oscuro rival
{ const dano = (rival: string) => { const b = battle([{species: 'Lugia-Oscuro', moves: ['Tifón Oscuro']}], [{species: rival, ability: 'Pressure', moves: ['Splash']}], [5, 6, 7, 8]);
    b.makeChoices('move 1', 'move 1'); const t = b.p2.active[0]; return (t.maxhp - t.hp) / t.maxhp; };
  const contraOscuro = dano('Lugia-Oscuro'), contraLugia = dano('Lugia');
  check(`hace mucho menos a otro Pokémon oscuro (${(contraOscuro * 100).toFixed(1)}% vs ${(contraLugia * 100).toFixed(1)}%)`, contraOscuro < contraLugia * 0.6); }
// Ocaso Oscuro: -2 Defensa
{ const b = battle([{species: 'Lugia-Oscuro', moves: ['Ocaso Oscuro']}], [{species: 'Snorlax', moves: ['Splash']}]);
  b.makeChoices('move 1', 'move 1');
  check('Ocaso Oscuro baja 2 la Defensa', b.p2.active[0].boosts.def === -2, b); }
// Muda Oscura: quita Reflejo y Pantalla de Luz rivales
{ const b = battle([{species: 'Lugia-Oscuro', moves: ['Muda Oscura', 'Splash']}], [{species: 'Mr. Mime', moves: ['Reflect', 'Light Screen', 'Splash']}]);
  b.makeChoices('move 2', 'move 1'); b.makeChoices('move 2', 'move 2');
  const antes = Object.keys(b.p2.sideConditions).join();
  b.makeChoices('move 1', 'move 3');
  check(`Muda Oscura quita las pantallas (${antes} → ${Object.keys(b.p2.sideConditions).join() || 'nada'})`, antes.includes('reflect') && !b.p2.sideConditions['lightscreen'], b); }
process.exit(fails ? 1 : 0);

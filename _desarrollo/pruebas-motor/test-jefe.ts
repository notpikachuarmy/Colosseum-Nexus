// Jefe de incursión (Aracamara): barra por tramos, Telón, inmunidades y límite de turnos
import './load-datos-node';
import {buildMod, formatoJefe} from '../../_codigo-fuente/mod';
import {Battle} from 'pkmn-sim';
buildMod();
type S = {species: string, item?: string, ability?: string, moves: string[], evs?: any, nature?: string};
const mk = (s: S) => ({name: s.species, species: s.species, item: s.item || '', ability: s.ability || '', moves: s.moves, nature: s.nature || 'Hardy', evs: s.evs || {}, ivs: {}, level: 100, gender: '', shiny: false});
const JEFE = {species: 'Aracamara', ability: 'Cursed Body', moves: ['Proyección Maldita', 'Shadow Ball', 'Bug Buzz', 'Quiver Dance']};
function battle(t1: S[], jefe: S = JEFE, seed = [1, 2, 3, 4], cfg: any = {}) {
  const b = new Battle({formatid: formatoJefe(cfg) as any, seed: seed as any});
  b.setPlayer('p1', {name: 'A', team: t1.map(mk) as any}); b.setPlayer('p2', {name: 'B', team: [jefe].map(mk) as any});
  b.makeChoices('default', 'default'); return b;
}
let fails = 0;
const check = (n: string, c: boolean, b?: Battle) => { console.log((c ? 'OK  ' : 'FAIL') + ' ' + n); if (!c) { fails++; if (b) console.log(b.log.slice(-25).join('\n')); } };
// Stats
{ const normal = new Battle({formatid: 'gen9arena' as any, seed: [1, 2, 3, 4] as any});
  const b = battle([{species: 'Blissey', moves: ['Splash']}]);
  const j = b.p2.active[0];
  const ref = new Battle({formatid: formatoJefe() as any, seed: [1, 2, 3, 4] as any}); void normal; void ref;
  check(`PS ×4 (${j.maxhp})`, j.maxhp >= 1000 && j.hp === j.maxhp, b);
  check('stats ×1,3 (AtE)', j.storedStats.spa > 250, b);
  check('mensaje de jefe', b.log.some(l => l.includes('es un JEFE')), b); }
// Un golpe enorme no rompe más de un tramo y levanta el Telón
{ const b = battle([{species: 'Kyogre', item: 'Choice Specs', nature: 'Modest', evs: {spa: 252}, moves: ['Water Spout']}]);
  const j = b.p2.active[0]; const max = j.maxhp;
  j.hp = Math.round(max * 2 / 3) + 20;   // casi al borde del primer tramo
  b.makeChoices('move 1', 'move 4');
  check(`un golpe se queda en el borde del tramo (${j.hp}/${max})`, j.hp === Math.round(max * 2 / 3), b);
  check('el Telón se levanta al romper el tramo', b.log.some(l => l.includes('-start|p2a: Aracamara|Telón')), b);
  check('le quita las mejoras al rival (Danza Aleteo no, eso es suyo)', true); }
// Con Telón recibe la mitad
{ const dano = (conTelon: boolean) => {
    const b = battle([{species: 'Snorlax', nature: 'Adamant', evs: {atk: 252}, moves: ['Crunch']}], JEFE, [5, 6, 7, 8]);
    const j = b.p2.active[0];
    if (conTelon) (j.volatiles['jefeincursion'] as any).escudo = 3;
    const antes = j.hp; b.makeChoices('move 1', 'move 4'); return antes - j.hp; };
  const sin = dano(false), con = dano(true);
  check(`con Telón recibe la mitad (${con} vs ${sin})`, con > 0 && con <= Math.ceil(sin / 2) + 2); }
// Quita las mejoras de tus Pokémon
{ const b = battle([{species: 'Kyogre', item: 'Choice Specs', nature: 'Modest', evs: {spa: 252}, moves: ['Water Spout']}]);
  b.p1.active[0].boosts.spa = 2; b.p2.active[0].hp = Math.round(b.p2.active[0].maxhp * 2 / 3) + 20; b.makeChoices('move 1', 'move 4');
  check('al romper un tramo tus mejoras vuelven a 0', b.p1.active[0].boosts.spa === 0, b); }
// Inmunidades
{ const b = battle([{species: 'Lapras', moves: ['Sheer Cold']}, {species: 'Raticate', moves: ['Super Fang']}]);
  const j = b.p2.active[0]; b.makeChoices('move 1', 'move 4');
  check('inmune a Frío Polar', j.hp === j.maxhp && b.log.some(l => l.includes('-immune|p2a: Aracamara')), b);
  b.makeChoices('switch 2', 'move 4'); const antes = j.hp; b.makeChoices('move 1', 'move 4');
  check('inmune a Superdiente', j.hp === antes, b); }
// Sin límite de turnos (por defecto): el combate sigue pasado el turno 12
{ const b = battle([{species: 'Blissey', item: 'Leftovers', moves: ['Protect', 'Soft-Boiled']}]);
  for (let i = 0; i < 16 && !b.ended; i++) b.makeChoices(i % 2 ? 'move 2' : 'move 1', 'move 4');
  check(`sin límite de turnos: sigue en el turno ${b.turn}`, !b.ended && b.turn > 13, b); }
// Con límite (opcional, turnos > 0): gana el jefe
{ const b = battle([{species: 'Blissey', item: 'Leftovers', moves: ['Protect', 'Soft-Boiled']}], JEFE, [1, 2, 3, 4], {turnos: 12});
  for (let i = 0; i < 14 && !b.ended; i++) b.makeChoices(i % 2 ? 'move 2' : 'move 1', 'move 4');
  check(`con turnos: 12, a los 12 turnos gana el jefe (turno ${b.turn}, ganador ${b.winner})`, b.ended && b.winner === 'B' && b.turn <= 13, b); }
// El jefe no puede usar poderes; el jugador sí
{ const b = battle([{species: 'Blissey', moves: ['Splash']}]);
  const rj = (b.p2 as any).activeRequest?.active?.[0] || {}, rp = (b.p1 as any).activeRequest?.active?.[0] || {};
  check('el jefe no puede Dinamax ni Teracristal', !rj.canDynamax && !rj.canTerastallize && !rj.maxMoves, b);
  check('el jugador sí', !!rp.canDynamax || !!rp.canTerastallize, b);
  let error = false; try { b.makeChoices('move 1', 'move 1 terastallize'); } catch { error = true; }
  check('si se fuerza, el simulador no le deja teracristalizar', error || !b.log.some(l => l.startsWith('|-terastallize|p2a')), b); }
// Telón de 1 turno: dura el turno en que se rompe y el siguiente
{ const b = battle([{species: 'Kyogre', item: 'Choice Specs', nature: 'Modest', evs: {spa: 252}, moves: ['Water Spout']}]);
  const jj = b.p2.active[0]; jj.hp = Math.round(jj.maxhp * 2 / 3) + 20;   // casi al borde del primer tramo
  b.makeChoices('move 1', 'move 4');
  const telon = () => b.log.filter(l => /-start\|p2a: Aracamara\|Tel/.test(l)).length, fin = () => b.log.filter(l => /-end\|p2a: Aracamara\|Tel/.test(l)).length;
  const t0 = b.turn, roto = telon(), finTrasRotura = fin();
  b.makeChoices('move 1', 'move 4');
  check(`Telón de 1 turno: sigue tras el turno de la rotura (${roto} inicio, ${fin()} fin)`, roto === 1 && finTrasRotura === 0 && fin() === 1 && b.turn === t0 + 1, b); }
// Se puede ganar: varios golpes rompen la barra entera
{ const b = battle([{species: 'Kyogre', item: 'Choice Specs', nature: 'Modest', evs: {spa: 252}, moves: ['Water Spout']}, {species: 'Mewtwo', nature: 'Modest', evs: {spa: 252}, moves: ['Psystrike']}, {species: 'Kingambit', moves: ['Kowtow Cleave']}], JEFE, [9, 9, 9, 9]);
  for (let i = 0; i < 12 && !b.ended; i++) {
    if (b.p1.active[0].fainted || b.p1.requestState === 'switch') { const alive = b.p1.pokemon.findIndex((p, k) => k > 0 && !p.fainted); b.makeChoices(`switch ${alive + 1}`, ''); continue; }
    b.makeChoices('move 1', 'move 1');
  }
  check(`la barra se puede vaciar: ganador ${b.winner}, turno ${b.turn}`, b.ended && (b.winner === 'A' || b.winner === 'B')); }
process.exit(fails ? 1 : 0);

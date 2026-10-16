import './load-datos-node';
import {buildMod, FORMATOS} from '../../_codigo-fuente/mod';
import {Battle} from 'pkmn-sim';
buildMod();
type S = {species: string, item?: string, ability?: string, moves: string[]};
const mk = (s: S) => ({name: s.species, species: s.species, item: s.item || '', ability: s.ability || '', moves: s.moves, nature: 'Hardy', evs: {}, ivs: {}, level: 100, gender: '', shiny: false});
function battle(t1: S[], t2: S[], seed = [1, 2, 3, 4], fmt = FORMATOS.singles) {
  const b = new Battle({formatid: fmt as any, seed: seed as any});
  b.setPlayer('p1', {name: 'A', team: t1.map(mk) as any}); b.setPlayer('p2', {name: 'B', team: t2.map(mk) as any});
  b.makeChoices('default', 'default'); return b;
}
let fails = 0;
const check = (n: string, c: boolean, b?: Battle) => { console.log((c ? 'OK  ' : 'FAIL') + ' ' + n); if (!c) { fails++; if (b) console.log(b.log.slice(-20).join('\n')); } };
// Protección vs trampas
for (const m of ['Stealth Rock', 'Spikes', 'Toxic Spikes', 'Sticky Web', 'Trampa Mental', 'Ceniza Sofocante']) {
  const mv = buildMod().moves.get(m);
  if (!mv.exists) { console.log('?? no existe', m); continue; }
  const b = battle([{species: 'Glimmora', moves: [m]}], [{species: 'Snorlax', moves: ['Protect']}]);
  b.makeChoices('move 1', 'move 1');
  const bloqueado = b.log.some(l => l.startsWith('|-activate|p2a: Snorlax|move: Protect'));
  console.log(`   ${m}: target=${mv.target} protect=${!!mv.flags.protect} cat=${mv.category}`);
  check(`Protección no para ${m}` + (mv.category !== 'Status' ? ' (es un ataque: sí lo para)' : ''), mv.category !== 'Status' ? bloqueado : !bloqueado, b);
}
// Fisura Táctica: Protección para el atrapar, pero las trampas se quitan igual
{ const b = battle([{species: 'Excadrill', moves: ['Fisura Táctica', 'Spikes']}], [{species: 'Glimmora', moves: ['Protect', 'Stealth Rock', 'Spikes']}]);
  b.makeChoices('move 2', 'move 2'); b.makeChoices('move 2', 'move 3');
  const antes = [Object.keys(b.p1.sideConditions), Object.keys(b.p2.sideConditions)];
  b.makeChoices('move 1', 'move 1');
  check(`Fisura Táctica con Protección quita las trampas (${antes}) → (${Object.keys(b.p1.sideConditions)}|${Object.keys(b.p2.sideConditions)})`, !Object.keys(b.p1.sideConditions).length && !Object.keys(b.p2.sideConditions).length, b);
  check('…pero no atrapa a quien se protege', !b.p2.active[0].volatiles['fisuratactica'], b); }
// Movimientos custom de estado con flag protect que no deberían
const d = buildMod();
for (const [n, m] of Object.entries<any>((globalThis as any).DATOS_MOVIMIENTOS)) {
  const mv = d.moves.get(n);
  console.log(`   ${n}: target=${mv.target} cat=${mv.category} protect=${!!mv.flags.protect}`);
}
// Sueño: dura 1-3 turnos del dormido
{ const turnos: number[] = [];
  for (let s = 1; s <= 30; s++) {
    const b = battle([{species: 'Breloom', moves: ['Spore']}], [{species: 'Snorlax', moves: ['Tackle']}], [s, s + 1, s + 2, s + 3]);
    b.makeChoices('move 1', 'move 1');
    let n = 0;
    while (b.p2.active[0].status === 'slp' && n < 10) { b.makeChoices('move 1', 'move 1'); n++; }
    // turnos que no pudo moverse
    turnos.push(b.log.filter(l => l.startsWith('|cant|p2a: Snorlax|slp')).length);
  }
  console.log('   turnos dormido:', turnos.join(','));
  check('Sueño dura de 1 a 3 turnos', turnos.every(t => t >= 1 && t <= 3)); }
// Cláusula de sueño
{ const b = battle([{species: 'Breloom', moves: ['Spore']}], [{species: 'Snorlax', moves: ['Splash']}, {species: 'Chansey', moves: ['Splash']}]);
  b.makeChoices('move 1', 'move 1'); b.makeChoices('move 1', 'switch 2'); b.makeChoices('move 1', 'move 1');
  check('Cláusula de sueño: solo uno dormido', b.p2.pokemon.filter(p => p.status === 'slp').length === 1, b); }
// Anulación
{ const b = battle([{species: 'Gengar', moves: ['Disable', 'Shadow Ball']}], [{species: 'Snorlax', moves: ['Tackle', 'Rest']}], [5, 5, 5, 5]);
  b.makeChoices('move 2', 'move 1'); b.makeChoices('move 1', 'move 2');
  // Gengar es más rápido: Anulación anula el último movimiento (Tackle) del turno anterior
  const req = (b.p2 as any).activeRequest;
  const ms = req?.active?.[0]?.moves || [];
  console.log('   ', b.log.filter(l => /disable|Disable/.test(l)).join(' / '), JSON.stringify(ms.map((m: any) => [m.id, m.disabled])));
  check('Anulación desactiva el movimiento en la petición', ms.some((m: any) => m.id === 'tackle' && m.disabled), b);
  try { b.makeChoices('move 2', 'move 1'); check('El simulador acepta un movimiento anulado (no debería)', false); } catch { check('El simulador rechaza el movimiento anulado', true); }
  b.makeChoices('move 2', 'move 2');
  check('No deja usar el movimiento anulado', !b.log.slice(-15).some(l => l.startsWith('|move|p2a: Snorlax|Tackle')), b); }
console.log(fails ? fails + ' FALLOS' : 'Todo OK');

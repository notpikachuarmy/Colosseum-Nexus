import './load-datos-node';
import {buildMod, FORMATOS} from '../../_codigo-fuente/mod';
import {Battle} from 'pkmn-sim';
const d = buildMod();
type S = {species: string, item?: string, ability?: string, moves: string[]};
const mk = (s: S) => ({name: s.species, species: s.species, item: s.item || '', ability: s.ability || '', moves: s.moves, nature: 'Hardy', evs: {}, ivs: {}, level: 100, gender: '', shiny: false});
function battle(t1: S[], t2: S[], seed = [1, 2, 3, 4]) {
  const b = new Battle({formatid: FORMATOS.singles as any, seed: seed as any});
  b.setPlayer('p1', {name: 'A', team: t1.map(mk) as any}); b.setPlayer('p2', {name: 'B', team: t2.map(mk) as any});
  b.makeChoices('default', 'default'); return b;
}
let fails = 0;
const check = (n: string, c: boolean, b?: Battle) => { console.log((c ? 'OK  ' : 'FAIL') + ' ' + n); if (!c) { fails++; if (b) console.log(b.log.slice(-25).join('\n')); } };
const hab = (s: string) => Object.values(d.species.get(s).abilities);
check('Railspike: ' + hab('Railspike'), ['Rock Head', 'Reckless', 'Cursed Body', 'Cimientos'].every(a => hab('Railspike').includes(a)));
check('Steelix: ' + hab('Steelix'), hab('Steelix').includes('Sturdy') && hab('Steelix').includes('Cimientos'));
check('Snorlax: ' + hab('Snorlax'), ['Immunity', 'Thick Fat', 'Gluttony', 'Sueño confortante', 'Sonámbulo'].every(a => hab('Snorlax').includes(a)));
check('Somnistera: ' + hab('Somnistera'), hab('Somnistera').includes('Sonámbulo'));
check('Kingambit: ' + hab('Kingambit'), hab('Kingambit').includes('Supreme Overlord') && hab('Kingambit').includes('Botín de Guerra'));
// Cimientos contra todas las trampas
{ const b = battle([{species: 'Skarmory', moves: ['Spikes', 'Stealth Rock', 'Toxic Spikes', 'Sticky Web']}, {species: 'Skarmory', moves: ['Trampa Mental']}],
    [{species: 'Blissey', moves: ['Splash']}, {species: 'Steelix', ability: 'Cimientos', moves: ['Splash']}]);
  for (const m of ['move 1', 'move 2', 'move 3', 'move 4']) b.makeChoices(m, 'move 1');
  b.makeChoices('switch 2', 'move 1'); b.makeChoices('move 1', 'move 1');
  const sides = Object.keys(b.p2.sideConditions);
  b.makeChoices('move 1', 'switch 2');
  const s = b.p2.active[0];
  check('Cimientos: 5 trampas puestas (' + sides + ')', sides.length === 5, b);
  check('Cimientos: sin daño, sin veneno, sin bajada, sin confusión', s.species.name === 'Steelix' && s.hp === s.maxhp && !s.status && !s.boosts.spe && !s.volatiles['confusion'], b);
  b.makeChoices('move 1', 'switch 2'); const bl = b.p2.active[0];
  check('Sin Cimientos sí afectan (Blissey)', bl.hp < bl.maxhp && bl.status === 'psn' && bl.boosts.spe === -1, b); }
// Botín de Guerra
{ const b = battle([{species: 'Kingambit', ability: 'Botín de Guerra', moves: ['Kowtow Cleave']}], [{species: 'Pichu', item: 'Leftovers', moves: ['Splash']}, {species: 'Snorlax', moves: ['Splash']}]);
  b.makeChoices('move 1', 'move 1');
  check('Botín de Guerra roba Restos', b.p1.active[0].item === 'leftovers' && b.log.some(l => l.includes('Botín de Guerra')), b); }
{ const b = battle([{species: 'Kingambit', item: 'Black Glasses', ability: 'Botín de Guerra', moves: ['Kowtow Cleave']}], [{species: 'Pichu', item: 'Leftovers', moves: ['Splash']}, {species: 'Snorlax', moves: ['Splash']}]);
  b.makeChoices('move 1', 'move 1');
  check('Botín de Guerra no roba si ya lleva objeto', b.p1.active[0].item === 'blackglasses', b); }
// Sonámbulo
{ const b = battle([{species: 'Snorlax', ability: 'Sonámbulo', moves: ['Body Slam']}], [{species: 'Breloom', moves: ['Spore']}]);
  b.makeChoices('move 1', 'move 1'); const hp0 = b.p2.active[0].hp; const dormido = b.p1.active[0].status === 'slp';
  b.makeChoices('move 1', 'move 1');
  check('Sonámbulo: ataca dormido', dormido && b.p2.active[0].hp < hp0, b); }
{ const dmg = (sleep: boolean) => { const b = battle([{species: 'Snorlax', ability: 'Sonámbulo', moves: ['Double-Edge']}], [{species: 'Blissey', moves: ['Splash']}], [5, 5, 5, 5]);
    if (sleep) { b.p1.active[0].setStatus('slp'); b.p1.active[0].statusState.time = 3; } const h0 = b.p2.active[0].hp; b.makeChoices('move 1', 'move 1'); return h0 - b.p2.active[0].hp; };
  const a = dmg(false), c = dmg(true); check(`Sonámbulo x0.75 dormido (${a} -> ${c})`, c > a * 0.65 && c < a * 0.85); }
console.log(fails ? fails + ' FALLOS' : 'Todo OK');

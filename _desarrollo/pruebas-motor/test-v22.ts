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
// Habilidades conservadas
const hab = (s: string) => Object.values(d.species.get(s).abilities);
check('Musharna conserva Forewarn, Synchronize, Telepathy + Sueño confortante ' + hab('Musharna'), ['Forewarn', 'Synchronize', 'Telepathy', 'Sueño confortante'].every(a => hab('Musharna').includes(a)));
check('Hypno conserva Inner Focus + Terror nocturno ' + hab('Hypno'), hab('Hypno').includes('Inner Focus') && hab('Hypno').includes('Terror nocturno'));
check('Pitaraka habilidades ' + hab('Pitaraka'), ['Overgrow', 'Corazón de Dragón', 'Ripen', 'Contraveneno'].every(a => hab('Pitaraka').includes(a)));
check('Pitalant/Pitaraka aprenden Rugido', d.species.get('Pitaraka').exists && (d.data.Learnsets as any).pitalant.learnset.rugidoancestral);
// Rugido Ancestral supereficaz contra Veneno
{ const b = battle([{species: 'Pitaraka', moves: ['Rugido Ancestral']}], [{species: 'Muk', moves: ['Splash']}]); b.makeChoices('move 1', 'move 1');
  check('Rugido supereficaz vs Muk', b.log.some(l => l.startsWith('|-supereffective|')), b); }
{ const b = battle([{species: 'Pitaraka', moves: ['Rugido Ancestral']}], [{species: 'Clefable', moves: ['Splash']}]); b.makeChoices('move 1', 'move 1');
  check('Rugido sigue sin afectar a Hada', b.log.some(l => l.startsWith('|-immune|')), b); }
// Contraveneno
{ const b = battle([{species: 'Zangoose', ability: 'Contraveneno', moves: ['Splash']}], [{species: 'Muk', moves: ['Sludge Bomb', 'Toxic']}]); b.makeChoices('move 1', 'move 1');
  check('Contraveneno: inmune a Bomba Lodo y +1 Atq', b.p1.active[0].hp === b.p1.active[0].maxhp && b.p1.active[0].boosts.atk === 1, b);
  b.makeChoices('move 1', 'move 2'); check('Contraveneno: Tóxico no lo envenena', !b.p1.active[0].status, b); }
// Mal de Ojo
{ const b = battle([{species: 'Gengar', ability: 'Mal de Ojo', moves: ['Splash']}], [{species: 'Snorlax', moves: ['Splash']}]);
  check('Mal de Ojo baja DefEsp', b.p2.active[0].boosts.spd === -1, b); }
// Corriente Fría
{ const b = battle([{species: 'Froslass', ability: 'Corriente Fría', moves: ['Snowscape']}], [{species: 'Snorlax', moves: ['Splash']}]); b.makeChoices('move 1', 'move 1');
  check('Corriente Fría +1 Vel con nieve', b.p1.active[0].boosts.spe === 1, b); }
// Rocío Matinal
{ const b = battle([{species: 'Leafeon', ability: 'Rocío Matinal', moves: ['Splash']}], [{species: 'Garchomp', moves: ['Earthquake']}]); b.makeChoices('move 1', 'move 1');
  check('Rocío Matinal cura', b.log.some(l => /-heal\|p1a: Leafeon.*Rocío Matinal/.test(l)), b); }
// Corazón de Dragón
{ const dmg = (hpFrac: number) => { const b = battle([{species: 'Dragonite', ability: 'Corazón de Dragón', moves: ['Dragon Claw']}], [{species: 'Snorlax', moves: ['Splash']}], [5, 5, 5, 5]);
    const p = b.p1.active[0]; p.sethp(Math.floor(p.maxhp * hpFrac)); const h0 = b.p2.active[0].hp; b.makeChoices('move 1', 'move 1'); return h0 - b.p2.active[0].hp; };
  const a = dmg(1), c = dmg(0.3); check(`Corazón de Dragón x1.5 (${a} -> ${c})`, c > a * 1.35 && c < a * 1.65); }
console.log(fails ? fails + ' FALLOS' : 'Todo OK');

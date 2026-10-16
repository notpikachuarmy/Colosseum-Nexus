import './load-datos-node';
import {buildMod} from '../../_codigo-fuente/mod';
import {equiposParejos} from '../../_codigo-fuente/aleatorio';
import {validarEquipo, empaquetar} from '../../_codigo-fuente/equipos';
import {Motor, IA} from '../../_codigo-fuente/motor';
const d = buildMod();
const bst = (s: string) => Object.values(d.species.get(s).baseStats).reduce((a: number, b: number) => a + b, 0);
let wins = {A: 0, B: 0};
(async () => {
for (const reserva of ['custom', 'mezcla', 'todos', 'custom', 'mezcla', 'todos'] as const) {
  const t0 = Date.now();
  const [a, b] = equiposParejos(reserva);
  const ms = Date.now() - t0;
  const ea = validarEquipo(a), eb = validarEquipo(b);
  console.log(reserva, ms + 'ms', 'A:', a.sets.map(s => `${s.species}(${s.level})`).join(', '));
  console.log('   B:', b.sets.map(s => `${s.species}(${s.level})`).join(', '));
  console.log('   BST', a.sets.reduce((x, s) => x + bst(s.species), 0), b.sets.reduce((x, s) => x + bst(s.species), 0), 'errores', ea.concat(eb).slice(0, 3));
  console.log('   ej:', a.sets[0].species, a.sets[0].item, a.sets[0].ability, a.sets[0].moves.join('/'));
  const m = new Motor(reserva === 'mezcla' ? 'doubles' : 'singles', {nombre: 'A', equipo: empaquetar(a)}, {nombre: 'B', equipo: empaquetar(b)});
  new IA(m, 'p1'); new IA(m, 'p2'); let log = '';
  m.escuchar('omni', c => { log += c + '\n'; });
  for (let i = 0; i < 700 && !m.terminado; i++) await new Promise(r => setTimeout(r, 20));
  const w = (log.match(/\|win\|(.*)/) || [])[1]; if (w) (wins as any)[w]++;
  console.log('   fin', m.terminado, 'ganador', w, 'errores', log.split('\n').filter(l => l.includes('|error|')).slice(0, 2));
}
console.log(wins); process.exit(0);
})();

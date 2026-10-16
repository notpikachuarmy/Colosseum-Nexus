import './load-datos-node';
import {buildMod, INFO} from '../../_codigo-fuente/mod';
import {Motor, IA} from '../../_codigo-fuente/motor';
import {nuevoSet, movimientosDe, empaquetar, validarEquipo} from '../../_codigo-fuente/equipos';
import {Dex} from 'pkmn-sim';
const d = buildMod();
const customs = [...INFO.custom].filter(id => !d.species.get(id).battleOnly);
const items = [...INFO.objetos];
function equipoAleatorio(n = 6) {
  const sets = [] as any[]; const used = new Set();
  while (sets.length < n) {
    const id = customs[Math.floor(Math.random() * customs.length)];
    const sp = d.species.get(id); if (used.has(sp.baseSpecies)) continue; used.add(sp.baseSpecies);
    const s = nuevoSet(sp.name);
    const ms = movimientosDe(sp.name); s.moves = Array.from({length: 4}, () => d.moves.get(ms[Math.floor(Math.random() * ms.length)]).name);
    s.moves = [...new Set(s.moves)];
    s.item = d.items.get('Metagrossita X').itemUser?.includes(sp.name) ? 'Metagrossita X' : d.items.get(items[Math.floor(Math.random() * items.length)]).name;
    const habs = Object.values(sp.abilities); s.ability = habs[Math.floor(Math.random() * habs.length)] as string;
    s.evs = {hp: 84, atk: 84, def: 84, spa: 84, spd: 84, spe: 84};
    sets.push(s);
  }
  const eq = {id: 'x', nombre: 'x', formato: 'singles' as const, sets};
  const errs = validarEquipo(eq); if (errs.length) console.log('VALIDACION', errs);
  return empaquetar(eq);
}
async function partida(formato: 'singles' | 'doubles') {
  const m = new Motor(formato, {nombre: 'A', equipo: equipoAleatorio()}, {nombre: 'B', equipo: equipoAleatorio()});
  new IA(m, 'p1'); new IA(m, 'p2');
  let log = '';
  m.escuchar('omni', c => { log += c + '\n'; });
  for (let i = 0; i < 600 && !m.terminado; i++) await new Promise(r => setTimeout(r, 20));
  const turnos = (log.match(/\|turn\|/g) || []).length;
  const errores = log.split('\n').filter(l => l.includes('|error|') || l.includes('Error') || l.includes('crash'));
  return {fin: m.terminado, turnos, errores, ganador: (log.match(/\|win\|(.*)/) || [])[1], log};
}
(async () => {
  let problemas = 0;
  for (let i = 0; i < 16; i++) {
    const f = i % 2 ? 'doubles' : 'singles';
    const r = await partida(f);
    console.log(f, 'fin:', r.fin, 'turnos:', r.turnos, 'ganador:', r.ganador, r.errores.slice(0, 3));
    if (!r.fin || r.errores.length) { problemas++; require('fs').writeFileSync(`/tmp/claude-0/-home-claude/b0d7bcbf-c19b-5a9a-b313-e0f13444b989/scratchpad/fallo${i}.log`, r.log); }
  }
  console.log('problemas', problemas);
  process.exit(0);
})();

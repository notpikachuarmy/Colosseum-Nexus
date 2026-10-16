// Ejecuta todas las pruebas del motor y resume el resultado.
// Uso (desde _desarrollo): bun run pruebas
import {readdirSync} from 'fs';
import {spawnSync} from 'child_process';
const dir = import.meta.dir;
const pruebas = readdirSync(dir).filter(f => /^test-.*\.ts$/.test(f)).sort();
let malas = 0;
for (const f of pruebas) {
  const r = spawnSync('bun', [`${dir}/${f}`], {encoding: 'utf8', timeout: 180000});
  const salida = (r.stdout || '') + (r.stderr || '');
  const fallos = salida.split('\n').filter(l => l.startsWith('FAIL'));
  const ok = r.status === 0 && !fallos.length;
  if (!ok) malas++;
  console.log(`${ok ? 'OK  ' : 'MAL '} ${f}${fallos.length ? '  → ' + fallos.join(' | ') : ''}${r.status ? '  (código ' + r.status + ')' : ''}`);
}
console.log(malas ? `${malas} archivo(s) con fallos` : 'Todas las pruebas OK');
process.exit(malas ? 1 : 0);

// Pases: las especies y avatares de las recompensas existen, y el bloqueo funciona
import './load-datos-node';
import * as fs from 'fs';
import * as vm from 'vm';
for (const f of ['avatares', 'economia', 'pases']) vm.runInThisContext(fs.readFileSync(`${import.meta.dir}/../../datos/${f}.js`, 'utf8'), {filename: f + '.js'});
import {buildMod} from '../../_codigo-fuente/mod';
const d = buildMod();
let fails = 0;
const ok = (n: string, c: boolean) => { console.log((c ? 'OK  ' : 'FAIL') + ' ' + n); if (!c) fails++; };
const W: any = globalThis;
const {bloqueo, precioPase, PASES} = await import('../../_codigo-fuente/pases');
for (const p of W.PASES) {
  for (const [i, r] of p.niveles.entries()) {
    if (r.tipo === 'pokemon') for (const e of r.especies) ok(`${p.id} nivel ${i + 1}: ${e} existe`, d.species.get(e).exists);
    if (r.tipo === 'avatar') ok(`${p.id} nivel ${i + 1}: avatar ${r.id} existe y no sale en el gacha`, W.DATOS_AVATARES.some((a: any) => a.id === r.id && a.origen === 'pase'));
  }
}
for (const e of W.FAKEMON_HISTORIA) ok(`historia: ${e} existe`, d.species.get(e).exists);
ok('Magiceon bloqueado por el pase', bloqueo('Magiceon') === 'Pase Kaiba Corp');
ok('Greedigus bloqueado por el pase', bloqueo('Greedigus') === 'Pase Kaiba Corp');
ok('Yamask normal libre', bloqueo('Yamask') === null);
ok('Hoopa normal libre', bloqueo('Hoopa') === null);
ok('Cineret bloqueado por la historia', bloqueo('Cineret') === 'Modo historia');
ok('Pikachu libre', bloqueo('Pikachu') === null);
ok('precio Kaiba 1200', precioPase(PASES[0]) === 1200);
process.exit(fails ? 1 : 0);

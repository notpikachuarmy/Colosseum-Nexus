import * as fs from 'fs';
import * as vm from 'vm';
(globalThis as any).window = globalThis;
vm.runInThisContext(fs.readFileSync(`${import.meta.dir}/../../traduccion-es.js`, 'utf8'));
for (const f of ['pokemon', 'habilidades', 'movimientos', 'objetos']) {
  vm.runInThisContext(fs.readFileSync(`${import.meta.dir}/../../datos/${f}.js`, 'utf8'), {filename: f + '.js'});
}

// Mide cuántos datos viajan por la red en un combate online (lo que gastaría el servidor de rebote TURN)
import './load-datos-node';
import {buildMod, FORMATOS} from '../../_codigo-fuente/mod';
import {Battle} from 'pkmn-sim';
buildMod();
const {equiposParejos} = await import('../../_codigo-fuente/aleatorio');
const {empaquetarSets} = await import('../../_codigo-fuente/serie');
const tam: number[] = [];
for (let k = 0; k < 20; k++) {
  const [a, b] = [equiposParejos('mezcla', 6)[0].sets, equiposParejos('mezcla', 6)[0].sets];
  const bt = new Battle({formatid: FORMATOS.singles as any});
  let bytes = 0;
  // Lo que el anfitrión manda al invitado: el registro del combate visto por p2 (más el envoltorio JSON)
  bt.setPlayer('p1', {name: 'A', team: a.map((s: any) => ({...s, name: s.name || s.species})) as any});
  bt.setPlayer('p2', {name: 'B', team: b.map((s: any) => ({...s, name: s.name || s.species})) as any});
  bytes += JSON.stringify({t: 'hola', equipo: empaquetarSets(b)}).length * 2;   // equipos al principio
  let vistos = 0;
  for (let i = 0; i < 300 && !bt.ended; i++) {
    bt.makeChoices('default', 'default');
    const nuevo = bt.log.slice(vistos).join('\n'); vistos = bt.log.length;
    const req = JSON.stringify((bt.p2 as any).activeRequest || {});
    bytes += JSON.stringify({t: 'p', d: nuevo + '\n|request|' + req}).length + 60;   // + la elección del invitado
  }
  tam.push(bytes);
}
tam.sort((x, y) => x - y);
console.log('KB por combate (mín/mediana/máx):', (tam[0] / 1024).toFixed(0), (tam[10] / 1024).toFixed(0), (tam[19] / 1024).toFixed(0));

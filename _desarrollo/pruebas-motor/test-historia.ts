// Modo historia: equipos de los NPC legales y jugables; recompensas que existen
import './load-datos-node';
import * as fs from 'fs';
import * as vm from 'vm';
for (const f of ['avatares', 'economia', 'pases', 'titulos', 'fondos', 'historia']) vm.runInThisContext(fs.readFileSync(`${import.meta.dir}/../../datos/${f}.js`, 'utf8'), {filename: f + '.js'});
import {buildMod, FORMATOS} from '../../_codigo-fuente/mod';
import {Battle} from 'pkmn-sim';
const d = buildMod();
let fails = 0;
const ok = (n: string, c: boolean) => { console.log((c ? 'OK  ' : 'FAIL') + ' ' + n); if (!c) fails++; };
const W: any = globalThis;
// La pantalla no se usa aquí: basta con un «document» mínimo para poder cargar el módulo
W.document = W.document || {getElementById: () => ({}), addEventListener() {}, createElement: () => ({style: {}, append() {}, addEventListener() {}, setAttribute() {}, classList: {add() {}}})};
W.matchMedia = W.matchMedia || (() => ({matches: false}));
const {CAPITULOS, equipoNPC, nodoJugable} = await import('../../_codigo-fuente/historia');
const {movimientosDe} = await import('../../_codigo-fuente/equipos');
ok('2 capítulos', CAPITULOS.length === 2);
for (const c of CAPITULOS) {
  for (const n of c.nodos) {
    ok(`${c.id}/${n.id}: avatar ${n.avatar} existe`, W.DATOS_AVATARES.some((a: any) => a.id === n.avatar));
    for (const r of n.requiere) ok(`${c.id}/${n.id}: requiere ${r} existe`, c.nodos.some(x => x.id === r));
    for (const r of n.recompensas || []) {
      if (r.tipo === 'avatar') ok(`${n.id}: avatar ${r.id} existe y no sale en el gacha`, W.DATOS_AVATARES.some((a: any) => a.id === r.id && a.origen === 'historia'));
      if (r.tipo === 'fondo') ok(`${n.id}: fondo ${r.id}`, W.FONDOS.some((f: any) => f.id === r.id));
      if (r.tipo === 'titulo') ok(`${n.id}: título ${r.id}`, W.TITULOS.some((t: any) => t.id === r.id));
      if (r.tipo === 'pokemon') for (const e of r.especies) ok(`${n.id}: ${e} existe y estaba bloqueado por la historia`, d.species.get(e).exists && W.FAKEMON_HISTORIA.includes(e));
    }
    for (const s of n.equipo || []) ok(`${n.id}: ${s.species} existe`, d.species.get(s.species).exists);
    if (!nodoJugable(n)) { console.log(`     (${n.id} pendiente: ${n.pendiente})`); continue; }
    for (const s of equipoNPC(n)) {
      const legales = new Set(movimientosDe(s.species));
      const malos = s.moves.filter(m => !legales.has(d.moves.get(m).id));
      ok(`${n.id}: ${s.species} movimientos legales ${malos.join(',')}`, !malos.length);
      ok(`${n.id}: ${s.species} habilidad ${s.ability}`, Object.values(d.species.get(s.species).abilities).includes(s.ability));
      ok(`${n.id}: ${s.species} objeto ${s.item}`, !s.item || d.items.get(s.item).exists);
    }
    // El combate arranca y avanza con el equipo del NPC
    const b = new Battle({formatid: FORMATOS.singles as any, seed: [1, 2, 3, 4] as any});
    const t = equipoNPC(n).map(s => ({...s, name: s.name || s.species}));
    b.setPlayer('p1', {name: 'A', team: t as any}); b.setPlayer('p2', {name: 'B', team: t as any});
    b.makeChoices('default', 'default');
    for (let i = 0; i < 5 && !b.ended; i++) b.makeChoices('default', 'default');
    ok(`${n.id}: el combate funciona`, b.turn >= 3 || b.ended);
  }
}
// El jefe Randes conserva su equipo exacto
const randes = CAPITULOS[0].nodos.find(n => n.id === 'randes')!;
ok('Randes: 6 Pokémon con sus apodos', randes.equipo!.map(s => `${s.species}:${s.nickname}`).join() === 'Galvantula:Stormsilk,Jolteon:VVeVV,Electivire:ZigZag,Magneton:Magneto,Inteleon:Sobel,Dedenne:NotPikachu');
ok('Randes: Inteleon con teratipo Eléctrico', randes.equipo!.find(s => s.species === 'Inteleon')!.teraType === 'Electric');
// El cine: solo Pokémon (nada de entrenadores humanos) y los hablantes 'pk:' existen
const cine = CAPITULOS.find(c => c.id === 'cine')!;
for (const n of cine.nodos) {
  ok(`cine/${n.id}: el rival es un Pokémon (${n.pokemon})`, !!n.pokemon && d.species.get(n.pokemon).exists);
  for (const l of [...(n.antes || []), ...(n.despues || [])]) if (l.quien.startsWith('pk:')) ok(`cine/${n.id}: hablante ${l.quien}`, d.species.get(l.quien.slice(3)).exists);
}
ok('todos los nodos se pueden jugar', CAPITULOS.every(c => c.nodos.every(nodoJugable)));
// Aracamara: jefe de incursión con los datos aprobados, y el combate arranca
const {formatoJefe} = await import('../../_codigo-fuente/mod');
const ara = cine.nodos.find(n => n.id === 'aracamara')!;
ok('Aracamara: incursión 4 / 1,3 / 3 / 2 / 12', JSON.stringify(ara.incursion) === JSON.stringify({hp: 4, stats: 1.3, tramos: 3, escudo: 2, turnos: 12}));
{
  const b = new Battle({formatid: formatoJefe(ara.incursion) as any, seed: [1, 2, 3, 4] as any});
  const mio = equipoNPC(CAPITULOS[0].nodos.find(n => n.id === 'randes')!).map(s => ({...s, name: s.name || s.species}));
  b.setPlayer('p1', {name: 'A', team: mio as any}); b.setPlayer('p2', {name: 'B', team: equipoNPC(ara).map(s => ({...s, name: s.species})) as any});
  b.makeChoices('default', 'default');
  const jefe = b.p2.active[0];
  ok('Aracamara: es jefe de incursión (PS ×4)', !!jefe.volatiles['jefeincursion'] && jefe.maxhp > 3 * jefe.baseStoredStats.hp);
  for (let i = 0; i < 30 && !b.ended; i++) b.makeChoices('default', 'default');
  ok('Aracamara: el combate termina (como mucho en 12 turnos)', b.ended && b.turn <= 13);
}
process.exit(fails ? 1 : 0);

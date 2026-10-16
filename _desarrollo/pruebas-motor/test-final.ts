// Fase 13: reglas críticas del progreso (pases por separado, solo el activo gana experiencia,
// PV una vez por combate, compras con el precio justo y recompensas sin duplicar)
import './load-datos-node';
import * as fs from 'fs';
import * as vm from 'vm';
for (const f of ['avatares', 'economia', 'pases', 'titulos', 'fondos']) vm.runInThisContext(fs.readFileSync(`${import.meta.dir}/../../datos/${f}.js`, 'utf8'), {filename: f + '.js'});
const W: any = globalThis;
// Un segundo pase de prueba (solo para esta prueba) para comprobar que cada pase lleva su progreso
W.PASES.push({id: 'prueba', nombre: 'Pase de prueba', imagen: '', xpPorNivel: 100, niveles: Array.from({length: 5}, () => ({tipo: 'tickets', n: 1}))});
// Navegador mínimo: guardado en memoria y una página falsa
const mem = new Map<string, string>();
W.localStorage = {getItem: (k: string) => mem.get(k) ?? null, setItem: (k: string, v: string) => mem.set(k, String(v)), removeItem: (k: string) => mem.delete(k)};
const el = (): any => ({style: {setProperty() {}}, setAttribute() {}, innerHTML: '', dataset: {}, append() {}, remove() {}, addEventListener() {}, classList: {add() {}, remove() {}, toggle() {}}, querySelectorAll: () => []});
W.document = {getElementById: () => el(), addEventListener() {}, createElement: el, body: el(), querySelector: () => null, querySelectorAll: () => []};
W.matchMedia = () => ({matches: false});
W.Node = class {};
W.requestAnimationFrame = () => 0;
W.document.createTextNode = (t: string) => ({t});
import {buildMod} from '../../_codigo-fuente/mod';
buildMod();
let fails = 0;
const ok = (n: string, c: boolean) => { console.log((c ? 'OK  ' : 'FAIL') + ' ' + n); if (!c) fails++; };
const {coleccion, cambiarColeccion, recompensaCombate, comprarTickets, comprarAvatar, AVATARES_TIENDA, precioAvatar, ECO} = await import('../../_codigo-fuente/avatares');
const {comprarPase, activarPase, experienciaPase, estadoPases, PASES, EXP} = await import('../../_codigo-fuente/pases');

cambiarColeccion(c => { c.pv = 5000; c.fichas = 0; });
// --- Compras
let r = comprarTickets(1);
ok('1 ticket: -' + ECO.ticket + ' PV y +1 ticket', r.ok && coleccion().pv === 5000 - ECO.ticket && coleccion().fichas === 1);
r = comprarTickets(10);
ok('pack: -' + ECO.pack10 + ' PV y +10 tickets', r.ok && coleccion().pv === 5000 - ECO.ticket - ECO.pack10 && coleccion().fichas === 11);
const av = AVATARES_TIENDA()[0]; const antes = coleccion().pv;
ok(`avatar de tienda ${av.id}: cobra ${precioAvatar(av)} una vez`, comprarAvatar(av.id).ok && coleccion().pv === antes - precioAvatar(av) && !comprarAvatar(av.id).ok && coleccion().pv === antes - precioAvatar(av));
// --- PV una sola vez por combate
const pv0 = coleccion().pv;
recompensaCombate('ia', 10, true, false, 'combate-1'); recompensaCombate('ia', 10, true, false, 'combate-1');
ok('PV de un combate se dan una vez', coleccion().pv - pv0 === ECO.pv.ia.victoria);
recompensaCombate('ia', 2, true, false, 'combate-corto');
ok('combate de menos de 3 turnos no da PV', coleccion().pv - pv0 === ECO.pv.ia.victoria);
// --- Pases por separado y solo el activo gana experiencia
cambiarColeccion(c => { c.pv = 99999; });
const [kaiba, prueba] = [PASES.find(p => p.id !== 'prueba')!, PASES.find(p => p.id === 'prueba')!];
ok('compra del primer pase lo activa', comprarPase(kaiba.id).ok && estadoPases().activo === kaiba.id);
ok('compra del segundo no cambia el activo', comprarPase(prueba.id).ok && estadoPases().activo === kaiba.id);
ok('comprar dos veces no cobra', !comprarPase(prueba.id).ok);
experienciaPase('ia', true, false, 'c-a');
ok('solo el activo (Kaiba) gana experiencia', estadoPases().pases[kaiba.id].xp === EXP.ia.victoria && estadoPases().pases[prueba.id].xp === 0);
experienciaPase('ia', true, false, 'c-a');
ok('el mismo combate no da experiencia dos veces', estadoPases().pases[kaiba.id].xp === EXP.ia.victoria);
activarPase(prueba.id);
const fichasAntes = coleccion().fichas;
experienciaPase('online', true, true, 'c-b');
const e = estadoPases();
ok('al cambiar de activo, cada pase guarda su experiencia', e.pases[kaiba.id].xp === EXP.ia.victoria && e.pases[prueba.id].xp === EXP.online.victoria + EXP.serieGanada);
const niveles = Math.floor(e.pases[prueba.id].xp / 100);
ok(`recompensas del pase de prueba entregadas (${niveles})`, e.pases[prueba.id].reclamados.length === niveles && coleccion().fichas === fichasAntes + niveles);
experienciaPase('online', true, true, 'c-b');
ok('las recompensas reclamadas no se repiten', estadoPases().pases[prueba.id].reclamados.length === niveles && coleccion().fichas === fichasAntes + niveles);
// --- Victorias, derrotas y rachas en el modo correcto
const {registrarCombate, perfil} = await import('../../_codigo-fuente/nivel');
// (antes ya hubo 1 victoria contra la IA: la del combate de los PV; el de 2 turnos no cuenta)
ok('el combate corto no contó y el válido sí: 1 V', perfil('ia').v === 1 && perfil('ia').racha === 1);
for (const g of [true, true, true, false, true, true]) registrarCombate('ia', g);
registrarCombate('online', false);
const ia = perfil('ia'), on = perfil('online');
ok(`IA: 6 V / 1 D, racha actual 2, racha máxima 4 (${ia.v}/${ia.d}/${ia.racha}/${ia.rachaMax})`, ia.v === 6 && ia.d === 1 && ia.racha === 2 && ia.rachaMax === 4);
ok(`online no se mezcla con la IA (${on.v}/${on.d})`, on.v === 0 && on.d === 1 && on.rachaMax === 0);
process.exit(fails ? 1 : 0);

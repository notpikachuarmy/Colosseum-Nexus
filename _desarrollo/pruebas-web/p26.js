// Fase 6: Pase Kaiba Corp, experiencia de temporada, recompensas sin duplicar y Fakemon bloqueados
const {chromium, devices} = require('playwright');
const {SHOTS, nuevaPagina, preparar, jugar, EQUIPOS} = require('./comun');
const fallos = []; const ok = (n, c) => { console.log((c ? 'OK  ' : 'FAIL') + ' ' + n); if (!c) fallos.push(n); };
const leer = (p, k) => p.evaluate(k => JSON.parse(localStorage.getItem(k) || '{}'), k);
const poner = (p, k, v) => p.evaluate(([k, v]) => localStorage.setItem(k, JSON.stringify(v)), [k, v]);
const set = (species, moves, ability) => ({name: '', species, item: '', ability, moves, nature: 'Hardy', evs: {hp: 0, atk: 0, def: 0, spa: 0, spd: 0, spe: 0}, ivs: {hp: 31, atk: 31, def: 31, spa: 31, spd: 31, spe: 31}, level: 100, gender: '', shiny: false, teraType: 'Normal'});
(async () => {
  const b = await chromium.launch();
  const ctx = await b.newContext({viewport: {width: 1280, height: 900}}); const errs = [];
  const p = await nuevaPagina(ctx, errs, 'pc'); p.on('dialog', d => d.accept());
  await preparar(p);
  // Comprar el pase
  await poner(p, 'cnx.coleccion.v1', {fichas: 0, pv: 2000, tengo: {sombra: 1}, avatar: 'sombra', tiradas: 0});
  await p.evaluate(() => localStorage.removeItem('cnx.pases.v1'));
  await p.reload(); await p.waitForSelector('.mp-fila');
  await p.click('.mp-tarjeta[data-id=gacha]'); await p.click('[data-pestana=pases]'); await p.waitForSelector('.pase-tarjeta');
  const btn = p.locator('.pase-tarjeta[data-pase=kaibacorp] .btn-compra');
  ok('precio del pase PV 1200 (300 + 45 × 20)', (await btn.textContent()) === 'PV 1200');
  ok('pista con 7 niveles por página antes de comprar', (await p.$$eval('.pase-col', e => e.length)) === 7);
  await p.click('.pase-flecha >> nth=1'); await p.click('.pase-flecha >> nth=1'); await p.waitForTimeout(100);
  ok('con las flechas se llega al nivel 20', (await p.$$eval('.pase-col', e => e.map(x => x.dataset.nivel))).includes('20'));
  await p.click('.pase-col[data-nivel="20"]');
  ok('al tocar un nivel sale su detalle', (await p.textContent('.pase-detalle')).includes('Seto Kaiba'));
  await btn.click(); await btn.click(); await p.waitForTimeout(300);
  let c = await leer(p, 'cnx.coleccion.v1'), e = await leer(p, 'cnx.pases.v1');
  ok('comprado: PV 800 y pase activo', c.pv === 800 && e.activo === 'kaibacorp' && e.pases.kaibacorp.xp === 0);
  ok('pone "Activo"', (await p.textContent('.pase-tarjeta[data-pase=kaibacorp]')).includes('Activo') && (await p.textContent('.pase-chip')) === 'Activo');
  await p.screenshot({path: SHOTS + 'pase-pc.png', fullPage: true});
  // Fakemon bloqueado: equipo con Magiceon no vale
  const eqMagi = {id: 'm1', nombre: 'Magi', formato: 'singles', sets: [set('Magiceon', ['Moonblast'], '')]};
  await poner(p, 'cnx.equipos.v1', [eqMagi, ...EQUIPOS]);
  await p.click('text=← Inicio'); await p.click('.mp-tarjeta[data-id=equipos]'); await p.click('.item-equipo >> nth=0'); await p.waitForTimeout(300);
  ok('Magiceon bloqueado en tu equipo', /todavía no lo tienes desbloqueado.*Pase Kaiba Corp/.test(await p.textContent('#app')));
  // Experiencia: le faltan 10 para el nivel 3 → al combatir se entregan los niveles 1, 2 y 3
  await poner(p, 'cnx.pases.v1', {...(await leer(p, 'cnx.pases.v1')), pases: {kaibacorp: {xp: 590, reclamados: []}}});
  await p.reload(); await p.waitForSelector('.mp-fila');
  await p.click('.mp-tarjeta[data-id=practica]'); await p.waitForSelector('.btn-grande'); await p.click('.btn-grande');
  ok('combate terminado', await jugar(p, 500, 999));
  c = await leer(p, 'cnx.coleccion.v1'); e = await leer(p, 'cnx.pases.v1');
  const xp = e.pases.kaibacorp.xp;
  ok(`exp. de temporada sumada: ${xp}`, xp === 605 || xp === 630);
  ok('niveles 1-3 entregados una vez: ' + JSON.stringify(e.pases.kaibacorp.reclamados), e.pases.kaibacorp.reclamados.sort().join() === '0,1,2');
  ok('Titán + 2 tickets + Magiceon', c.tengo.titan === 1 && c.fichas === 2 && e.desbloqueados.includes('magiceon'));
  ok('fin de combate enseña la exp. de pase', /exp\. de pase/.test(await p.textContent('.fin-combate')));
  // Recargar no vuelve a dar nada
  await p.reload(); await p.waitForSelector('.mp-fila');
  await p.click('.mp-tarjeta[data-id=gacha]'); await p.click('[data-pestana=pases]'); await p.waitForSelector('.pase-col');
  const c2 = await leer(p, 'cnx.coleccion.v1');
  ok('tras recargar no se repite nada', c2.fichas === 2 && JSON.stringify(c2.tengo) === JSON.stringify(c.tengo));
  ok('3 niveles marcados como conseguidos y el 4 como actual', (await p.$$eval('.pase-col.hecho', e => e.length)) === 3 && (await p.$eval('.pase-col.actual', e => e.dataset.nivel)) === '4');
  await p.screenshot({path: SHOTS + 'pase2-pc.png'});
  // Ahora Magiceon sí vale
  await p.click('text=← Inicio'); await p.click('.mp-tarjeta[data-id=equipos]'); await p.click('.item-equipo >> nth=0'); await p.waitForTimeout(300);
  ok('Magiceon desbloqueado ya vale', !/todavía no lo tienes desbloqueado/.test(await p.textContent('#app')));
  // Avatar del pase que ya tenías → su valor en PV
  await poner(p, 'cnx.pases.v1', {...(await leer(p, 'cnx.pases.v1')), pases: {kaibacorp: {xp: 3995, reclamados: [...Array(18).keys()]}}});
  await poner(p, 'cnx.coleccion.v1', {...(await leer(p, 'cnx.coleccion.v1')), tengo: {...c2.tengo, 'seto-kaiba': 1}, pv: 0});
  await p.reload(); await p.waitForSelector('.mp-fila');
  await p.click('.mp-tarjeta[data-id=practica]'); await p.waitForSelector('.btn-grande'); await p.click('.btn-grande');
  await jugar(p, 500, 999);
  c = await leer(p, 'cnx.coleccion.v1'); e = await leer(p, 'cnx.pases.v1');
  ok('pase completo: xp tope 4000 y nivel 20 entregado', e.pases.kaibacorp.xp === 4000 && e.pases.kaibacorp.reclamados.includes(19));
  ok(`Seto Kaiba repetido → PV de compensación (${c.pv})`, c.pv >= 400 + 3);
  ok('título Duelista conseguido', e.titulos.includes('duelista'));
  // Créditos
  await p.click('button:has-text("Volver")').catch(() => {}); await p.goto('http://127.0.0.1:8080/index.html'); await p.waitForSelector('.mp-fila');
  await p.click('.mp-tarjeta[data-id=creditos]'); await p.waitForTimeout(300);
  ok('créditos: aviso de propiedad intelectual', /propiedad intelectual/.test(await p.textContent('.cred-ip')));
  ok('sin errores', !errs.length); if (errs.length) console.log(errs);
  const m = await b.newContext(devices['Pixel 7']); const pm = await nuevaPagina(m, errs, 'movil');
  await preparar(pm); await poner(pm, 'cnx.pases.v1', {activo: 'kaibacorp', pases: {kaibacorp: {xp: 900, reclamados: [0, 1, 2, 3]}}});
  await pm.reload(); await pm.waitForSelector('.mp-fila'); await pm.click('.mp-tarjeta[data-id=gacha]'); await pm.click('[data-pestana=pases]');
  await pm.waitForTimeout(400); await pm.screenshot({path: SHOTS + 'pase-movil.png', fullPage: true});
  ok('móvil sin desbordar', await pm.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1));
  await b.close();
  console.log(fallos.length ? 'FALLOS: ' + fallos.length : 'Todo OK');
  process.exit(fallos.length ? 1 : 0);
})();

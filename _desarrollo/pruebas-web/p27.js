// Fase 7: títulos (perfil, equipar, VS, logros de colección sin repetir)
const {chromium} = require('playwright');
const {SHOTS, nuevaPagina, preparar, jugar} = require('./comun');
const fallos = []; const ok = (n, c) => { console.log((c ? 'OK  ' : 'FAIL') + ' ' + n); if (!c) fallos.push(n); };
const leer = (p, k) => p.evaluate(k => JSON.parse(localStorage.getItem(k) || '{}'), k);
const poner = (p, k, v) => p.evaluate(([k, v]) => localStorage.setItem(k, JSON.stringify(v)), [k, v]);
(async () => {
  const b = await chromium.launch();
  const ctx = await b.newContext({viewport: {width: 1280, height: 900}}); const errs = [];
  const p = await nuevaPagina(ctx, errs, 'pc'); p.on('dialog', d => d.accept());
  await preparar(p);
  // Todos los entrenadores de Kanto del gacha + racha online de 5
  const kanto = await p.evaluate(() => window.DATOS_AVATARES.filter(a => !a.origen && a.etiquetas.includes('Kanto')).map(a => a.id));
  await poner(p, 'cnx.coleccion.v1', {fichas: 0, pv: 0, tengo: Object.fromEntries(['sombra', ...kanto].map(i => [i, 1])), avatar: 'sombra', tiradas: 0});
  await poner(p, 'cnx.niveles.v1', {online: {xp: 0, v: 6, d: 1, racha: 0, rachaMax: 5}, ia: {xp: 0, v: 0, d: 0}});
  await p.evaluate(() => localStorage.removeItem('cnx.titulos.v1'));
  await p.reload(); await p.waitForSelector('.mp-fila');
  await p.click('.mp-perfil'); await p.waitForSelector('.titulos-lista'); await p.waitForTimeout(300);
  let t = await leer(p, 'cnx.titulos.v1'), c = await leer(p, 'cnx.coleccion.v1');
  ok('títulos ganados: ' + t.conseguidos, ['maestro-kanto', 'primera-victoria', 'imparable'].every(i => t.conseguidos.includes(i)) && !t.conseguidos.includes('leyenda-invicta'));
  ok(`PV de premio una vez: ${c.pv}`, c.pv === 200 + 50 + 150);
  await p.reload(); await p.waitForSelector('.mp-fila'); await p.click('.mp-perfil'); await p.waitForSelector('.titulos-lista');
  ok('al volver no se repite el premio', (await leer(p, 'cnx.coleccion.v1')).pv === 400);
  ok('contador de títulos', /^Títulos: 3\/35$/.test(await p.textContent('.pf-col-cab >> nth=1 >> .pf-contador')));
  ok('progreso de un logro: Cazaholos 0/25', (await p.textContent('.titulo-item[data-titulo=cazaholos]')).includes('0/25'));
  // Equipar
  await p.selectOption('.pf-titulo-fila select', 'maestro-kanto'); await p.waitForTimeout(200);
  ok('título equipado y visible en el perfil', (await leer(p, 'cnx.titulos.v1')).equipado === 'maestro-kanto' && (await p.textContent('.pf-id .titulo-jugador')) === 'Maestro de Kanto');
  await p.screenshot({path: SHOTS + 'titulos-pc.png', fullPage: true});
  // VS en práctica
  await p.click('text=← Inicio'); await p.click('.mp-tarjeta[data-id=practica]'); await p.waitForSelector('.btn-grande'); await p.click('.btn-grande');
  await p.waitForSelector('.vs-capa', {timeout: 10000});
  ok('el VS enseña el título', (await p.textContent('.vs-yo')).includes('Maestro de Kanto'));
  const fin = await jugar(p, 500, 999);
  t = await leer(p, 'cnx.titulos.v1');
  ok('el combate cuenta una vez para los títulos', fin && t.premiados.length === 1);
  // Sin título
  await p.goto('http://127.0.0.1:8080/index.html'); await p.waitForSelector('.mp-fila');
  await p.click('.mp-perfil'); await p.selectOption('.pf-titulo-fila select', '');
  ok('se puede dejar sin título', (await leer(p, 'cnx.titulos.v1')).equipado === '' && !(await p.$('.pf-id .titulo-jugador')));
  ok('sin errores', !errs.length); if (errs.length) console.log(errs);
  await b.close();
  console.log(fallos.length ? 'FALLOS: ' + fallos.length : 'Todo OK');
  process.exit(fallos.length ? 1 : 0);
})();

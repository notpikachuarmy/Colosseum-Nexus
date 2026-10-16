// Tienda de Fakemon (Lugia Oscuro) y selector de Pokémon ancho
const {chromium} = require('playwright');
const {SHOTS, nuevaPagina, preparar} = require('./comun');
const fallos = []; const ok = (n, c) => { console.log((c ? 'OK  ' : 'FAIL') + ' ' + n); if (!c) fallos.push(n); };
const leer = (p, k) => p.evaluate(k => JSON.parse(localStorage.getItem(k) || '{}'), k);
const poner = (p, k, v) => p.evaluate(([k, v]) => localStorage.setItem(k, JSON.stringify(v)), [k, v]);
(async () => {
  const b = await chromium.launch(); const ctx = await b.newContext({viewport: {width: 1280, height: 900}}); const errs = [];
  const p = await nuevaPagina(ctx, errs, 'pc'); p.on('dialog', d => d.accept());
  await preparar(p);
  // Selector de Pokémon: ancho y con los stats en una línea
  await p.click('.mp-tarjeta[data-id=equipos]'); await p.click('.item-equipo >> nth=0'); await p.waitForTimeout(200);
  await p.click('.slot >> nth=0'); await p.waitForTimeout(200); await p.click('.set-sprite');
  await p.waitForSelector('.modal.selector');
  const ancho = await p.$eval('.modal.selector', e => e.getBoundingClientRect().width);
  const alto = await p.$eval('.selector .fila-especie', e => e.getBoundingClientRect().height);
  await p.screenshot({path: SHOTS + 'selector-pc.png'});
  ok(`selector ancho (${Math.round(ancho)}px) y filas de una línea (${Math.round(alto)}px)`, ancho > 900 && alto < 60);
  await p.fill('.modal.selector input', 'lugia');
  ok('Lugia Oscuro sale con candado de Tienda', /Lugia Oscuro[\s\S]*Tienda/.test(await p.textContent('.selector-lista')));
  await p.keyboard.press('Escape'); await p.goto('http://127.0.0.1:8080/index.html'); await p.waitForSelector('.mp-fila');
  // Tienda: comprar Lugia Oscuro
  await poner(p, 'cnx.coleccion.v1', {fichas: 0, pv: 1200, tengo: {sombra: 1}, avatar: 'sombra', tiradas: 0});
  await p.evaluate(() => localStorage.removeItem('cnx.pases.v1'));
  await p.reload(); await p.waitForSelector('.mp-fila');
  await p.click('.mp-tarjeta[data-id=gacha]'); await p.click('[data-pestana=tienda]'); await p.waitForSelector('.tienda-fakemon');
  const carta = '.tienda-avatar[data-fakemon="Lugia-Oscuro"]';
  ok('sección Fakemon con Lugia Oscuro a PV 1000', (await p.textContent(carta)).includes('Lugia Oscuro') && (await p.textContent(carta + ' .btn-compra')) === 'PV 1000');
  await p.screenshot({path: SHOTS + 'tienda-fakemon.png', fullPage: true});
  await p.click(carta + ' .btn-compra'); await p.click(carta + ' .btn-compra'); await p.waitForTimeout(300);
  const c = await leer(p, 'cnx.coleccion.v1'), e = await leer(p, 'cnx.pases.v1');
  ok(`comprado: PV ${c.pv} y desbloqueado`, c.pv === 200 && (e.desbloqueados || []).includes('lugiaoscuro'));
  ok('ahora pone "Ya lo tienes"', (await p.textContent(carta)).includes('Ya lo tienes'));
  ok('sin errores', !errs.length); if (errs.length) console.log(errs);
  await b.close(); console.log(fallos.length ? 'FALLOS: ' + fallos.length : 'Todo OK'); process.exit(fallos.length ? 1 : 0);
})();

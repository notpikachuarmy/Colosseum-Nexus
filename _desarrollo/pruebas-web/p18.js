// v3: barra de jugador, avatares + gacha, créditos, avatares en combate, recompensa
const {chromium, devices} = require('playwright');
const {SHOTS, nuevaPagina, preparar, jugar} = require('./comun');
(async () => {
  const b = await chromium.launch();
  for (const [nombre, opts] of [['pc', {viewport: {width: 1280, height: 860}}], ['movil', devices['Pixel 7']]]) {
    const ctx = await b.newContext(opts); const errs = [];
    const p = await nuevaPagina(ctx, errs, nombre);
    await preparar(p);
    await p.waitForTimeout(300);
    await p.screenshot({path: SHOTS + `v3-inicio-${nombre}.png`});
    const txt = await p.textContent('#app');
    if (/null/.test(txt)) errs.push('texto null en inicio');
    // Avatares
    await p.click('.mp-tarjeta[data-id=gacha]'); await p.waitForSelector('.avatares-grid');
    const n = await p.$$eval('.avatar-carta', e => e.length);
    const nombres = await p.$$eval('.avatar-carta .avatar-nombre', e => e.map(x => x.textContent));
    const bloqueados = await p.$$eval('.avatar-carta.bloqueado', e => e.length);
    console.log(nombre, 'avatares', n, 'bloqueados', bloqueados, nombres.slice(0, 5).join(','));
    await p.screenshot({path: SHOTS + `v3-avatares-${nombre}.png`});
    // Filtro Johto
    await p.click('.filtro-input'); await p.waitForTimeout(100);
    console.log(nombre, 'sugerencias', await p.$$eval('.filtro-sugerencias .sug', e => e.length));
    await p.fill('.filtro-input', 'joh'); await p.keyboard.press('Enter'); await p.waitForTimeout(100);
    console.log(nombre, 'johto', await p.$$eval('.avatar-carta', e => e.length));
    await p.fill('.filtro-input', 'líd'); await p.keyboard.press('Enter'); await p.waitForTimeout(100);
    console.log(nombre, 'johto+lideres', await p.$$eval('.avatar-carta', e => e.length), await p.$$eval('.filtros-chips .chip-filtro', e => e.map(x => x.textContent)));
    await p.keyboard.press('Escape');
    await p.screenshot({path: SHOTS + `v3-filtros-${nombre}.png`});
    await p.click('.chip-limpiar');
    // Dar fichas y abrir
    await p.evaluate(() => { const c = JSON.parse(localStorage.getItem('cnx.coleccion.v1') || '{}'); c.fichas = 12; localStorage.setItem('cnx.coleccion.v1', JSON.stringify(c)); });
    await p.reload(); await p.waitForSelector('.mp-fila'); await p.click('.mp-tarjeta[data-id=gacha]'); await p.waitForSelector('.gacha-botones');
    await p.click('.gacha-botones .btn >> nth=0'); await p.waitForSelector('.gacha-premio', {timeout: 5000});
    await p.screenshot({path: SHOTS + `v3-gacha1-${nombre}.png`});
    await p.click('.gacha-caja .btn-sec');
    await p.click('.gacha-botones .btn >> nth=1'); await p.waitForSelector('.gacha-premio', {timeout: 5000});
    await p.waitForTimeout(900);
    await p.screenshot({path: SHOTS + `v3-gacha10-${nombre}.png`});
    await p.click('.gacha-caja .btn-sec');
    const col = await p.evaluate(() => JSON.parse(localStorage.getItem('cnx.coleccion.v1')));
    console.log(nombre, 'fichas', col.fichas, 'tengo', Object.keys(col.tengo).length, 'tiradas', col.tiradas);
    // Elegir un avatar que no sea Sombra
    const otro = await p.$('.avatar-carta:not(.bloqueado):not(.elegido)');
    if (otro) { await otro.click(); await p.waitForTimeout(100); }
    const actual = await p.evaluate(() => JSON.parse(localStorage.getItem('cnx.coleccion.v1')).avatar);
    console.log(nombre, 'avatar elegido', actual);
    await p.screenshot({path: SHOTS + `v3-avatares2-${nombre}.png`});
    // Créditos
    await p.click('header .btn-sec'); await p.waitForSelector('.mp-fila');
    await p.click('.mp-tarjeta[data-id=creditos]'); await p.waitForSelector('.creditos');
    await p.screenshot({path: SHOTS + `v3-creditos-${nombre}.png`, fullPage: true});
    // Pokédex: créditos en la ficha
    await p.click('header .btn-sec'); await p.waitForSelector('.mp-fila');
    await p.click('.mp-tarjeta[data-id=pokedex]'); await p.waitForSelector('.dex-grid');
    const cred = await p.$$eval('.dex-creditos', e => e.map(x => x.textContent));
    console.log(nombre, 'dex creditos', cred.length, cred.find(c => /Doctor/.test(c)) ? 'con Doctor' : 'SIN Doctor');
    const heroeon = await p.evaluate(() => [...document.querySelectorAll('.dex-tarjeta')].filter(t => /Heroeon|Dracoreon|Draglett|Dragtrio/.test(t.querySelector('.dex-nombre').textContent)).map(t => t.querySelector('.dex-nombre').textContent + ': ' + t.querySelector('.dex-creditos').textContent));
    console.log(nombre, heroeon.join(' | '));
    // Combate contra la IA
    await p.click('header .btn-sec'); await p.waitForSelector('.mp-fila');
    await p.click('.mp-tarjeta[data-id=practica]'); await p.waitForSelector('.btn-grande');
    const txt2 = await p.textContent('#app'); if (/null/.test(txt2)) errs.push('texto null en práctica');
    await p.click('.btn-grande');
    await p.waitForSelector('.vs-capa', {timeout: 5000}).catch(() => errs.push('sin presentación VS'));
    await p.waitForTimeout(400);
    await p.screenshot({path: SHOTS + `v3-vs-${nombre}.png`});
    await p.waitForSelector('.controles button.btn-movimiento, .controles button.btn-cambio', {timeout: 20000});
    await p.waitForTimeout(2500);
    await p.screenshot({path: SHOTS + `v3-combate-${nombre}.png`});
    console.log(nombre, 'avatares en combate', await p.$$eval('.avatar-busto.en-combate', e => e.length));
    await jugar(p, 600, -1);
    await p.waitForTimeout(600);
    console.log(nombre, 'fin', await p.textContent('.fin-combate').catch(() => '?'));
    console.log(nombre, 'niveles', await p.evaluate(() => localStorage.getItem('cnx.niveles.v1')));
    await p.screenshot({path: SHOTS + `v3-fin-${nombre}.png`});
    console.log(nombre, 'errores', errs);
    await ctx.close();
  }
  await b.close();
})();

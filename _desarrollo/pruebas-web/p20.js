// Iconos del equipo rival con ficha + estado, y botón de movimiento anulado
const {chromium, devices} = require('playwright');
const {SHOTS, nuevaPagina} = require('./comun');
const set = (species, moves, item = '') => ({species, item, ability: '', moves, name: '', nature: 'Hardy', evs: {hp: 84, atk: 84, def: 84, spa: 84, spd: 84, spe: 84}, ivs: {hp: 31, atk: 31, def: 31, spa: 31, spd: 31, spe: 31}, level: 100, gender: '', shiny: false, teraType: 'Normal'});
// Yo: Breloom (Espora) y Snorlax; IA: Gengar (Anulación) y Chansey
const EQ = [{id: 'a', nombre: 'A', formato: 'singles', sets: [set('Breloom', ['Spore', 'Tackle']), set('Snorlax', ['Tackle', 'Rest'])]},
  {id: 'b', nombre: 'B', formato: 'singles', sets: [set('Chansey', ['Splash']), set('Gengar', ['Disable'])]}];
(async () => {
  const b = await chromium.launch();
  for (const [nombre, opts] of [['pc', {viewport: {width: 1280, height: 860}}], ['movil', devices['Pixel 7']]]) {
    const ctx = await b.newContext(opts); const errs = [];
    const p = await nuevaPagina(ctx, errs, nombre);
    await p.goto('http://127.0.0.1:8080/index.html');
    await p.evaluate(eq => { localStorage.setItem('cnx.equipos.v1', JSON.stringify(eq)); localStorage.setItem('cnx.rapido', 'true'); localStorage.setItem('cnx.modoPractica', '"mio-vs-mio"'); localStorage.setItem('cnx.seriePractica', '"uno"'); localStorage.setItem('cnx.ultimoEquipo', '"a"'); }, EQ);
    await p.reload(); await p.waitForSelector('.mp-fila');
    await p.click('.mp-tarjeta[data-id=practica]'); await p.waitForTimeout(300);
    await p.selectOption('.formulario select >> nth=3', 'b');
    await p.click('button.btn-grande');
    await p.waitForSelector('.controles button.btn-cambio'); await p.click('.controles button.btn-cambio >> nth=0'); // Breloom
    const mov = async n => { await p.waitForSelector('.controles button.btn-movimiento:not([disabled])', {timeout: 20000}); await p.click(`.controles button.btn-movimiento >> nth=${n}`); };
    await mov(0); // Espora a Chansey
    await p.waitForSelector('.controles button.btn-movimiento:not([disabled])', {timeout: 20000});
    // La IA no cambia sola: forzamos que Gengar entre más tarde. Miramos el icono de Chansey dormida
    await p.waitForTimeout(400);
    const estados = await p.$$eval('.equipo-iconos.rival .icono-estado', e => e.map(x => x.textContent));
    console.log(nombre, 'estado en iconos del rival:', estados);
    const ic = await p.$('.equipo-iconos.rival .icono-eq');
    if (nombre === 'pc') await ic.hover(); else await ic.tap();
    await p.waitForTimeout(500);
    console.log(nombre, 'ficha del icono:', (await p.$$eval('.info-flotante.visible', e => e.map(x => x.textContent.slice(0, 80))))[0] || 'NADA');
    await p.screenshot({path: SHOTS + `iconos-rival-${nombre}.png`});
    console.log(nombre, 'errores', errs); await ctx.close();
  }
  await b.close();
})();

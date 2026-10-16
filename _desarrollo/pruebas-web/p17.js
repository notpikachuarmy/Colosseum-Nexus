const {chromium, devices} = require('playwright');
const {SHOTS, nuevaPagina} = require('./comun');
const set = (species, moves, ability = '') => ({species, item: 'Leftovers', ability, moves, name: '', nature: 'Hardy', evs: {hp: 84, atk: 84, def: 84, spa: 84, spd: 84, spe: 84}, ivs: {hp: 31, atk: 31, def: 31, spa: 31, spd: 31, spe: 31}, level: 100, gender: '', shiny: false, teraType: 'Normal'});
const EQ = [{id: 'h', nombre: 'Trampas', formato: 'singles', sets: [set('Glimmora', ['Spikes', 'Toxic Spikes', 'Stealth Rock', 'Protect'], 'Toxic Debris'), set('Skarmory', ['Spikes', 'Roost', 'Brave Bird', 'Whirlwind']), set('Snorlax', ['Body Slam', 'Rest', 'Curse', 'Earthquake']), set('Chansey', ['Soft-Boiled', 'Seismic Toss', 'Toxic', 'Protect']), set('Gengar', ['Shadow Ball', 'Sludge Bomb', 'Focus Blast', 'Protect']), set('Lucario', ['Aura Sphere', 'Flash Cannon', 'Vacuum Wave', 'Nasty Plot'])]}];
(async () => {
  const b = await chromium.launch();
  for (const [nombre, opts] of [['pc', {viewport: {width: 1280, height: 860}}], ['movil', devices['Pixel 7']]]) {
    const ctx = await b.newContext(opts); const errs = [];
    const p = await nuevaPagina(ctx, errs, nombre);
    await p.goto('http://127.0.0.1:8080/index.html');
    await p.evaluate(eq => { localStorage.setItem('cnx.equipos.v1', JSON.stringify(eq)); localStorage.setItem('cnx.rapido', 'true'); localStorage.setItem('cnx.modoPractica', '"mio-vs-aleatorio"'); localStorage.setItem('cnx.seriePractica', '"uno"'); }, EQ);
    await p.reload(); await p.waitForSelector('.mp-fila');
    await p.click('.mp-tarjeta[data-id=practica]'); await p.waitForTimeout(300);
    await p.click('button.btn-grande');
    await p.waitForSelector('.controles button.btn-cambio'); await p.click('.controles button.btn-cambio >> nth=0');
    for (const n of [0, 1, 0]) {
      const el = await p.waitForSelector('.controles button.btn-movimiento:not([disabled]), .controles button.btn-cambio:not([disabled])', {timeout: 30000}).catch(() => null);
      if (!el) break;
      if (await p.$('.controles button.btn-movimiento:not([disabled])')) await p.click(`.controles button.btn-movimiento >> nth=${n}`);
      else await el.click();
      await p.waitForTimeout(2500);
    }
    console.log(nombre, await p.$$eval('.fila-lado', els => els.map(e => e.textContent)));
    await p.screenshot({path: SHOTS + 'trampas-' + nombre + '.png'});
    console.log('errores', errs); await ctx.close();
  }
  await b.close();
})();

// Fase 2: menú principal, ajustes, práctica contra holoentrenadores e interruptores de poderes online
const {chromium, devices} = require('playwright');
const {SHOTS, nuevaPagina, preparar} = require('./comun');
const fallos = []; const ok = (n, c) => { console.log((c ? 'OK  ' : 'FAIL') + ' ' + n); if (!c) fallos.push(n); };
(async () => {
  const b = await chromium.launch();
  for (const [nombre, opts] of [['pc', {viewport: {width: 1280, height: 860}}], ['movil', devices['Pixel 7']], ['tablet', {viewport: {width: 820, height: 1100}}]]) {
    const ctx = await b.newContext(opts); const errs = [];
    const p = await nuevaPagina(ctx, errs, nombre);
    await preparar(p); await p.waitForTimeout(400);
    await p.screenshot({path: SHOTS + `menu-${nombre}.png`});
    const ids = await p.$$eval('.mp-tarjeta', e => e.map(x => x.dataset.id));
    ok(`${nombre}: 7 opciones en orden`, ids.join(',') === 'online,practica,equipos,historia,pokedex,gacha,creditos');
    // Todas visibles dentro de la pantalla (sin cortes ni scroll horizontal)
    const vis = await p.$$eval('.mp-tarjeta', e => e.every(x => { const r = x.getBoundingClientRect(); return r.width > 40 && r.left >= -1 && r.right <= innerWidth + 1; }));
    ok(`${nombre}: todas las tarjetas caben`, vis);
    ok(`${nombre}: sin scroll horizontal`, await p.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1));
    ok(`${nombre}: logo, perfil y ajustes`, !!(await p.$('.mp-logo img')) && !!(await p.$('.mp-perfil')) && !!(await p.$('.mp-ajustes')));
    const fondo1 = await p.$$eval('.mp-poke img', e => e.map(x => x.alt || x.src));
    ok(`${nombre}: 3 Pokémon de fondo`, fondo1.length === 3 || (nombre === 'movil' && fondo1.length === 3));
    // Volver al menú: mismos Pokémon de fondo
    await p.click('.mp-tarjeta[data-id=pokedex]'); await p.waitForSelector('.dex-grid');
    await p.click('header .btn-sec'); await p.waitForSelector('.mp-fila');
    const fondo2 = await p.$$eval('.mp-poke img', e => e.map(x => x.alt || x.src));
    ok(`${nombre}: el fondo se mantiene al volver`, fondo1.join() === fondo2.join());
    if (nombre === 'pc') {
      // Teclado
      await p.focus('.mp-tarjeta[data-id=online]'); await p.keyboard.press('ArrowRight'); await p.keyboard.press('ArrowRight');
      ok('flechas del teclado', await p.evaluate(() => document.activeElement?.dataset?.id) === 'equipos');
      ok('descripción de la opción', (await p.textContent('.mp-descripcion')).length > 5);
      // Historia: ya está disponible (Fase 10) y se vuelve al menú
      await p.click('.mp-tarjeta[data-id=historia]'); await p.waitForSelector('.hist-cap');
      ok('historia abre la lista de historias', (await p.$$('.hist-cap')).length === 2);
      await p.click('text=← Inicio'); await p.waitForSelector('.mp-fila');
      // Ajustes: volumen y nombre se guardan
      await p.click('.mp-ajustes'); await p.waitForSelector('.modal.ajustes');
      await p.screenshot({path: SHOTS + 'ajustes.png'});
      await p.$eval('.vol-barra', el => { el.value = '25'; el.dispatchEvent(new Event('input')); });
      await p.fill('.modal.ajustes .input', 'Arga'); await p.press('.modal.ajustes .input', 'Enter'); await p.keyboard.press('Tab');
      await p.click('.modal.ajustes .fin-botones .btn');
      await p.reload(); await p.waitForSelector('.mp-fila');
      const aj = await p.evaluate(() => JSON.parse(localStorage.getItem('cnx.ajustes')));
      ok('volumen guardado tras recargar: ' + JSON.stringify(aj), aj.volumen === 25);
      ok('nombre nuevo en el perfil', (await p.textContent('.mp-perfil')).includes('Arga'));
      // Práctica: el rival es un holoentrenador
      await p.click('.mp-tarjeta[data-id=practica]'); await p.waitForSelector('.btn-grande');
      ok('título "Combate de práctica"', (await p.textContent('h2')).includes('Combate de práctica'));
      await p.click('.btn-grande');
      await p.waitForFunction(() => { const j = document.querySelector('.equipo-iconos.rival .jugador'); return j && j.textContent && !/^p2/.test(j.textContent); }, null, {timeout: 15000});
      const rival = await p.textContent('.equipo-iconos.rival .jugador');
      ok('rival holoentrenador: ' + rival, /Holograma/.test(rival));
    }
    ok(`${nombre}: sin errores`, !errs.length); if (errs.length) console.log(errs);
    await ctx.close();
  }
  // Online: el anfitrión quita Dinamax y Teracristal
  const ctx = await b.newContext({viewport: {width: 1280, height: 800}}); const errs = [];
  const host = await nuevaPagina(ctx, errs, 'HOST'); const guest = await nuevaPagina(ctx, errs, 'GUEST');
  await preparar(host, 'http://127.0.0.1:8080/index.html?local=1', 'Ana');
  await host.evaluate(() => localStorage.removeItem('cnx.sinPoderes'));
  await host.click('.mp-tarjeta[data-id=online]'); await host.click('button:has-text("Crear sala")');
  await host.waitForFunction(() => /^[A-Z0-9]{5}$/.test(document.querySelector('.codigo-grande')?.textContent || ''));
  const codigo = await host.$eval('.codigo-grande', e => e.textContent);
  await host.selectOption('.formulario select >> nth=1', 'aleatorio');
  await guest.goto('http://127.0.0.1:8080/index.html?local=1'); await guest.waitForSelector('.mp-fila');
  await guest.click('.mp-tarjeta[data-id=online]'); await guest.fill('.input-codigo', codigo); await guest.click('button:has-text("Unirse")');
  await host.waitForSelector('text=está en la sala');
  await host.click('.poder-chip:has-text("Dinamax") input'); await host.click('.poder-chip:has-text("Teracristal") input');
  await guest.waitForTimeout(500);
  const txt = await guest.textContent('.formulario');
  ok('el invitado ve los poderes de la sala', /Poderes: Megaevolución, Movimientos Z/.test(txt));
  await host.screenshot({path: SHOTS + 'sala-poderes.png'});
  await host.click('text=¡Empezar combate!');
  for (const p of [host, guest]) { const c = await p.waitForSelector('.controles .btn-cambio:not([disabled])', {timeout: 20000}); await c.click(); }
  for (const p of [host, guest]) await p.waitForSelector('.controles .btn-movimiento:not([disabled])', {timeout: 20000});
  await host.waitForTimeout(500);
  const poderes = await Promise.all([host, guest].map(p => p.$$eval('.btn-poder', e => e.map(x => x.textContent))));
  ok('sin botones de Dinamax ni Tera: ' + JSON.stringify(poderes), poderes.every(l => !l.some(t => /Dinamax|Teracristal/.test(t))));
  ok('aviso en el registro', (await guest.textContent('.registro-lineas')).includes('Desactivado en esta sala'));
  ok('online sin errores', !errs.length); if (errs.length) console.log(errs);
  await b.close();
  console.log(fallos.length ? fallos.length + ' FALLOS' : 'Todo OK'); process.exit(fallos.length ? 1 : 0);
})();

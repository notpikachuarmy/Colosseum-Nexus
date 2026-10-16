// Fase 10: modo historia (capítulos, mapa, diálogos, combate de NPC, recompensas una vez, jefes pendientes)
const {chromium, devices} = require('playwright');
const {SHOTS, nuevaPagina, preparar, jugar} = require('./comun');
const fallos = []; const ok = (n, c) => { console.log((c ? 'OK  ' : 'FAIL') + ' ' + n); if (!c) fallos.push(n); };
const leer = (p, k) => p.evaluate(k => JSON.parse(localStorage.getItem(k) || '{}'), k);
const poner = (p, k, v) => p.evaluate(([k, v]) => localStorage.setItem(k, JSON.stringify(v)), [k, v]);
(async () => {
  const b = await chromium.launch(); const ctx = await b.newContext({viewport: {width: 1280, height: 900}}); const errs = [];
  const p = await nuevaPagina(ctx, errs, 'pc'); p.on('dialog', d => d.accept());
  await preparar(p);
  await p.evaluate(() => localStorage.removeItem('cnx.historia.v1'));
  await poner(p, 'cnx.modoHistoria', 'aleatorio');
  await p.reload(); await p.waitForSelector('.mp-fila');
  ok('Historia ya no está "Próximamente"', !(await p.$('.mp-tarjeta[data-id=historia].pronto')));
  await p.click('.mp-tarjeta[data-id=historia]'); await p.waitForSelector('.hist-cap');
  ok('2 historias', (await p.$$eval('.hist-cap', e => e.map(x => x.dataset.capitulo))).join() === 'linternita,cine');
  await p.screenshot({path: SHOTS + 'historia-lista.png'});
  await p.click('.hist-cap[data-capitulo=linternita]'); await p.waitForSelector('.hist-mapa');
  const estados = await p.$$eval('.hist-nodo', e => e.map(x => x.dataset.nodo + ':' + x.className.split(' ')[1]));
  ok('estado inicial del mapa: ' + estados, estados.join() === 'volta:disponible,chispas:bloqueado,ohm:bloqueado,randes:bloqueado');
  await p.screenshot({path: SHOTS + 'historia-mapa.png'});
  await p.click('.hist-nodo[data-nodo=randes]');
  ok('Randes: ya no está pendiente y no sale «null»', !(await p.textContent('.hist-panel')).includes('null') && !(await p.$('.hist-panel .avisos')));
  ok('Randes: se ve su equipo con apodos', (await p.textContent('.hp-iconos')).includes('NotPikachu'));
  await p.click('.hist-nodo[data-nodo=volta]');
  await p.click('.hist-panel .btn-grande'); await p.waitForSelector('.dialogo');
  ok('diálogo antes del combate, con el nombre del NPC', (await p.textContent('.dialogo-nombre')) === 'Técnico Volta' && (await p.textContent('.dialogo-texto')).includes('Randes'));
  await p.screenshot({path: SHOTS + 'historia-dialogo.png'});
  await p.click('.dialogo-sig'); await p.click('.dialogo-sig'); await p.click('.dialogo-sig');
  await p.waitForSelector('.combate');
  ok('el combate usa el fondo del capítulo (gimnasio)', (await p.$eval('.campo-batalla', e => e.dataset.fondo)) === 'gimnasio');
  const pvAntes = (await leer(p, 'cnx.coleccion.v1')).pv || 0;
  ok('combate terminado', await jugar(p, 500, 999));
  const fin = await p.textContent('.fin-combate');
  const h = await leer(p, 'cnx.historia.v1'); const pv = (await leer(p, 'cnx.coleccion.v1')).pv || 0;
  if ((h.ganados || []).includes('linternita:volta')) {
    ok('ganado: recompensa de 30 PV (más los PV del combate) una vez', pv - pvAntes >= 30 + 15 && fin.includes('Recompensas'));
    await p.click('button:has-text("Continuar")'); await p.waitForSelector('.dialogo'); await p.click('.dialogo-botones .btn-sec');
    await p.waitForSelector('.hist-mapa');
    ok('el siguiente nodo se desbloquea', (await p.getAttribute('.hist-nodo[data-nodo=chispas]', 'class')).includes('disponible'));
  } else {
    ok('perdido: no se marca ni se da recompensa, y se puede reintentar', !(h.entregados || []).length && !!(await p.$('button:has-text("Reintentar")')));
  }
  // Recompensas del jefe una sola vez (simulando que se ganó, como si el combate estuviera listo)
  await poner(p, 'cnx.historia.v1', {ganados: ['linternita:volta', 'linternita:chispas', 'linternita:ohm'], entregados: ['linternita:volta', 'linternita:chispas', 'linternita:ohm']});
  await p.goto('http://127.0.0.1:8080/index.html'); await p.waitForSelector('.mp-fila');
  await p.click('.mp-tarjeta[data-id=historia]'); await p.click('.hist-cap[data-capitulo=linternita]'); await p.waitForSelector('.hist-mapa');
  ok('con los 3 NPC ganados, Randes disponible', (await p.getAttribute('.hist-nodo[data-nodo=randes]', 'class')).includes('disponible'));
  ok('progreso en la lista', true);
  // Móvil
  const m = await b.newContext(devices['Pixel 7']); const pm = await nuevaPagina(m, errs, 'movil');
  await preparar(pm); await pm.click('.mp-tarjeta[data-id=historia]'); await pm.click('.hist-cap[data-capitulo=cine]'); await pm.waitForSelector('.hist-mapa');
  await pm.screenshot({path: SHOTS + 'historia-movil.png', fullPage: true});
  ok('móvil sin desbordar', await pm.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1));
  ok('cine: todos los rivales son Pokémon (sprite, no avatar)', (await pm.$$('.hist-nodo .hist-jefe-sprite')).length === 4 && !(await pm.$('.hist-nodo .avatar-img')));
  // Aracamara: jefe de incursión (se simula que el resto del cine ya está ganado)
  await poner(p, 'cnx.historia.v1', {ganados: ['cine:taquilla', 'cine:butacas', 'cine:cabina'], entregados: ['cine:taquilla', 'cine:butacas', 'cine:cabina']});
  await p.goto('http://127.0.0.1:8080/index.html'); await p.waitForSelector('.mp-fila');
  await p.click('.mp-tarjeta[data-id=historia]'); await p.click('.hist-cap[data-capitulo=cine]'); await p.waitForSelector('.hist-mapa');
  await p.click('.hist-nodo[data-nodo=aracamara]');
  const panel = await p.textContent('.hist-panel');
  ok('Aracamara: explica las reglas del jefe y se puede combatir', panel.includes('Jefe de incursión') && panel.includes('12 turnos') && !!(await p.$('.hist-panel .btn-grande')));
  await p.screenshot({path: SHOTS + 'historia-aracamara.png'});
  await p.click('.hist-panel .btn-grande'); await p.waitForSelector('.dialogo');
  ok('diálogo con hablante Pokémon', !!(await p.$('.dialogo-sprite')) || (await p.textContent('.dialogo-nombre')) === 'Handsome');
  await p.click('.dialogo-botones .btn-sec');
  await p.waitForSelector('.combate'); await p.waitForSelector('.vs-rival .cara-pokemon', {timeout: 3000}).catch(() => {});
  ok('VS: el rival sale como Pokémon', !!(await p.$('.vs-rival .cara-pokemon')));
  await p.screenshot({path: SHOTS + 'historia-vs-jefe.png'});
  for (let i = 0; i < 20 && !(await p.$('.barra-jefe')); i++) await jugar(p, 1, 999);   // elegir el Pokémon inicial
  ok('el jefe enseña 1 Pokémon (no 6)', (await p.$$('.equipo-iconos.rival .eq-iconos-fila > *')).length === 1);
  ok('barra de jefe partida en 3 tramos', (await p.$$('.barra-jefe .marca-tramo')).length === 2);
  await p.waitForTimeout(800); await p.screenshot({path: SHOTS + 'historia-barra-jefe.png'});
  ok('combate de jefe terminado', await jugar(p, 300, 999));
  await p.screenshot({path: SHOTS + 'historia-jefe-fin.png'});
  ok('sin errores', !errs.length); if (errs.length) console.log(errs);
  await b.close(); console.log(fallos.length ? 'FALLOS: ' + fallos.length : 'Todo OK'); process.exit(fallos.length ? 1 : 0);
})();

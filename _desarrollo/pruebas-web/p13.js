// Pokédex: pestañas visibles, textos quitados, nombres «Jagara» y exportador PBS oculto (Ctrl+Alt+Ñ / #pbs)
const {chromium} = require('playwright');
const {SHOTS, nuevaPagina, preparar} = require('./comun');
(async () => {
  const b = await chromium.launch(); const ctx = await b.newContext({viewport: {width: 1280, height: 900}});
  const errs = []; const p = await nuevaPagina(ctx, errs, 'A'); await preparar(p);
  const fallos = [];
  const ok = (n, c) => { console.log((c ? 'OK  ' : 'FAIL') + ' ' + n); if (!c) fallos.push(n); };
  ok('título de la pestaña', (await p.title()) === 'Colosseum Nexus');
  ok('sin el subtítulo antiguo', !(await p.textContent('#app')).includes('Combates Pokémon con tus criaturas'));
  await p.click('.mp-tarjeta[data-id=pokedex]');
  const pestanas = await p.$$eval('.tabs .tab', e => e.map(x => x.textContent));
  ok('sin pestaña PBS visible: ' + pestanas.join(','), !pestanas.some(t => /PBS/.test(t)));
  for (const t of ['Pokémon', 'Movimientos', 'Habilidades', 'Objetos']) {
    await p.click(`.tabs .tab:has-text("${t}")`); await p.waitForTimeout(300);
    const txt = await p.textContent('#app');
    ok(`${t}: sin textos de datos/*.js`, !/datos\/(pokemon|movimientos|objetos)\.js/.test(txt));
  }
  await p.click('.tabs .tab:has-text("Pokémon")'); await p.waitForTimeout(300);
  const nombres = await p.$$eval('.dex-nombre', e => e.map(x => x.textContent));
  ok('Diglett Jagara en la Pokédex', nombres.includes('Diglett Jagara'));
  ok('Hoopa Jagara en la Pokédex', nombres.includes('Hoopa Jagara'));
  ok('ninguno con (Custom)', !nombres.some(n => /Custom/.test(n)));
  await p.screenshot({path: SHOTS + 'dex-jagara.png'});
  // Atajo con un campo de texto enfocado: no debe abrir nada
  await p.focus('.buscador'); await p.keyboard.press('Control+Alt+Semicolon'); await p.waitForTimeout(300);
  ok('el atajo no se activa escribiendo', !(await p.$('.pbs-archivo')));
  // Atajo fuera de campos de texto
  await p.click('h2'); await p.keyboard.press('Control+Alt+Semicolon'); await p.waitForTimeout(500);
  ok('Ctrl+Alt+Ñ abre el exportador', !!(await p.$('.pbs-archivo')));
  const [dl] = await Promise.all([p.waitForEvent('download'), p.click('.pbs-archivo >> nth=0 >> text=Descargar')]);
  ok('descarga ' + dl.suggestedFilename(), /pokemon/.test(dl.suggestedFilename()));
  // Volver a la Pokédex normal: la pestaña PBS desaparece
  await p.click('text=Inicio'); await p.click('.mp-tarjeta[data-id=pokedex]'); await p.waitForTimeout(300);
  ok('al volver a la Pokédex no hay PBS', !(await p.$$eval('.tabs .tab', e => e.map(x => x.textContent))).some(t => /PBS/.test(t)));
  // Alternativa: #pbs en la dirección
  await p.goto('http://127.0.0.1:8080/index.html#pbs'); await p.waitForSelector('.pbs-archivo', {timeout: 5000}).catch(() => {});
  ok('#pbs en la dirección abre el exportador', !!(await p.$('.pbs-archivo')));
  ok('sin errores en la página', !errs.length);
  console.log(fallos.length ? fallos.length + ' FALLOS' : 'Todo OK', errs); await b.close();
  process.exit(fallos.length ? 1 : 0);
})();

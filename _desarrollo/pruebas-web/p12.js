const {chromium} = require('playwright');
const {SHOTS, nuevaPagina, preparar, jugar} = require('./comun');
(async () => {
  const browser = await chromium.launch();
  const ctx = await browser.newContext({viewport: {width: 1280, height: 800}});
  const errs = [];
  const host = await nuevaPagina(ctx, errs, 'HOST');
  const guest = await nuevaPagina(ctx, errs, 'GUEST');
  for (const p of [host, guest]) p.on('dialog', d => d.accept());
  await preparar(host, 'http://127.0.0.1:8080/index.html?local=1', 'Ana');
  await host.click('.mp-tarjeta[data-id=online]');
  await host.click('button:has-text("Crear sala")');
  await host.waitForFunction(() => /^[A-Z0-9]{5}$/.test(document.querySelector('.codigo-grande')?.textContent || ''));
  const codigo = await host.$eval('.codigo-grande', e => e.textContent);
  await host.selectOption('.formulario select >> nth=0', 'uno');
  await host.waitForTimeout(150);
  await host.selectOption('.formulario select >> nth=1', 'aleatorio');
  const unir = async () => {
    await guest.goto('http://127.0.0.1:8080/index.html?local=1');
    await guest.waitForSelector('.mp-fila');
    await guest.click('.mp-tarjeta[data-id=online]');
    await guest.fill('.input-codigo', codigo);
    await guest.click('button:has-text("Unirse")');
  };
  await unir();
  await host.waitForSelector('text=está en la sala');
  await host.click('text=¡Empezar combate!');
  // jugar unos turnos
  for (let t = 0; t < 4; t++) {
    for (const p of [host, guest]) {
      // Si solo un jugador tiene que cambiar de Pokémon (el otro espera), se salta al que no tiene nada que elegir
      const b = await p.waitForSelector('.controles .btn-movimiento:not([disabled]), .controles .btn-cambio:not([disabled])', {timeout: 8000}).catch(() => null);
      if (b) await b.click();
    }
    await host.waitForTimeout(1500);
  }
  const turnoAntes = await guest.$$eval('.linea.turno', e => e.length);
  // El invitado recarga la página (se cae) y vuelve a entrar
  await unir();
  await guest.waitForSelector('.campo-batalla', {timeout: 20000});
  await guest.waitForTimeout(2500);
  const turnoDespues = await guest.$$eval('.linea.turno', e => e.length);
  console.log('turnos vistos antes', turnoAntes, 'tras reconectar', turnoDespues);
  await guest.screenshot({path: SHOTS + 'v4-reconexion.png'});
  const hostLog = await host.$$eval('.linea.sistema', e => e.map(x => x.textContent));
  console.log('host log:', hostLog.slice(-2));
  const [a, b] = await Promise.all([jugar(host, 800, 999, 'x'), jugar(guest, 800, 999, 'x')]);
  console.log('fin', a, b);
  console.log('errores', errs.slice(0, 5));
  await browser.close();
})();

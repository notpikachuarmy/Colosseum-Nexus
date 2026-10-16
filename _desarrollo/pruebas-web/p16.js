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
  for (let t = 0; t < 2; t++) {
    for (const p of [host, guest]) {
      const b = await p.waitForSelector('.controles .btn-movimiento:not([disabled]), .controles .btn-cambio:not([disabled])', {timeout: 20000}).catch(() => null); if (!b) continue;
      await b.click();
    }
    await host.waitForTimeout(1500);
  }
  // El invitado sale con ⌂ Salir a mitad de combate → vuelve al inicio y el anfitrión gana
  await guest.click('text=⌂ Salir'); await guest.waitForTimeout(800);
  console.log('invitado en inicio:', await guest.isVisible('.mp-fila'));
  await host.waitForSelector('.fin-combate', {timeout: 20000}).catch(() => {});
  console.log('anfitrión fin:', await host.isVisible('.fin-combate'), (await host.textContent('.registro-lineas')).slice(-120));
  // Nuevo combate y ahora sale el anfitrión → el invitado recibe "ha cerrado la sala"
  await host.click('text=Salir'); await host.waitForTimeout(500);
  console.log('anfitrión en inicio:', await host.isVisible('.mp-fila'));
  console.log('ERRORES', errs); await browser.close();
})();

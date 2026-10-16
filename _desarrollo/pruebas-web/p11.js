const {chromium} = require('playwright');
const {SHOTS, nuevaPagina, preparar, jugar} = require('./comun');
async function elegir(p) {
  await p.waitForSelector('.sel-grid', {timeout: 20000});
  const n = (await p.$$('.sel-card')).length;
  if (!(await p.$('.sel-card.elegido'))) for (let i = 0; i < 6; i++) await p.click(`.sel-card >> nth=${i}`);
  await p.click('button:has-text("¡Listo!")');
}
(async () => {
  const browser = await chromium.launch();
  const ctx = await browser.newContext({viewport: {width: 1280, height: 800}});
  const errs = [];
  const host = await nuevaPagina(ctx, errs, 'HOST');
  const guest = await nuevaPagina(ctx, errs, 'GUEST');
  for (const p of [host, guest]) p.on('dialog', d => d.accept());
  await preparar(host, 'http://127.0.0.1:8080/index.html?local=1', 'Ana');
  await preparar(guest, 'http://127.0.0.1:8080/index.html?local=1', 'Ana');
  await host.click('.mp-tarjeta[data-id=online]');
  await host.click('button:has-text("Crear sala")');
  await host.waitForFunction(() => /^[A-Z0-9]{5}$/.test(document.querySelector('.codigo-grande')?.textContent || ''));
  const codigo = await host.$eval('.codigo-grande', e => e.textContent);
  await host.selectOption('.formulario select >> nth=0', 'draft');
  await host.waitForTimeout(200);
  await host.selectOption('.formulario select >> nth=1', 'aleatorio');
  await host.waitForTimeout(200);
  await guest.click('.mp-tarjeta[data-id=online]');
  await guest.fill('.input-codigo', codigo);
  await guest.click('button:has-text("Unirse")');
  await host.waitForSelector('text=está en la sala');
  await guest.waitForSelector('text=Conectado');
  await guest.screenshot({path: SHOTS + 'v4-guest-lobby.png'});
  await host.click('text=¡Empezar serie!');
  for (let juego = 1; juego <= 3; juego++) {
    await Promise.all([elegir(host), elegir(guest)]);
    const [a, b] = await Promise.all([jugar(host, 800, 999, 'x'), jugar(guest, 800, 999, 'x')]);
    const mh = await host.$eval('.fin-combate', e => e.innerText.replace(/\n/g, ' | ')).catch(() => '?');
    await guest.waitForTimeout(500);
    const mg = await guest.$eval('.fin-combate', e => e.innerText.replace(/\n/g, ' | ')).catch(() => '?');
    console.log('juego', juego, a, b, '\n  host:', mh, '\n  guest:', mg);
    const sig = await host.$('button:has-text("Siguiente combate")');
    if (!sig) break;
    await sig.click();
  }
  console.log('errores', errs.slice(0, 5));
  await browser.close();
})();

// Música de fondo: una pista para los menús y otra para los combates.
// - Solo suena una a la vez; al cambiar, una se apaga poco a poco y la otra entra.
// - Usa el volumen y el «silenciar» de Ajustes (se guardan en el navegador).
// - Los navegadores no dejan sonar nada hasta que la persona toca o pulsa algo,
//   así que la música empieza con la primera interacción.
import {ajustes, alCambiarAjustes} from './ajustes';

export type Pista = 'menu' | 'combate';
const ARCHIVOS: {[k in Pista]: string} = {menu: 'audio/menu.mp3', combate: 'audio/combate.mp3'};
const FUNDIDO_MS = 700;

const audios: Partial<{[k in Pista]: HTMLAudioElement}> = {};
let deseada: Pista = 'menu';
let actual: Pista | null = null;
let desbloqueado = false;
let programado = false;
const fundidos = new Map<HTMLAudioElement, number>();

/** Volumen real (0–1). La escala al cuadrado hace que la barra se sienta más natural. */
function volumenObjetivo() {
  const a = ajustes();
  if (a.silencio) return 0;
  const v = a.volumen / 100;
  return v * v;
}

function audio(p: Pista) {
  let a = audios[p];
  if (!a) {
    a = new Audio(ARCHIVOS[p]);
    a.loop = true;
    a.preload = 'auto';
    a.volume = 0;
    audios[p] = a;
  }
  return a;
}

function fundir(a: HTMLAudioElement, hasta: number, alAcabar?: () => void) {
  const previo = fundidos.get(a);
  if (previo) cancelAnimationFrame(previo);
  const desde = a.volume;
  const inicio = performance.now();
  const paso = (t: number) => {
    const k = Math.min(1, (t - inicio) / FUNDIDO_MS);
    a.volume = Math.max(0, Math.min(1, desde + (hasta - desde) * k));
    if (k < 1) fundidos.set(a, requestAnimationFrame(paso));
    else { fundidos.delete(a); alAcabar?.(); }
  };
  fundidos.set(a, requestAnimationFrame(paso));
}

function aplicar() {
  programado = false;
  if (!desbloqueado) return;
  const vol = volumenObjetivo();
  // Apagar lo que no toca
  for (const p of Object.keys(audios) as Pista[]) {
    const a = audios[p]!;
    if (p !== deseada || vol === 0 || document.hidden) {
      if (!a.paused) fundir(a, 0, () => { if (p !== deseada || volumenObjetivo() === 0 || document.hidden) a.pause(); });
    }
  }
  if (vol === 0 || document.hidden) { actual = null; return; }
  const a = audio(deseada);
  if (actual !== deseada) {
    // Una pista nueva empieza desde el principio; volver a la misma no la reinicia si sigue sonando
    if (a.paused) a.currentTime = 0;
    actual = deseada;
  }
  if (a.paused) a.play().catch(() => { /* el navegador aún no deja: se reintenta con la siguiente interacción */ desbloqueado = false; actual = null; });
  fundir(a, vol);
}

function programar() {
  // Se agrupan los cambios del mismo momento (p. ej. pasar por el menú y entrar directo a un combate)
  if (programado) return;
  programado = true;
  setTimeout(aplicar, 0);
}

/** Pide qué música debe sonar ahora */
export function musica(p: Pista) {
  deseada = p;
  programar();
}

let iniciada = false;
/** Prepara los avisos del navegador y de los ajustes. Se llama una vez al cargar. */
export function iniciarMusica() {
  if (iniciada) return;
  iniciada = true;
  const desbloquear = () => {
    if (desbloqueado) return;
    desbloqueado = true;
    programar();
  };
  for (const ev of ['pointerdown', 'keydown', 'touchend']) window.addEventListener(ev, desbloquear, {capture: true});
  alCambiarAjustes(() => programar());
  document.addEventListener('visibilitychange', () => programar());
  // Para las pruebas automáticas
  (window as any).cnxMusica = () => ({deseada, actual, desbloqueado,
    sonando: (Object.keys(audios) as Pista[]).filter(p => !audios[p]!.paused),
    volumen: Object.fromEntries((Object.keys(audios) as Pista[]).map(p => [p, +audios[p]!.volume.toFixed(2)]))});
}

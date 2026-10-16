// Ajustes del jugador (idioma, volumen, animaciones, nombre) y su ventana.
import {tr, IDIOMA, cambiarIdioma} from './idioma';
import {h, storage, toast} from './util';
import {nombreJugador} from './nucleo';

export interface Ajustes { volumen: number; silencio: boolean }
const CLAVE = 'cnx.ajustes';
const POR_DEFECTO: Ajustes = {volumen: 60, silencio: false};
const oyentes: ((a: Ajustes) => void)[] = [];

export function ajustes(): Ajustes {
  const a = storage.get<Partial<Ajustes>>(CLAVE, {});
  const vol = Number.isFinite(+a.volumen!) ? Math.max(0, Math.min(100, Math.round(+a.volumen!))) : POR_DEFECTO.volumen;
  return {volumen: vol, silencio: !!a.silencio};
}
export function guardarAjustes(cambios: Partial<Ajustes>) {
  const a = {...ajustes(), ...cambios};
  storage.set(CLAVE, a);
  for (const f of oyentes) { try { f(a); } catch (e) { console.error(e); } }
}
/** Avisar cuando cambian los ajustes (lo usará la música) */
export function alCambiarAjustes(f: (a: Ajustes) => void) { oyentes.push(f); }

/** Ventana de ajustes */
export function abrirAjustes(alCerrar?: () => void) {
  const a = ajustes();
  const fondo = h('div', {class: 'modal-fondo', role: 'dialog', 'aria-modal': 'true', 'aria-label': tr('Ajustes', 'Settings')});
  const cerrar = () => { fondo.remove(); document.removeEventListener('keydown', esc); alCerrar?.(); };
  const esc = (e: KeyboardEvent) => { if (e.key === 'Escape') cerrar(); };
  document.addEventListener('keydown', esc);

  const nombre = h('input', {class: 'input', value: nombreJugador(), placeholder: tr('Tu nombre de entrenador', 'Your trainer name'), maxlength: '18'});
  nombre.addEventListener('change', () => { storage.set('cnx.nombre', nombre.value.trim()); toast(tr('Nombre guardado', 'Name saved')); });

  const idioma = h('div', {class: 'selector-idioma'},
    ...([['es', 'Español'], ['en', 'English']] as const).map(([id, txt]) =>
      h('button', {class: 'idioma-btn' + (IDIOMA === id ? ' activo' : ''), onclick: () => { if (IDIOMA !== id) cambiarIdioma(id); }}, txt)));

  const valor = h('span', {class: 'vol-valor'}, a.volumen + '%');
  const vol = h('input', {type: 'range', min: '0', max: '100', step: '5', value: String(a.volumen), class: 'vol-barra', 'aria-label': tr('Volumen de la música', 'Music volume')});
  vol.addEventListener('input', () => { valor.textContent = vol.value + '%'; guardarAjustes({volumen: +vol.value}); });
  const mute = h('input', {type: 'checkbox', checked: a.silencio});
  mute.addEventListener('change', () => guardarAjustes({silencio: mute.checked}));
  const rapido = h('input', {type: 'checkbox', checked: storage.get('cnx.rapido', false)});
  rapido.addEventListener('change', () => storage.set('cnx.rapido', rapido.checked));

  const fila = (etq: string, ...control: any[]) => h('div', {class: 'ajuste-fila'}, h('span', {class: 'ajuste-etq'}, etq), h('div', {class: 'ajuste-control'}, ...control));
  fondo.append(h('div', {class: 'modal ajustes'},
    h('div', {class: 'modal-cab'}, h('h3', {}, tr('Ajustes', 'Settings')), h('button', {class: 'btn-x', 'aria-label': tr('Cerrar', 'Close'), onclick: cerrar}, '×')),
    fila(tr('Nombre de entrenador', 'Trainer name'), nombre),
    fila(tr('Idioma', 'Language'), idioma),
    fila(tr('Volumen de la música', 'Music volume'), vol, valor),
    fila(tr('Silenciar', 'Mute'), h('label', {class: 'toggle'}, mute, tr(' Sin sonido', ' No sound'))),
    fila(tr('Animaciones', 'Animations'), h('label', {class: 'toggle'}, rapido, tr(' Animaciones rápidas en combate', ' Fast battle animations'))),
    h('div', {class: 'fin-botones'}, h('button', {class: 'btn', onclick: cerrar}, tr('Listo', 'Done')))));
  fondo.addEventListener('click', e => { if (e.target === fondo) cerrar(); });
  document.body.append(fondo);
  nombre.focus();
}

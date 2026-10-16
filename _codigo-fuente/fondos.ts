// Fondos de combate desbloqueables y capas visuales del campo (tinte, peligros y clima).
// Todo esto es solo visual: se dibuja a partir del estado real del combate y no cambia ninguna regla.
import {tr} from './idioma';
import {h, storage} from './util';
import type {Estado, LadoId} from './estado';

export interface Fondo {id: string; nombre: string; imagen: string; origen: string; donde?: string}
const W: any = window;
export const FONDOS: Fondo[] = ((W.FONDOS || []) as any[]).filter(f => f && f.id && f.imagen).map(f => ({
  id: String(f.id), nombre: String(f.nombre || f.id), imagen: String(f.imagen), origen: String(f.origen || 'base'), donde: f.donde ? String(f.donde) : undefined,
}));
const CLIMA_IMG: {[k: string]: string} = W.CLIMA_IMAGEN || {};
const PELIGRO_IMG: {[k: string]: string} = W.PELIGROS_IMAGEN || {};
const TINTE = {opacidad: Math.min(1, Math.max(0, +(W.TINTE_CAMPO?.opacidad ?? 0.22))), colores: (W.TINTE_CAMPO?.colores || {}) as {[k: string]: string}};

// ---------------------------------------------------------------- guardado --
/** desbloqueados: fondos conseguidos (los 'base' siempre lo están) · elegido: id o 'azar' */
const CLAVE = 'cnx.fondos.v1';
function leer(): {desbloqueados: string[], elegido: string} {
  const g = storage.get<any>(CLAVE, {});
  const desbloqueados = Array.isArray(g.desbloqueados) ? g.desbloqueados.filter((x: any) => typeof x === 'string') : [];
  return {desbloqueados, elegido: typeof g.elegido === 'string' ? g.elegido : ''};
}
export const tieneFondo = (id: string) => { const f = FONDOS.find(x => x.id === id); return !!f && (f.origen === 'base' || leer().desbloqueados.includes(id)); };
export const fondosDisponibles = () => FONDOS.filter(f => tieneFondo(f.id));
/** Desbloquea un fondo (lo usará el modo historia o un pase) */
export function desbloquearFondo(id: string) {
  const e = leer();
  if (!e.desbloqueados.includes(id)) e.desbloqueados.push(id);
  storage.set(CLAVE, e);
}
/** El fondo elegido: un id desbloqueado o 'azar'. Si el guardado no vale, el primero disponible. */
export function fondoElegido(): string {
  const e = leer().elegido;
  if (e === 'azar' || tieneFondo(e)) return e;
  return fondosDisponibles()[0]?.id || '';
}
export function elegirFondo(id: string) {
  if (id !== 'azar' && !tieneFondo(id)) return;   // no se puede elegir uno bloqueado
  storage.set(CLAVE, {...leer(), elegido: id});
}
/** Fondo para un combate concreto (si es 'azar', uno al azar entre los desbloqueados) */
export function fondoParaCombate(): Fondo | undefined {
  const disp = fondosDisponibles();
  const e = fondoElegido();
  if (e === 'azar') return disp[Math.floor(Math.random() * disp.length)];
  return disp.find(f => f.id === e) || disp[0];
}

// ------------------------------------------------------------ capas del campo --
/** Capas: tinte del campo (debajo de los Pokémon), peligros de cada lado (en el suelo) y clima (encima) */
export function crearCapas() {
  const tinte = h('div', {class: 'capa-tinte', 'aria-hidden': 'true'});
  const peligros = {
    rival: h('div', {class: 'capa-peligros peligros-rival', 'aria-hidden': 'true'}),
    yo: h('div', {class: 'capa-peligros peligros-yo', 'aria-hidden': 'true'}),
  };
  const clima = h('div', {class: 'capa-clima', 'aria-hidden': 'true'});
  let firma = '';
  const actualizar = (e: Estado) => {
    const terreno = [...e.campo.keys()].find(k => k.endsWith('terrain') && TINTE.colores[k]) || '';
    const lado = (l: LadoId) => [...e.lados[l].condiciones.entries()].filter(([k]) => PELIGRO_IMG[k]).map(([k, n]) => `${k}:${n}`).join(',');
    const nueva = [terreno, CLIMA_IMG[e.clima] || '', lado(e.rival), lado(e.yo)].join('|');
    if (nueva === firma) return;    // nada ha cambiado: no se toca la página
    firma = nueva;
    tinte.style.background = terreno ? TINTE.colores[terreno] : 'transparent';
    tinte.style.opacity = terreno ? String(TINTE.opacidad) : '0';
    tinte.dataset.campo = terreno;
    const img = CLIMA_IMG[e.clima];
    clima.style.backgroundImage = img ? `url("${img}")` : 'none';
    clima.dataset.clima = img ? e.clima : '';
    for (const [quien, l] of [['rival', e.rival], ['yo', e.yo]] as const) {
      const cont = peligros[quien];
      cont.innerHTML = '';
      for (const [k, n] of e.lados[l].condiciones) {
        const src = PELIGRO_IMG[k];
        if (!src) continue;
        // Púas y púas tóxicas tienen capas (1-3 / 1-2): se dibuja una imagen por capa
        const veces = k === 'spikes' || k === 'toxicspikes' ? Math.max(1, Math.min(3, n)) : 1;
        for (let i = 0; i < veces; i++) cont.append(h('img', {class: 'peligro p-' + k, src, alt: '', draggable: 'false', 'data-peligro': k}));
      }
    }
  };
  return {tinte, peligros, clima, actualizar};
}

// --------------------------------------------------------------- selector --
/** Selector de fondo para el perfil: los desbloqueados se pueden elegir; los demás salen con candado */
export function selectorFondos(alCambiar?: () => void) {
  const raiz = h('div', {class: 'fondos-lista'});
  const pintar = () => {
    const elegido = fondoElegido();
    raiz.innerHTML = '';
    const tarjeta = (id: string, nombre: string, img: HTMLElement, bloqueado: string | null) => {
      const b = h('button', {class: 'fondo-carta' + (elegido === id ? ' elegido' : '') + (bloqueado ? ' bloqueado' : ''), 'data-fondo': id, disabled: !!bloqueado,
        title: bloqueado ? tr(`Bloqueado: ${bloqueado}`, `Locked: ${bloqueado}`) : nombre,
        onclick: () => { elegirFondo(id); pintar(); alCambiar?.(); }}, img, h('b', {}, (bloqueado ? '🔒 ' : '') + nombre), bloqueado ? h('small', {class: 'tenue'}, bloqueado) : null);
      return b;
    };
    raiz.append(tarjeta('azar', tr('Aleatorio', 'Random'), h('div', {class: 'fondo-azar'}, '?'), null));
    for (const f of FONDOS) raiz.append(tarjeta(f.id, f.nombre, h('img', {class: 'fondo-mini', src: f.imagen, alt: '', loading: 'lazy'}), tieneFondo(f.id) ? null : (f.donde || tr('Se consigue más adelante', 'Unlocked later'))));
  };
  pintar();
  return raiz;
}

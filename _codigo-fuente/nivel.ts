// Niveles de jugador: uno contra la IA y otro online (se guardan en el navegador).
import {tr} from './idioma';
import {h, storage} from './util';

export type TipoNivel = 'ia' | 'online';
interface Registro {xp: number; v: number; d: number}
const W: any = window;
const CFG = {
  ia: {victoria: 30, derrota: 10, serieGanada: 20, ...(W.NIVELES?.ia || {})},
  online: {victoria: 50, derrota: 15, serieGanada: 30, ...(W.NIVELES?.online || {})},
  nivelMaximo: W.NIVELES?.nivelMaximo || 100,
};
const CLAVE = 'arena.niveles.v1';

/** Experiencia necesaria para pasar del nivel n al n+1 */
export const xpParaSubir = (n: number) => 100 + 20 * (n - 1);

export function calcularNivel(xp: number) {
  let n = 1, resto = Math.max(0, Math.floor(xp));
  while (n < CFG.nivelMaximo && resto >= xpParaSubir(n)) { resto -= xpParaSubir(n); n++; }
  return {nivel: n, enNivel: resto, paraSiguiente: n >= CFG.nivelMaximo ? 0 : xpParaSubir(n)};
}

function leer(): {[t in TipoNivel]: Registro} {
  const g = storage.get<any>(CLAVE, {});
  const r = (x: any): Registro => ({xp: Math.max(0, Math.floor(+x?.xp || 0)), v: Math.max(0, +x?.v || 0), d: Math.max(0, +x?.d || 0)});
  return {ia: r(g.ia), online: r(g.online)};
}

export function perfil(tipo: TipoNivel) {
  const r = leer()[tipo];
  return {...r, ...calcularNivel(r.xp)};
}
export const nivelDe = (tipo: TipoNivel) => perfil(tipo).nivel;

/** Rango según el nivel (se ve junto al nivel) */
export function rango(n: number): {nombre: string, color: string} {
  if (n >= 75) return {nombre: tr('Tryhard 🔥', 'Tryhard 🔥'), color: '#ff5a5a'};
  if (n >= 50) return {nombre: tr('Campeón', 'Champion'), color: '#ffcb3d'};
  if (n >= 35) return {nombre: tr('Maestro', 'Master'), color: '#c77dff'};
  if (n >= 20) return {nombre: tr('As', 'Ace'), color: '#5bb8ff'};
  if (n >= 10) return {nombre: tr('Veterano', 'Veteran'), color: '#3ecf6e'};
  if (n >= 5) return {nombre: tr('Entrenador', 'Trainer'), color: '#9fd8a0'};
  return {nombre: tr('Novato', 'Rookie'), color: '#9aa0bf'};
}

/** Etiqueta pequeña: "🤖 Nv. 7" / "🌐 Nv. 12" */
export function insignia(tipo: TipoNivel, n: number, conRango = false) {
  const r = rango(n);
  return h('span', {class: 'insignia-nivel ' + tipo, style: {'--nc': r.color},
    title: (tipo === 'ia' ? tr('Nivel contra la IA', 'Level vs the AI') : tr('Nivel online (contra jugadores)', 'Online level (vs players)')) + ` · ${r.nombre}`},
    (tipo === 'ia' ? '🤖' : '🌐') + tr(' Nv. ', ' Lv. ') + n + (conRango ? ' · ' + r.nombre : ''));
}

/** Suma la experiencia de un combate. resultado: true = victoria, false = derrota */
export function registrarCombate(tipo: TipoNivel, gano: boolean, serieGanada = false) {
  const g = leer();
  const antes = calcularNivel(g[tipo].xp).nivel;
  const c = CFG[tipo];
  const xp = (gano ? c.victoria : c.derrota) + (serieGanada ? c.serieGanada : 0);
  g[tipo].xp += xp;
  if (gano) g[tipo].v++; else g[tipo].d++;
  storage.set(CLAVE, g);
  const despues = calcularNivel(g[tipo].xp);
  return {xp, antes, ...despues, subio: despues.nivel > antes};
}

/** Experiencia extra por ganar una serie (sin contar como combate) */
export function bonusSerie(tipo: TipoNivel) {
  const g = leer();
  const xp = CFG[tipo].serieGanada;
  g[tipo].xp += xp;
  storage.set(CLAVE, g);
  return xp;
}

/** Barra de progreso del nivel */
export function barraNivel(tipo: TipoNivel) {
  const p = perfil(tipo);
  const pct = p.paraSiguiente ? p.enNivel / p.paraSiguiente * 100 : 100;
  return h('div', {class: 'nivel-fila'},
    insignia(tipo, p.nivel, true),
    h('div', {class: 'nivel-barra'}, h('span', {style: {width: pct.toFixed(1) + '%'}})),
    h('small', {class: 'tenue'}, (p.paraSiguiente ? `${p.enNivel}/${p.paraSiguiente} XP` : tr('Nivel máximo', 'Max level')) + ` · ${p.v}V ${p.d}D`));
}

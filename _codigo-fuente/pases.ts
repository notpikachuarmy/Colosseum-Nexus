// Pases (experiencia de pase, recompensas por nivel) y Fakemon bloqueados. Los pases no caducan.
import {tr} from './idioma';
import {toID} from 'pkmn-sim';
import {h, storage, toast, dex, iconImg, nombreVisible} from './util';
import type {TipoNivel} from './nivel';
import {darTitulo} from './titulos';
import {AVATARES, ECO, cambiarColeccion, coleccion, avatarImg, iconoTicket, textoPV, RAREZAS, precioAvatarRareza} from './avatares';

export type TipoRecompensa = 'avatar' | 'tickets' | 'pokemon' | 'titulo';
export interface Recompensa {tipo: TipoRecompensa; id?: string; n?: number; especies?: string[]; nombre?: string}
export interface Pase {id: string; nombre: string; imagen: string; antiguo: boolean; xpPorNivel: number; niveles: Recompensa[]}

const W: any = window;
export const PASES: Pase[] = ((W.PASES || []) as any[]).filter(p => p && p.id && Array.isArray(p.niveles)).map(p => ({
  id: String(p.id), nombre: String(p.nombre || p.id), imagen: p.imagen || '', antiguo: !!p.antiguo,
  xpPorNivel: Math.max(1, Math.floor(+p.xpPorNivel || 200)), niveles: p.niveles as Recompensa[],
}));
const num = (x: any, d: number) => Number.isFinite(+x) && +x >= 0 ? Math.floor(+x) : d;
const E = W.EXP_PASE || W.EXP_TEMPORADA || {};
export const EXP = {
  ia: {victoria: num(E.ia?.victoria, 40), derrota: num(E.ia?.derrota, 15)},
  online: {victoria: num(E.online?.victoria, 80), derrota: num(E.online?.derrota, 30)},
  serieGanada: num(E.serieGanada, 40),
};

// ------------------------------------------------------------------ guardado --
interface Progreso {xp: number; reclamados: number[]}
/** activo: pase que gana experiencia · pases: los comprados · premiados: combates que ya dieron experiencia
 *  desbloqueados: Fakemon desbloqueados (pases e historia) · titulos: títulos conseguidos */
interface EstadoPases {activo: string | null; pases: {[id: string]: Progreso}; premiados: string[]; desbloqueados: string[]; titulos: string[]}
const CLAVE = 'cnx.pases.v1';
let oyentes: (() => void)[] = [];
/** Avisar cuando cambian los pases. El aviso se quita solo cuando 'el' sale de la pantalla. */
export function alCambiarPases(el: HTMLElement, f: () => void) {
  const g = () => { if (!el.isConnected) { oyentes = oyentes.filter(x => x !== g); return; } f(); };
  oyentes.push(g);
}

function leer(): EstadoPases {
  const g = storage.get<any>(CLAVE, {});
  const lista = (x: any) => Array.isArray(x) ? x.filter((y: any) => typeof y === 'string') : [];
  const pases: {[id: string]: Progreso} = {};
  for (const [id, p] of Object.entries<any>(g.pases || {})) {
    if (!PASES.some(x => x.id === id)) { pases[id] = p; continue; }   // pases que ya no existen: se guardan igual
    pases[id] = {xp: num(p?.xp, 0), reclamados: Array.isArray(p?.reclamados) ? p.reclamados.filter((n: any) => Number.isInteger(n)) : []};
  }
  const activo = typeof g.activo === 'string' && pases[g.activo] ? g.activo : null;
  return {activo, pases, premiados: lista(g.premiados).slice(-200), desbloqueados: lista(g.desbloqueados), titulos: lista(g.titulos)};
}
function guardar(e: EstadoPases) {
  storage.set(CLAVE, e);
  for (const f of [...oyentes]) { try { f(); } catch (err) { console.error(err); } }
}
export const estadoPases = () => leer();
export const titulosConseguidos = () => leer().titulos;

// ------------------------------------------------------------ Fakemon bloqueados --
const claveEsp = (nombre: string) => {
  const sp = dex().species.get(nombre);
  if (!sp.exists) return toID(nombre);
  return toID(sp.battleOnly ? (sp.changesFrom || sp.baseSpecies) as string : sp.name);
};
/** De dónde sale cada Fakemon bloqueado (clave → texto) */
let origenesCache: Map<string, string> | null = null;
function origenesBloqueo(): Map<string, string> {
  if (origenesCache) return origenesCache;
  const m = origenesCache = new Map<string, string>();
  for (const p of PASES) for (const r of p.niveles) if (r.tipo === 'pokemon') for (const e of r.especies || []) m.set(claveEsp(e), p.nombre);
  for (const e of (W.FAKEMON_HISTORIA || []) as string[]) if (!m.has(claveEsp(e))) m.set(claveEsp(e), tr('Modo historia', 'Story mode'));
  return m;
}
/** Si TÚ no puedes usar esa especie todavía, devuelve dónde se consigue; si no, null */
export function bloqueo(especie: string): string | null {
  const k = claveEsp(especie);
  const o = origenesBloqueo().get(k);
  if (!o) return null;
  return leer().desbloqueados.includes(k) ? null : o;
}
/** Desbloquea Fakemon (lo usan los pases y, más adelante, el modo historia) */
export function desbloquear(especies: string[]) {
  const e = leer();
  for (const s of especies) { const k = claveEsp(s); if (!e.desbloqueados.includes(k)) e.desbloqueados.push(k); }
  guardar(e);
}

// ------------------------------------------------------------------- pases --
export const paseDe = (id: string) => PASES.find(p => p.id === id);
export function precioPase(p: Pase) {
  const bruto = ECO.pase.base + ECO.pase.porRecompensa * p.niveles.length;
  return Math.round(bruto * (p.antiguo ? ECO.pase.descuentoAntiguo : 1) / 10) * 10;
}
export const xpMaxima = (p: Pase) => p.xpPorNivel * p.niveles.length;
export const nivelDePase = (p: Pase, xp: number) => Math.min(p.niveles.length, Math.floor(xp / p.xpPorNivel));

export function textoRecompensa(r: Recompensa): string {
  if (r.tipo === 'avatar') return AVATARES.find(a => a.id === r.id)?.nombre || r.id || '?';
  if (r.tipo === 'tickets') return tr(`${r.n} tickets`, `${r.n} tickets`);
  if (r.tipo === 'pokemon') return (r.especies || []).map(nombreVisible).join(' + ');
  return tr(`Título «${r.nombre}»`, `Title "${r.nombre}"`);
}
export function iconoRecompensa(r: Recompensa): HTMLElement {
  if (r.tipo === 'avatar') return avatarImg(r.id || '', 'rec-avatar', 'busto');
  if (r.tipo === 'tickets') return h('span', {class: 'rec-tickets'}, iconoTicket(), h('b', {}, '×' + r.n));
  if (r.tipo === 'pokemon') return h('span', {class: 'rec-pokes'}, ...(r.especies || []).map(e => iconImg(e)));
  return h('span', {class: 'rec-titulo'}, 'T');
}

/** Entrega una recompensa. Si ya tenías ese avatar, te da su valor en PV para no darte nada vacío. */
function entregar(r: Recompensa, e: EstadoPases): string {
  if (r.tipo === 'avatar' && r.id) {
    const a = AVATARES.find(x => x.id === r.id);
    let compensa = 0;
    cambiarColeccion(c => { if (c.tengo[r.id!]) { compensa = a ? precioAvatarRareza(a.rareza) : 0; c.pv += compensa; } else c.tengo[r.id!] = 1; });
    return compensa ? tr(`${a?.nombre}: ya lo tenías, +${compensa} PV`, `${a?.nombre}: already owned, +${compensa} PV`) : (a?.nombre || r.id);
  }
  if (r.tipo === 'tickets') { cambiarColeccion(c => { c.fichas += Math.max(0, r.n || 0); }); return textoRecompensa(r); }
  if (r.tipo === 'pokemon') { for (const s of r.especies || []) { const k = claveEsp(s); if (!e.desbloqueados.includes(k)) e.desbloqueados.push(k); } return textoRecompensa(r); }
  if (r.tipo === 'titulo' && r.id) { if (!e.titulos.includes(r.id)) e.titulos.push(r.id); darTitulo(r.id); return textoRecompensa(r); }
  return textoRecompensa(r);
}

/** Entrega las recompensas de los niveles alcanzados que aún no se han entregado */
function reclamarPendientes(e: EstadoPases, p: Pase): string[] {
  const pr = e.pases[p.id];
  const nivel = nivelDePase(p, pr.xp);
  const dados: string[] = [];
  for (let i = 0; i < nivel; i++) {
    if (pr.reclamados.includes(i)) continue;
    pr.reclamados.push(i);          // se apunta ANTES de entregar: nunca se repite
    dados.push(entregar(p.niveles[i], e));
  }
  return dados;
}

export function comprarPase(id: string): {ok: boolean, texto: string} {
  const p = paseDe(id);
  if (!p) return {ok: false, texto: tr('Ese pase no existe', 'That pass does not exist')};
  const e = leer();
  if (e.pases[id]) return {ok: false, texto: tr('Ya tienes este pase', 'You already own this pass')};
  const precio = precioPase(p);
  if (coleccion().pv < precio) return {ok: false, texto: tr('No tienes PV suficientes', 'Not enough PV')};
  // Todo seguido y sin esperas: primero se apunta el pase y luego se cobra (un segundo clic ya lo ve comprado)
  e.pases[id] = {xp: 0, reclamados: []};
  if (!e.activo) e.activo = id;
  guardar(e);
  cambiarColeccion(c => { c.pv -= precio; });
  return {ok: true, texto: tr(`¡${p.nombre} es tuyo!`, `${p.nombre} is yours!`)};
}

export function activarPase(id: string) {
  const e = leer();
  if (!e.pases[id]) return;
  e.activo = id;
  guardar(e);
}

/**
 * Experiencia de pase al terminar un combate. Solo para el pase activo y una vez por combate.
 * Devuelve la experiencia dada y las recompensas nuevas.
 */
export function experienciaPase(tipo: TipoNivel, gano: boolean, serieGanada: boolean, idCombate: string, extra = 0): {xp: number, pase: Pase | null, nuevas: string[]} {
  const e = leer();
  const p = e.activo ? paseDe(e.activo) : undefined;
  if (!p || !e.pases[p.id]) return {xp: 0, pase: null, nuevas: []};
  if (idCombate && e.premiados.includes(idCombate)) return {xp: 0, pase: p, nuevas: []};
  const pr = e.pases[p.id];
  const ganada = extra || ((gano ? EXP[tipo].victoria : EXP[tipo].derrota) + (serieGanada ? EXP.serieGanada : 0));
  const antes = pr.xp;
  pr.xp = Math.min(xpMaxima(p), pr.xp + ganada);
  if (idCombate) e.premiados.push(idCombate);
  const nuevas = reclamarPendientes(e, p);
  guardar(e);
  if (nuevas.length) toast(tr(`${p.nombre}: ${nuevas.join(', ')}`, `${p.nombre}: ${nuevas.join(', ')}`), 4500);
  return {xp: pr.xp - antes, pase: p, nuevas};
}

// ---------------------------------------------------------------- pantalla --
export function panelPases(botonCompra: (texto: string, precio: number, puede: boolean, comprar: () => {ok: boolean, texto: string}) => HTMLElement) {
  const raiz = h('div', {class: 'pases'});
  let viendo = storage.get<string>('cnx.paseViendo', '');
  let pagina = -1, elegido = -1;   // página de la pista y nivel seleccionado (-1 = el actual)
  const pintar = () => {
    const e = leer(), c = coleccion();
    if (!paseDe(viendo)) viendo = e.activo || PASES[0]?.id || '';
    raiz.innerHTML = '';
    if (!PASES.length) { raiz.append(h('p', {class: 'tenue'}, tr('Todavía no hay pases.', 'No passes yet.'))); return; }
    // Lista de pases
    raiz.append(h('div', {class: 'pases-lista'}, ...PASES.map(p => {
      const pr = e.pases[p.id];
      const completo = pr && pr.xp >= xpMaxima(p);
      const estado = !pr ? null : e.activo === p.id ? tr('Activo', 'Active') : completo ? tr('Completado', 'Completed') : tr('Comprado', 'Owned');
      return h('div', {class: 'pase-tarjeta' + (viendo === p.id ? ' viendo' : '') + (e.activo === p.id ? ' activo' : ''), 'data-pase': p.id},
        h('button', {class: 'pase-ver', onclick: () => { viendo = p.id; storage.set('cnx.paseViendo', viendo); pagina = -1; elegido = -1; pintar(); }},
          p.imagen ? h('img', {class: 'pase-img', src: p.imagen, alt: ''}) : null,
          h('div', {class: 'pase-info'}, h('b', {}, p.nombre),
            h('small', {class: 'tenue'}, tr(`${p.niveles.length} niveles`, `${p.niveles.length} levels`) + (p.antiguo ? tr(' · pase anterior', ' · older pass') : '')),
            estado ? h('span', {class: 'pase-estado'}, estado + (completo && e.activo === p.id ? ' · ' + tr('Completado', 'Completed') : '')) : null)),
        !pr ? botonCompra(textoPV(precioPase(p)), precioPase(p), c.pv >= precioPase(p), () => comprarPase(p.id))
          : e.activo !== p.id ? h('button', {class: 'btn btn-sec', onclick: () => activarPase(p.id)}, tr('Activar', 'Activate')) : null);
    })));
    // Recorrido del pase (una sola fila de recompensas, por páginas, como en los juegos de cartas)
    const p = paseDe(viendo)!;
    const pr = e.pases[p.id];
    const xp = pr?.xp || 0;
    const nivel = nivelDePase(p, xp);
    const completo = xp >= xpMaxima(p);
    const enNivel = xp - nivel * p.xpPorNivel;
    const total = p.niveles.length;
    const porPagina = matchMedia('(max-width: 640px)').matches ? 4 : 7;
    if (pagina < 0) pagina = Math.floor(Math.min(nivel, total - 1) / porPagina);
    pagina = Math.max(0, Math.min(pagina, Math.ceil(total / porPagina) - 1));
    if (elegido < 0 || elegido >= total) elegido = Math.min(nivel, total - 1);
    const desde = pagina * porPagina, hasta = Math.min(total, desde + porPagina);
    const r = p.niveles[elegido];
    const hechoSel = !!pr && pr.reclamados.includes(elegido);
    const faltaSel = (elegido + 1) * p.xpPorNivel - xp;
    const columnas = [];
    for (let i = desde; i < hasta; i++) {
      const rec = p.niveles[i];
      const hecho = !!pr && pr.reclamados.includes(i);
      const ra = rec.tipo === 'avatar' ? AVATARES.find(a => a.id === rec.id) : undefined;
      columnas.push(h('button', {class: 'pase-col' + (hecho ? ' hecho' : '') + (i === nivel && !completo ? ' actual' : '') + (i === elegido ? ' elegido' : ''),
        style: ra ? {'--rc': RAREZAS[ra.rareza].color} : {}, 'data-nivel': String(i + 1), title: textoRecompensa(rec),
        onclick: () => { elegido = i; pintar(); }},
        h('span', {class: 'pc-num'}, String(i + 1)),
        h('span', {class: 'pc-celda'}, iconoRecompensa(rec), hecho ? h('span', {class: 'pc-check'}, '✓') : null)));
    }
    raiz.append(h('div', {class: 'pase-marco'},
      h('div', {class: 'pase-titulo'}, p.imagen ? h('img', {class: 'pase-img', src: p.imagen, alt: ''}) : null, h('b', {}, p.nombre),
        !pr ? h('span', {class: 'pase-chip'}, tr('Vista previa', 'Preview'))
          : e.activo === p.id ? h('span', {class: 'pase-chip activo'}, tr('Activo', 'Active'))
          : !completo ? h('span', {class: 'pase-chip aviso'}, tr('No activo: no gana exp.', 'Inactive: no XP')) : null),
      h('div', {class: 'pase-grado'},
        h('span', {class: 'pg-etq'}, tr('NIVEL', 'LEVEL')),
        h('div', {class: 'pg-fila'},
          h('b', {class: 'pg-n'}, String(nivel)),
          h('div', {class: 'pg-barra'}, h('span', {style: {width: (completo ? 100 : enNivel / p.xpPorNivel * 100).toFixed(1) + '%'}})),
          h('b', {class: 'pg-n'}, completo ? '✓' : String(nivel + 1))),
        h('small', {class: 'pg-xp'}, completo ? tr('¡Pase completado!', 'Pass completed!') : tr(`${enNivel}/${p.xpPorNivel} exp. de pase`, `${enNivel}/${p.xpPorNivel} pass XP`))),
      h('div', {class: 'pase-pista'},
        h('button', {class: 'pase-flecha', 'aria-label': tr('Anteriores', 'Previous'), disabled: pagina === 0, onclick: () => { pagina--; pintar(); }}, '‹'),
        h('div', {class: 'pase-cols', style: {'--n': String(porPagina)}}, ...columnas),
        h('button', {class: 'pase-flecha', 'aria-label': tr('Siguientes', 'Next'), disabled: hasta >= total, onclick: () => { pagina++; pintar(); }}, '›')),
      h('div', {class: 'pase-detalle'},
        h('div', {class: 'pd-icono'}, iconoRecompensa(r)),
        h('div', {class: 'pd-texto'},
          h('small', {class: 'tenue'}, tr(`Nivel ${elegido + 1}`, `Level ${elegido + 1}`)),
          h('b', {}, textoRecompensa(r)),
          h('small', {class: hechoSel ? 'pd-hecho' : 'tenue'}, hechoSel ? tr('✓ Conseguido', '✓ Claimed') : pr ? tr(`Faltan ${faltaSel} exp.`, `${faltaSel} XP left`) : tr('Compra el pase para conseguirlo', 'Buy the pass to earn it')))),
      h('small', {class: 'tenue pase-ayuda'}, tr(`Exp. de pase: victoria ${EXP.online.victoria} online / ${EXP.ia.victoria} contra la IA, derrota ${EXP.online.derrota} / ${EXP.ia.derrota}, serie ganada +${EXP.serieGanada}. Los pases no caducan.`,
        `Pass XP: win ${EXP.online.victoria} online / ${EXP.ia.victoria} vs AI, loss ${EXP.online.derrota} / ${EXP.ia.derrota}, series win +${EXP.serieGanada}. Passes never expire.`))));
  };
  pintar();
  requestAnimationFrame(() => alCambiarPases(raiz, pintar));
  return {el: raiz, pintar};
}

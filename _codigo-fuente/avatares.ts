// Avatares de jugador: colección, fichas de gacha y pantalla de selección.
import {tr, EN} from './idioma';
import {h, storage, toast, sleep} from './util';
import {registrarCombate, insignia, nivelDe, barraNivel, TipoNivel} from './nivel';

export type Rareza = 'comun' | 'raro' | 'epico' | 'legendario' | 'base';
export interface Avatar {id: string; nombre: string; autor: string; rareza: Rareza; etiquetas: string[]}
interface Coleccion {fichas: number; tengo: {[id: string]: number}; avatar: string; tiradas: number}

const W: any = window;
const clave = (s: string) => s.replace(/^[^\p{L}\p{N}]+/u, '');
/** Todos los avatares, ordenados alfabéticamente */
export const AVATARES: Avatar[] = ((W.DATOS_AVATARES || []) as Avatar[]).slice()
  .sort((a, b) => clave(a.nombre).localeCompare(clave(b.nombre), 'es', {sensitivity: 'base'}));
const POR_ID = new Map(AVATARES.map(a => [a.id, a]));
export const AVATAR_BASE = AVATARES.find(a => a.rareza === 'base')?.id || 'sombra';
export const PROB: {[r: string]: number} = {comun: 60, raro: 28, epico: 10, legendario: 2, ...(W.GACHA_PROBABILIDADES || {})};
export const RECOMPENSAS = {ia: 50, online: 1, serieGanada: 1, ...(W.GACHA_RECOMPENSAS || {})};
/** Turnos mínimos para que una victoria dé fichas (evita rendiciones al momento) */
const TURNOS_MINIMOS = 3;

export const RAREZAS: {[r in Rareza]: {nombre: string, color: string, estrellas: string}} = {
  base: {nombre: tr('Inicial', 'Starter'), color: '#9aa0bf', estrellas: '◆'},
  comun: {nombre: tr('Común', 'Common'), color: '#8fd18a', estrellas: '★'},
  raro: {nombre: tr('Raro', 'Rare'), color: '#5bb8ff', estrellas: '★★'},
  epico: {nombre: tr('Épico', 'Epic'), color: '#c77dff', estrellas: '★★★'},
  legendario: {nombre: tr('Legendario', 'Legendary'), color: '#ffcb3d', estrellas: '★★★★'},
};
const ETIQUETAS_EN: {[k: string]: string} = {
  Líderes: 'Gym Leaders', Élite: 'Elite Four', Campeones: 'Champions', Protagonistas: 'Protagonists', Rivales: 'Rivals',
  Profesores: 'Professors', Villanos: 'Villains', Comunidad: 'Community', Hologramas: 'Holograms',
};
export const nomEtiqueta = (t: string) => EN ? (ETIQUETAS_EN[t] || t) : t;
/** Orden de los filtros (las etiquetas que no estén aquí van al final) */
const ORDEN_ETIQUETAS = ['Custom', 'Kanto', 'Johto', 'Hoenn', 'Sinnoh', 'Teselia', 'Kalos', 'Alola', 'Galar', 'Paldea',
  'Protagonistas', 'Rivales', 'Líderes', 'Élite', 'Campeones', 'Profesores', 'Villanos', 'Team Rocket', 'Team Magma', 'Team Aqua',
  'Comunidad', 'Hologramas', 'Wow'];
export function etiquetas(): string[] {
  const todas = new Set(AVATARES.flatMap(a => a.etiquetas));
  const pos = (t: string) => { const i = ORDEN_ETIQUETAS.indexOf(t); return i < 0 ? 999 : i; };
  return [...todas].sort((a, b) => pos(a) - pos(b) || a.localeCompare(b, 'es'));
}

// ------------------------------------------------------------- colección --
const CLAVE = 'arena.coleccion.v1';
let oyentes: (() => void)[] = [];
/** Avisar cuando cambian las fichas o el avatar. 'el' = el aviso se quita solo cuando el elemento sale de la pantalla */
export function alCambiarColeccion(el: HTMLElement, f: () => void) {
  const g = () => { if (!el.isConnected) { oyentes = oyentes.filter(x => x !== g); return; } f(); };
  oyentes.push(g);
}

export function coleccion(): Coleccion {
  const c = storage.get<Partial<Coleccion>>(CLAVE, {});
  const tengo: {[id: string]: number} = {};
  for (const [id, n] of Object.entries(c.tengo || {})) if (POR_ID.has(id) && +n > 0) tengo[id] = Math.floor(+n);
  tengo[AVATAR_BASE] = Math.max(1, tengo[AVATAR_BASE] || 0);
  const avatar = c.avatar && tengo[c.avatar] ? c.avatar : AVATAR_BASE;
  return {fichas: Math.max(0, Math.floor(+(c.fichas || 0))), tengo, avatar, tiradas: c.tiradas || 0};
}
function guardar(c: Coleccion) {
  storage.set(CLAVE, c);
  for (const f of [...oyentes]) { try { f(); } catch (e) { console.error(e); } }
}

export const avatarActual = () => coleccion().avatar;
export function elegirAvatar(id: string) {
  const c = coleccion();
  if (!c.tengo[id]) return;
  c.avatar = id;
  guardar(c);
}
/** Id válido para mostrar (los de otros jugadores pueden venir mal o de otra versión) */
export const avatarValido = (id: any) => typeof id === 'string' && POR_ID.has(id) ? id : AVATAR_BASE;
export const datosAvatar = (id: string) => POR_ID.get(avatarValido(id))!;
export const avatarUrl = (id: string) => `sprites/avatares/${avatarValido(id)}.png`;

/** Sprite de un avatar. modo 'busto' = recorte de la cabeza y el pecho (como Showdown) */
export function avatarImg(id: string, cls = '', modo: 'entero' | 'busto' = 'entero') {
  const a = datosAvatar(id);
  if (modo === 'busto') {
    return h('span', {class: 'avatar-busto ' + cls, title: a.nombre, role: 'img', 'aria-label': a.nombre, style: {backgroundImage: `url("${avatarUrl(a.id)}")`}});
  }
  const img = h('img', {class: 'avatar-img ' + cls, src: avatarUrl(a.id), alt: a.nombre, title: a.nombre, loading: 'lazy', draggable: 'false'});
  img.addEventListener('error', () => { if (!img.src.endsWith(`/${AVATAR_BASE}.png`)) img.src = `sprites/avatares/${AVATAR_BASE}.png`; }, {once: true});
  return img;
}

/** Avatar al azar para la IA */
export const avatarAleatorio = () => AVATARES[Math.floor(Math.random() * AVATARES.length)]?.id || AVATAR_BASE;

// ---------------------------------------------------------------- fichas --
export function darFichas(n: number) {
  if (n <= 0) return;
  const c = coleccion();
  c.fichas += n;
  guardar(c);
}

/**
 * Recompensa al terminar un combate: experiencia de nivel (ganes o pierdas) y,
 * si ganas, fichas de gacha. Devuelve un elemento con lo conseguido (o null).
 * ia: probabilidad de 1 ficha · online: fichas seguras.
 */
export function recompensaCombate(tipo: TipoNivel, turnos: number, gano: boolean, serieGanada = false): HTMLElement | null {
  if (turnos < TURNOS_MINIMOS) return h('div', {class: 'recompensa nada'}, tr('Combate demasiado corto: no cuenta para el nivel ni da fichas.', 'Battle too short: no XP or tokens.'));
  const nv = registrarCombate(tipo, gano, serieGanada);
  let n = 0;
  if (gano) {
    if (tipo === 'ia') n = Math.random() * 100 < RECOMPENSAS.ia ? 1 : 0;
    else n = Math.max(0, Math.floor(RECOMPENSAS.online));
    if (serieGanada) n += Math.max(0, Math.floor(RECOMPENSAS.serieGanada));
    darFichas(n);
  }
  if (nv.subio) toast(tr(`⬆ ¡Has subido al nivel ${nv.nivel}${tipo === 'ia' ? ' contra la IA' : ' online'}!`, `⬆ You reached level ${nv.nivel}${tipo === 'ia' ? ' vs the AI' : ' online'}!`), 3800);
  else if (n) toast(tr(`🎟 ¡Has conseguido ${n} ficha${n > 1 ? 's' : ''} de gacha!`, `🎟 You got ${n} gacha token${n > 1 ? 's' : ''}!`), 3500);
  return h('div', {class: 'recompensa'},
    h('span', {}, `+${nv.xp} XP`),
    insignia(tipo, nv.nivel),
    nv.subio ? h('b', {class: 'sube-nivel'}, tr('¡Subes de nivel!', 'Level up!')) : null,
    gano ? (n ? h('span', {}, h('span', {class: 'ficha-icono'}, '🎟'), tr(` +${n} ficha${n > 1 ? 's' : ''}`, ` +${n} token${n > 1 ? 's' : ''}`))
      : h('span', {class: 'tenue'}, tr('sin ficha esta vez', 'no token this time'))) : null);
}

function rarezaAlAzar(): Exclude<Rareza, 'base'> {
  const rs = (['comun', 'raro', 'epico', 'legendario'] as const).filter(r => AVATARES.some(a => a.rareza === r));
  const total = rs.reduce((s, r) => s + Math.max(0, PROB[r] || 0), 0);
  let x = Math.random() * total;
  for (const r of rs) { x -= Math.max(0, PROB[r] || 0); if (x < 0) return r; }
  return rs[0];
}

/** Gasta una ficha y devuelve el avatar conseguido (puede ser repetido) */
export function tirar(): {avatar: Avatar, nuevo: boolean, copias: number} | null {
  const c = coleccion();
  if (c.fichas < 1) return null;
  const r = rarezaAlAzar();
  const pool = AVATARES.filter(a => a.rareza === r);
  const av = pool[Math.floor(Math.random() * pool.length)];
  c.fichas--;
  c.tiradas++;
  const nuevo = !c.tengo[av.id];
  c.tengo[av.id] = (c.tengo[av.id] || 0) + 1;
  guardar(c);
  return {avatar: av, nuevo, copias: c.tengo[av.id]};
}

// -------------------------------------------------------------- pantalla --
export function pantallaAvatares(raiz: HTMLElement, volver: () => void) {
  let filtros = storage.get<string[]>('arena.filtrosAvatar', []).filter(t => etiquetas().includes(t));
  let rareza = storage.get<string>('arena.rarezaAvatar', '');
  let soloMios = storage.get<boolean>('arena.soloMios', false);
  const buscar = h('input', {class: 'input buscador', placeholder: tr('Buscar entrenador…', 'Search trainer…')});
  const cab = h('div', {class: 'gacha-cab'});
  const chips = h('div', {class: 'filtros-chips'});
  const filtroIn = h('input', {class: 'input filtro-input', placeholder: tr('Filtrar: Kanto, Líderes, Custom…', 'Filter: Kanto, Gym Leaders, Custom…'), autocomplete: 'off'});
  const sugerencias = h('div', {class: 'filtro-sugerencias', role: 'listbox'});
  const cajaFiltro = h('div', {class: 'filtro-caja'}, filtroIn, sugerencias);
  const sinTilde = (x: string) => x.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  let marcada = 0;
  const opciones = () => {
    const q = sinTilde(filtroIn.value.trim());
    return etiquetas().filter(t => !filtros.includes(t) && (!q || sinTilde(t + ' ' + nomEtiqueta(t)).includes(q)));
  };
  const cerrarSug = () => { sugerencias.classList.remove('abierta'); };
  const pintarSug = () => {
    const ops = opciones();
    marcada = Math.min(marcada, Math.max(0, ops.length - 1));
    sugerencias.innerHTML = '';
    if (!ops.length) sugerencias.append(h('div', {class: 'sug-vacia'}, tr('No hay más filtros', 'No more filters')));
    ops.forEach((t, i) => {
      const n = AVATARES.filter(a => a.etiquetas.includes(t)).length;
      sugerencias.append(h('button', {class: 'sug' + (i === marcada ? ' marcada' : ''), type: 'button', role: 'option',
        onmousedown: (e: Event) => e.preventDefault(), onclick: () => anadirFiltro(t)}, nomEtiqueta(t), h('small', {class: 'tenue'}, String(n))));
    });
    sugerencias.classList.add('abierta');
  };
  const anadirFiltro = (t: string) => {
    if (!filtros.includes(t)) filtros.push(t);
    storage.set('arena.filtrosAvatar', filtros);
    filtroIn.value = ''; marcada = 0;
    pintarChips(); pintarGrid();
    if (document.activeElement === filtroIn) pintarSug(); else cerrarSug();
  };
  filtroIn.addEventListener('focus', pintarSug);
  filtroIn.addEventListener('input', () => { marcada = 0; pintarSug(); });
  filtroIn.addEventListener('blur', () => setTimeout(cerrarSug, 120));
  filtroIn.addEventListener('keydown', e => {
    const ops = opciones();
    if (e.key === 'ArrowDown') { e.preventDefault(); marcada = Math.min(ops.length - 1, marcada + 1); pintarSug(); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); marcada = Math.max(0, marcada - 1); pintarSug(); }
    else if (e.key === 'Enter') { e.preventDefault(); if (ops[marcada]) anadirFiltro(ops[marcada]); }
    else if (e.key === 'Escape') { cerrarSug(); filtroIn.blur(); }
    else if (e.key === 'Backspace' && !filtroIn.value && filtros.length) { filtros.pop(); storage.set('arena.filtrosAvatar', filtros); pintarChips(); pintarGrid(); pintarSug(); }
  });
  const grid = h('div', {class: 'avatares-grid'});
  const contador = h('span', {class: 'tenue'});
  const selRareza = h('select', {class: 'select select-sm'}, h('option', {value: ''}, tr('Todas las rarezas', 'All rarities')),
    ...(['legendario', 'epico', 'raro', 'comun', 'base'] as Rareza[]).map(r => h('option', {value: r}, RAREZAS[r].estrellas + ' ' + RAREZAS[r].nombre)));
  selRareza.value = rareza;
  selRareza.addEventListener('change', () => { rareza = selRareza.value; storage.set('arena.rarezaAvatar', rareza); pintarGrid(); });
  const chkMios = h('label', {class: 'toggle'}, (() => {
    const c = h('input', {type: 'checkbox', checked: soloMios});
    c.addEventListener('change', () => { soloMios = c.checked; storage.set('arena.soloMios', soloMios); pintarGrid(); });
    return c;
  })(), tr(' Solo los que tengo', ' Only owned'));

  const pintarCab = () => {
    const c = coleccion();
    const a = datosAvatar(c.avatar);
    const total = AVATARES.length, tengo = AVATARES.filter(x => c.tengo[x.id]).length;
    cab.innerHTML = '';
    cab.append(
      h('div', {class: 'gacha-actual'},
        h('div', {class: 'gacha-actual-img', style: {'--rc': RAREZAS[a.rareza].color}}, avatarImg(a.id)),
        h('div', {}, h('small', {class: 'tenue'}, tr('Tu avatar', 'Your avatar')), h('div', {class: 'gacha-nombre'}, a.nombre),
          h('small', {class: 'tenue'}, tr('Sprite: ', 'Sprite: ') + a.autor),
          h('div', {class: 'gacha-progreso'}, h('span', {style: {width: (tengo / total * 100).toFixed(1) + '%'}})),
          h('small', {}, tr(`Colección: ${tengo}/${total}`, `Collection: ${tengo}/${total}`)),
          barraNivel('ia'), barraNivel('online'))),
      h('div', {class: 'gacha-maquina'},
        h('div', {class: 'gacha-fichas'}, h('span', {class: 'ficha-icono grande'}, '🎟'), h('b', {}, String(c.fichas)), h('small', {}, tr('fichas', 'tokens'))),
        h('div', {class: 'gacha-botones'},
          h('button', {class: 'btn', disabled: c.fichas < 1, onclick: () => abrir(1)}, tr('Abrir 1 ficha', 'Open 1 token')),
          c.fichas >= 5 ? h('button', {class: 'btn btn-sec', onclick: () => abrir(Math.min(10, c.fichas))}, tr(`Abrir ${Math.min(10, c.fichas)}`, `Open ${Math.min(10, c.fichas)}`)) : null),
        h('small', {class: 'tenue gacha-ayuda'},
          tr(`Ganas fichas al vencer: contra la IA (${RECOMPENSAS.ia}% de probabilidad), online (${RECOMPENSAS.online} segura) y +${RECOMPENSAS.serieGanada} por ganar una serie al mejor de 3. Los repetidos suman copias (×2, ×3…).`,
            `You earn tokens by winning: vs the AI (${RECOMPENSAS.ia}% chance), online (${RECOMPENSAS.online} guaranteed) and +${RECOMPENSAS.serieGanada} for winning a best-of-3 series. Duplicates just add copies (×2, ×3…).`)),
        h('div', {class: 'gacha-probs'}, ...(['comun', 'raro', 'epico', 'legendario'] as Rareza[]).map(r =>
          h('span', {class: 'prob', style: {'--rc': RAREZAS[r].color}}, `${RAREZAS[r].nombre} ${PROB[r]}%`)))));
  };

  const pintarChips = () => {
    chips.innerHTML = '';
    if (!filtros.length) return;
    chips.append(...filtros.map(t => h('button', {class: 'chip-filtro activo', title: tr('Quitar filtro', 'Remove filter'),
      onclick: () => { filtros = filtros.filter(x => x !== t); storage.set('arena.filtrosAvatar', filtros); pintarChips(); pintarGrid(); }}, nomEtiqueta(t) + ' ✕')),
      h('button', {class: 'chip-limpiar', onclick: () => { filtros = []; storage.set('arena.filtrosAvatar', filtros); pintarChips(); pintarGrid(); }}, tr('Quitar todos', 'Clear all')));
  };

  const pintarGrid = () => {
    const c = coleccion();
    const q = buscar.value.trim().toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
    grid.innerHTML = '';
    let n = 0;
    for (const a of AVATARES) {
      if (filtros.some(t => !a.etiquetas.includes(t))) continue;
      if (rareza && a.rareza !== rareza) continue;
      const copias = c.tengo[a.id] || 0;
      if (soloMios && !copias) continue;
      const texto = (a.nombre + ' ' + a.autor + ' ' + a.etiquetas.map(nomEtiqueta).join(' ')).toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
      if (q && !texto.includes(q)) continue;
      n++;
      const r = RAREZAS[a.rareza];
      const elegido = c.avatar === a.id;
      const tarjeta = h('div', {class: 'avatar-carta' + (copias ? '' : ' bloqueado') + (elegido ? ' elegido' : ''), style: {'--rc': r.color}, tabindex: '0',
        title: copias ? (elegido ? tr('Avatar actual', 'Current avatar') : tr('Usar este avatar', 'Use this avatar')) : tr(`Bloqueado · consíguelo en el gacha (${r.nombre})`, `Locked · get it from the gacha (${r.nombre})`)},
        h('span', {class: 'avatar-rareza'}, r.estrellas),
        copias > 1 ? h('span', {class: 'avatar-copias'}, '×' + copias) : null,
        avatarImg(a.id),
        h('div', {class: 'avatar-nombre'}, a.nombre),
        h('small', {class: 'avatar-autor'}, a.autor));
      const usar = () => {
        if (!copias) { toast(tr(`🔒 ${a.nombre}: ${r.nombre}. Consíguelo abriendo fichas.`, `🔒 ${a.nombre}: ${r.nombre}. Get it by opening tokens.`)); return; }
        elegirAvatar(a.id);
      };
      tarjeta.addEventListener('click', usar);
      tarjeta.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); usar(); } });
      grid.append(tarjeta);
    }
    contador.textContent = tr(`${n} entrenador${n === 1 ? '' : 'es'}`, `${n} trainer${n === 1 ? '' : 's'}`);
    if (!n) grid.append(h('p', {class: 'tenue centro'}, tr('Ninguno coincide con el filtro.', 'Nothing matches the filter.')));
  };

  async function abrir(veces: number) {
    const res: ReturnType<typeof tirar>[] = [];
    for (let i = 0; i < veces; i++) { const r = tirar(); if (!r) break; res.push(r); }
    if (!res.length) return;
    await mostrarResultados(res.filter(Boolean) as NonNullable<ReturnType<typeof tirar>>[]);
  }

  buscar.addEventListener('input', pintarGrid);
  raiz.innerHTML = '';
  raiz.append(
    h('header', {class: 'barra'}, h('button', {class: 'btn btn-sec', onclick: volver}, tr('← Inicio', '← Home')), h('h2', {}, tr('Entrenadores y gacha', 'Trainers & gacha'))),
    cab,
    h('div', {class: 'tarjeta avatares-panel'},
      h('div', {class: 'avatares-herramientas'}, buscar, cajaFiltro, selRareza, chkMios, contador),
      chips, grid));
  pintarCab(); pintarChips(); pintarGrid();
  alCambiarColeccion(cab, () => { pintarCab(); pintarGrid(); });
}

/** Animación de apertura y resultados */
async function mostrarResultados(res: {avatar: Avatar, nuevo: boolean, copias: number}[]) {
  const orden: Rareza[] = ['comun', 'raro', 'epico', 'legendario'];
  const mejor = res.reduce((m, r) => orden.indexOf(r.avatar.rareza) > orden.indexOf(m) ? r.avatar.rareza : m, 'comun' as Rareza);
  const fondo = h('div', {class: 'gacha-modal', style: {'--rc': RAREZAS[mejor].color}});
  const capsula = h('div', {class: 'gacha-capsula'}, h('span', {class: 'cap-arriba'}), h('span', {class: 'cap-abajo'}), h('span', {class: 'cap-boton'}));
  const caja = h('div', {class: 'gacha-caja'}, capsula, h('div', {class: 'tenue'}, tr('Abriendo…', 'Opening…')));
  fondo.append(caja);
  document.body.append(fondo);
  let saltar = false;
  fondo.addEventListener('click', () => { saltar = true; });
  if (!matchMedia('(prefers-reduced-motion: reduce)').matches) {
    for (let i = 0; i < 12 && !saltar; i++) await sleep(100);
  }
  caja.innerHTML = '';
  const cerrar = () => fondo.remove();
  const tarjetas = res.map((r, i) => {
    const ra = RAREZAS[r.avatar.rareza];
    return h('div', {class: 'gacha-premio r-' + r.avatar.rareza, style: {'--rc': ra.color, animationDelay: (i * 0.08) + 's'}},
      h('span', {class: 'avatar-rareza'}, ra.estrellas),
      r.nuevo ? h('span', {class: 'premio-nuevo'}, tr('¡NUEVO!', 'NEW!')) : h('span', {class: 'premio-repe'}, tr(`Repe ×${r.copias}`, `Dupe ×${r.copias}`)),
      avatarImg(r.avatar.id),
      h('div', {class: 'avatar-nombre'}, r.avatar.nombre),
      h('small', {style: {color: ra.color}}, ra.nombre));
  });
  const uno = res.length === 1 ? res[0] : null;
  caja.append(
    h('h3', {}, res.length > 1 ? tr(`¡${res.length} fichas abiertas!`, `${res.length} tokens opened!`) : tr('¡Ficha abierta!', 'Token opened!')),
    h('div', {class: 'gacha-premios' + (uno ? ' uno' : '')}, ...tarjetas),
    h('div', {class: 'fin-botones'},
      uno && uno.nuevo ? h('button', {class: 'btn', onclick: (e: Event) => { e.stopPropagation(); elegirAvatar(uno.avatar.id); cerrar(); }}, tr('Usar ahora', 'Use now')) : null,
      h('button', {class: 'btn btn-sec', onclick: (e: Event) => { e.stopPropagation(); cerrar(); }}, tr('Cerrar', 'Close'))));
  fondo.addEventListener('click', e => { if (e.target === fondo) cerrar(); });
}

/** Barra superior estilo Showdown: avatar, nombre y fichas */
export function barraJugador(nombre: HTMLInputElement, irAvatares: () => void) {
  const barra = h('div', {class: 'barra-jugador'});
  const pintar = () => {
    const c = coleccion();
    barra.innerHTML = '';
    barra.append(
      h('button', {class: 'bj-avatar', title: tr('Cambiar avatar', 'Change avatar'), onclick: irAvatares}, avatarImg(c.avatar, '', 'busto')),
      h('div', {class: 'bj-nombre'}, h('div', {class: 'bj-niveles'}, insignia('ia', nivelDe('ia')), insignia('online', nivelDe('online'))), nombre),
      h('button', {class: 'bj-fichas', title: tr('Abrir fichas de gacha', 'Open gacha tokens'), onclick: irAvatares},
        h('span', {class: 'ficha-icono'}, '🎟'), h('b', {}, String(c.fichas)), c.fichas ? h('span', {class: 'bj-punto'}) : null));
  };
  pintar();
  // (se suscribe cuando ya está en la página)
  requestAnimationFrame(() => alCambiarColeccion(barra, pintar));
  return barra;
}

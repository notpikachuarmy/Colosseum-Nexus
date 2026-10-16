// Pantalla de perfil: avatar, nombre, estadísticas online y contra la IA (separadas) y la colección.
import {tr} from './idioma';
import {h} from './util';
import {nombreJugador} from './nucleo';
import {abrirAjustes} from './ajustes';
import {perfil, rango, nombreModo, TipoNivel} from './nivel';
import {TITULOS, tituloDe, tituloEquipado, titulosConseguidos, selectorTitulo, progresoTitulo, revisarTitulos} from './titulos';
import {selectorFondos} from './fondos';
import {avatarImg, coleccion, datosAvatar, alCambiarColeccion, rejillaAvatares, progresoColeccion, RAREZAS} from './avatares';

/** Bloque de estadísticas de un modo (online o IA) */
function bloqueStats(tipo: TipoNivel) {
  const p = perfil(tipo);
  const r = rango(p.nivel);
  const pct = p.paraSiguiente ? p.enNivel / p.paraSiguiente * 100 : 100;
  const dato = (valor: string, etq: string) => h('div', {class: 'pf-dato'}, h('b', {}, valor), h('small', {}, etq));
  return h('section', {class: 'pf-stats ' + tipo, style: {'--nc': r.color}, 'data-modo': tipo},
    h('div', {class: 'pf-stats-cab'},
      h('h3', {}, tipo === 'online' ? tr('Combates online', 'Online battles') : tr('Combates contra la IA', 'Battles vs the AI')),
      h('span', {class: 'pf-nivel'}, nombreModo(tipo) + tr(' Nv. ', ' Lv. ') + p.nivel, h('small', {}, r.nombre))),
    h('div', {class: 'pf-barra', role: 'progressbar', 'aria-valuemin': '0', 'aria-valuemax': String(p.paraSiguiente || 1), 'aria-valuenow': String(p.paraSiguiente ? p.enNivel : 1)},
      h('span', {style: {width: pct.toFixed(1) + '%'}})),
    h('small', {class: 'tenue pf-xp'}, p.paraSiguiente ? tr(`${p.enNivel}/${p.paraSiguiente} XP para el nivel ${p.nivel + 1}`, `${p.enNivel}/${p.paraSiguiente} XP to level ${p.nivel + 1}`) : tr('Nivel máximo', 'Max level')),
    h('div', {class: 'pf-datos'},
      dato(String(p.v), tr('Victorias', 'Wins')),
      dato(String(p.d), tr('Derrotas', 'Losses')),
      dato(String(p.rachaMax), tr('Racha máxima', 'Best streak')),
      dato(p.porcentaje === null ? '—' : Math.round(p.porcentaje) + '%', tr('Victorias %', 'Win rate'))));
}

export function pantallaPerfil(raiz: HTMLElement, volver: () => void) {
  const cab = h('div', {class: 'pf-cab'});
  const contador = h('span', {class: 'pf-contador'});
  const col = rejillaAvatares('coleccion');

  const pintarCab = () => {
    const c = coleccion();
    const a = datosAvatar(c.avatar);
    cab.innerHTML = '';
    cab.append(
      h('div', {class: 'pf-avatar', style: {'--rc': RAREZAS[a.rareza].color}}, avatarImg(a.id)),
      h('div', {class: 'pf-id'},
        h('div', {class: 'pf-nick'}, nombreJugador() || tr('Entrenador', 'Trainer')),
        tituloDe(tituloEquipado()) ? h('span', {class: 'titulo-jugador'}, tituloDe(tituloEquipado())!.nombre) : null,
        h('label', {class: 'pf-titulo-fila'}, h('small', {class: 'tenue'}, tr('Título en el VS:', 'Title in the VS:')), selectorTitulo(() => { pintarCab(); pintarTitulos(); })),
        h('small', {class: 'tenue'}, a.nombre + ' · ' + tr('sprite: ', 'sprite: ') + a.autor),
        h('button', {class: 'btn btn-sec btn-sm', onclick: () => abrirAjustes(() => pintarCab())}, tr('Cambiar nombre', 'Change name'))));
    const {tengo, total} = progresoColeccion();
    contador.textContent = tr(`Colección: ${tengo}/${total}`, `Collection: ${tengo}/${total}`);
  };

  const titulosEl = h('div', {class: 'titulos-lista'});
  const contTitulos = h('span', {class: 'pf-contador'});
  const pintarTitulos = () => {
    const tengo = new Set(titulosConseguidos());
    titulosEl.innerHTML = '';
    contTitulos.textContent = tr(`Títulos: ${TITULOS.filter(t => tengo.has(t.id)).length}/${TITULOS.length}`, `Titles: ${TITULOS.filter(t => tengo.has(t.id)).length}/${TITULOS.length}`);
    // Primero los conseguidos
    for (const t of [...TITULOS].sort((a, b) => +tengo.has(b.id) - +tengo.has(a.id))) {
      const prog = tengo.has(t.id) ? '' : progresoTitulo(t.id);
      titulosEl.append(h('div', {class: 'titulo-item' + (tengo.has(t.id) ? ' tengo' : ''), 'data-titulo': t.id},
        h('b', {}, (tengo.has(t.id) ? '' : '🔒 ') + t.nombre),
        h('small', {class: 'tenue'}, t.texto),
        prog ? h('small', {class: 'ti-prog'}, prog) : null,
        t.pv ? h('small', {class: 'ti-pv'}, tengo.has(t.id) ? tr(`+${t.pv} PV conseguidos`, `+${t.pv} PV earned`) : tr(`Premio: ${t.pv} PV`, `Reward: ${t.pv} PV`)) : null));
    }
  };
  revisarTitulos();
  raiz.innerHTML = '';
  raiz.append(
    h('header', {class: 'barra'}, h('button', {class: 'btn btn-sec', onclick: volver}, tr('← Inicio', '← Home')), h('h2', {}, tr('Perfil', 'Profile'))),
    h('div', {class: 'perfil'},
      cab,
      bloqueStats('online'),
      bloqueStats('ia'),
      h('div', {class: 'pf-col-cab'}, h('h3', {}, tr('Tu colección', 'Your collection')), contador,
        h('small', {class: 'tenue'}, tr('Toca un entrenador para usarlo como avatar. Los nuevos se consiguen en el Gacha.', 'Tap a trainer to use it as your avatar. Get new ones in the Gacha.'))),
      col.el,
      h('div', {class: 'pf-col-cab'}, h('h3', {}, tr('Fondo de combate', 'Battle background')),
        h('small', {class: 'tenue'}, tr('El fondo que ves en tus combates. «Aleatorio» elige uno distinto en cada combate entre los que tienes.', 'The background you see in your battles. "Random" picks a different one each battle among those you own.'))),
      selectorFondos(),
      h('div', {class: 'pf-col-cab'}, h('h3', {}, tr('Títulos', 'Titles')), contTitulos,
        h('small', {class: 'tenue'}, tr('Elige arriba cuál se enseña en el VS (o ninguno). Cada combate cuenta si dura 3 turnos o más.', 'Choose above which one shows in the VS (or none). Battles count if they last 3+ turns.'))),
      titulosEl));
  pintarTitulos();
  pintarCab();
  alCambiarColeccion(cab, () => { pintarCab(); col.pintar(); });
}

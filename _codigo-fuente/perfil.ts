// Pantalla de perfil: avatar, nombre, estadísticas online y contra la IA (separadas) y la colección.
import {tr} from './idioma';
import {h} from './util';
import {nombreJugador} from './nucleo';
import {abrirAjustes} from './ajustes';
import {perfil, rango, nombreModo, TipoNivel} from './nivel';
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
        // El título equipado irá aquí cuando existan los títulos (fase 7)
        h('small', {class: 'tenue'}, a.nombre + ' · ' + tr('sprite: ', 'sprite: ') + a.autor),
        h('button', {class: 'btn btn-sec btn-sm', onclick: () => abrirAjustes(() => pintarCab())}, tr('Cambiar nombre', 'Change name'))));
    const {tengo, total} = progresoColeccion();
    contador.textContent = tr(`Colección: ${tengo}/${total}`, `Collection: ${tengo}/${total}`);
  };

  raiz.innerHTML = '';
  raiz.append(
    h('header', {class: 'barra'}, h('button', {class: 'btn btn-sec', onclick: volver}, tr('← Inicio', '← Home')), h('h2', {}, tr('Perfil', 'Profile'))),
    h('div', {class: 'perfil'},
      cab,
      bloqueStats('online'),
      bloqueStats('ia'),
      h('div', {class: 'pf-col-cab'}, h('h3', {}, tr('Tu colección', 'Your collection')), contador,
        h('small', {class: 'tenue'}, tr('Toca un entrenador para usarlo como avatar. Los nuevos se consiguen en el Gacha.', 'Tap a trainer to use it as your avatar. Get new ones in the Gacha.'))),
      col.el));
  pintarCab();
  alCambiarColeccion(cab, () => { pintarCab(); col.pintar(); });
}

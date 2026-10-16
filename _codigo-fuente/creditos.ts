// Créditos: autores de los Fakemon, de los sprites de entrenador y del motor.
import {tr} from './idioma';
import {INFO} from './mod';
import {h, dex, spriteImg, nombreVisible} from './util';
import {AVATARES, avatarImg} from './avatares';

const W: any = window;
export interface Autores {idea: string, diseno: string, sprites: string}

/** Autores de un Fakemon (null si es un Pokémon oficial sin cambios de diseño) */
export function creditosDe(especie: string): Autores | null {
  const d = dex();
  const sp = d.species.get(especie);
  if (!sp.exists || !INFO.custom.has(sp.id)) return null;
  const cfg = W.CREDITOS_FAKEMON || {};
  const base = cfg.porDefecto || {idea: 'Arga', diseno: 'reza3u.sprites', sprites: 'reza3u.sprites'};
  const exc = cfg.excepciones || {};
  const extra = exc[sp.name] || exc[sp.baseSpecies] || exc[nombreVisible(sp.name)] || {};
  return {...base, ...extra};
}

/** Bloque pequeño para las fichas de la Pokédex */
export function bloqueCreditos(especie: string): HTMLElement | null {
  const c = creditosDe(especie);
  if (!c) return null;
  const fila = (etq: string, quien: string) => h('span', {}, h('span', {class: 'tenue'}, etq), ' ', h('b', {}, quien));
  return h('div', {class: 'dex-creditos'}, '✎ ',
    fila(tr('Idea:', 'Idea:'), c.idea), ' · ', fila(tr('Diseño:', 'Design:'), c.diseno), ' · ', fila(tr('Sprites:', 'Sprites:'), c.sprites));
}

/** Pantalla de créditos */
export function pantallaCreditos(raiz: HTMLElement, volver: () => void) {
  const d = dex();
  // Fakemon agrupados por autores
  const grupos = new Map<string, {a: Autores, especies: string[]}>();
  for (const id of INFO.custom) {
    const sp = d.species.get(id);
    // Las formas solo de combate no salen, salvo las megaevoluciones (Mega Metagross X)
    if (!sp.exists || (sp.battleOnly && !sp.isMega && !sp.requiredItem)) continue;
    const a = creditosDe(sp.name);
    if (!a) continue;
    const k = `${a.idea}|${a.diseno}|${a.sprites}`;
    if (!grupos.has(k)) grupos.set(k, {a, especies: []});
    grupos.get(k)!.especies.push(sp.name);
  }
  // Sprites de entrenador agrupados por artista
  const artistas = new Map<string, string[]>();
  for (const av of AVATARES) {
    if (!artistas.has(av.autor)) artistas.set(av.autor, []);
    artistas.get(av.autor)!.push(av.id);
  }
  const persona = (etq: string, quien: string) => h('div', {class: 'cred-persona'}, h('small', {class: 'tenue'}, etq), h('b', {}, quien));
  raiz.innerHTML = '';
  raiz.append(
    h('header', {class: 'barra'}, h('button', {class: 'btn btn-sec', onclick: volver}, tr('← Inicio', '← Home')), h('h2', {}, tr('Créditos', 'Credits'))),
    h('div', {class: 'creditos'},
      h('section', {class: 'tarjeta cred-lema'}, h('b', {}, tr('Colosseum Nexus es y será gratis: sin anuncios, sin compras externas (con dinero real) y sin ventajas de pago.',
        'Colosseum Nexus is and will always be free: no ads, no external purchases (with real money) and no pay-to-win advantages.'))),
      h('section', {class: 'tarjeta'},
        h('h3', {}, tr('Fakemon', 'Fakemon')),
        ...[...grupos.values()].sort((x, y) => y.especies.length - x.especies.length).map(g => h('div', {class: 'cred-grupo'},
          h('div', {class: 'cred-personas'},
            persona(tr('Idea del diseño', 'Design idea'), g.a.idea),
            persona(tr('Diseño final', 'Final design'), g.a.diseno),
            persona(tr('Sprites', 'Sprites'), g.a.sprites)),
          h('div', {class: 'cred-sprites'}, ...g.especies.map(n => {
            const el = h('div', {class: 'cred-poke', title: nombreVisible(n)}, spriteImg(n), h('small', {}, nombreVisible(n)));
            return el;
          }))))),
      h('section', {class: 'tarjeta'},
        h('h3', {}, tr('Sprites de entrenador (avatares)', 'Trainer sprites (avatars)')),
        ...[...artistas.entries()].map(([quien, ids]) => h('div', {class: 'cred-grupo'},
          h('div', {class: 'cred-personas'}, persona(tr('Sprites', 'Sprites'), quien), h('small', {class: 'tenue'}, tr(`${ids.length} entrenador${ids.length > 1 ? 'es' : ''}`, `${ids.length} trainer${ids.length > 1 ? 's' : ''}`))),
          h('div', {class: 'cred-avatares'}, ...ids.map(id => avatarImg(id, '', 'busto')))))),
      h('section', {class: 'tarjeta'},
        h('h3', {}, tr('Y además', 'Also')),
        ...((W.CREDITOS_OTROS || []) as any[]).map(o => h('div', {class: 'cred-otro'}, h('span', {class: 'tenue'}, tr(o.que, o.queEN || o.que)), h('b', {}, o.quien))))));
}

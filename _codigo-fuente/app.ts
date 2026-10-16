// Punto de entrada: pantalla de inicio y navegación.
import {tr, IDIOMA} from './idioma';
import {buildMod} from './mod';
import {h} from './util';
import {pantallaEquipos} from './constructor';
import {app, cambiarPantalla, nav} from './nucleo';
import {practica} from './practica';
import {online} from './online';
import {pokedex} from './pokedex';
import {pantallaAvatares} from './avatares';
import {pantallaCreditos} from './creditos';
import {menuPrincipal} from './menu';
import {iniciarMusica} from './musica';
import {pantallaPerfil} from './perfil';
import {pantallaHistoria} from './historia';

const inicio = menuPrincipal;
nav.inicio = inicio;
nav.online = online;
nav.practica = practica;
nav.pokedex = () => pokedex();
nav.pbs = () => pokedex(true);
nav.avatares = () => pantallaAvatares(app, () => cambiarPantalla(inicio));
nav.historia = pantallaHistoria;
nav.perfil = () => pantallaPerfil(app, () => cambiarPantalla(inicio));
nav.creditos = () => pantallaCreditos(app, () => cambiarPantalla(inicio));
nav.equipos = () => pantallaEquipos(app, () => cambiarPantalla(inicio));

document.documentElement.lang = IDIOMA;

// Atajo oculto del exportador PBS: Ctrl + Alt + Ñ (en Windows, AltGr + Ñ hace lo mismo).
// Se reconoce por la tecla física (la Ñ del teclado español = 'Semicolon'), así que en otros
// teclados es la tecla que ocupa ese sitio. Alternativa sin teclado: añadir #pbs a la dirección.
// No se activa mientras escribes en un campo de texto. No es una medida de seguridad.
function escribiendo(el: EventTarget | null) {
  const e = el as HTMLElement | null;
  return !!e && (e.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(e.tagName));
}
document.addEventListener('keydown', ev => {
  if (!ev.ctrlKey || !ev.altKey || ev.shiftKey || ev.metaKey || ev.repeat) return;
  if (ev.code !== 'Semicolon' && !/^ñ$/i.test(ev.key)) return;
  if (escribiendo(ev.target)) return;
  ev.preventDefault();
  cambiarPantalla(nav.pbs);
});
const abrirPorDireccion = () => { if (location.hash === '#pbs') { history.replaceState(null, '', location.pathname + location.search); cambiarPantalla(nav.pbs); } };
window.addEventListener('hashchange', abrirPorDireccion);
try {
  buildMod();
  iniciarMusica();
  inicio();
  abrirPorDireccion();
} catch (e: any) {
  console.error(e);
  app.innerHTML = '';
  app.append(h('div', {class: 'avisos'}, tr('Error al cargar los datos personalizados: ', 'Error loading the custom data: ') + (e?.message || e),
    h('p', {}, tr('Revisa el último cambio que hiciste en la carpeta datos/.', 'Check the last change you made in the datos/ folder.'))));
}

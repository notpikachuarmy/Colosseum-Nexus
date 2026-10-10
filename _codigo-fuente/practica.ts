// Práctica contra la IA (un combate, al mejor de 3 o draft al mejor de 3).
import {tr} from './idioma';
import {h, toast, storage} from './util';
import {cargarEquipos, guardarEquipos, validarEquipo, Equipo, SetPkm} from './equipos';
import {equiposParejos, Reserva} from './aleatorio';
import {PantallaCombate} from './combate';
import {Motor, IA} from './motor';
import {app, cambiarPantalla, setLimpiar, nav, nombreJugador, selectorEquipo, selectorReserva, selectorSerie, campo, TipoSerie} from './nucleo';
import {Serie, empaquetarSets, pantallaSeleccion} from './serie';

const NOMBRE_IA = tr('IA', 'AI');
type Modo = 'parejos' | 'mio-vs-aleatorio' | 'mio-vs-mio';

export function practica() {
  app.innerHTML = '';
  let serie = storage.get<TipoSerie>('arena.seriePractica', 'uno');
  const formato = h('select', {class: 'select'}, h('option', {value: 'singles'}, tr('Individual', 'Singles')), h('option', {value: 'doubles'}, tr('Dobles', 'Doubles')));
  formato.value = storage.get('arena.formatoPractica', 'singles');
  formato.addEventListener('change', () => storage.set('arena.formatoPractica', formato.value));
  const reserva = selectorReserva();
  let sel = selectorEquipo(serie === 'draft' ? 'draft' : 'normal');
  let rival = selectorEquipo(serie === 'draft' ? 'draft' : 'normal');
  const modo = h('select', {class: 'select'});
  const cont = h('div', {class: 'tarjeta formulario'});

  const pintar = () => {
    sel = selectorEquipo(serie === 'draft' ? 'draft' : 'normal');
    rival = selectorEquipo(serie === 'draft' ? 'draft' : 'normal');
    const actual = storage.get('arena.modoPractica', 'parejos');
    modo.innerHTML = '';
    modo.append(h('option', {value: 'parejos'}, serie === 'draft' ? tr('Plantillas aleatorias parejas (12 cada uno)', 'Balanced random rosters (12 each)') : tr('Los dos con equipos aleatorios parejos', 'Both with balanced random teams')));
    if (!sel.vacio) {
      modo.append(h('option', {value: 'mio-vs-aleatorio'}, serie === 'draft' ? tr('Mi plantilla contra una aleatoria', 'My roster vs a random one') : tr('Mi equipo contra un equipo aleatorio', 'My team vs a random team')));
      modo.append(h('option', {value: 'mio-vs-mio'}, serie === 'draft' ? tr('Mi plantilla contra otra de las mías', 'My roster vs another of mine') : tr('Mi equipo contra otro de mis equipos', 'My team vs another of my teams')));
    }
    modo.value = [...modo.options].some(o => o.value === actual) ? actual : 'parejos';
    const m = modo.value as Modo;
    cont.innerHTML = '';
    cont.append(
      campo(tr('Tipo de partida', 'Match type'), selectorSerie(serie, v => { serie = v; storage.set('arena.seriePractica', v); pintar(); })),
      campo(tr('Equipos', 'Teams'), modo),
      m !== 'mio-vs-mio' ? campo(tr('Pokémon de los equipos aleatorios', 'Pokémon in random teams'), reserva.el) : null,
      m !== 'parejos' ? campo(serie === 'draft' ? tr('Tu plantilla', 'Your roster') : tr('Tu equipo', 'Your team'), sel.el) : null,
      m === 'mio-vs-mio' ? campo(serie === 'draft' ? tr('Plantilla de la IA', "AI's roster") : tr('Equipo de la IA', "AI's team"), rival.el) : null,
      serie === 'draft' && sel.vacio ? h('p', {class: 'tenue'}, tr('Para usar tu propia plantilla, crea en "Mis equipos" una "Plantilla draft" de 7 a 12 Pokémon.', 'To use your own roster, create a "Draft roster" of 7 to 12 Pokémon in "My teams".')) : null,
      campo(tr('Formato', 'Format'), formato),
      h('button', {class: 'btn btn-grande', onclick: empezar}, tr('¡A combatir!', 'Battle!')));
  };
  modo.addEventListener('change', () => { storage.set('arena.modoPractica', modo.value); pintar(); });

  function empezar() {
    const f = formato.value as 'singles' | 'doubles';
    const m = modo.value as Modo;
    const r = reserva.valor();
    const tam = serie === 'draft' ? 12 : 6;
    let rosters: [SetPkm[], SetPkm[]];
    if (m === 'parejos') {
      const [a, b] = equiposParejos(r, tam);
      rosters = [a.sets, b.sets];
    } else {
      const eq = sel.equipo();
      if (!eq) return;
      const errs = validarEquipo({...eq, formato: serie === 'draft' ? 'draft' : f});
      if (errs.length) { toast(errs[0], 5000); return; }
      if (m === 'mio-vs-mio') {
        const otro = rival.equipo();
        if (!otro) return;
        rosters = [eq.sets, otro.sets];
      } else rosters = [eq.sets, equiposParejos(r, Math.max(6, eq.sets.length))[1].sets];
    }
    cambiarPantalla(() => serieLocal(new Serie(serie), rosters, f, m === 'parejos' ? r : null));
  }

  app.append(h('header', {class: 'barra'}, h('button', {class: 'btn btn-sec', onclick: () => cambiarPantalla(nav.inicio)}, tr('← Inicio', '← Home')), h('h2', {}, tr('Practicar contra la IA', 'Practice against the AI'))), cont);
  pintar();
}

/** Una serie contra la IA */
function serieLocal(serie: Serie, rosters: [SetPkm[], SetPkm[]], formato: 'singles' | 'doubles', reserva: Reserva | null) {
  const yo = nombreJugador() || tr('Tú', 'You');
  const nombres: [string, string] = [yo, NOMBRE_IA];
  let previa: number[] | undefined;
  let activo = true;
  let limpiarJuego: (() => void) | null = null;
  setLimpiar(() => { activo = false; limpiarJuego?.(); });

  const siguiente = () => {
    if (!activo) return;
    if (serie.tipo === 'draft') {
      app.innerHTML = '';
      const raiz = h('div', {});
      app.append(raiz);
      pantallaSeleccion(raiz, {
        titulo: tr(`Combate ${serie.juego}`, `Battle ${serie.juego}`), marcador: serie.texto(nombres), roster: rosters[0], previa,
        rosterRival: rosters[1].map(s => ({species: s.species})), nombreRival: tr('la IA', 'the AI'),
        onListo: indices => {
          previa = indices;
          const iaIndices = [...rosters[1].keys()].sort(() => Math.random() - 0.5).slice(0, 6);
          jugar(indices.map(i => rosters[0][i]), iaIndices.map(i => rosters[1][i]));
        },
      });
    } else jugar(rosters[0].slice(0, 6), rosters[1].slice(0, 6));
  };

  const jugar = (mio: SetPkm[], ia: SetPkm[]) => {
    if (!activo) return;
    app.innerHTML = '';
    const motor = new Motor(formato, {nombre: yo, equipo: empaquetarSets(mio)}, {nombre: NOMBRE_IA, equipo: empaquetarSets(ia)});
    new IA(motor, 'p2');
    const raiz = h('div', {});
    app.append(raiz);
    const titulo = (formato === 'doubles' ? tr('Práctica · Dobles', 'Practice · Doubles') : tr('Práctica · Individual', 'Practice · Singles')) + (serie.alMejorDe3 ? tr(` · Combate ${serie.juego}`, ` · Battle ${serie.juego}`) : '');
    const pantalla = new PantallaCombate(raiz, {
      yo: 'p1', titulo,
      elegir: e => motor.elegir('p1', e),
      rendirse: () => motor.rendirse('p1'),
      alTerminar: () => {
        const g = pantalla.estado.ganador;
        if (!pantalla.estado.contado) {
          pantalla.estado.contado = true;
          serie.registrar(g === yo ? 0 : g === NOMBRE_IA ? 1 : -1);
        }
        const botones: HTMLElement[] = [];
        if (serie.alMejorDe3) botones.push(h('div', {class: 'marcador'}, serie.texto(nombres)));
        if (!serie.terminada) botones.push(h('button', {class: 'btn', onclick: () => { limpiarJuego?.(); siguiente(); }}, tr('Siguiente combate', 'Next battle')));
        else {
          if (serie.alMejorDe3) botones.push(h('div', {class: 'fin-serie'}, serie.marcador[0] > serie.marcador[1] ? tr('🏆 ¡Has ganado la serie!', '🏆 You won the series!') : tr('La IA gana la serie', 'The AI wins the series')));
          botones.push(h('button', {class: 'btn', onclick: () => {
            const nuevos: [SetPkm[], SetPkm[]] = reserva ? (() => { const [a, b] = equiposParejos(reserva, rosters[0].length); return [a.sets, b.sets] as [SetPkm[], SetPkm[]]; })() : rosters;
            cambiarPantalla(() => serieLocal(new Serie(serie.tipo), nuevos, formato, reserva));
          }}, serie.alMejorDe3 ? tr('Otra serie', 'Another series') : tr('Otra vez', 'Play again')));
        }
        if (reserva) botones.push(h('button', {class: 'btn btn-sec', onclick: () => guardarComoEquipo(rosters[0], serie.tipo === 'draft', formato)}, serie.tipo === 'draft' ? tr('Guardar mi plantilla', 'Save my roster') : tr('Guardar mi equipo', 'Save my team')));
        botones.push(h('button', {class: 'btn btn-sec', onclick: () => cambiarPantalla(practica)}, tr('Volver', 'Back')));
        return botones;
      },
    });
    motor.escuchar('p1', c => pantalla.recibir(c));
    limpiarJuego = () => { pantalla.destruir(); motor.destruir(); };
  };

  siguiente();
}

function guardarComoEquipo(sets: SetPkm[], draft: boolean, formato: 'singles' | 'doubles') {
  const lista = cargarEquipos();
  const eq: Equipo = {id: Math.random().toString(36).slice(2, 10), nombre: (draft ? tr('Plantilla aleatoria ', 'Random roster ') : tr('Aleatorio ', 'Random ')) + new Date().toLocaleDateString('es-ES'),
    formato: draft ? 'draft' : formato, sets: sets.map(s => ({...s, name: ''}))};
  lista.push(eq);
  guardarEquipos(lista);
  toast(tr('Guardado en "Mis equipos"', 'Saved in "My teams"'));
}

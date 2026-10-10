// Series (al mejor de 3) y pantalla de elección de los 6 Pokémon para el draft.
import {tr} from './idioma';
import {Teams} from 'pkmn-sim';
import {h, dex, tipoBadge, spriteImg, itemIcon, nombreVisible, nomMov, nomObj, nomHab} from './util';
import {SetPkm, paraSimulador} from './equipos';
import {TipoSerie} from './nucleo';

export class Serie {
  marcador: [number, number] = [0, 0];
  juego = 1;
  constructor(public tipo: TipoSerie) {}
  get alMejorDe3() { return this.tipo !== 'uno'; }
  get terminada() { return this.tipo === 'uno' ? this.juego > 1 : Math.max(...this.marcador) >= 2; }
  /** ganador: 0 = jugador 1, 1 = jugador 2, -1 = empate */
  registrar(ganador: number) {
    if (ganador === 0 || ganador === 1) this.marcador[ganador]++;
    this.juego++;
  }
  texto(nombres: [string, string]) {
    return `${nombres[0]} ${this.marcador[0]} – ${this.marcador[1]} ${nombres[1]}`;
  }
}

export function empaquetarSets(sets: SetPkm[]) {
  return Teams.pack(paraSimulador({id: 'x', nombre: 'x', formato: 'singles', sets}) as any);
}
export function desempaquetar(packed: string): SetPkm[] {
  return (Teams.unpack(packed) || []).map((s: any) => ({
    name: s.name, species: s.species, item: s.item || '', ability: s.ability || '', moves: s.moves || [],
    nature: s.nature || 'Hardy', evs: s.evs || {}, ivs: s.ivs || {}, level: s.level || 100, gender: s.gender || '',
    shiny: !!s.shiny, teraType: s.teraType || '', gigantamax: !!s.gigantamax,
  }));
}

export interface OpcionesSeleccion {
  titulo: string;
  roster: SetPkm[];
  rosterRival: {species: string, item?: string}[];
  nombreRival: string;
  marcador?: string;
  previa?: number[];
  onListo: (indices: number[]) => void;
}

/** Pantalla para elegir 6 Pokémon de la plantilla. Devuelve un objeto para cambiar el estado de espera. */
export function pantallaSeleccion(raiz: HTMLElement, op: OpcionesSeleccion) {
  const n = Math.min(6, op.roster.length);
  let elegidos: number[] = (op.previa || []).filter(i => i < op.roster.length).slice(0, n);
  let enviado = false;
  const estado = h('div', {class: 'sel-estado'});
  const grid = h('div', {class: 'sel-grid'});
  const boton = h('button', {class: 'btn btn-grande'}, tr('¡Listo!', 'Ready!'));
  const d = dex();
  const pintar = () => {
    grid.innerHTML = '';
    op.roster.forEach((s, i) => {
      const idx = elegidos.indexOf(i);
      const sp = d.species.get(s.species);
      const card = h('button', {class: 'sel-card' + (idx >= 0 ? ' elegido' : '') + (enviado ? ' bloqueado' : ''), onclick: () => {
        if (enviado) return;
        if (idx >= 0) elegidos.splice(idx, 1);
        else if (elegidos.length < n) elegidos.push(i);
        pintar();
      }},
      idx >= 0 ? h('span', {class: 'sel-num'}, String(idx + 1)) : null,
      spriteImg(s.species, 'front', s.shiny, 'sel-sprite'),
      h('div', {class: 'sel-nombre'}, s.name && s.name !== sp.baseSpecies ? s.name : nombreVisible(s.species)),
      h('div', {class: 'sel-tipos'}, ...sp.types.map(t => tipoBadge(t, true))),
      h('div', {class: 'sel-item'}, s.item ? itemIcon(s.item) : null, s.item ? nomObj(s.item) : tr('Sin objeto', 'No item')),
      h('div', {class: 'sel-hab'}, nomHab(s.ability)),
      h('div', {class: 'sel-movs'}, ...s.moves.map(m => h('span', {}, nomMov(m)))));
      grid.append(card);
    });
    boton.toggleAttribute('disabled', enviado || elegidos.length !== n);
    boton.textContent = enviado ? tr('Elección enviada', 'Choice sent') : elegidos.length === n ? tr('¡Listo!', 'Ready!') : tr(`Elige ${n - elegidos.length} más`, `Pick ${n - elegidos.length} more`);
  };
  boton.addEventListener('click', () => {
    if (enviado || elegidos.length !== n) return;
    enviado = true;
    pintar();
    op.onListo([...elegidos]);
  });
  raiz.innerHTML = '';
  raiz.append(h('div', {class: 'seleccion'},
    h('div', {class: 'sel-cab'}, h('h2', {}, op.titulo), op.marcador ? h('div', {class: 'marcador'}, op.marcador) : null),
    h('p', {class: 'tenue'}, tr(`Elige ${n} Pokémon de tu plantilla para este combate. El orden no importa: el inicial lo eliges al empezar.`, `Pick ${n} Pokémon from your roster for this battle. Order doesn't matter: you choose your lead when it starts.`)),
    grid,
    h('div', {class: 'sel-rival'}, h('b', {}, tr(`Plantilla de ${op.nombreRival}:`, `${op.nombreRival}'s roster:`)),
      h('div', {class: 'sel-rival-lista'}, ...op.rosterRival.map(r => h('div', {class: 'sel-rival-poke', title: nombreVisible(r.species)},
        spriteImg(r.species, 'front', false, 'mini'), h('small', {}, nombreVisible(r.species)))))),
    estado, boton));
  pintar();
  return {
    esperando(texto: string) { estado.textContent = texto; },
  };
}

export {nomMov};

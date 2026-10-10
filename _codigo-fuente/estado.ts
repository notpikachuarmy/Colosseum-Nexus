// Estado del combate reconstruido a partir del protocolo de Showdown + textos en español.
import {toID} from 'pkmn-sim';
import {dex, STATS_LARGO, TIPOS_ES, nomMov, nomHab, nomObj, nomEfecto} from './util';

export type LadoId = 'p1' | 'p2';
export interface Pkm {
  name: string; species: string; level: number; shiny: boolean; gender: string;
  hp: number; maxhp: number; status: string; fainted: boolean;
  boosts: {[k: string]: number}; volatiles: Set<string>;
  item?: string; ability?: string; tera?: string; types?: string[];
  conocido: boolean;
  movesVistos?: string[]; itemPerdido?: boolean;
}
export interface Lado {
  id: LadoId; nombre: string; equipo: Pkm[]; activos: (Pkm | null)[]; condiciones: Map<string, number>; tamano: number;
}

export function parseDetails(details: string) {
  const parts = details.split(', ');
  const out = {species: parts[0], level: 100, shiny: false, gender: '', tera: ''};
  for (const p of parts.slice(1)) {
    if (p.startsWith('L')) out.level = parseInt(p.slice(1));
    else if (p === 'shiny') out.shiny = true;
    else if (p === 'M' || p === 'F') out.gender = p;
    else if (p.startsWith('tera:')) out.tera = p.slice(5);
  }
  return out;
}
export function parseHP(cond: string) {
  const [hpPart, status] = (cond || '').split(' ');
  if (hpPart === '0' || status === 'fnt') return {hp: 0, maxhp: 100, status: '', fainted: true};
  const [hp, max] = hpPart.split('/').map(Number);
  return {hp: hp || 0, maxhp: max || 100, status: status || '', fainted: false};
}

export class Estado {
  lados: {[k in LadoId]: Lado};
  yo: LadoId = 'p1';
  turno = 0;
  clima = '';
  campo = new Map<string, number>();
  gametype = 'singles';
  ganador: string | null = null;
  terminado = false;

  constructor(yo: LadoId) {
    this.yo = yo;
    const lado = (id: LadoId): Lado => ({id, nombre: id, equipo: [], activos: [], condiciones: new Map(), tamano: 6});
    this.lados = {p1: lado('p1'), p2: lado('p2')};
  }
  get rival(): LadoId { return this.yo === 'p1' ? 'p2' : 'p1'; }

  /** Sincroniza mi equipo con la petición del simulador */
  sincronizar(req: any) {
    if (!req?.side) return;
    const lado = this.lados[this.yo];
    lado.nombre = req.side.name || lado.nombre;
    const nuevos: Pkm[] = [];
    for (const p of req.side.pokemon) {
      const name = p.ident.replace(/^p[12]: /, '');
      const d = parseDetails(p.details);
      let mon = lado.equipo.find(x => x.name === name);
      if (!mon) mon = this.nuevoPkm(name, d.species, d.level, d.shiny);
      mon.species = d.species; mon.level = d.level; mon.shiny = d.shiny;
      Object.assign(mon, parseHP(p.condition));
      mon.item = p.item ? (dex().items.get(p.item).name || p.item) : '';
      mon.ability = p.ability ? dex().abilities.get(p.ability).name : (p.baseAbility ? dex().abilities.get(p.baseAbility).name : '');
      if (p.terastallized) mon.tera = p.terastallized;
      (mon as any).stats = p.stats; (mon as any).moves = p.moves; (mon as any).teraType = p.teraType;
      nuevos.push(mon);
    }
    lado.equipo = nuevos;
  }

  parseIdent(ident: string): {lado: Lado, pos: number, name: string} | null {
    const m = /^(p[12])([a-c])?: (.*)$/.exec(ident || '');
    if (!m) return null;
    return {lado: this.lados[m[1] as LadoId], pos: m[2] ? m[2].charCodeAt(0) - 97 : -1, name: m[3]};
  }

  /** Busca (o crea) el Pokémon de un ident y detalles */
  pkm(ident: string, details?: string): Pkm | null {
    const p = this.parseIdent(ident);
    if (!p) return null;
    const {lado, pos, name} = p;
    if (pos >= 0 && !details && lado.activos[pos] && lado.activos[pos]!.name === name) return lado.activos[pos];
    let found = lado.equipo.find(x => x.name === name && x.conocido);
    if (!found && details) {
      const d = parseDetails(details);
      const base = dex().species.get(d.species).baseSpecies;
      found = lado.equipo.find(x => !x.conocido && dex().species.get(x.species).baseSpecies === base);
      if (found) { found.name = name; found.conocido = true; }
    }
    if (!found) found = lado.equipo.find(x => x.name === name);
    if (!found) {
      const d = details ? parseDetails(details) : {species: name, level: 100, shiny: false, gender: '', tera: ''};
      found = this.nuevoPkm(name, d.species, d.level, d.shiny);
      lado.equipo.push(found);
    }
    return found;
  }

  nuevoPkm(name: string, species: string, level = 100, shiny = false): Pkm {
    return {name, species, level, shiny, gender: '', hp: 100, maxhp: 100, status: '', fainted: false,
      boosts: {}, volatiles: new Set(), conocido: true};
  }

  nombre(ident: string, conRival = true) {
    const p = this.parseIdent(ident);
    if (!p) return ident;
    if (p.lado.id !== this.yo && conRival) return `el ${p.name} rival`;
    return p.name;
  }
  Nombre(ident: string) {
    const n = this.nombre(ident);
    return n.charAt(0).toUpperCase() + n.slice(1);
  }

  /** Aplica una línea de protocolo y devuelve el texto en español (si lo hay) */
  aplicar(line: string): {texto?: string, clase?: string, anim?: any} {
    if (!line.startsWith('|')) return {};
    const parts = line.slice(1).split('|');
    const cmd = parts[0];
    const args = parts.slice(1);
    const kw: {[k: string]: string} = {};
    const pos: string[] = [];
    for (const a of args) {
      const m = /^\[(\w+)\](?: ?(.*))?$/.exec(a);
      if (m) kw[m[1]] = m[2] ?? ''; else pos.push(a);
    }
    const N = (i: string) => this.Nombre(i);
    const n = (i: string) => this.nombre(i);
    const efecto = (e: string) => limpiaEfecto(e);
    const desde = kw.from ? limpiaEfecto(kw.from) : '';
    // Información descubierta: habilidades y objetos que se revelan con [from]
    if (kw.from && cmd !== '-enditem') {
      const m = /^(ability|item): ?(.*)$/.exec(kw.from);
      const esPos = (x: string) => /^p[12][a-c]: /.test(x || '');
      const ident = esPos(kw.of) ? kw.of : esPos(pos[0]) ? pos[0] : '';
      const dueno = m && ident ? this.pkm(ident) : null;
      if (m && dueno) {
        if (m[1] === 'ability') { if (!/^(Trace|Receiver|Power of Alchemy)$/.test(m[2])) dueno.ability = m[2]; }
        else if (cmd !== '-item') { dueno.item = m[2]; dueno.itemPerdido = false; }
      }
    }

    switch (cmd) {
    case 'player': {
      if (pos[1]) this.lados[pos[0] as LadoId].nombre = pos[1];
      return {};
    }
    case 'teamsize': this.lados[pos[0] as LadoId].tamano = +pos[1]; return {};
    case 'gametype': this.gametype = pos[0]; return {};
    case 'poke': {
      const lado = this.lados[pos[0] as LadoId];
      const d = parseDetails(pos[1]);
      if (lado.id !== this.yo) {
        const p = this.nuevoPkm(d.species, d.species, d.level, d.shiny);
        p.conocido = false;
        lado.equipo.push(p);
      }
      return {};
    }
    case 'clearpoke': {
      for (const id of ['p1', 'p2'] as LadoId[]) if (id !== this.yo) this.lados[id].equipo = [];
      return {};
    }
    case 'teampreview': return {texto: 'Elige el orden de tu equipo.', clase: 'sistema'};
    case 'start': return {texto: '¡Comienza el combate!', clase: 'sistema'};
    case 'turn': this.turno = +pos[0]; return {texto: `Turno ${pos[0]}`, clase: 'turno'};
    case 'win': this.ganador = pos[0]; this.terminado = true; return {texto: `¡${pos[0]} ha ganado el combate!`, clase: 'fin'};
    case 'tie': this.terminado = true; return {texto: '¡Empate!', clase: 'fin'};
    case 'switch': case 'drag': case 'replace': {
      const p = this.parseIdent(pos[0])!;
      const d = parseDetails(pos[1]);
      const mon = this.pkm(pos[0], pos[1])!;
      const viejo = p.lado.activos[p.pos];
      if (viejo && viejo !== mon && cmd !== 'replace') { viejo.boosts = {}; viejo.volatiles.clear(); }
      mon.species = d.species; mon.level = d.level; mon.shiny = d.shiny;
      if (d.tera) mon.tera = d.tera;
      const hp = parseHP(pos[2]);
      Object.assign(mon, hp);
      mon.boosts = {}; mon.volatiles = new Set();
      p.lado.activos[p.pos] = mon;
      if (cmd === 'replace') return {anim: {tipo: 'switch', ident: pos[0]}};
      const quien = p.lado.id === this.yo ? `¡Adelante, ${p.name}!` : `¡${p.lado.nombre} sacó a ${p.name}!`;
      return {texto: cmd === 'drag' ? `¡${p.name} fue arrastrado al combate!` : quien, anim: {tipo: 'switch', ident: pos[0]}};
    }
    case 'detailschange': case '-formechange': {
      const mon = this.pkm(pos[0]);
      if (mon) {
        const d = parseDetails(pos[1]);
        mon.species = d.species;
        if (cmd === 'detailschange') mon.shiny = d.shiny;
        if (pos[2]) Object.assign(mon, parseHP(pos[2]));
      }
      return {anim: {tipo: 'forma', ident: pos[0]}};
    }
    case 'move': {
      const mov = nomMov(pos[1]);
      const quien = this.pkm(pos[0]);
      const mvd = dex().moves.get(pos[1]);
      if (quien && !kw.from && mvd.exists && !mvd.isZ && !mvd.isMax && mvd.id !== 'struggle') {
        quien.movesVistos = quien.movesVistos || [];
        if (!quien.movesVistos.includes(mvd.name)) quien.movesVistos.push(mvd.name);
      }
      const ext = kw.from ? ` (por ${desde})` : '';
      return {texto: `¡${N(pos[0])} usó ${mov}!${ext}`, clase: 'mov', anim: {tipo: 'move', ident: pos[0], target: pos[2], move: mov, still: 'still' in kw}};
    }
    case 'cant': {
      const r = toID(pos[1]);
      const t: {[k: string]: string} = {
        slp: `${N(pos[0])} está profundamente dormido.`, par: `¡${N(pos[0])} está paralizado! No se puede mover.`,
        frz: `¡${N(pos[0])} está congelado!`, flinch: `¡${N(pos[0])} retrocedió y no se pudo mover!`,
        recharge: `${N(pos[0])} necesita recuperarse.`, truant: `${N(pos[0])} está holgazaneando.`,
        nopp: `¡${N(pos[0])} no tiene PP para ese movimiento!`, attract: `¡${N(pos[0])} está enamorado y no ataca!`,
      };
      return {texto: t[r] || `¡${N(pos[0])} no puede usar ${pos[2] ? nomMov(pos[2]) : 'el movimiento'}! (${efecto(pos[1])})`};
    }
    case 'faint': {
      const mon = this.pkm(pos[0]);
      if (mon) { mon.fainted = true; mon.hp = 0; mon.status = ''; }
      return {texto: `¡${N(pos[0])} se debilitó!`, clase: 'debilitado', anim: {tipo: 'faint', ident: pos[0]}};
    }
    case '-damage': case '-heal': case '-sethp': {
      const mon = this.pkm(pos[0]);
      if (!mon) return {};
      const antes = mon.maxhp ? mon.hp / mon.maxhp : 0;
      Object.assign(mon, parseHP(pos[1]));
      const despues = mon.maxhp ? mon.hp / mon.maxhp : 0;
      const pct = Math.round(Math.abs(despues - antes) * 100);
      const anim = {tipo: cmd === '-damage' ? 'damage' : 'heal', ident: pos[0]};
      if (cmd === '-sethp') return {anim};
      if (cmd === '-damage') {
        if (kw.from) {
          const f = toID(kw.from.replace(/^(item|ability|move): ?/, ''));
          const msgs: {[k: string]: string} = {
            psn: `¡${N(pos[0])} sufre por el veneno!`, tox: `¡${N(pos[0])} sufre por el veneno!`,
            brn: `¡${N(pos[0])} se resiente de la quemadura!`, recoil: `¡${N(pos[0])} sufre el daño del retroceso!`,
            stealthrock: `¡Unas piedras puntiagudas dañaron a ${n(pos[0])}!`, spikes: `¡${N(pos[0])} fue herido por las púas!`,
            sandstorm: `¡La tormenta de arena zarandea a ${n(pos[0])}!`, hail: `¡El granizo golpea a ${n(pos[0])}!`,
            leechseed: `¡Las drenadoras restan salud a ${n(pos[0])}!`, confusion: `¡Está tan confuso que se hirió a sí mismo!`,
            lifeorb: `¡${N(pos[0])} perdió algo de vida!`, rockyhelmet: `¡${N(pos[0])} fue herido por el Casco Dentado!`,
            roughskin: `¡${N(pos[0])} fue herido!`, ironbarbs: `¡${N(pos[0])} fue herido!`,
            curse: `¡${N(pos[0])} es víctima de una maldición!`, nightmare: `¡${N(pos[0])} sufre una pesadilla!`,
            saltcure: `¡${N(pos[0])} sufre por la Sal Curativa!`,
          };
          const mm = msgs[f] || (kw.from === 'confused' ? msgs.confusion : null) || `¡${N(pos[0])} perdió PS por ${desde}!`;
          return {texto: `${mm} (−${pct}%)`, clase: 'dano', anim};
        }
        if (!pct) return {anim};
        return {texto: `(${N(pos[0])} perdió el ${pct}% de sus PS)`, clase: 'dano-num', anim};
      }
      if (kw.from) return {texto: `¡${N(pos[0])} recuperó PS gracias a ${desde}! (+${pct}%)`, clase: 'cura', anim};
      return {texto: `¡${N(pos[0])} recuperó PS! (+${pct}%)`, clase: 'cura', anim};
    }
    case '-status': {
      const mon = this.pkm(pos[0]);
      if (mon) mon.status = pos[1];
      const t: {[k: string]: string} = {
        slp: `¡${N(pos[0])} se ha dormido!`, par: `¡${N(pos[0])} está paralizado! Quizás no pueda moverse.`,
        brn: `¡${N(pos[0])} se ha quemado!`, psn: `¡${N(pos[0])} ha sido envenenado!`,
        tox: `¡${N(pos[0])} ha sido gravemente envenenado!`, frz: `¡${N(pos[0])} se ha congelado!`,
      };
      return {texto: (t[pos[1]] || `${N(pos[0])}: ${pos[1]}`) + (kw.from ? ` (${desde})` : ''), clase: 'estado', anim: {tipo: 'status', ident: pos[0]}};
    }
    case '-curestatus': {
      const mon = this.pkm(pos[0]);
      if (mon) mon.status = '';
      const t: {[k: string]: string} = {
        slp: `¡${N(pos[0])} se ha despertado!`, frz: `¡${N(pos[0])} se ha descongelado!`, par: `¡${N(pos[0])} ya no está paralizado!`,
        brn: `¡${N(pos[0])} ya no está quemado!`, psn: `¡${N(pos[0])} ya no está envenenado!`, tox: `¡${N(pos[0])} ya no está envenenado!`,
      };
      return {texto: t[pos[1]] || `¡${N(pos[0])} se curó!`, clase: 'estado'};
    }
    case '-cureteam': {
      const p = this.parseIdent(pos[0]);
      if (p) for (const m of p.lado.equipo) m.status = '';
      return {texto: '¡El equipo se curó de sus problemas de estado!', clase: 'estado'};
    }
    case '-boost': case '-unboost': {
      const mon = this.pkm(pos[0]);
      let v = +pos[2];
      if (mon) mon.boosts[pos[1]] = Math.max(-6, Math.min(6, (mon.boosts[pos[1]] || 0) + (cmd === '-boost' ? v : -v)));
      const stat = STATS_LARGO[pos[1]] || pos[1];
      const sube = cmd === '-boost';
      let txt: string;
      if (v === 0) txt = `¡${capital(stat)} de ${n(pos[0])} no puede ${sube ? 'subir' : 'bajar'} más!`;
      else txt = `¡${capital(stat)} de ${n(pos[0])} ${sube ? 'aumentó' : 'disminuyó'}${v >= 3 ? ' muchísimo' : v === 2 ? ' mucho' : ''}!`;
      if (kw.from) txt += ` (${desde})`;
      return {texto: txt, clase: sube ? 'sube' : 'baja', anim: {tipo: sube ? 'boost' : 'unboost', ident: pos[0]}};
    }
    case '-setboost': {
      const mon = this.pkm(pos[0]);
      if (mon) mon.boosts[pos[1]] = +pos[2];
      return 'silent' in kw ? {} : {texto: `¡${capital(STATS_LARGO[pos[1]] || pos[1])} de ${n(pos[0])} cambió!`};
    }
    case '-clearboost': case '-clearpositiveboost': case '-clearnegativeboost': {
      const mon = this.pkm(pos[0]);
      if (mon) for (const k of Object.keys(mon.boosts)) {
        if (cmd === '-clearboost' || (cmd === '-clearpositiveboost' && mon.boosts[k] > 0) || (cmd === '-clearnegativeboost' && mon.boosts[k] < 0)) mon.boosts[k] = 0;
      }
      return {texto: `¡Los cambios de características de ${n(pos[0])} desaparecieron!`};
    }
    case '-clearallboost': {
      for (const l of Object.values(this.lados)) for (const m of l.activos) if (m) m.boosts = {};
      return {texto: '¡Se eliminaron todos los cambios de características!'};
    }
    case '-invertboost': {
      const mon = this.pkm(pos[0]);
      if (mon) for (const k of Object.keys(mon.boosts)) mon.boosts[k] = -mon.boosts[k];
      return {texto: `¡Los cambios de características de ${n(pos[0])} se invirtieron!`};
    }
    case '-copyboost': {
      const a = this.pkm(pos[0]), b = this.pkm(pos[1]);
      if (a && b) a.boosts = {...b.boosts};
      return {texto: `¡${N(pos[0])} copió los cambios de características de ${n(pos[1])}!`};
    }
    case '-swapboost': return {texto: `¡${N(pos[0])} intercambió cambios de características!`};
    case '-weather': {
      const w = pos[0];
      const nombres: {[k: string]: [string, string, string]} = {
        RainDance: ['¡Ha empezado a llover!', 'Sigue lloviendo.', 'Ha dejado de llover.'],
        SunnyDay: ['¡El sol pega fuerte!', 'El sol sigue pegando fuerte.', 'El sol ya no pega tan fuerte.'],
        Sandstorm: ['¡Se ha desatado una tormenta de arena!', 'La tormenta de arena sigue azotando.', 'La tormenta de arena ha amainado.'],
        Hail: ['¡Ha empezado a granizar!', 'Sigue granizando.', 'Ha dejado de granizar.'],
        Snowscape: ['¡Ha empezado a nevar!', 'Sigue nevando.', 'Ha dejado de nevar.'],
        Snow: ['¡Ha empezado a nevar!', 'Sigue nevando.', 'Ha dejado de nevar.'],
        DesolateLand: ['¡El sol se ha vuelto abrasador!', '', 'El sol vuelve a la normalidad.'],
        PrimordialSea: ['¡Ha empezado a diluviar!', '', 'El diluvio ha cesado.'],
        DeltaStream: ['¡Soplan vientos misteriosos!', '', 'Los vientos misteriosos han amainado.'],
      };
      if (w === 'none') {
        const prev = nombres[this.clima];
        this.clima = '';
        return {texto: prev ? prev[2] : 'El tiempo vuelve a la normalidad.', clase: 'clima'};
      }
      const prev = this.clima;
      this.clima = w;
      if ('upkeep' in kw) return {texto: nombres[w]?.[1] || '', clase: 'clima'};
      return {texto: (nombres[w]?.[0] || w) + (kw.from ? ` (${desde})` : ''), clase: 'clima', anim: prev !== w ? {tipo: 'clima'} : undefined};
    }
    case '-fieldstart': {
      const e = efecto(pos[0]);
      this.campo.set(toID(pos[0].replace(/^move: /, '')), this.turno);
      const t: {[k: string]: string} = {
        electricterrain: '¡Se ha formado un campo de corriente eléctrica!', grassyterrain: '¡Ha crecido hierba por todo el terreno!',
        mistyterrain: '¡La niebla ha envuelto el terreno de combate!', psychicterrain: '¡El terreno se ha vuelto muy extraño!',
        trickroom: '¡Se han alterado las dimensiones!', gravity: '¡La gravedad se ha intensificado!',
        magicroom: '¡Se ha creado una zona mágica!', wonderroom: '¡Se ha creado una zona extraña!',
      };
      return {texto: t[toID(pos[0].replace(/^move: /, ''))] || `¡${e} se ha activado!`, clase: 'clima', anim: {tipo: 'clima'}};
    }
    case '-fieldend': {
      this.campo.delete(toID(pos[0].replace(/^move: /, '')));
      return {texto: `${efecto(pos[0])} ha terminado.`, clase: 'clima', anim: {tipo: 'clima'}};
    }
    case '-sidestart': case '-sideend': {
      const lado = this.lados[pos[0].slice(0, 2) as LadoId];
      const id = toID(pos[1].replace(/^move: /, ''));
      const e = efecto(pos[1]);
      const equipo = lado.id === this.yo ? 'tu equipo' : 'el equipo rival';
      if (cmd === '-sidestart') {
        lado.condiciones.set(id, (lado.condiciones.get(id) || 0) + 1);
        const t: {[k: string]: string} = {
          spikes: `¡${capital(equipo)} está rodeado de púas!`, stealthrock: `¡${capital(equipo)} está rodeado de piedras puntiagudas!`,
          toxicspikes: `¡${capital(equipo)} está rodeado de púas tóxicas!`, stickyweb: `¡Una red pegajosa se extiende bajo ${equipo}!`,
          reflect: `¡Reflejo protege a ${equipo} de los ataques físicos!`, lightscreen: `¡Pantalla de Luz protege a ${equipo} de los ataques especiales!`,
          auroraveil: `¡Velo Aurora protege a ${equipo}!`, tailwind: `¡Sopla un viento afín a favor de ${equipo}!`,
          safeguard: `¡${capital(equipo)} está protegido por Velo Sagrado!`, mist: `¡${capital(equipo)} está protegido por la Neblina!`,
        };
        return {texto: t[id] || `¡${e} afecta a ${equipo}!`, clase: 'clima', anim: {tipo: 'lado'}};
      }
      lado.condiciones.delete(id);
      return {texto: `¡${e} ha desaparecido de ${equipo}!`, clase: 'clima', anim: {tipo: 'lado'}};
    }
    case '-swapsideconditions': return {texto: '¡Se intercambiaron los efectos de ambos lados del campo!'};
    case '-crit': return {texto: '¡Un golpe crítico!', clase: 'crit'};
    case '-supereffective': return {texto: '¡Es supereficaz!', clase: 'super'};
    case '-resisted': return {texto: 'No es muy eficaz…', clase: 'resist'};
    case '-immune': return {texto: `No afecta a ${n(pos[0])}…` + (kw.from ? ` (${desde})` : ''), clase: 'resist'};
    case '-miss': return {texto: pos[1] ? `¡${N(pos[1])} esquivó el ataque!` : `¡El ataque de ${n(pos[0])} falló!`, clase: 'resist'};
    case '-fail': {
      if (pos[1] === 'unboost') return {texto: `¡Las características de ${n(pos[0])} no bajan!` + (kw.from ? ` (${desde})` : '')};
      return {texto: '¡Pero falló!' + (kw.from ? ` (${desde})` : ''), clase: 'resist'};
    }
    case '-notarget': return {texto: 'Pero no hay objetivo…'};
    case '-nothing': return {texto: '¡Pero no pasó nada!'};
    case '-ohko': return {texto: '¡Fulminado de un golpe!', clase: 'crit'};
    case '-hitcount': return {texto: `¡Golpeó ${pos[1]} ${pos[1] === '1' ? 'vez' : 'veces'}!`};
    case '-block': return {texto: `¡${N(pos[0])} bloqueó el efecto! (${efecto(pos[1])})`};
    case '-item': {
      const mon = this.pkm(pos[0]);
      if (mon) { mon.item = pos[1]; mon.itemPerdido = false; }
      const obj = nomObj(pos[1]);
      if (kw.from && /frisk/i.test(kw.from)) return {texto: `${N(pos[0])} lleva ${obj}. (Cacheo)`};
      if (kw.from) return {texto: `¡${N(pos[0])} obtuvo ${obj}! (${desde})`};
      return {texto: `${N(pos[0])} lleva ${obj}.`};
    }
    case '-enditem': {
      const mon = this.pkm(pos[0]);
      if (mon) { mon.item = ''; mon.itemPerdido = true; }
      const obj = nomObj(pos[1]);
      if ('eat' in kw) return {texto: `¡${N(pos[0])} se comió su ${obj}!`};
      if (kw.from && /stealeat|bugbite|pluck/i.test(kw.from)) return {texto: `¡Se comieron la ${obj} de ${n(pos[0])}!`};
      if (kw.from && /knockoff/i.test(toID(kw.from))) return {texto: `¡${N(pos[0])} perdió su ${obj}!`};
      return {texto: `¡${N(pos[0])} usó su ${obj}!`};
    }
    case '-ability': {
      const mon = this.pkm(pos[0]);
      if (mon) mon.ability = pos[1];
      return {texto: `[${capital(n(pos[0]))}: ${nomHab(pos[1])}]`, clase: 'habilidad', anim: {tipo: 'habilidad', ident: pos[0], texto: nomHab(pos[1])}};
    }
    case '-endability': return {texto: `La habilidad de ${n(pos[0])} quedó anulada.`};
    case '-transform': {
      const mon = this.pkm(pos[0]);
      const tgt = this.pkm(pos[1]);
      if (mon && tgt) { mon.species = tgt.species; }
      return {texto: `¡${N(pos[0])} se transformó en ${tgt?.species || pos[1]}!`, anim: {tipo: 'forma', ident: pos[0]}};
    }
    case '-mega': return {texto: `¡${N(pos[0])} ha megaevolucionado!`, clase: 'especial', anim: {tipo: 'mega', ident: pos[0]}};
    case '-primal': return {texto: `¡${N(pos[0])} ha recuperado su forma primigenia!`, clase: 'especial'};
    case '-terastallize': {
      const mon = this.pkm(pos[0]);
      if (mon) mon.tera = pos[1];
      return {texto: `¡${N(pos[0])} se ha teracristalizado en tipo ${TIPOS_ES[pos[1]] || pos[1]}!`, clase: 'especial', anim: {tipo: 'mega', ident: pos[0]}};
    }
    case '-start': {
      const mon = this.pkm(pos[0]);
      const id = toID(pos[1].replace(/^(move|ability|item): ?/, ''));
      if (mon) mon.volatiles.add(id);
      if (id === 'typechange' && mon) { mon.types = pos[2].split('/'); return {texto: `¡${N(pos[0])} ahora es de tipo ${pos[2].split('/').map(t => TIPOS_ES[t] || t).join('/')}!`}; }
      const t: {[k: string]: string} = {
        dynamax: pos[2] === 'Gmax' ? `¡${N(pos[0])} se ha gigamaximizado!` : `¡${N(pos[0])} se ha dinamaximizado!`,
        substitute: `¡${N(pos[0])} creó un sustituto!`, confusion: `¡${N(pos[0])} está confuso!`,
        leechseed: `¡${N(pos[0])} ha sido infectado!`, taunt: `¡${N(pos[0])} se ha dejado engañar por la Mofa!`,
        encore: `¡${N(pos[0])} recibió un Otra Vez!`, attract: `¡${N(pos[0])} se ha enamorado!`,
        yawn: `¡${N(pos[0])} empieza a tener sueño!`, perish3: `¡${N(pos[0])} caerá debilitado en 3 turnos!`,
        perish2: `Contador de ${n(pos[0])}: 2`, perish1: `Contador de ${n(pos[0])}: 1`, perish0: `Contador de ${n(pos[0])}: 0`,
        disable: `¡${pos[2] ? nomMov(pos[2]) : 'Un movimiento'} de ${n(pos[0])} ha sido anulado!`, curse: `¡${N(pos[0])} ha sido maldito!`,
        nightmare: `¡${N(pos[0])} ha caído en una pesadilla!`, focusenergy: `¡${N(pos[0])} se está preparando para el combate!`,
        futuresight: `¡${N(pos[0])} previó un ataque!`, doomdesire: `¡${N(pos[0])} eligió Deseo Oculto como destino!`,
        flashfire: `¡El poder de los ataques de Fuego de ${n(pos[0])} ha aumentado!`, protosynthesis: `¡${N(pos[0])} potencia una característica! (Paleosíntesis)`,
        quarkdrive: `¡${N(pos[0])} potencia una característica! (Carga Cuark)`, slowstart: `¡${N(pos[0])} no logra ponerse en marcha!`,
        stockpile1: `${N(pos[0])} reservó energía (1).`, stockpile2: `${N(pos[0])} reservó energía (2).`, stockpile3: `${N(pos[0])} reservó energía (3).`,
      };
      return {texto: t[id] || `${efecto(pos[1])}: ${N(pos[0])}`, anim: {tipo: 'volatil', ident: pos[0]}};
    }
    case '-end': {
      const mon = this.pkm(pos[0]);
      const id = toID(pos[1].replace(/^(move|ability|item): ?/, ''));
      if (mon) mon.volatiles.delete(id);
      const t: {[k: string]: string} = {
        dynamax: `¡${N(pos[0])} ha vuelto a su tamaño normal!`,
        substitute: `¡El sustituto de ${n(pos[0])} se debilitó!`, confusion: `¡${N(pos[0])} ya no está confuso!`,
        taunt: `¡${N(pos[0])} ya no está bajo los efectos de la Mofa!`, encore: `¡${N(pos[0])} ya no está bajo los efectos de Otra Vez!`,
        disable: `¡${N(pos[0])} ya puede usar todos sus movimientos!`,
        futuresight: `¡${N(pos[0])} recibió el ataque de Premonición!`, doomdesire: `¡${N(pos[0])} recibió el ataque de Deseo Oculto!`, slowstart: `¡${N(pos[0])} se ha puesto en marcha!`,
      };
      return {texto: t[id] || `${efecto(pos[1])} terminó para ${n(pos[0])}.`, anim: {tipo: 'volatil', ident: pos[0]}};
    }
    case '-singleturn': case '-singlemove': {
      const id = toID(pos[1].replace(/^move: /, ''));
      const t: {[k: string]: string} = {
        protect: `¡${N(pos[0])} se está protegiendo!`, endure: `¡${N(pos[0])} se prepara para aguantar!`,
        followme: `¡${N(pos[0])} se ha convertido en el centro de atención!`, ragepowder: `¡${N(pos[0])} se ha convertido en el centro de atención!`,
        helpinghand: `¡${N(pos[0])} se prepara para ayudar a su compañero!`, roost: `${N(pos[0])} se posó en el suelo.`,
        focuspunch: `¡${N(pos[0])} se está concentrando!`, destinybond: `¡${N(pos[0])} intenta llevarse a su rival consigo!`,
      };
      return {texto: t[id] || `${efecto(pos[1])}: ${N(pos[0])}`};
    }
    case '-activate': {
      const id = toID((pos[1] || '').replace(/^(move|ability|item): ?/, ''));
      const t: {[k: string]: string} = {
        protect: `¡${N(pos[0])} se ha protegido!`, substitute: `¡El sustituto recibió el daño en lugar de ${n(pos[0])}!`,
        confusion: `${N(pos[0])} está confuso.`, destinybond: `¡${N(pos[0])} se llevó a su rival consigo!`,
        endure: `¡${N(pos[0])} aguantó el golpe!`, trick: `¡${N(pos[0])} intercambió objetos!`,
        mistyterrain: `¡${N(pos[0])} está protegido por el Campo de Niebla!`,
      };
      if (t[id]) return {texto: t[id]};
      if (pos[1]?.startsWith('item: ')) return {texto: `¡${nomObj(pos[1].slice(6))} de ${n(pos[0])} se activó!`, anim: {tipo: 'objeto', ident: pos[0], texto: nomObj(pos[1].slice(6))}};
      if (pos[1]?.startsWith('ability: ')) return {texto: `[${capital(n(pos[0]))}: ${nomHab(pos[1].slice(9))}]`, clase: 'habilidad', anim: {tipo: 'habilidad', ident: pos[0], texto: nomHab(pos[1].slice(9))}};
      return {texto: `¡${efecto(pos[1] || '')}! (${N(pos[0])})`};
    }
    case '-prepare': return {texto: `¡${N(pos[0])} se está preparando para usar ${nomMov(pos[1])}!`};
    case '-mustrecharge': return {};
    case '-zpower': return {texto: `¡${N(pos[0])} se ha rodeado de su Poder Z!`, clase: 'especial', anim: {tipo: 'mega', ident: pos[0]}};
    case '-zbroken': return {texto: `¡${N(pos[0])} no ha podido protegerse del todo!`};
    case '-center': return {texto: '¡Los Pokémon se movieron al centro!'};
    case '-combine': return {texto: '¡Los movimientos se combinaron!'};
    case '-waiting': return {texto: `${N(pos[0])} espera a su compañero…`};
    case '-message': case 'message': return {texto: pos.join('|')};
    case '-hint': return {texto: pos[0], clase: 'pista'};
    case 'swap': return {};
    case 'error': return {texto: pos.join('|'), clase: 'error'};
    case 'raw': case 'html': case 'uhtml': return {};
    default: return {};
    }
  }
}

function capital(s: string) { return s ? s.charAt(0).toUpperCase() + s.slice(1) : s; }
export function limpiaEfecto(e: string) {
  return nomEfecto(e || '');
}

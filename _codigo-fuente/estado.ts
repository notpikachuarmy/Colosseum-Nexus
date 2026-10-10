// Estado del combate reconstruido a partir del protocolo de Showdown + textos en español.
import {tr} from './idioma';
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
  /** ya se ha sumado al marcador de la serie */
  contado = false;

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
    if (p.lado.id !== this.yo && conRival) return tr(`el ${p.name} rival`, `the opposing ${p.name}`);
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
    case 'teampreview': return {texto: tr('Elige el orden de tu equipo.', 'Choose your team order.'), clase: 'sistema'};
    case 'start': return {texto: tr('¡Comienza el combate!', 'The battle begins!'), clase: 'sistema'};
    case 'turn': this.turno = +pos[0]; return {texto: tr(`Turno ${pos[0]}`, `Turn ${pos[0]}`), clase: 'turno'};
    case 'win': this.ganador = pos[0]; this.terminado = true; return {texto: tr(`¡${pos[0]} ha ganado el combate!`, `${pos[0]} won the battle!`), clase: 'fin'};
    case 'tie': this.terminado = true; return {texto: tr('¡Empate!', 'Tie!'), clase: 'fin'};
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
      const quien = p.lado.id === this.yo ? tr(`¡Adelante, ${p.name}!`, `Go! ${p.name}!`) : tr(`¡${p.lado.nombre} sacó a ${p.name}!`, `${p.lado.nombre} sent out ${p.name}!`);
      return {texto: cmd === 'drag' ? tr(`¡${p.name} fue arrastrado al combate!`, `${p.name} was dragged out!`) : quien, anim: {tipo: 'switch', ident: pos[0]}};
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
      const ext = kw.from ? tr(` (por ${desde})`, ` (via ${desde})`) : '';
      return {texto: tr(`¡${N(pos[0])} usó ${mov}!${ext}`, `${N(pos[0])} used ${mov}!${ext}`), clase: 'mov', anim: {tipo: 'move', ident: pos[0], target: pos[2], move: mov, still: 'still' in kw}};
    }
    case 'cant': {
      const r = toID(pos[1]);
      const t: {[k: string]: string} = {
        slp: tr(`${N(pos[0])} está profundamente dormido.`, `${N(pos[0])} is fast asleep.`), par: tr(`¡${N(pos[0])} está paralizado! No se puede mover.`, `${N(pos[0])} is paralyzed! It can't move!`),
        frz: tr(`¡${N(pos[0])} está congelado!`, `${N(pos[0])} is frozen solid!`), flinch: tr(`¡${N(pos[0])} retrocedió y no se pudo mover!`, `${N(pos[0])} flinched and couldn't move!`),
        recharge: tr(`${N(pos[0])} necesita recuperarse.`, `${N(pos[0])} must recharge!`), truant: tr(`${N(pos[0])} está holgazaneando.`, `${N(pos[0])} is loafing around!`),
        nopp: tr(`¡${N(pos[0])} no tiene PP para ese movimiento!`, `${N(pos[0])} has no PP left for that move!`), attract: tr(`¡${N(pos[0])} está enamorado y no ataca!`, `${N(pos[0])} is immobilized by love!`),
      };
      return {texto: t[r] || tr(`¡${N(pos[0])} no puede usar ${pos[2] ? nomMov(pos[2]) : 'el movimiento'}! (${efecto(pos[1])})`, `${N(pos[0])} can't use ${pos[2] ? nomMov(pos[2]) : 'the move'}! (${efecto(pos[1])})`)};
    }
    case 'faint': {
      const mon = this.pkm(pos[0]);
      if (mon) { mon.fainted = true; mon.hp = 0; mon.status = ''; }
      return {texto: tr(`¡${N(pos[0])} se debilitó!`, `${N(pos[0])} fainted!`), clase: 'debilitado', anim: {tipo: 'faint', ident: pos[0]}};
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
            psn: tr(`¡${N(pos[0])} sufre por el veneno!`, `${N(pos[0])} was hurt by poison!`), tox: tr(`¡${N(pos[0])} sufre por el veneno!`, `${N(pos[0])} was hurt by poison!`),
            brn: tr(`¡${N(pos[0])} se resiente de la quemadura!`, `${N(pos[0])} was hurt by its burn!`), recoil: tr(`¡${N(pos[0])} sufre el daño del retroceso!`, `${N(pos[0])} is damaged by the recoil!`),
            stealthrock: tr(`¡Unas piedras puntiagudas dañaron a ${n(pos[0])}!`, `Pointed stones dug into ${n(pos[0])}!`), spikes: tr(`¡${N(pos[0])} fue herido por las púas!`, `${N(pos[0])} was hurt by the spikes!`),
            sandstorm: tr(`¡La tormenta de arena zarandea a ${n(pos[0])}!`, `${N(pos[0])} is buffeted by the sandstorm!`), hail: tr(`¡El granizo golpea a ${n(pos[0])}!`, `${N(pos[0])} is pelted by hail!`),
            leechseed: tr(`¡Las drenadoras restan salud a ${n(pos[0])}!`, `${N(pos[0])}'s health is sapped by Leech Seed!`), confusion: tr(`¡Está tan confuso que se hirió a sí mismo!`, `It hurt itself in its confusion!`),
            lifeorb: tr(`¡${N(pos[0])} perdió algo de vida!`, `${N(pos[0])} lost some of its HP!`), rockyhelmet: tr(`¡${N(pos[0])} fue herido por el Casco Dentado!`, `${N(pos[0])} was hurt by the Rocky Helmet!`),
            roughskin: tr(`¡${N(pos[0])} fue herido!`, `${N(pos[0])} was hurt!`), ironbarbs: tr(`¡${N(pos[0])} fue herido!`, `${N(pos[0])} was hurt!`),
            curse: tr(`¡${N(pos[0])} es víctima de una maldición!`, `${N(pos[0])} is afflicted by the curse!`), nightmare: tr(`¡${N(pos[0])} sufre una pesadilla!`, `${N(pos[0])} is locked in a nightmare!`),
            saltcure: tr(`¡${N(pos[0])} sufre por la Sal Curativa!`, `${N(pos[0])} is being salt cured!`),
          };
          const mm = msgs[f] || (kw.from === 'confused' ? msgs.confusion : null) || tr(`¡${N(pos[0])} perdió PS por ${desde}!`, `${N(pos[0])} lost HP due to ${desde}!`);
          return {texto: `${mm} (−${pct}%)`, clase: 'dano', anim};
        }
        if (!pct) return {anim};
        return {texto: tr(`(${N(pos[0])} perdió el ${pct}% de sus PS)`, `(${N(pos[0])} lost ${pct}% of its health)`), clase: 'dano-num', anim};
      }
      if (kw.from) return {texto: tr(`¡${N(pos[0])} recuperó PS gracias a ${desde}! (+${pct}%)`, `${N(pos[0])} restored HP using ${desde}! (+${pct}%)`), clase: 'cura', anim};
      return {texto: tr(`¡${N(pos[0])} recuperó PS! (+${pct}%)`, `${N(pos[0])} had its HP restored! (+${pct}%)`), clase: 'cura', anim};
    }
    case '-status': {
      const mon = this.pkm(pos[0]);
      if (mon) mon.status = pos[1];
      const t: {[k: string]: string} = {
        slp: tr(`¡${N(pos[0])} se ha dormido!`, `${N(pos[0])} fell asleep!`), par: tr(`¡${N(pos[0])} está paralizado! Quizás no pueda moverse.`, `${N(pos[0])} is paralyzed! It may be unable to move!`),
        brn: tr(`¡${N(pos[0])} se ha quemado!`, `${N(pos[0])} was burned!`), psn: tr(`¡${N(pos[0])} ha sido envenenado!`, `${N(pos[0])} was poisoned!`),
        tox: tr(`¡${N(pos[0])} ha sido gravemente envenenado!`, `${N(pos[0])} was badly poisoned!`), frz: tr(`¡${N(pos[0])} se ha congelado!`, `${N(pos[0])} was frozen solid!`),
      };
      return {texto: (t[pos[1]] || `${N(pos[0])}: ${pos[1]}`) + (kw.from ? ` (${desde})` : ''), clase: 'estado', anim: {tipo: 'status', ident: pos[0]}};
    }
    case '-curestatus': {
      const mon = this.pkm(pos[0]);
      if (mon) mon.status = '';
      const t: {[k: string]: string} = {
        slp: tr(`¡${N(pos[0])} se ha despertado!`, `${N(pos[0])} woke up!`), frz: tr(`¡${N(pos[0])} se ha descongelado!`, `${N(pos[0])} thawed out!`), par: tr(`¡${N(pos[0])} ya no está paralizado!`, `${N(pos[0])} is no longer paralyzed!`),
        brn: tr(`¡${N(pos[0])} ya no está quemado!`, `${N(pos[0])}'s burn was healed!`), psn: tr(`¡${N(pos[0])} ya no está envenenado!`, `${N(pos[0])} was cured of its poisoning!`), tox: tr(`¡${N(pos[0])} ya no está envenenado!`, `${N(pos[0])} was cured of its poisoning!`),
      };
      return {texto: t[pos[1]] || tr(`¡${N(pos[0])} se curó!`, `${N(pos[0])} was cured!`), clase: 'estado'};
    }
    case '-cureteam': {
      const p = this.parseIdent(pos[0]);
      if (p) for (const m of p.lado.equipo) m.status = '';
      return {texto: tr('¡El equipo se curó de sus problemas de estado!', "The team's status conditions were cured!"), clase: 'estado'};
    }
    case '-boost': case '-unboost': {
      const mon = this.pkm(pos[0]);
      let v = +pos[2];
      if (mon) mon.boosts[pos[1]] = Math.max(-6, Math.min(6, (mon.boosts[pos[1]] || 0) + (cmd === '-boost' ? v : -v)));
      const stat = STATS_LARGO[pos[1]] || pos[1];
      const sube = cmd === '-boost';
      let txt: string;
      if (v === 0) txt = tr(`¡${capital(stat)} de ${n(pos[0])} no puede ${sube ? 'subir' : 'bajar'} más!`, `${N(pos[0])}'s ${stat} won't go any ${sube ? 'higher' : 'lower'}!`);
      else txt = tr(`¡${capital(stat)} de ${n(pos[0])} ${sube ? 'aumentó' : 'disminuyó'}${v >= 3 ? ' muchísimo' : v === 2 ? ' mucho' : ''}!`, `${N(pos[0])}'s ${stat} ${v >= 3 ? (sube ? 'rose drastically' : 'severely fell') : v === 2 ? (sube ? 'rose sharply' : 'harshly fell') : (sube ? 'rose' : 'fell')}!`);
      if (kw.from) txt += ` (${desde})`;
      return {texto: txt, clase: sube ? 'sube' : 'baja', anim: {tipo: sube ? 'boost' : 'unboost', ident: pos[0]}};
    }
    case '-setboost': {
      const mon = this.pkm(pos[0]);
      if (mon) mon.boosts[pos[1]] = +pos[2];
      return 'silent' in kw ? {} : {texto: tr(`¡${capital(STATS_LARGO[pos[1]] || pos[1])} de ${n(pos[0])} cambió!`, `${N(pos[0])}'s ${STATS_LARGO[pos[1]] || pos[1]} changed!`)};
    }
    case '-clearboost': case '-clearpositiveboost': case '-clearnegativeboost': {
      const mon = this.pkm(pos[0]);
      if (mon) for (const k of Object.keys(mon.boosts)) {
        if (cmd === '-clearboost' || (cmd === '-clearpositiveboost' && mon.boosts[k] > 0) || (cmd === '-clearnegativeboost' && mon.boosts[k] < 0)) mon.boosts[k] = 0;
      }
      return {texto: tr(`¡Los cambios de características de ${n(pos[0])} desaparecieron!`, `${N(pos[0])}'s stat changes were removed!`)};
    }
    case '-clearallboost': {
      for (const l of Object.values(this.lados)) for (const m of l.activos) if (m) m.boosts = {};
      return {texto: tr('¡Se eliminaron todos los cambios de características!', 'All stat changes were eliminated!')};
    }
    case '-invertboost': {
      const mon = this.pkm(pos[0]);
      if (mon) for (const k of Object.keys(mon.boosts)) mon.boosts[k] = -mon.boosts[k];
      return {texto: tr(`¡Los cambios de características de ${n(pos[0])} se invirtieron!`, `${N(pos[0])}'s stat changes were inverted!`)};
    }
    case '-copyboost': {
      const a = this.pkm(pos[0]), b = this.pkm(pos[1]);
      if (a && b) a.boosts = {...b.boosts};
      return {texto: tr(`¡${N(pos[0])} copió los cambios de características de ${n(pos[1])}!`, `${N(pos[0])} copied ${n(pos[1])}'s stat changes!`)};
    }
    case '-swapboost': return {texto: tr(`¡${N(pos[0])} intercambió cambios de características!`, `${N(pos[0])} swapped stat changes!`)};
    case '-weather': {
      const w = pos[0];
      const nombres: {[k: string]: [string, string, string]} = {
        RainDance: [tr('¡Ha empezado a llover!', 'It started to rain!'), tr('Sigue lloviendo.', 'Rain continues to fall.'), tr('Ha dejado de llover.', 'The rain stopped.')],
        SunnyDay: [tr('¡El sol pega fuerte!', 'The sunlight turned harsh!'), tr('El sol sigue pegando fuerte.', 'The sunlight is strong.'), tr('El sol ya no pega tan fuerte.', 'The harsh sunlight faded.')],
        Sandstorm: [tr('¡Se ha desatado una tormenta de arena!', 'A sandstorm kicked up!'), tr('La tormenta de arena sigue azotando.', 'The sandstorm is raging.'), tr('La tormenta de arena ha amainado.', 'The sandstorm subsided.')],
        Hail: [tr('¡Ha empezado a granizar!', 'It started to hail!'), tr('Sigue granizando.', 'The hail is crashing down.'), tr('Ha dejado de granizar.', 'The hail stopped.')],
        Snowscape: [tr('¡Ha empezado a nevar!', 'It started to snow!'), tr('Sigue nevando.', 'Snow continues to fall.'), tr('Ha dejado de nevar.', 'The snow stopped.')],
        Snow: [tr('¡Ha empezado a nevar!', 'It started to snow!'), tr('Sigue nevando.', 'Snow continues to fall.'), tr('Ha dejado de nevar.', 'The snow stopped.')],
        DesolateLand: [tr('¡El sol se ha vuelto abrasador!', 'The sunlight turned extremely harsh!'), '', tr('El sol vuelve a la normalidad.', 'The extremely harsh sunlight faded!')],
        PrimordialSea: [tr('¡Ha empezado a diluviar!', 'A heavy rain began to fall!'), '', tr('El diluvio ha cesado.', 'The heavy rain has lifted!')],
        DeltaStream: [tr('¡Soplan vientos misteriosos!', 'Mysterious strong winds are protecting Flying-type Pokémon!'), '', tr('Los vientos misteriosos han amainado.', 'The mysterious strong winds have dissipated!')],
      };
      if (w === 'none') {
        const prev = nombres[this.clima];
        this.clima = '';
        return {texto: prev ? prev[2] : tr('El tiempo vuelve a la normalidad.', 'The weather returned to normal.'), clase: 'clima'};
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
        electricterrain: tr('¡Se ha formado un campo de corriente eléctrica!', 'An electric current ran across the battlefield!'), grassyterrain: tr('¡Ha crecido hierba por todo el terreno!', 'Grass grew to cover the battlefield!'),
        mistyterrain: tr('¡La niebla ha envuelto el terreno de combate!', 'Mist swirled around the battlefield!'), psychicterrain: tr('¡El terreno se ha vuelto muy extraño!', 'The battlefield got weird!'),
        trickroom: tr('¡Se han alterado las dimensiones!', 'The dimensions were twisted!'), gravity: tr('¡La gravedad se ha intensificado!', 'Gravity intensified!'),
        magicroom: tr('¡Se ha creado una zona mágica!', 'It created a bizarre area in which Pokémon\'s held items lose their effects!'), wonderroom: tr('¡Se ha creado una zona extraña!', 'It created a bizarre area in which Defense and Sp. Def stats are swapped!'),
      };
      return {texto: t[toID(pos[0].replace(/^move: /, ''))] || tr(`¡${e} se ha activado!`, `${e} took effect!`), clase: 'clima', anim: {tipo: 'clima'}};
    }
    case '-fieldend': {
      this.campo.delete(toID(pos[0].replace(/^move: /, '')));
      return {texto: tr(`${efecto(pos[0])} ha terminado.`, `${efecto(pos[0])} ended.`), clase: 'clima', anim: {tipo: 'clima'}};
    }
    case '-sidestart': case '-sideend': {
      const lado = this.lados[pos[0].slice(0, 2) as LadoId];
      const id = toID(pos[1].replace(/^move: /, ''));
      const e = efecto(pos[1]);
      const equipo = lado.id === this.yo ? tr('tu equipo', 'your team') : tr('el equipo rival', 'the opposing team');
      if (cmd === '-sidestart') {
        lado.condiciones.set(id, (lado.condiciones.get(id) || 0) + 1);
        const t: {[k: string]: string} = {
          spikes: tr(`¡${capital(equipo)} está rodeado de púas!`, `Spikes were scattered around ${equipo}!`), stealthrock: tr(`¡${capital(equipo)} está rodeado de piedras puntiagudas!`, `Pointed stones float in the air around ${equipo}!`),
          toxicspikes: tr(`¡${capital(equipo)} está rodeado de púas tóxicas!`, `Poison spikes were scattered around ${equipo}!`), stickyweb: tr(`¡Una red pegajosa se extiende bajo ${equipo}!`, `A sticky web spreads out under ${equipo}!`),
          reflect: tr(`¡Reflejo protege a ${equipo} de los ataques físicos!`, `Reflect made ${equipo} stronger against physical moves!`), lightscreen: tr(`¡Pantalla de Luz protege a ${equipo} de los ataques especiales!`, `Light Screen made ${equipo} stronger against special moves!`),
          auroraveil: tr(`¡Velo Aurora protege a ${equipo}!`, `Aurora Veil made ${equipo} stronger against physical and special moves!`), tailwind: tr(`¡Sopla un viento afín a favor de ${equipo}!`, `The Tailwind blew from behind ${equipo}!`),
          safeguard: tr(`¡${capital(equipo)} está protegido por Velo Sagrado!`, `${capital(equipo)} cloaked itself in a mystical veil!`), mist: tr(`¡${capital(equipo)} está protegido por la Neblina!`, `${capital(equipo)} became shrouded in mist!`),
        };
        return {texto: t[id] || tr(`¡${e} afecta a ${equipo}!`, `${e} affects ${equipo}!`), clase: 'clima', anim: {tipo: 'lado'}};
      }
      lado.condiciones.delete(id);
      return {texto: tr(`¡${e} ha desaparecido de ${equipo}!`, `${e} wore off for ${equipo}!`), clase: 'clima', anim: {tipo: 'lado'}};
    }
    case '-swapsideconditions': return {texto: tr('¡Se intercambiaron los efectos de ambos lados del campo!', 'The effects on each side of the field were swapped!')};
    case '-crit': return {texto: tr('¡Un golpe crítico!', 'A critical hit!'), clase: 'crit'};
    case '-supereffective': return {texto: tr('¡Es supereficaz!', "It's super effective!"), clase: 'super'};
    case '-resisted': return {texto: tr('No es muy eficaz…', "It's not very effective…"), clase: 'resist'};
    case '-immune': return {texto: tr(`No afecta a ${n(pos[0])}…`, `It doesn't affect ${n(pos[0])}…`) + (kw.from ? ` (${desde})` : ''), clase: 'resist'};
    case '-miss': return {texto: pos[1] ? tr(`¡${N(pos[1])} esquivó el ataque!`, `${N(pos[1])} avoided the attack!`) : tr(`¡El ataque de ${n(pos[0])} falló!`, `${N(pos[0])}'s attack missed!`), clase: 'resist'};
    case '-fail': {
      if (pos[1] === 'unboost') return {texto: tr(`¡Las características de ${n(pos[0])} no bajan!`, `${N(pos[0])}'s stats were not lowered!`) + (kw.from ? ` (${desde})` : '')};
      return {texto: tr('¡Pero falló!', 'But it failed!') + (kw.from ? ` (${desde})` : ''), clase: 'resist'};
    }
    case '-notarget': return {texto: tr('Pero no hay objetivo…', 'But there was no target…')};
    case '-nothing': return {texto: tr('¡Pero no pasó nada!', 'But nothing happened!')};
    case '-ohko': return {texto: tr('¡Fulminado de un golpe!', "It's a one-hit KO!"), clase: 'crit'};
    case '-hitcount': return {texto: tr(`¡Golpeó ${pos[1]} ${pos[1] === '1' ? 'vez' : 'veces'}!`, `The Pokémon was hit ${pos[1]} time${pos[1] === '1' ? '' : 's'}!`)};
    case '-block': return {texto: tr(`¡${N(pos[0])} bloqueó el efecto! (${efecto(pos[1])})`, `${N(pos[0])} blocked the effect! (${efecto(pos[1])})`)};
    case '-item': {
      const mon = this.pkm(pos[0]);
      if (mon) { mon.item = pos[1]; mon.itemPerdido = false; }
      const obj = nomObj(pos[1]);
      if (kw.from && /frisk/i.test(kw.from)) return {texto: tr(`${N(pos[0])} lleva ${obj}. (Cacheo)`, `${N(pos[0])} is holding ${obj}. (Frisk)`)};
      if (kw.from) return {texto: tr(`¡${N(pos[0])} obtuvo ${obj}! (${desde})`, `${N(pos[0])} obtained ${obj}! (${desde})`)};
      return {texto: tr(`${N(pos[0])} lleva ${obj}.`, `${N(pos[0])} is holding ${obj}.`)};
    }
    case '-enditem': {
      const mon = this.pkm(pos[0]);
      if (mon) { mon.item = ''; mon.itemPerdido = true; }
      const obj = nomObj(pos[1]);
      if ('eat' in kw) return {texto: tr(`¡${N(pos[0])} se comió su ${obj}!`, `${N(pos[0])} ate its ${obj}!`)};
      if (kw.from && /stealeat|bugbite|pluck/i.test(kw.from)) return {texto: tr(`¡Se comieron la ${obj} de ${n(pos[0])}!`, `${N(pos[0])}'s ${obj} was eaten!`)};
      if (kw.from && /knockoff/i.test(toID(kw.from))) return {texto: tr(`¡${N(pos[0])} perdió su ${obj}!`, `${N(pos[0])} lost its ${obj}!`)};
      return {texto: tr(`¡${N(pos[0])} usó su ${obj}!`, `${N(pos[0])} used its ${obj}!`)};
    }
    case '-ability': {
      const mon = this.pkm(pos[0]);
      if (mon) mon.ability = pos[1];
      return {texto: `[${capital(n(pos[0]))}: ${nomHab(pos[1])}]`, clase: 'habilidad', anim: {tipo: 'habilidad', ident: pos[0], texto: nomHab(pos[1])}};
    }
    case '-endability': return {texto: tr(`La habilidad de ${n(pos[0])} quedó anulada.`, `${N(pos[0])}'s Ability was suppressed!`)};
    case '-transform': {
      const mon = this.pkm(pos[0]);
      const tgt = this.pkm(pos[1]);
      if (mon && tgt) { mon.species = tgt.species; }
      return {texto: tr(`¡${N(pos[0])} se transformó en ${tgt?.species || pos[1]}!`, `${N(pos[0])} transformed into ${tgt?.species || pos[1]}!`), anim: {tipo: 'forma', ident: pos[0]}};
    }
    case '-mega': return {texto: tr(`¡${N(pos[0])} ha megaevolucionado!`, `${N(pos[0])} has Mega Evolved!`), clase: 'especial', anim: {tipo: 'mega', ident: pos[0]}};
    case '-primal': return {texto: tr(`¡${N(pos[0])} ha recuperado su forma primigenia!`, `${N(pos[0])}'s Primal Reversion! It reverted to its primal form!`), clase: 'especial'};
    case '-terastallize': {
      const mon = this.pkm(pos[0]);
      if (mon) mon.tera = pos[1];
      return {texto: tr(`¡${N(pos[0])} se ha teracristalizado en tipo ${TIPOS_ES[pos[1]] || pos[1]}!`, `${N(pos[0])} has Terastallized into the ${TIPOS_ES[pos[1]] || pos[1]} type!`), clase: 'especial', anim: {tipo: 'mega', ident: pos[0]}};
    }
    case '-start': {
      const mon = this.pkm(pos[0]);
      const id = toID(pos[1].replace(/^(move|ability|item): ?/, ''));
      if (mon) mon.volatiles.add(id);
      if (id === 'typechange' && mon) { mon.types = pos[2].split('/'); return {texto: tr(`¡${N(pos[0])} ahora es de tipo ${pos[2].split('/').map(t => TIPOS_ES[t] || t).join('/')}!`, `${N(pos[0])}'s type changed to ${pos[2].split('/').map(t => TIPOS_ES[t] || t).join('/')}!`)}; }
      const t: {[k: string]: string} = {
        dynamax: pos[2] === 'Gmax' ? tr(`¡${N(pos[0])} se ha gigamaximizado!`, `${N(pos[0])} has Gigantamaxed!`) : tr(`¡${N(pos[0])} se ha dinamaximizado!`, `${N(pos[0])} has Dynamaxed!`),
        substitute: tr(`¡${N(pos[0])} creó un sustituto!`, `${N(pos[0])} put in a substitute!`), confusion: tr(`¡${N(pos[0])} está confuso!`, `${N(pos[0])} became confused!`),
        leechseed: tr(`¡${N(pos[0])} ha sido infectado!`, `${N(pos[0])} was seeded!`), taunt: tr(`¡${N(pos[0])} se ha dejado engañar por la Mofa!`, `${N(pos[0])} fell for the taunt!`),
        encore: tr(`¡${N(pos[0])} recibió un Otra Vez!`, `${N(pos[0])} must do an encore!`), attract: tr(`¡${N(pos[0])} se ha enamorado!`, `${N(pos[0])} fell in love!`),
        yawn: tr(`¡${N(pos[0])} empieza a tener sueño!`, `${N(pos[0])} grew drowsy!`), perish3: tr(`¡${N(pos[0])} caerá debilitado en 3 turnos!`, `${N(pos[0])} will faint in 3 turns!`),
        perish2: tr(`Contador de ${n(pos[0])}: 2`, `${N(pos[0])}'s perish count fell to 2.`), perish1: tr(`Contador de ${n(pos[0])}: 1`, `${N(pos[0])}'s perish count fell to 1.`), perish0: tr(`Contador de ${n(pos[0])}: 0`, `${N(pos[0])}'s perish count fell to 0.`),
        disable: tr(`¡${pos[2] ? nomMov(pos[2]) : 'Un movimiento'} de ${n(pos[0])} ha sido anulado!`, `${N(pos[0])}'s ${pos[2] ? nomMov(pos[2]) : 'move'} was disabled!`), curse: tr(`¡${N(pos[0])} ha sido maldito!`, `${N(pos[0])} was cursed!`),
        nightmare: tr(`¡${N(pos[0])} ha caído en una pesadilla!`, `${N(pos[0])} began having a nightmare!`), focusenergy: tr(`¡${N(pos[0])} se está preparando para el combate!`, `${N(pos[0])} is getting pumped!`),
        futuresight: tr(`¡${N(pos[0])} previó un ataque!`, `${N(pos[0])} foresaw an attack!`), doomdesire: tr(`¡${N(pos[0])} eligió Deseo Oculto como destino!`, `${N(pos[0])} chose Doom Desire as its destiny!`),
        flashfire: tr(`¡El poder de los ataques de Fuego de ${n(pos[0])} ha aumentado!`, `The power of ${n(pos[0])}'s Fire-type moves rose!`), protosynthesis: tr(`¡${N(pos[0])} potencia una característica! (Paleosíntesis)`, `${N(pos[0])} boosted a stat! (Protosynthesis)`),
        quarkdrive: tr(`¡${N(pos[0])} potencia una característica! (Carga Cuark)`, `${N(pos[0])} boosted a stat! (Quark Drive)`), slowstart: tr(`¡${N(pos[0])} no logra ponerse en marcha!`, `${N(pos[0])} can't get it going!`),
        stockpile1: tr(`${N(pos[0])} reservó energía (1).`, `${N(pos[0])} stockpiled 1!`), stockpile2: tr(`${N(pos[0])} reservó energía (2).`, `${N(pos[0])} stockpiled 2!`), stockpile3: tr(`${N(pos[0])} reservó energía (3).`, `${N(pos[0])} stockpiled 3!`),
      };
      return {texto: t[id] || `${efecto(pos[1])}: ${N(pos[0])}`, anim: {tipo: 'volatil', ident: pos[0]}};
    }
    case '-end': {
      const mon = this.pkm(pos[0]);
      const id = toID(pos[1].replace(/^(move|ability|item): ?/, ''));
      if (mon) mon.volatiles.delete(id);
      const t: {[k: string]: string} = {
        dynamax: tr(`¡${N(pos[0])} ha vuelto a su tamaño normal!`, `${N(pos[0])} returned to normal size!`),
        substitute: tr(`¡El sustituto de ${n(pos[0])} se debilitó!`, `${N(pos[0])}'s substitute faded!`), confusion: tr(`¡${N(pos[0])} ya no está confuso!`, `${N(pos[0])} snapped out of its confusion!`),
        taunt: tr(`¡${N(pos[0])} ya no está bajo los efectos de la Mofa!`, `${N(pos[0])} shook off the taunt!`), encore: tr(`¡${N(pos[0])} ya no está bajo los efectos de Otra Vez!`, `${N(pos[0])}'s encore ended!`),
        disable: tr(`¡${N(pos[0])} ya puede usar todos sus movimientos!`, `${N(pos[0])}'s move is no longer disabled!`),
        futuresight: tr(`¡${N(pos[0])} recibió el ataque de Premonición!`, `${N(pos[0])} took the Future Sight attack!`), doomdesire: tr(`¡${N(pos[0])} recibió el ataque de Deseo Oculto!`, `${N(pos[0])} took the Doom Desire attack!`), slowstart: tr(`¡${N(pos[0])} se ha puesto en marcha!`, `${N(pos[0])} finally got its act together!`),
      };
      return {texto: t[id] || tr(`${efecto(pos[1])} terminó para ${n(pos[0])}.`, `${efecto(pos[1])} ended for ${n(pos[0])}.`), anim: {tipo: 'volatil', ident: pos[0]}};
    }
    case '-singleturn': case '-singlemove': {
      const id = toID(pos[1].replace(/^move: /, ''));
      const t: {[k: string]: string} = {
        protect: tr(`¡${N(pos[0])} se está protegiendo!`, `${N(pos[0])} protected itself!`), endure: tr(`¡${N(pos[0])} se prepara para aguantar!`, `${N(pos[0])} braced itself!`),
        followme: tr(`¡${N(pos[0])} se ha convertido en el centro de atención!`, `${N(pos[0])} became the center of attention!`), ragepowder: tr(`¡${N(pos[0])} se ha convertido en el centro de atención!`, `${N(pos[0])} became the center of attention!`),
        helpinghand: tr(`¡${N(pos[0])} se prepara para ayudar a su compañero!`, `${N(pos[0])} is ready to help its ally!`), roost: tr(`${N(pos[0])} se posó en el suelo.`, `${N(pos[0])} landed on the ground.`),
        focuspunch: tr(`¡${N(pos[0])} se está concentrando!`, `${N(pos[0])} is tightening its focus!`), destinybond: tr(`¡${N(pos[0])} intenta llevarse a su rival consigo!`, `${N(pos[0])} is hoping to take its attacker down with it!`),
      };
      return {texto: t[id] || `${efecto(pos[1])}: ${N(pos[0])}`};
    }
    case '-activate': {
      const id = toID((pos[1] || '').replace(/^(move|ability|item): ?/, ''));
      const t: {[k: string]: string} = {
        protect: tr(`¡${N(pos[0])} se ha protegido!`, `${N(pos[0])} protected itself!`), substitute: tr(`¡El sustituto recibió el daño en lugar de ${n(pos[0])}!`, `The substitute took damage for ${n(pos[0])}!`),
        confusion: tr(`${N(pos[0])} está confuso.`, `${N(pos[0])} is confused!`), destinybond: tr(`¡${N(pos[0])} se llevó a su rival consigo!`, `${N(pos[0])} took its attacker down with it!`),
        endure: tr(`¡${N(pos[0])} aguantó el golpe!`, `${N(pos[0])} endured the hit!`), trick: tr(`¡${N(pos[0])} intercambió objetos!`, `${N(pos[0])} switched items!`),
        mistyterrain: tr(`¡${N(pos[0])} está protegido por el Campo de Niebla!`, `${N(pos[0])} surrounds itself with a protective mist!`),
      };
      if (t[id]) return {texto: t[id]};
      if (pos[1]?.startsWith('item: ')) return {texto: tr(`¡${nomObj(pos[1].slice(6))} de ${n(pos[0])} se activó!`, `${N(pos[0])}'s ${nomObj(pos[1].slice(6))} activated!`), anim: {tipo: 'objeto', ident: pos[0], texto: nomObj(pos[1].slice(6))}};
      if (pos[1]?.startsWith('ability: ')) return {texto: `[${capital(n(pos[0]))}: ${nomHab(pos[1].slice(9))}]`, clase: 'habilidad', anim: {tipo: 'habilidad', ident: pos[0], texto: nomHab(pos[1].slice(9))}};
      return {texto: tr(`¡${efecto(pos[1] || '')}! (${N(pos[0])})`, `${efecto(pos[1] || '')}! (${N(pos[0])})`)};
    }
    case '-prepare': return {texto: tr(`¡${N(pos[0])} se está preparando para usar ${nomMov(pos[1])}!`, `${N(pos[0])} is preparing ${nomMov(pos[1])}!`)};
    case '-mustrecharge': return {};
    case '-zpower': return {texto: tr(`¡${N(pos[0])} se ha rodeado de su Poder Z!`, `${N(pos[0])} surrounded itself with its Z-Power!`), clase: 'especial', anim: {tipo: 'mega', ident: pos[0]}};
    case '-zbroken': return {texto: tr(`¡${N(pos[0])} no ha podido protegerse del todo!`, `${N(pos[0])} couldn't fully protect itself and got hurt!`)};
    case '-center': return {texto: tr('¡Los Pokémon se movieron al centro!', 'The Pokémon moved to the center!')};
    case '-combine': return {texto: tr('¡Los movimientos se combinaron!', 'The two moves have become one! It\'s a combined move!')};
    case '-waiting': return {texto: tr(`${N(pos[0])} espera a su compañero…`, `${N(pos[0])} is waiting for its ally's move…`)};
    case '-message': case 'message': { const txt = pos.join('|'); const partes = txt.split(' ‖ '); return {texto: partes.length === 2 ? tr(partes[0], partes[1]) : txt}; }
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

// Motor de combate (lo ejecuta el anfitrión) y una IA sencilla para practicar.
import {BattleStreams, toID} from 'pkmn-sim';
import {buildMod, formatoCon, Poder} from './mod';
import {Estado, LadoId} from './estado';
import {dex} from './util';

export class Motor {
  private streams: any;
  private oyentes: {[k: string]: ((chunk: string) => void)[]} = {p1: [], p2: [], omni: []};
  terminado = false;

  /** formatoId: un formato especial ya creado (p. ej. formatoJefe()); si se da, manda sobre «formato» */
  constructor(formato: 'singles' | 'doubles', p1: {nombre: string, equipo: string}, p2: {nombre: string, equipo: string}, sinPoderes: Poder[] = [], formatoId = '') {
    buildMod();
    this.streams = BattleStreams.getPlayerStreams(new BattleStreams.BattleStream());
    for (const k of ['p1', 'p2', 'omniscient'] as const) {
      const key = k === 'omniscient' ? 'omni' : k;
      void (async () => {
        for await (const chunk of this.streams[k]) {
          if (key === 'omni' && /\n\|(win|tie)\b/.test('\n' + chunk)) this.terminado = true;
          for (const cb of this.oyentes[key]) {
            try { cb(chunk); } catch (e) { console.error(e); }
          }
        }
      })();
    }
    const spec = {formatid: formatoId || formatoCon(formato, sinPoderes)};
    void this.streams.omniscient.write(`>start ${JSON.stringify(spec)}\n` +
      `>player p1 ${JSON.stringify({name: p1.nombre, team: p1.equipo})}\n` +
      `>player p2 ${JSON.stringify({name: p2.nombre, team: p2.equipo})}`);
  }

  escuchar(lado: LadoId | 'omni', cb: (chunk: string) => void) { this.oyentes[lado].push(cb); }
  elegir(lado: LadoId, eleccion: string) { void this.streams[lado].write(eleccion); }
  rendirse(lado: LadoId) { if (!this.terminado) void this.streams.omniscient.write(`>forcelose ${lado}`); }
  destruir() { this.oyentes = {p1: [], p2: [], omni: []}; try { void this.streams.omniscient.writeEnd(); } catch { /* */ } }
}

/** IA voraz: elige el movimiento que más daño estimado hace. */
export class IA {
  estado: Estado;
  req: any = null;
  timer: any = null;

  constructor(private motor: Motor, private lado: LadoId) {
    this.estado = new Estado(lado);
    motor.escuchar(lado, chunk => this.recibir(chunk));
  }

  recibir(chunk: string) {
    for (const line of chunk.split('\n')) {
      if (line.startsWith('|request|')) {
        const json = line.slice(9);
        if (json) { this.req = JSON.parse(json); this.estado.sincronizar(this.req); }
        continue;
      }
      if (line.startsWith('|error|')) { console.warn('IA:', line); if (this.req) this.programar(); continue; }
      this.estado.aplicar(line);
    }
    if (this.req) this.programar();
  }

  programar() {
    clearTimeout(this.timer);
    this.timer = setTimeout(() => {
      const req = this.req;
      if (!req || req.wait || this.motor.terminado) return;
      this.req = null;
      let eleccion = 'default';
      try { eleccion = this.decidir(req); } catch (e) { console.error(e); }
      this.motor.elegir(this.lado, eleccion);
    }, 150);
  }

  rivalesActivos() {
    return this.estado.lados[this.estado.rival].activos.map(p => p && !p.fainted ? p : null);
  }

  tiposDe(species: string, tera?: string) {
    if (tera) return [tera];
    return dex().species.get(species).types;
  }

  eficacia(tipo: string, defensor: {species: string, tera?: string}) {
    const d = dex();
    const tipos = this.tiposDe(defensor.species, defensor.tera);
    if (!d.getImmunity(tipo, tipos)) return 0;
    return Math.pow(2, d.getEffectiveness(tipo, tipos));
  }

  decidir(req: any): string {
    const d = dex();
    if (req.teamPreview) return 'default';
    const pokes = req.side.pokemon;
    const usados = new Set<number>();
    const elegirCambio = () => {
      let mejor = -1, mejorScore = -Infinity;
      pokes.forEach((p: any, i: number) => {
        if (p.active || usados.has(i) || p.condition.endsWith(' fnt') || p.condition === '0 fnt') return;
        const [hp, max] = p.condition.split(' ')[0].split('/').map(Number);
        let score = hp / max;
        const rival = this.rivalesActivos().find(Boolean);
        if (rival) {
          const tipos = d.species.get(p.details.split(',')[0]).types;
          for (const t of this.tiposDe(rival.species, rival.tera)) {
            score -= 0.3 * (Math.pow(2, d.getEffectiveness(t, tipos)) * (d.getImmunity(t, tipos) ? 1 : 0) - 1);
          }
        }
        score += Math.random() * 0.2;
        if (score > mejorScore) { mejorScore = score; mejor = i; }
      });
      if (mejor < 0) return 'pass';
      usados.add(mejor);
      return `switch ${mejor + 1}`;
    };
    if (req.forceSwitch) {
      return req.forceSwitch.map((f: boolean) => f ? elegirCambio() : 'pass').join(', ');
    }
    const elecciones: string[] = [];
    const rivales = this.rivalesActivos();
    let megaUsada = false, teraUsada = false;
    req.active.forEach((act: any, slot: number) => {
      const yo = pokes[slot];
      if (!yo || yo.condition.endsWith(' fnt')) { elecciones.push('pass'); return; }
      const stats = yo.stats || {atk: 100, spa: 100};
      const misTipos = d.species.get(yo.details.split(',')[0]).types;
      let mejor = '', mejorScore = -Infinity, mejorTgt = 0;
      act.moves.forEach((m: any, i: number) => {
        if (m.disabled || m.pp === 0) return;
        const mv = d.moves.get(m.id);
        let score: number;
        let tgt = 0;
        if (mv.category === 'Status') {
          score = 25 + Math.random() * 30;
          if (['protect', 'detect', 'spikyshield', 'kingsshield', 'banefulbunker'].includes(mv.id)) score = 10 + Math.random() * 20;
          if (mv.id === 'splash') score = 0;
        } else {
          const bp = mv.basePower || 60;
          const atk = mv.category === 'Physical' ? stats.atk : stats.spa;
          const stab = misTipos.includes(mv.type) ? 1.5 : 1;
          const acc = mv.accuracy === true ? 1 : mv.accuracy / 100;
          let mejorEf = -1;
          rivales.forEach((r, ri) => {
            if (!r) return;
            const ef = this.eficacia(mv.type, r);
            if (ef > mejorEf) { mejorEf = ef; tgt = ri + 1; }
          });
          if (mejorEf < 0) mejorEf = 1;
          score = bp * stab * mejorEf * acc * (atk / 100) * (0.9 + Math.random() * 0.2);
          if (mv.selfdestruct) score *= 0.3;
          if (mv.flags['charge'] || mv.flags['recharge']) score *= 0.5;
        }
        if (score > mejorScore) { mejorScore = score; mejor = String(i + 1); mejorTgt = tgt; }
      });
      if (!mejor) { elecciones.push('move 1'); return; }
      let e = `move ${mejor}`;
      const tgtTipo = act.moves[+mejor - 1].target;
      if (req.active.length > 1 && ['normal', 'any', 'adjacentFoe'].includes(tgtTipo)) {
        if (!rivales[mejorTgt - 1]) mejorTgt = rivales.findIndex(Boolean) + 1 || 1;
        e += ` ${mejorTgt}`;
      }
      if (req.active.length > 1 && tgtTipo === 'adjacentAlly') e += ` -${slot === 0 ? 2 : 1}`;
      if (req.active.length > 1 && tgtTipo === 'adjacentAllyOrSelf') e += ` -${slot + 1}`;
      const singles = req.active.length === 1;
      if (act.canMegaEvo && !megaUsada) { e += ' mega'; megaUsada = true; }
      else if (singles && act.canZMove?.[+mejor - 1] && Math.random() < 0.5) e += ' zmove';
      else if (singles && act.canDynamax && Math.random() < 0.25) e += ' dynamax';
      else if (act.canTerastallize && !teraUsada && Math.random() < 0.3) { e += ' terastallize'; teraUsada = true; }
      // Si sus ataques no hacen nada, cambia
      if (mejorScore <= 1 && !act.trapped && !act.maybeTrapped && pokes.some((p: any, i: number) => !p.active && !p.condition.endsWith(' fnt') && !usados.has(i))) {
        e = elegirCambio();
      }
      elecciones.push(e);
    });
    return elecciones.join(', ');
  }
}

export {toID};

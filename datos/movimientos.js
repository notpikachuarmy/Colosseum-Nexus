/* =============================================================================
 *  MOVIMIENTOS PERSONALIZADOS
 *  type: tipo en inglés · category: 'Physical', 'Special' o 'Status'
 *  basePower: potencia · accuracy: precisión (true = nunca falla) · pp
 *  target: 'normal' (un objetivo), 'self' (uno mismo), 'foeSide' (campo rival)...
 *  idPBS / funcionPBS: solo se usan al exportar a Pokémon Essentials.
 *  nombreEN / descEN: nombre y descripción en inglés (modo English y exportación PBS).
 * ========================================================================== */
/** Mensajes de combate en los dos idiomas: MSG('texto en español', 'English text') */
window.MSG = window.MSG || function (es, en) { return es + ' ‖ ' + en; };
window.DATOS_MOVIMIENTOS = {

  // Sueño dulce: duerme al objetivo y, si lo consigue, cura 1/8 de PS al usuario.
  'Sueño dulce': {
    desc: 'Duerme al objetivo y restaura 1/8 de los PS máximos al usuario.',
    nombreEN: 'Sweet Dream', descEN: 'Puts the target to sleep and restores 1/8 of the user\'s max HP.',
    idPBS: 'SWEETDREAM', funcionPBS: 'SleepTargetHealUser',
    type: 'Fairy', category: 'Status', basePower: 0, accuracy: 75, pp: 10,
    priority: 0, target: 'normal',
    flags: { protect: 1, reflectable: 1, mirror: 1, metronome: 1 },
    onHit(target, source, move) {
      if (!target.setStatus('slp', source, move)) return false;
      this.heal(Math.ceil(source.maxhp / 8), source, source, move);
    },
  },

  // ======================== Pack "Objetos y Movimientos Custom" (v21) ========================

  // Proyección Maldita: 30% de confundir o bajar Precisión. Si el objetivo cambia
  // antes de que acabe el turno siguiente, recibe un 25% del daño del golpe.
  'Proyección Maldita': {
    desc: 'Puede confundir o bajar la Precisión (30%). Si el objetivo se retira el turno siguiente, sufre daño extra.',
    nombreEN: 'Curse Reel', descEN: 'May confuse the target or lower its accuracy (30%). If the target switches out next turn, it takes extra damage.',
    idPBS: 'CURSEREEL', funcionPBS: 'LowerTargetAccuracyOrConfuseHurtOnSwitch',
    type: 'Ghost', category: 'Special', basePower: 80, accuracy: 90, pp: 10, target: 'normal',
    flags: { protect: 1, mirror: 1, metronome: 1 },
    onAfterHit(target, source, move) {
      if (!target.hp || !source.lastDamage || target.volatiles['substitute']) return;
      target.addVolatile(move.id);
      if (target.volatiles[move.id]) target.volatiles[move.id].dano = Math.max(1, Math.floor(source.lastDamage / 4));
    },
    secondary: {
      chance: 30,
      onHit(target, source) {
        if (this.randomChance(1, 2)) target.addVolatile('confusion', source);
        else this.boost({ accuracy: -1 }, target, source);
      },
    },
    condition: {
      duration: 2,
      onStart(pokemon) { this.add('-message', MSG(`¡${pokemon.name} quedó atrapado en una escena de pesadilla!`, `${pokemon.name} got caught in a nightmare scene!`)); },
      onBeforeSwitchOut(pokemon) {
        if (!this.effectState.dano) return;
        this.add('-message', MSG(`¡La pesadilla persigue a ${pokemon.name} mientras intenta huir!`, `The nightmare haunts ${pokemon.name} as it tries to flee!`));
        this.damage(this.effectState.dano, pokemon);
        this.effectState.dano = 0;
      },
    },
  },

  // Gas de Paranoia: nunca falla. Baja mucho la Velocidad y causa paranoia (confusión
  // de 2-3 turnos). Si se hiere en su confusión, se le cae el objeto (y quien lanzó el gas
  // se lo queda si tiene Prestidigitador o Hurto y no lleva nada).
  'Gas de Paranoia': {
    desc: 'Nunca falla. Baja mucho la Velocidad y causa paranoia: confusión que hace soltar el objeto.',
    nombreEN: 'Phobia Gas', descEN: 'Never misses. Harshly lowers Speed and causes paranoia: a confusion that makes the target drop its item.',
    idPBS: 'PHOBIAGAS', funcionPBS: 'LowerTargetSpeed2InflictParanoia',
    type: 'Dark', category: 'Physical', basePower: 85, accuracy: true, pp: 10, target: 'normal',
    flags: { protect: 1, mirror: 1, metronome: 1 },
    onHit(target, source) {
      this.boost({ spe: -2 }, target, source);
      if (target.volatiles['confusion']) return;
      if (target.addVolatile('confusion', source)) {
        target.volatiles['confusion'].time = this.random(2, 4);
        target.addVolatile('paranoia', source);
      }
    },
  },

  'Supernova Gemela': {
    desc: 'Energía estelar de dos dimensiones. 50% de bajar la Defensa o la Def. Esp. del objetivo.',
    nombreEN: 'Twin Supernova', descEN: 'Two-dimensional stellar energy. 50% chance to lower the target\'s Defense or Sp. Def.',
    idPBS: 'TWINSUPERNOVA', funcionPBS: 'LowerTargetDefOrSpDef1Random',
    type: 'Psychic', category: 'Special', basePower: 60, accuracy: 100, pp: 15, target: 'normal',
    flags: { protect: 1, mirror: 1, metronome: 1 },
    secondary: {
      chance: 50,
      onHit(target, source) { this.boost(this.randomChance(1, 2) ? { def: -1 } : { spd: -1 }, target, source); },
    },
  },

  'Drenaje Umbrío': {
    desc: 'Absorbe la energía vital del objetivo. El usuario recupera la mitad del daño causado.',
    nombreEN: 'Shadow Drain', descEN: 'Drains the target\'s life energy. The user recovers half the damage dealt.',
    idPBS: 'SHADOWDRAIN', funcionPBS: 'HealUserByHalfOfDamageDone',
    type: 'Dark', category: 'Special', basePower: 75, accuracy: 100, pp: 10, target: 'normal',
    drain: [1, 2], flags: { protect: 1, mirror: 1, heal: 1, metronome: 1 },
  },

  'Impacto Sísmico': {
    desc: 'Ignora las subidas de Defensa del objetivo y rompe Reflejo, Pantalla de Luz y Velo Aurora.',
    nombreEN: 'Fault Strike', descEN: 'Ignores the target\'s Defense boosts and breaks Reflect, Light Screen and Aurora Veil.',
    idPBS: 'FAULTSTRIKE', funcionPBS: 'IgnoreTargetDefRaisesRemoveScreens',
    type: 'Ground', category: 'Physical', basePower: 60, accuracy: 100, pp: 20, target: 'normal',
    flags: { contact: 1, protect: 1, mirror: 1, metronome: 1 },
    onTryHit(target) {
      target.side.removeSideCondition('reflect');
      target.side.removeSideCondition('lightscreen');
      target.side.removeSideCondition('auroraveil');
    },
    onModifyMove(move, source, target) {
      if (target && target.boosts.def > 0) move.ignoreDefensive = true;
    },
  },

  'Niebla Espejo': {
    desc: 'Prioridad +1. Este turno recibe la mitad de daño de ataques especiales y devuelve las bajadas de características.',
    nombreEN: 'Reflective Frost', descEN: '+1 priority. This turn the user takes half damage from special moves and reflects stat drops.',
    idPBS: 'REFLECTIVEFROST', funcionPBS: 'HalveSpecialDamageReflectStatDropsThisRound',
    type: 'Ice', category: 'Status', basePower: 0, accuracy: true, pp: 10, priority: 1, target: 'self',
    flags: { snatch: 1, metronome: 1 }, volatileStatus: 'nieblaespejo',
    condition: {
      duration: 1,
      onStart(pokemon) { this.add('-message', MSG(`¡${pokemon.name} se cubrió con un escudo de escarcha deslumbrante!`, `${pokemon.name} cloaked itself in a dazzling frost shield!`)); },
      onSourceModifyDamage(damage, source, target, move) {
        if (move.category === 'Special') return this.chainModify(0.5);
      },
      onTryBoost(boost, target, source, effect) {
        if (!source || target === source || effect?.id === this.effect.id) return;
        const negativo = {};
        let hay = false;
        for (const b in boost) if (boost[b] < 0) { negativo[b] = boost[b]; delete boost[b]; hay = true; }
        if (!hay || !source.hp) return;
        this.add('-message', MSG(`¡La Niebla Espejo de ${target.name} devolvió el efecto!`, `${target.name}'s Reflective Frost bounced the effect back!`));
        this.boost(negativo, source, target, this.effect, true);
      },
    },
  },

  'Corte Fotosintético': {
    desc: 'Tajo con energía solar con alto índice de golpe crítico. Con sol su potencia sube a 105.',
    nombreEN: 'Sunlight Blade', descEN: 'A solar-powered slash with a high critical-hit ratio. Power rises to 105 in harsh sunlight.',
    idPBS: 'SUNLIGHTBLADE', funcionPBS: 'IncreasePowerInSun',
    type: 'Grass', category: 'Physical', basePower: 70, accuracy: 100, pp: 15, target: 'normal', critRatio: 2,
    flags: { contact: 1, protect: 1, mirror: 1, metronome: 1, slicing: 1 },
    onBasePower(basePower, pokemon) {
      if (['sunnyday', 'desolateland'].includes(pokemon.effectiveWeather())) return this.chainModify(1.5);
    },
  },

  'Desvío de Impacto': {
    desc: 'Prioridad +1. Si el objetivo ya usó un ataque de contacto este turno, es golpe crítico seguro.',
    nombreEN: 'Parry Strike', descEN: '+1 priority. Always lands a critical hit if the target already used a contact move this turn.',
    idPBS: 'PARRYSTRIKE', funcionPBS: 'AlwaysCriticalIfTargetUsedContactMove',
    type: 'Fighting', category: 'Physical', basePower: 50, accuracy: 100, pp: 15, priority: 1, target: 'normal',
    flags: { contact: 1, protect: 1, mirror: 1, metronome: 1 },
    onModifyMove(move, source, target) {
      if (target && target.moveThisTurn && target.lastMove && target.lastMove.flags && target.lastMove.flags['contact']) move.willCrit = true;
    },
  },

  'Avalancha de Grava': {
    desc: 'Ráfaga de piedras afiladas que golpea de dos a cinco veces seguidas.',
    nombreEN: 'Gravel Blast', descEN: 'A burst of sharp stones that hits two to five times in a row.',
    idPBS: 'GRAVELBLAST', funcionPBS: 'HitTwoToFiveTimes',
    type: 'Rock', category: 'Physical', basePower: 25, accuracy: 90, pp: 30, target: 'normal', multihit: [2, 5],
    flags: { protect: 1, mirror: 1, metronome: 1 },
  },

  'Destello Cegador': {
    desc: 'Ráfaga de luz. Si el objetivo ataca este turno, baja su Ataque y su Ataque Especial.',
    nombreEN: 'Blinding Flash', descEN: 'A burst of light. If the target attacks this turn, its Attack and Sp. Atk fall.',
    idPBS: 'BLINDINGFLASH', funcionPBS: 'LowerTargetAtkSpAtk1IfTargetAttacks',
    type: 'Fairy', category: 'Special', basePower: 60, accuracy: 100, pp: 15, target: 'normal',
    flags: { protect: 1, mirror: 1, metronome: 1 },
    onHit(target, source) {
      const accion = this.queue.willMove(target);
      const vaAAtacar = accion && accion.move && accion.move.category !== 'Status';
      const yaAtaco = target.moveThisTurn && target.lastMove && target.lastMove.category !== 'Status';
      if (vaAAtacar || yaAtaco) this.boost({ atk: -1, spa: -1 }, target, source);
    },
  },

  'Ceniza Sofocante': {
    desc: 'Cubre al rival de ceniza 3 turnos: sus ataques físicos pueden fallar (30%), salvo en tipos Fuego, Acero y Roca.',
    nombreEN: 'Choking Ash', descEN: 'Covers the foe in ash for 3 turns: its physical moves may fail (30%), except for Fire, Steel and Rock types.',
    idPBS: 'CHOKINGASH', funcionPBS: 'StartChokingAshOnFoeSide',
    type: 'Fire', category: 'Status', basePower: 0, accuracy: true, pp: 15, target: 'foeSide',
    flags: { metronome: 1 }, sideCondition: 'cenizasofocante',
    onTry(source) {
      if (!this.randomChance(9, 10)) { this.add('-message', MSG('¡Pero la ceniza se dispersó sin efecto!', 'But the ash scattered harmlessly!')); return null; }
    },
    condition: {
      duration: 3,
      onSideStart(side) { this.add('-sidestart', side, 'Ceniza Sofocante'); },
      onBeforeMovePriority: 6,
      onBeforeMove(pokemon, target, move) {
        if (move.category !== 'Physical' || pokemon.hasType(['Fire', 'Steel', 'Rock'])) return;
        if (this.randomChance(3, 10)) {
          this.add('-message', MSG(`¡${pokemon.name} se asfixia entre la ceniza y no puede atacar!`, `${pokemon.name} is choking on the ash and can't attack!`));
          return false;
        }
      },
      onSideResidualOrder: 26,
      onSideResidualSubOrder: 11,
      onSideEnd(side) { this.add('-sideend', side, 'Ceniza Sofocante'); },
    },
  },

  'Corte Glacial': {
    desc: 'Tajo con una hoja de hielo. Ignora los cambios en las defensas del objetivo y puede congelarlo (10%).',
    nombreEN: 'Frost Edge', descEN: 'Slashes with an icy blade. Ignores the target\'s defensive stat changes and may freeze it (10%).',
    idPBS: 'FROSTEDGE', funcionPBS: 'IgnoreTargetDefSpDefEvaStatStagesFreezeTarget',
    type: 'Ice', category: 'Physical', basePower: 70, accuracy: 100, pp: 15, target: 'normal',
    ignoreDefensive: true, ignoreEvasion: true,
    flags: { contact: 1, protect: 1, mirror: 1, metronome: 1, slicing: 1 },
    secondary: { chance: 10, status: 'frz' },
  },

  'Fisura Táctica': {
    desc: 'Elimina las trampas de ambos lados del campo y el objetivo no puede cambiar hasta el final del turno siguiente.',
    nombreEN: 'Tectonic Pit', descEN: 'Removes hazards from both sides of the field and traps the target until the end of the next turn.',
    idPBS: 'TECTONICPIT', funcionPBS: 'RemoveEntryHazardsTrapTargetOneTurn',
    type: 'Ground', category: 'Status', basePower: 0, accuracy: 100, pp: 10, target: 'normal',
    flags: { protect: 1, mirror: 1, metronome: 1 },
    onHit(target, source, move) {
      const trampas = ['spikes', 'toxicspikes', 'stealthrock', 'stickyweb', 'gmaxsteelsurge'];
      let algo = false;
      for (const side of [source.side, target.side]) {
        let quitada = false;
        for (const t of trampas) if (side.removeSideCondition(t)) quitada = true;
        if (quitada) { algo = true; this.add('-message', MSG(`¡La fisura aplastó las trampas del campo de ${side.name}!`, `The fissure crushed the hazards on ${side.name}'s side!`)); }
      }
      if (!target.hasType('Ghost') && !target.volatiles[move.id]) {
        target.addVolatile(move.id, source);
        algo = true;
      }
      if (!algo) return false;
    },
    condition: {
      duration: 2,
      onStart(pokemon) { this.add('-message', MSG(`¡${pokemon.name} quedó atrapado en la zanja y no puede huir!`, `${pokemon.name} is stuck in the pit and can't escape!`)); },
      onTrapPokemon(pokemon) { pokemon.tryTrap(); },
    },
  },

  'Golpe de Ventisca': {
    desc: 'Prioridad +1. Con lluvia o sol su potencia sube a 75.',
    nombreEN: 'Gale Strike', descEN: '+1 priority. Power rises to 75 in rain or harsh sunlight.',
    idPBS: 'GALESTRIKE', funcionPBS: 'IncreasePowerInRainOrSun',
    type: 'Flying', category: 'Physical', basePower: 50, accuracy: 100, pp: 15, priority: 1, target: 'normal',
    flags: { contact: 1, protect: 1, mirror: 1, metronome: 1 },
    onBasePower(basePower, pokemon) {
      if (['sunnyday', 'desolateland', 'raindance', 'primordialsea'].includes(pokemon.effectiveWeather())) return this.chainModify(1.5);
    },
  },

  'Sobrecarga Neural': {
    desc: 'Si un rival va a usar un movimiento con prioridad, se le adelanta y le hace el doble de daño.',
    nombreEN: 'Psychic Overload', descEN: 'If a foe is about to use a priority move, the user moves first and deals double damage.',
    idPBS: 'PSYCHICOVERLOAD', funcionPBS: 'MovesBeforePriorityFoeDoublePower',
    type: 'Psychic', category: 'Special', basePower: 75, accuracy: 100, pp: 10, target: 'normal',
    flags: { protect: 1, mirror: 1, metronome: 1 },
    beforeTurnCallback(pokemon) {
      pokemon.sobrecargaObjetivos = [];
      pokemon.sobrecargaPrioridad = null;
      let maxPri = null;
      for (const foe of pokemon.foes()) {
        const accion = this.queue.willMove(foe);
        if (accion && accion.move && accion.move.id !== this.toID('Sobrecarga Neural') && accion.priority > 0) {
          pokemon.sobrecargaObjetivos.push(foe);
          maxPri = maxPri === null ? accion.priority : Math.max(maxPri, accion.priority);
        }
      }
      const propia = this.queue.willMove(pokemon);
      if (propia && maxPri !== null && propia.priority <= maxPri) {
        pokemon.sobrecargaPrioridad = Math.floor(maxPri) + 1;
        this.getActionSpeed(propia);
        this.queue.sort();
      }
    },
    onModifyPriority(priority, source) {
      if (source && source.sobrecargaPrioridad != null) return source.sobrecargaPrioridad;
    },
    basePowerCallback(pokemon, target, move) {
      if (pokemon.sobrecargaObjetivos && pokemon.sobrecargaObjetivos.includes(target)) return move.basePower * 2;
      return move.basePower;
    },
  },
};

/* Estados auxiliares que usan los movimientos (no se aprenden). */
window.DATOS_CONDICIONES = {
  // Gas de Paranoia: si se hiere a sí mismo por la confusión, se le cae el objeto
  paranoia: {
    name: 'Paranoia',
    onStart(pokemon) { this.add('-message', MSG(`¡${pokemon.name} revive sus peores pesadillas y cae en la paranoia!`, `${pokemon.name} relives its worst nightmares and falls into paranoia!`)); },
    onDamage(damage, target, source, effect) {
      if (!effect || effect.id !== 'confused' || !target.item) return;
      if (target.hasAbility('stickyhold')) { this.add('-message', MSG(`¡${target.name} se aferra a su objeto pese al pánico!`, `${target.name} clings to its item despite the panic!`)); return; }
      const objeto = target.getItem();
      if (!target.takeItem()) return;
      this.add('-enditem', target, objeto.name, '[from] move: Gas de Paranoia');
      const ladron = this.effectState.source;
      if (ladron && ladron.isActive && ladron.hp && !ladron.item && ladron.hasAbility(['magician', 'pickpocket'])) {
        ladron.setItem(objeto);
        this.add('-item', ladron, objeto, '[from] ability: ' + ladron.getAbility().name);
      }
    },
    onResidual(pokemon) { if (!pokemon.volatiles['confusion']) pokemon.removeVolatile('paranoia'); },
  },
};

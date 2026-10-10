/* =============================================================================
 *  HABILIDADES PERSONALIZADAS
 *  Escritas con el formato de Pokémon Showdown (cada "on..." es un momento del
 *  combate en el que la habilidad hace algo).
 * ========================================================================== */
window.DATOS_HABILIDADES = {

  // Sueño confortante: al recibir un ataque físico, 25% de dormir al atacante.
  'Sueño confortante': {
    desc: 'Al recibir un movimiento físico, puede dormir al atacante (25%).',
    idPBS: 'SOOTHINGSLUMBER', nombreEN: 'Soothing Slumber', descEN: 'When hit by a physical move, may put the attacker to sleep (25%).',
    rating: 2.5,
    onDamagingHit(damage, target, source, move) {
      if (move.category !== 'Physical' || !source || source === target) return;
      if (this.randomChance(25, 100)) {
        source.trySetStatus('slp', target);
      }
    },
  },

  // Terror nocturno: los ataques hacen un 30% más de daño a objetivos dormidos.
  'Terror nocturno': {
    desc: 'Aumenta un 30% el daño causado a objetivos dormidos.',
    idPBS: 'NIGHTTERROR', nombreEN: 'Night Terror', descEN: 'Boosts damage dealt to sleeping targets by 30%.',
    rating: 2,
    onModifyDamage(damage, source, target, move) {
      if (target && (target.status === 'slp' || target.hasAbility('comatose'))) {
        return this.chainModify(1.3);
      }
    },
  },

  // ============================ Habilidades nuevas (v2) ============================

  // Corazón de Dragón: como Mar Llamas/Espesura pero para movimientos de tipo Dragón.
  'Corazón de Dragón': {
    desc: 'Potencia un 50% sus movimientos de tipo Dragón cuando le queda un tercio de los PS o menos.',
    idPBS: 'DRAGONHEART', nombreEN: 'Dragon Heart', descEN: 'Powers up Dragon-type moves by 50% when the Pokémon\'s HP is at one third or less.',
    rating: 2,
    onModifyAtkPriority: 5,
    onModifyAtk(atk, attacker, defender, move) {
      if (move.type === 'Dragon' && attacker.hp <= attacker.maxhp / 3) return this.chainModify(1.5);
    },
    onModifySpAPriority: 5,
    onModifySpA(atk, attacker, defender, move) {
      if (move.type === 'Dragon' && attacker.hp <= attacker.maxhp / 3) return this.chainModify(1.5);
    },
  },

  // Contraveneno: inmune al veneno; los ataques de tipo Veneno le suben el Ataque.
  'Contraveneno': {
    desc: 'No puede ser envenenado. Si le alcanza un movimiento de tipo Veneno, no le afecta y sube su Ataque.',
    idPBS: 'ANTIVENOM', nombreEN: 'Antivenom', descEN: 'Can\'t be poisoned. If hit by a Poison-type move, it takes no damage and its Attack rises.',
    rating: 3,
    onTryHitPriority: 1,
    onTryHit(target, source, move) {
      if (target !== source && move.type === 'Poison') {
        if (!this.boost({ atk: 1 })) this.add('-immune', target, '[from] ability: Contraveneno');
        return null;
      }
    },
    onSetStatus(status, target, source, effect) {
      if (status.id !== 'psn' && status.id !== 'tox') return;
      if (effect && effect.status) this.add('-immune', target, '[from] ability: Contraveneno');
      return false;
    },
    onUpdate(pokemon) {
      if (pokemon.status === 'psn' || pokemon.status === 'tox') {
        this.add('-activate', pokemon, 'ability: Contraveneno');
        pokemon.cureStatus();
      }
    },
  },

  // Rocío Matinal: se cura un poco cada turno; más con lluvia o Campo de Hierba.
  'Rocío Matinal': {
    desc: 'Recupera 1/16 de sus PS máximos al final de cada turno, o 1/8 con lluvia o Campo de Hierba.',
    idPBS: 'MORNINGDEW', nombreEN: 'Morning Dew', descEN: 'Restores 1/16 of its max HP at the end of each turn, or 1/8 in rain or on Grassy Terrain.',
    rating: 2.5,
    onResidualOrder: 5,
    onResidualSubOrder: 4,
    onResidual(pokemon) {
      if (pokemon.hp >= pokemon.maxhp) return;
      const lluvia = ['raindance', 'primordialsea'].includes(pokemon.effectiveWeather());
      const hierba = this.field.isTerrain('grassyterrain') && pokemon.isGrounded();
      this.heal(pokemon.baseMaxhp / (lluvia || hierba ? 8 : 16));
    },
  },

  // Corriente Fría: con lluvia o nieve se vuelve más rápido.
  'Corriente Fría': {
    desc: 'Al entrar en combate con lluvia o nieve, o cuando empieza a llover o nevar, sube su Velocidad.',
    idPBS: 'COLDCURRENT', nombreEN: 'Cold Current', descEN: 'Raises Speed when entering battle in rain or snow, or when it starts to rain or snow.',
    rating: 2,
    onStart(pokemon) {
      if (['raindance', 'primordialsea', 'snow', 'snowscape', 'hail'].includes(pokemon.effectiveWeather())) this.boost({ spe: 1 }, pokemon);
    },
    onWeatherChange(pokemon) {
      if (['raindance', 'primordialsea', 'snow', 'snowscape', 'hail'].includes(pokemon.effectiveWeather())) this.boost({ spe: 1 }, pokemon);
    },
  },

  // Mal de Ojo: como Intimidación, pero baja la Defensa Especial.
  'Mal de Ojo': {
    desc: 'Al entrar en combate, lanza una mirada maldita que baja la Defensa Especial de los rivales.',
    idPBS: 'EVILEYE', nombreEN: 'Evil Eye', descEN: 'On entering battle, a cursed glare lowers the Sp. Def of opposing Pokémon.',
    rating: 3,
    onStart(pokemon) {
      let anunciada = false;
      for (const target of pokemon.adjacentFoes()) {
        if (!anunciada) { this.add('-ability', pokemon, 'Mal de Ojo', 'boost'); anunciada = true; }
        if (target.volatiles['substitute']) this.add('-immune', target);
        else this.boost({ spd: -1 }, target, pokemon, null, true);
      }
    },
  },
};

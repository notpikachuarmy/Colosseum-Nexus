/* =============================================================================
 *  HABILIDADES PERSONALIZADAS
 *  Escritas con el formato de Pokémon Showdown (cada "on..." es un momento del
 *  combate en el que la habilidad hace algo).
 * ========================================================================== */
window.DATOS_HABILIDADES = {

  // Sueño confortante: al recibir un ataque físico, 25% de dormir al atacante.
  'Sueño confortante': {
    desc: 'Al recibir un movimiento físico, puede dormir al atacante (25%).',
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
    rating: 2,
    onModifyDamage(damage, source, target, move) {
      if (target && (target.status === 'slp' || target.hasAbility('comatose'))) {
        return this.chainModify(1.3);
      }
    },
  },
};

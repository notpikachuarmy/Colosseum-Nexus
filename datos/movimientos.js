/* =============================================================================
 *  MOVIMIENTOS PERSONALIZADOS
 *  type: tipo en inglés · category: 'Physical', 'Special' o 'Status'
 *  basePower: potencia · accuracy: precisión (true = nunca falla) · pp
 *  target: 'normal' (un objetivo), 'self' (uno mismo), 'allAdjacentFoes'...
 * ========================================================================== */
window.DATOS_MOVIMIENTOS = {

  // Sueño dulce: duerme al objetivo y, si lo consigue, cura 1/8 de PS al usuario.
  'Sueño dulce': {
    desc: 'Duerme al objetivo y restaura 1/8 de los PS máximos al usuario.',
    type: 'Fairy', category: 'Status', basePower: 0, accuracy: 75, pp: 10,
    priority: 0, target: 'normal',
    flags: { protect: 1, reflectable: 1, mirror: 1, metronome: 1 },
    onHit(target, source, move) {
      if (!target.setStatus('slp', source, move)) return false;
      this.heal(Math.ceil(source.maxhp / 8), source, source, move);
    },
  },
};

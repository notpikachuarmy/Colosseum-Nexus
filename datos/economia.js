/* =============================================================================
 *  ECONOMÍA: PUNTOS VICTORIA (PV) Y TIENDA
 *  Todo lo que se gana y lo que cuesta está aquí. Cambia los números y listo.
 *  (Solo cuentan los combates de 3 turnos o más.)
 * ========================================================================== */
window.ECONOMIA = {
  // PV que se ganan al terminar un combate
  pv: {
    ia:     { victoria: 15, derrota: 3 },
    online: { victoria: 30, derrota: 8 },
    serieGanada: 20,          // extra por ganar una serie al mejor de 3
  },

  // Precios de la tienda (en PV)
  tickets: {
    uno: 50,                  // 1 ticket de gacha
    pack10: 450,              // pack de 10 tickets (siempre da exactamente 10)
  },

  // Avatares de la tienda (los que tienen origen: 'tienda' en datos/avatares.js).
  // El precio depende de su rareza.
  avatarPorRareza: { comun: 150, raro: 250, epico: 400, legendario: 650 },

  // Pases: el precio depende de cuánto contenido traen (los pases no caducan).
  // precio = base + porRecompensa × número de recompensas del pase.
  // Un pase antiguo (cuando ya hay otros más nuevos) cuesta menos.
  pase: { base: 300, porRecompensa: 45, descuentoAntiguo: 0.7 },
};

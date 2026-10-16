/* =============================================================================
 *  PASES (no caducan: duran para siempre)
 *  - Se compran con PV (precio en datos/economia.js: base + porRecompensa × recompensas).
 *  - Puedes tener varios, pero solo el ACTIVO gana experiencia de pase.
 *  - Al llegar a un nivel, su recompensa se entrega sola y queda apuntada (no se repite).
 *  Tipos de recompensa:
 *    { tipo: 'avatar',  id: 'titan' }                 → entrenador (id de datos/avatares.js)
 *    { tipo: 'tickets', n: 3 }                        → tickets de gacha
 *    { tipo: 'pokemon', especies: ['Magiceon'] }      → desbloquea esos Fakemon (nombre interno)
 *    { tipo: 'titulo',  id: 'duelista', nombre: 'Duelista' } → título (se usarán en la fase 7)
 *  antiguo: true → ya hay pases más nuevos (sigue a la venta, más barato).
 * ========================================================================== */
window.PASES = [
  {
    id: 'kaibacorp', nombre: 'Pase Kaiba Corp', imagen: 'img/pases/kaibacorp.png', antiguo: false,
    xpPorNivel: 200,
    niveles: [
      { tipo: 'avatar', id: 'titan' },                                  // 1
      { tipo: 'tickets', n: 2 },                                        // 2
      { tipo: 'pokemon', especies: ['Magiceon'] },                      // 3
      { tipo: 'pokemon', especies: ['Malichamp'] },                     // 4
      { tipo: 'tickets', n: 3 },                                        // 5
      { tipo: 'avatar', id: 'atenea-mai-valentine-cosplay' },           // 6
      { tipo: 'pokemon', especies: ['Yamask-Custom', 'Greedigus'] },    // 7
      { tipo: 'pokemon', especies: ['Grimmarch'] },                     // 8
      { tipo: 'tickets', n: 3 },                                        // 9
      { tipo: 'avatar', id: 'misty-maga-oscura-cosplay' },              // 10
      { tipo: 'pokemon', especies: ['Hoopa-Lampara'] },                 // 11
      { tipo: 'tickets', n: 5 },                                        // 12
      { tipo: 'pokemon', especies: ['Regigigas-Custom'] },              // 13
      { tipo: 'pokemon', especies: ['Rayquaza-Custom'] },               // 14
      { tipo: 'avatar', id: 'giovanni-kaiba-cosplay' },                 // 15
      { tipo: 'tickets', n: 3 },                                        // 16
      { tipo: 'pokemon', especies: ['Ho-Oh-Custom'] },                  // 17
      { tipo: 'pokemon', especies: ['Lugia-Custom'] },                  // 18
      { tipo: 'titulo', id: 'duelista', nombre: 'Duelista' },           // 19
      { tipo: 'avatar', id: 'seto-kaiba' },                             // 20
    ],
  },
];

/* Experiencia de pase por combate (distinta de la del nivel y de los PV).
   Solo cuentan los combates de 3 turnos o más. */
window.EXP_PASE = {
  ia:     { victoria: 40, derrota: 15 },
  online: { victoria: 80, derrota: 30 },
  serieGanada: 40,
};

/* Fakemon que se consiguen jugando el modo historia (hasta entonces, bloqueados).
   Bloqueado = TÚ no puedes usarlo en tus equipos; la IA y otros jugadores sí. */
window.FAKEMON_HISTORIA = ['Espina Feroz', 'Ferroantena', 'Cineret', 'Aracamara'];

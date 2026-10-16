/* =============================================================================
 *  FONDOS DE COMBATE, CLIMA, CAMPOS Y PELIGROS (solo lo que se VE; no cambia reglas)
 * ========================================================================== */

/* Fondos que el jugador puede elegir en su Perfil (o "aleatorio" entre los que tiene).
   origen: 'base' (lo tienes desde el principio), 'historia', 'pase' o 'tienda'.
   donde: texto que se enseña mientras está bloqueado. Para añadir uno: copia la imagen
   (mejor 512×288 o con esa forma) a img/fondos/ y añade su línea. */
window.FONDOS = [
  { id: 'bosque',   nombre: 'Bosque',           imagen: 'img/fondos/bosque.png',   origen: 'base' },
  { id: 'gimnasio', nombre: 'Gimnasio Pokémon', imagen: 'img/fondos/gimnasio.png', origen: 'historia', donde: 'Medalla Linternita (modo historia)' },
  { id: 'cine',     nombre: 'Cine',             imagen: 'img/fondos/cine.png',     origen: 'historia', donde: 'Cine maldito (modo historia)' },
];

/* Capa de clima (va por encima de todo el campo). Climas sin imagen no enseñan nada.
   Viento fuerte (DeltaStream) no tiene imagen a propósito. */
window.CLIMA_IMAGEN = {
  RainDance: 'img/clima/lluvia.png', PrimordialSea: 'img/clima/lluvia.png',
  SunnyDay: 'img/clima/sol.png', DesolateLand: 'img/clima/sol.png',
  Sandstorm: 'img/clima/tormentaarena.png',
  Hail: 'img/clima/granizo.png',
  Snow: 'img/clima/nieve.png', Snowscape: 'img/clima/nieve.png',
};

/* Tinte de los campos (por encima del fondo, por debajo de los Pokémon).
   opacidad: de 0 (nada) a 1 (color sólido). */
window.TINTE_CAMPO = {
  opacidad: 0.22,
  colores: { grassyterrain: '#3fd25a', electricterrain: '#ffe23a', mistyterrain: '#ff8fd0', psychicterrain: '#a35bff' },
};

/* Peligros de entrada que se dibujan en el suelo de cada lado.
   Acero afilado y Ceniza sofocante aún no tienen imagen (solo salen como texto). */
window.PELIGROS_IMAGEN = {
  spikes: 'img/hazards/puas.png', toxicspikes: 'img/hazards/puastoxicas.png', stealthrock: 'img/hazards/tramparocas.png',
  stickyweb: 'img/hazards/stickyweb.png', trampamental: 'img/hazards/trampamental.png',
};

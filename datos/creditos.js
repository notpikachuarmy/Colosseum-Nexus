/* =============================================================================
 *  CRÉDITOS DE LOS FAKEMON
 *  Se muestran en la ficha de cada Fakemon (Pokédex) y en la sección Créditos.
 *  - porDefecto: lo que se aplica a todos los Fakemon que no estén en la lista.
 *  - excepciones: Fakemon con autores distintos (se busca por nombre; las formas,
 *    como "Railspike-Ballesta", usan el nombre de su especie base).
 *  Campos: idea (idea del diseño), diseno (diseño final), sprites y, si los hizo
 *  otra persona, spritesShiny. Las formas propias (Lugia-Oscuro) usan su nombre completo.
 * ========================================================================== */
window.CREDITOS_FAKEMON = {
  porDefecto: { idea: 'Arga', diseno: 'reza3u.sprites', sprites: 'reza3u.sprites' },
  excepciones: {
    'Heroeon':   { idea: 'Doctor fakemon', diseno: 'Doctor fakemon', sprites: 'reza3u.sprites' },
    'Dracoreon': { idea: 'Doctor fakemon', diseno: 'Doctor fakemon', sprites: 'reza3u.sprites' },
    'Draglett':  { idea: 'Doctor fakemon', diseno: 'Doctor fakemon', sprites: 'reza3u.sprites' },
    'Dragtrio':  { idea: 'Doctor fakemon', diseno: 'Doctor fakemon', sprites: 'reza3u.sprites' },
    'Lugia-Oscuro': { idea: 'Nintendo (Pokémon XD: Tempestad Oscura)', diseno: 'Nintendo (Pokémon XD: Tempestad Oscura)', sprites: 'Shadowgate31', spritesShiny: 'Arga' },
  },
};

/* Otros créditos que aparecen en la sección Créditos. */
window.CREDITOS_OTROS = [
  { que: 'Sprites de Pokémon oficiales', queEN: 'Official Pokémon sprites', quien: 'Pokémon Showdown / Smogon (play.pokemonshowdown.com)' },
  { que: 'Motor de combate', queEN: 'Battle engine', quien: 'Pokémon Showdown (licencia MIT) · @pkmn/sim' },
  { que: 'Pokémon', queEN: 'Pokémon', quien: 'Nintendo · Game Freak · Creatures' },
  { que: 'Música', queEN: 'Music', quien: 'Música creada con Suno' },
];

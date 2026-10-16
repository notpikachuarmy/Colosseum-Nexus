/* =============================================================================
 *  TÍTULOS Y LOGROS
 *  Se consiguen una sola vez y se pueden mostrar (o no) en el VS desde el Perfil.
 *  Puedes cambiar el nombre, el texto y los PV de premio. La condición de cada uno
 *  está programada según su id, así que el id NO se cambia.
 *  Combate válido: 3 turnos o más y con ganador; cada combate cuenta una sola vez.
 * ========================================================================== */
window.TITULOS = [
  // Online y niveles
  { id: 'primera-victoria', nombre: 'Primera victoria', texto: 'Gana 1 combate online', pv: 50 },
  { id: 'veterano-online', nombre: 'Veterano online', texto: 'Llega al rango Veterano online (nivel 10)', pv: 100 },
  { id: 'as-online', nombre: 'As online', texto: 'Llega al nivel 20 online', pv: 200 },
  { id: 'campeon-online', nombre: 'Campeón online', texto: 'Llega al nivel 50 online', pv: 400 },
  { id: 'tryhard', nombre: 'Tryhard', texto: 'Llega al nivel 75 online', pv: 600 },
  { id: 'cazaholos', nombre: 'Cazaholos', texto: 'Gana 25 combates contra la IA', pv: 100 },
  { id: 'imparable', nombre: 'Imparable', texto: 'Consigue una racha de 5 victorias online', pv: 150 },
  { id: 'leyenda-invicta', nombre: 'Leyenda invicta', texto: 'Consigue una racha de 10 victorias online', pv: 300 },
  // Colección
  { id: 'maestro-kanto', nombre: 'Maestro de Kanto', texto: 'Ten todos los entrenadores del gacha con la etiqueta Kanto', pv: 200 },
  { id: 'maestro-johto', nombre: 'Maestro de Johto', texto: 'Ten todos los entrenadores del gacha con la etiqueta Johto', pv: 200 },
  { id: 'maestro-hoenn', nombre: 'Maestro de Hoenn', texto: 'Ten todos los entrenadores del gacha con la etiqueta Hoenn', pv: 200 },
  { id: 'completista', nombre: 'Completista', texto: 'Ten todos los entrenadores del gacha', pv: 500 },
  { id: 'cliente-vip', nombre: 'Cliente VIP', texto: 'Compra 3 entrenadores de la tienda', pv: 100 },
  // Estilo de combate (5 victorias salvo que se diga otra cosa)
  { id: 'maestro-regional', nombre: 'Maestro regional', texto: 'Gana 5 combates usando solo formas regionales (Alola, Galar, Hisui, Paldea o Jagara)', pv: 150 },
  { id: 'orgullo-jagara', nombre: 'Orgullo Jagara', texto: 'Gana 5 combates solo con Fakemon y formas Jagara', pv: 150 },
  { id: 'purista', nombre: 'Purista', texto: 'Gana 5 combates sin ningún Fakemon ni forma Jagara', pv: 100 },
  { id: 'orgullo-kanto', nombre: 'Orgullo de Kanto', texto: 'Gana 5 combates solo con Pokémon de Kanto', pv: 150 },
  { id: 'orgullo-johto', nombre: 'Orgullo de Johto', texto: 'Gana 5 combates solo con Pokémon de Johto', pv: 150 },
  { id: 'orgullo-hoenn', nombre: 'Orgullo de Hoenn', texto: 'Gana 5 combates solo con Pokémon de Hoenn', pv: 150 },
  { id: 'orgullo-sinnoh', nombre: 'Orgullo de Sinnoh', texto: 'Gana 5 combates solo con Pokémon de Sinnoh', pv: 150 },
  { id: 'orgullo-teselia', nombre: 'Orgullo de Teselia', texto: 'Gana 5 combates solo con Pokémon de Teselia', pv: 150 },
  { id: 'orgullo-kalos', nombre: 'Orgullo de Kalos', texto: 'Gana 5 combates solo con Pokémon de Kalos', pv: 150 },
  { id: 'orgullo-alola', nombre: 'Orgullo de Alola', texto: 'Gana 5 combates solo con Pokémon de Alola (incluidas sus formas regionales)', pv: 150 },
  { id: 'orgullo-galar', nombre: 'Orgullo de Galar', texto: 'Gana 5 combates solo con Pokémon de Galar (incluidas sus formas regionales)', pv: 150 },
  { id: 'orgullo-hisui', nombre: 'Orgullo de Hisui', texto: 'Gana 5 combates solo con Pokémon de Hisui (incluidas sus formas regionales)', pv: 150 },
  { id: 'orgullo-paldea', nombre: 'Orgullo de Paldea', texto: 'Gana 5 combates solo con Pokémon de Paldea (incluidas sus formas regionales)', pv: 150 },
  { id: 'monotipo', nombre: 'Monotipo', texto: 'Gana 3 combates con 6 Pokémon que compartan un tipo', pv: 150 },
  { id: 'remontada', nombre: 'Remontada', texto: 'Gana un combate después de quedarte con un solo Pokémon cuando al rival le quedaban 3 o más', pv: 150 },
  { id: 'intocable', nombre: 'Intocable', texto: 'Gana un combate individual 6 contra 6 sin que se debilite ninguno de los tuyos', pv: 200 },
  { id: 'poder-total', nombre: 'Poder total', texto: 'Gana combates usando cada poder al menos una vez: Megaevolución, Movimiento Z, Dinamax y Teracristal', pv: 200 },
  // Series
  { id: 'estratega', nombre: 'Estratega', texto: 'Gana 3 series de draft', pv: 200 },
  { id: 'al-mejor-de-tres', nombre: 'Al mejor de tres', texto: 'Gana 5 series al mejor de 3', pv: 150 },
  // Pases e historia
  { id: 'duelista', nombre: 'Duelista', texto: 'Nivel 19 del Pase Kaiba Corp', pv: 0 },
  { id: 'medalla-linternita', nombre: 'Medalla Linternita', texto: 'Gana la Medalla Linternita en el modo historia', pv: 150 },
  { id: 'cazafantasmas', nombre: 'Cazafantasmas', texto: 'Vence a Aracamara en el Cine maldito (modo historia)', pv: 150 },
];

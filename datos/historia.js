/* =============================================================================
 *  MODO HISTORIA
 *  Cada capítulo es un bloque con su ruta de nodos (combates). Para añadir un
 *  capítulo nuevo basta con copiar uno y cambiar sus datos: no hay que programar.
 *
 *  Capítulo:
 *    id, titulo, resumen, fondo (id de datos/fondos.js para los combates del capítulo;
 *    si se omite, el que elija el jugador), color (del mapa), nodos: [...]
 *  Nodo:
 *    id, nombre, avatar (id de datos/avatares.js), x / y (posición en el mapa, 0-100),
 *    requiere: ids de nodos que hay que ganar antes,
 *    jefe: true (el último del capítulo), pendiente: 'texto' (si aún no se puede jugar),
 *    pokemon: 'Especie' (si el rival es un Pokémon salvaje en vez de un entrenador: sale su sprite),
 *    incursion: { hp, stats, tramos, escudo, turnos } (jefe de incursión 1 contra 6, ver mod.ts),
 *    antes / despues: diálogos [{ quien: 'id de avatar', 'jugador' o 'pk:Especie', nombre?, texto }],
 *    equipo: Pokémon del rival (species, item, ability, moves, nature, evs, nickname, teraType),
 *    recompensas: [{ tipo: 'avatar', id } | { tipo: 'fondo', id } | { tipo: 'pokemon', especies: [...] }
 *                  | { tipo: 'titulo', id } | { tipo: 'pv', n }]
 *  Las recompensas se entregan UNA sola vez (al ganar el nodo por primera vez).
 *  Los Pokémon de los NPC son nivel 100; si un campo falta se usa uno neutro.
 * ========================================================================== */
window.HISTORIA = [
  // ===========================================================================
  {
    id: 'linternita', titulo: 'Medalla Linternita', color: '#ffd43b', fondo: 'gimnasio',
    resumen: 'Recorre la ruta de los entrenadores eléctricos y desafía al gimnasio de Randes.',
    nodos: [
      {
        id: 'volta', nombre: 'Técnico Volta', avatar: 'tecnico', x: 12, y: 70, requiere: [],
        antes: [
          { quien: 'tecnico', texto: '¡Alto ahí! Nadie llega al gimnasio de Randes sin pasar por mi cuadro eléctrico.' },
          { quien: 'jugador', texto: 'Vengo a por la Medalla Linternita.' },
          { quien: 'tecnico', texto: 'Ja. Primero demuéstrame que aguantas una descarga.' },
        ],
        despues: [{ quien: 'tecnico', texto: 'Vale, vale… Tienes buena toma de tierra. Sigue la ruta.' }],
        equipo: [
          { species: 'Raichu', item: 'Life Orb', ability: 'Lightning Rod', nature: 'Timid', moves: ['Thunderbolt', 'Grass Knot', 'Focus Blast', 'Nasty Plot'] },
          { species: 'Rotom-Wash', item: 'Leftovers', ability: 'Levitate', nature: 'Modest', moves: ['Hydro Pump', 'Volt Switch', 'Will-O-Wisp', 'Thunderbolt'] },
          { species: 'Lanturn', item: 'Leftovers', ability: 'Volt Absorb', nature: 'Calm', moves: ['Scald', 'Thunderbolt', 'Ice Beam', 'Thunder Wave'] },
        ],
        recompensas: [{ tipo: 'pv', n: 30 }],
      },
      {
        id: 'chispas', nombre: 'Punk Chispas', avatar: 'punk', x: 38, y: 38, requiere: ['volta'],
        antes: [
          { quien: 'punk', texto: '¿Tú también vienes a ver a Randes? Dicen que su Dedenne es más rápido que la luz.' },
          { quien: 'punk', texto: '¡Mi banda y yo te vamos a dejar los pelos de punta!' },
        ],
        despues: [{ quien: 'punk', texto: 'Uf… Ese ritmo no me lo esperaba. Randes te va a caer bien.' }],
        equipo: [
          { species: 'Toxtricity', item: 'Throat Spray', ability: 'Punk Rock', nature: 'Modest', moves: ['Overdrive', 'Boomburst', 'Sludge Bomb', 'Volt Switch'] },
          { species: 'Luxray', item: 'Choice Band', ability: 'Intimidate', nature: 'Adamant', moves: ['Wild Charge', 'Crunch', 'Ice Fang', 'Play Rough'] },
          { species: 'Heliolisk', item: 'Choice Specs', ability: 'Dry Skin', nature: 'Timid', moves: ['Thunderbolt', 'Hyper Voice', 'Grass Knot', 'Volt Switch'] },
          { species: 'Pachirisu', item: 'Sitrus Berry', ability: 'Volt Absorb', nature: 'Jolly', moves: ['Nuzzle', 'Super Fang', 'U-turn', 'Protect'] },
        ],
        recompensas: [{ tipo: 'pv', n: 40 }],
      },
      {
        id: 'ohm', nombre: 'Montañero Ohm', avatar: 'montanero', x: 64, y: 62, requiere: ['chispas'],
        antes: [
          { quien: 'montanero', texto: 'Llevo años escalando hasta este gimnasio para que Randes me dé la medalla… y nunca lo consigo.' },
          { quien: 'montanero', texto: 'Si me ganas a mí, quizá tú sí puedas. ¡Pero no me lo pondré fácil!' },
        ],
        despues: [
          { quien: 'montanero', texto: 'Increíble. El gimnasio está justo ahí arriba.' },
          { quien: 'montanero', texto: 'Un consejo: no subestimes a NotPikachu. Es su as.' },
        ],
        equipo: [
          { species: 'Ampharos', item: 'Leftovers', ability: 'Static', nature: 'Modest', moves: ['Thunderbolt', 'Dragon Pulse', 'Focus Blast', 'Volt Switch'] },
          { species: 'Eelektross', item: 'Assault Vest', ability: 'Levitate', nature: 'Adamant', moves: ['Wild Charge', 'Drain Punch', 'Knock Off', 'U-turn'] },
          { species: 'Vikavolt', item: 'Choice Specs', ability: 'Levitate', nature: 'Modest', moves: ['Thunderbolt', 'Bug Buzz', 'Energy Ball', 'Volt Switch'] },
          { species: 'Electrode', item: 'Focus Sash', ability: 'Soundproof', nature: 'Timid', moves: ['Volt Switch', 'Thunderbolt', 'Foul Play', 'Taunt'] },
          { species: 'Zapdos', item: 'Heavy-Duty Boots', ability: 'Pressure', nature: 'Timid', moves: ['Thunderbolt', 'Hurricane', 'Heat Wave', 'Roost'] },
        ],
        recompensas: [{ tipo: 'pv', n: 50 }],
      },
      {
        id: 'randes', nombre: 'Líder Randes', avatar: 'randes', x: 84, y: 26, requiere: ['ohm'], jefe: true,
        antes: [
          { quien: 'randes', texto: 'Así que has llegado hasta aquí. Bienvenido al Gimnasio Linternita.' },
          { quien: 'randes', texto: 'Mi equipo y yo brillamos más que cualquier tormenta. Si quieres la medalla, ¡tendrás que apagarnos!' },
        ],
        despues: [
          { quien: 'randes', texto: 'Has apagado hasta la última chispa… Te has ganado la Medalla Linternita.' },
          { quien: 'randes', texto: 'Llévate también esto: Espina Feroz y Ferroantena ya confían en ti.' },
        ],
        // Equipo aprobado por Arga (todos a nivel 100; NotPikachu, el as, sale el último)
        equipo: [
          { species: 'Galvantula', nickname: 'Stormsilk', item: 'Focus Sash', ability: 'Compound Eyes', nature: 'Timid', evs: { hp: 4, spa: 252, spe: 252 }, moves: ['Sticky Web', 'Thunder', 'Bug Buzz', 'Volt Switch'] },
          { species: 'Jolteon', nickname: 'VVeVV', item: 'Choice Specs', ability: 'Volt Absorb', nature: 'Timid', evs: { hp: 4, spa: 252, spe: 252 }, moves: ['Thunderbolt', 'Shadow Ball', 'Volt Switch', 'Hyper Voice'] },
          { species: 'Electivire', nickname: 'ZigZag', item: 'Life Orb', ability: 'Motor Drive', nature: 'Adamant', evs: { hp: 4, atk: 252, spe: 252 }, moves: ['Wild Charge', 'Ice Punch', 'Earthquake', 'Cross Chop'] },
          { species: 'Magnezone', nickname: 'Magneto', item: 'Assault Vest', ability: 'Magnet Pull', nature: 'Modest', evs: { hp: 252, spa: 252, spd: 4 }, moves: ['Thunderbolt', 'Flash Cannon', 'Volt Switch', 'Tri Attack'] },
          { species: 'Inteleon', nickname: 'Sobel', teraType: 'Electric', item: 'Choice Specs', ability: 'Sniper', nature: 'Timid', evs: { hp: 4, spa: 252, spe: 252 }, moves: ['Tera Blast', 'Hydro Pump', 'Ice Beam', 'U-turn'] },
          { species: 'Dedenne', nickname: 'NotPikachu', item: 'Sitrus Berry', ability: 'Cheek Pouch', nature: 'Timid', evs: { hp: 252, spa: 4, spe: 252 }, moves: ['Thunderbolt', 'Dazzling Gleam', 'Nuzzle', 'Super Fang'] },
        ],
        recompensas: [
          { tipo: 'avatar', id: 'randes' },
          { tipo: 'fondo', id: 'gimnasio' },
          { tipo: 'pokemon', especies: ['Espina Feroz', 'Ferroantena'] },
          { tipo: 'titulo', id: 'medalla-linternita' },
        ],
      },
    ],
  },
  // ===========================================================================
  {
    id: 'cine', titulo: 'El cine maldito', color: '#b36bff', fondo: 'cine',
    resumen: 'Ayuda a Handsome a investigar el Cine Rex, donde ha desaparecido una actriz.',
    nodos: [
      {
        id: 'taquilla', nombre: 'Fantasmas de la taquilla', avatar: 'handsome', pokemon: 'Banette', x: 12, y: 68, requiere: [],
        antes: [
          { quien: 'handsome', texto: 'Buenas noches. Soy Handsome, de la Policía Internacional.' },
          { quien: 'handsome', texto: 'Una actriz ha desaparecido en este cine durante un rodaje. Desde entonces nadie se atreve a entrar: dicen que hay fantasmas.' },
          { quien: 'pk:Banette', texto: '¡Baneeette!' },
          { quien: 'handsome', texto: '¡Pokémon fantasma en la taquilla! Y parecen… hipnotizados. Tienen hilos de seda en el cuerpo.' },
        ],
        despues: [
          { quien: 'handsome', texto: 'Se han ido corriendo hacia dentro. Esos hilos los estaban controlando.' },
          { quien: 'handsome', texto: 'Sigamos el rastro de seda. Lleva al pasillo de las butacas.' },
        ],
        equipo: [
          { species: 'Mismagius', item: 'Life Orb', ability: 'Levitate', nature: 'Timid', moves: ['Shadow Ball', 'Mystical Fire', 'Thunderbolt', 'Nasty Plot'] },
          { species: 'Banette', item: 'Life Orb', ability: 'Frisk', nature: 'Adamant', moves: ['Shadow Claw', 'Knock Off', 'Gunk Shot', 'Shadow Sneak'] },
          { species: 'Sableye', item: 'Leftovers', ability: 'Prankster', nature: 'Careful', moves: ['Knock Off', 'Will-O-Wisp', 'Recover', 'Foul Play'] },
        ],
        recompensas: [{ tipo: 'pv', n: 30 }],
      },
      {
        id: 'butacas', nombre: 'Sombras de las butacas', avatar: 'handsome', pokemon: 'Gengar', x: 36, y: 34, requiere: ['taquilla'],
        antes: [
          { quien: 'handsome', texto: 'Shhh… La pantalla está encendida, pero no hay nadie viendo la película.' },
          { quien: 'pk:Gengar', texto: '¡Gen-gen-gaaar!' },
          { quien: 'handsome', texto: '¡Las butacas están llenas de Pokémon siniestros y fantasma! Todos atados con la misma seda.' },
        ],
        despues: [
          { quien: 'handsome', texto: 'Al romper los hilos se calman. Alguien los usa como «extras» de su película.' },
          { quien: 'handsome', texto: 'La seda sube hacia la cabina de proyección. Ahí debe de estar el responsable.' },
        ],
        equipo: [
          { species: 'Honchkrow', item: 'Life Orb', ability: 'Moxie', nature: 'Adamant', moves: ['Brave Bird', 'Sucker Punch', 'Night Slash', 'Heat Wave'] },
          { species: 'Spiritomb', item: 'Leftovers', ability: 'Infiltrator', nature: 'Careful', moves: ['Shadow Sneak', 'Sucker Punch', 'Will-O-Wisp', 'Pain Split'] },
          { species: 'Gengar', item: 'Choice Specs', ability: 'Cursed Body', nature: 'Timid', moves: ['Shadow Ball', 'Sludge Bomb', 'Focus Blast', 'Thunderbolt'] },
          { species: 'Zoroark', item: 'Life Orb', ability: 'Illusion', nature: 'Timid', moves: ['Night Daze', 'Flamethrower', 'Focus Blast', 'Nasty Plot'] },
        ],
        recompensas: [{ tipo: 'pv', n: 40 }],
      },
      {
        id: 'cabina', nombre: 'Guardianes de la cabina', avatar: 'handsome', pokemon: 'Chandelure', x: 62, y: 64, requiere: ['butacas'],
        antes: [
          { quien: 'pk:Chandelure', texto: '¡Chandeluuure!' },
          { quien: 'handsome', texto: 'Este Chandelure hace de foco… ¡y los demás vigilan el proyector! Están rodando algo ahora mismo.' },
          { quien: 'jugador', texto: 'Tiene que ser la película de la actriz desaparecida.' },
        ],
        despues: [
          { quien: 'handsome', texto: 'En la pantalla aparece la actriz, atrapada en un plató de telarañas… y una cámara con patas la está grabando.' },
          { quien: 'handsome', texto: 'Está en la sala 3. Prepárate: lo que nos espera ahí dentro es el «director» de todo esto.' },
        ],
        equipo: [
          { species: 'Chandelure', item: 'Life Orb', ability: 'Flash Fire', nature: 'Modest', moves: ['Shadow Ball', 'Flamethrower', 'Energy Ball', 'Calm Mind'] },
          { species: 'Hydreigon', item: 'Choice Specs', ability: 'Levitate', nature: 'Timid', moves: ['Dark Pulse', 'Draco Meteor', 'Flamethrower', 'U-turn'] },
          { species: 'Dusknoir', item: 'Leftovers', ability: 'Frisk', nature: 'Adamant', moves: ['Poltergeist', 'Shadow Sneak', 'Earthquake', 'Will-O-Wisp'] },
          { species: 'Umbreon', item: 'Leftovers', ability: 'Synchronize', nature: 'Calm', moves: ['Foul Play', 'Wish', 'Protect', 'Yawn'] },
          { species: 'Mimikyu', item: 'Life Orb', ability: 'Disguise', nature: 'Jolly', moves: ['Play Rough', 'Shadow Claw', 'Shadow Sneak', 'Swords Dance'] },
        ],
        recompensas: [{ tipo: 'pv', n: 50 }],
      },
      {
        id: 'aracamara', nombre: 'Director Aracamara', avatar: 'handsome', pokemon: 'Aracamara', x: 82, y: 28, requiere: ['cabina'], jefe: true,
        // Jefe de incursión: PS ×4, resto ×1,3, barra de 3 tramos, Telón de 1 turno, sin límite de turnos
        // (turnos: 0 = sin límite). El jefe nunca usa Dinamax, Teracristal, Mega ni Z.
        incursion: { hp: 4, stats: 1.3, tramos: 3, escudo: 1, turnos: 0 },
        antes: [
          { quien: 'handsome', texto: '¡Ahí está! Un Aracamara gigante… ¡grabando con su propia cámara de seda!' },
          { quien: 'pk:Aracamara', texto: '¡Arac… ¡ACCIÓN!' },
          { quien: 'handsome', texto: 'La actriz está atrapada en el plató. ¡Hay que pararle antes de que acabe su película!' },
        ],
        despues: [
          { quien: 'modelo', nombre: 'Actriz', texto: '¡Gracias! Llevaba días atrapada repitiendo la misma escena una y otra vez…' },
          { quien: 'handsome', texto: 'Caso cerrado. Los Pokémon del cine vuelven a ser libres y la actriz está a salvo.' },
          { quien: 'handsome', texto: 'Buen trabajo, compañero. Quédate con mi foto para el álbum… y con esos dos bichos de la cámara: parece que te han cogido cariño.' },
        ],
        equipo: [
          { species: 'Aracamara', ability: 'Cursed Body', nature: 'Timid', evs: { hp: 84, def: 84, spa: 252, spd: 84, spe: 4 }, moves: ['Proyección Maldita', 'Shadow Ball', 'Bug Buzz', 'Quiver Dance'] },
        ],
        recompensas: [
          { tipo: 'avatar', id: 'handsome' },
          { tipo: 'pokemon', especies: ['Cineret', 'Aracamara'] },
          { tipo: 'fondo', id: 'cine' },
          { tipo: 'titulo', id: 'cazafantasmas' },
        ],
      },
    ],
  },
];

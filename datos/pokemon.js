/* =============================================================================
 *  POKÉMON PERSONALIZADOS
 * =============================================================================
 *  Este archivo se puede editar con cualquier editor de texto (Bloc de notas,
 *  VS Code...). No hace falta compilar nada: guarda, sube a GitHub y listo.
 *
 *  Cada Pokémon es un bloque { ... } con estos campos:
 *
 *    nombre      Nombre tal cual aparece en el juego.
 *    base        (opcional) Si es una versión de un Pokémon que ya existe
 *                (por ejemplo "Lapras"), se pone aquí su nombre oficial en
 *                inglés. Hereda TODO del original (stats, habilidades,
 *                movimientos...) salvo lo que cambies aquí abajo.
 *                Tu versión se añade como una FORMA NUEVA (p. ej. "Lapras-Custom")
 *                y el Lapras original sigue existiendo.
 *    tipos       Lista de 1 o 2 tipos en inglés: Normal, Fire, Water, Grass,
 *                Electric, Ice, Fighting, Poison, Ground, Flying, Psychic,
 *                Bug, Rock, Ghost, Dragon, Dark, Steel, Fairy.
 *    stats       [PS, Ataque, Defensa, At. Esp, Def. Esp, Velocidad]
 *    habilidades Lista de 1 o 2 habilidades normales (nombre en inglés, o el
 *                nombre de una habilidad personalizada de habilidades.js).
 *    oculta      Habilidad oculta (opcional).
 *    movimientos Movimientos que puede aprender (nombre en inglés o de
 *                movimientos.js). Si tiene "base", se SUMAN a los del original.
 *                Las preevoluciones pasan sus movimientos a las evoluciones
 *                automáticamente.
 *    preevo      Nombre del Pokémon del que evoluciona (opcional).
 *    peso        En kg (afecta a Patada Baja, Golpe Calor...).
 *    sprite      Nombre del archivo en sprites/custom/front/ (sin .png).
 *
 *  ⚠ Los datos marcados como PROVISIONAL se han inventado para poder jugar ya.
 *    Cámbialos cuando quieras.
 * ========================================================================== */

// Nombre de la forma que reciben tus versiones de Pokémon existentes
// (Lapras -> "Lapras-Custom"). Si lo cambias, los equipos ya guardados con
// esas formas tendrán que volver a elegir el Pokémon.
window.FORMA_PERSONALIZADA = 'Custom';

// --- Listas de movimientos compartidas (para no repetir) ---------------------
const MOV_FANTASMA = ['Shadow Ball', 'Hex', 'Will-O-Wisp', 'Night Shade', 'Curse', 'Confuse Ray',
  'Shadow Sneak', 'Shadow Claw', 'Poltergeist', 'Phantom Force', 'Pain Split', 'Destiny Bond', 'Spite'];
const MOV_DRAGON = ['Dragon Pulse', 'Draco Meteor', 'Dragon Claw', 'Outrage', 'Dragon Rush',
  'Breaking Swipe', 'Dragon Tail', 'Dragon Breath', 'Scale Shot', 'Dragon Dance'];
const MOV_HADA = ['Moonblast', 'Dazzling Gleam', 'Draining Kiss', 'Play Rough', 'Misty Terrain',
  'Charm', 'Sweet Kiss', 'Disarming Voice', 'Alluring Voice'];
const MOV_PLANTA = ['Giga Drain', 'Energy Ball', 'Leaf Storm', 'Seed Bomb', 'Leech Seed', 'Synthesis',
  'Bullet Seed', 'Trailblaze', 'Grassy Glide', 'Magical Leaf', 'Solar Beam', 'Grassy Terrain'];
const MOV_SINIESTRO = ['Knock Off', 'Sucker Punch', 'Crunch', 'Dark Pulse', 'Foul Play', 'Taunt',
  'Throat Chop', 'Snarl', 'Night Slash', 'Thief', 'Nasty Plot'];
const MOV_COMUNES = ['Protect', 'Substitute', 'Rest', 'Sleep Talk', 'Facade', 'Tera Blast',
  'Endure', 'Hyper Beam', 'Giga Impact', 'Helping Hand'];
const MOV_REGI = ['Explosion', 'Zap Cannon', 'Lock-On', 'Hyper Beam', 'Ancient Power', 'Stomp',
  'Curse', 'Iron Defense', 'Body Press', 'Superpower', 'Hammer Arm', 'Earthquake', 'Rock Slide',
  'Stealth Rock', 'Thunder Wave', 'Charge Beam', 'Focus Blast', 'Rock Tomb', 'Bulldoze',
  'Amnesia', 'Brick Break', 'Thunder Punch', 'Ice Punch', 'Drain Punch', 'Trick Room', 'Rest',
  'Protect', 'Substitute', 'Facade', 'Tera Blast', 'Giga Impact', 'Sleep Talk', 'Double-Edge',
  'Swagger', 'Block', 'Hyper Voice'];

window.DATOS_POKEMON = [

  // ===== Beldum · Metang · Metagross (Agua/Roca) =============================
  // Stats originales. Habilidades y movimientos de Agua/Roca: PROVISIONAL.
  { nombre: 'Beldum', base: 'Beldum', tipos: ['Water', 'Rock'],
    habilidades: ['Clear Body', 'Solid Rock'], oculta: 'Swift Swim',
    movimientos: ['Aqua Jet', 'Rock Throw', 'Water Gun', 'Rock Polish'],
    sprite: 'BELDUM' },
  { nombre: 'Metang', base: 'Metang', tipos: ['Water', 'Rock'],
    habilidades: ['Clear Body', 'Solid Rock'], oculta: 'Swift Swim',
    movimientos: ['Aqua Jet', 'Liquidation', 'Waterfall', 'Rock Slide', 'Rock Blast', 'Rock Polish',
      'Stealth Rock', 'Surf', 'Power Gem', 'Rain Dance', 'Aqua Tail', 'Smack Down'],
    sprite: 'METANG' },
  { nombre: 'Metagross', base: 'Metagross', tipos: ['Water', 'Rock'],
    habilidades: ['Clear Body', 'Solid Rock'], oculta: 'Swift Swim',
    movimientos: ['Wave Crash', 'Stone Edge', 'Head Smash', 'Hydro Pump', 'Accelerock', 'Meteor Beam'],
    sprite: 'METAGROSS' },
  // Megaevolución con la Metagrossita X
  { nombre: 'Metagross-Mega-X', base: 'Metagross-Mega', tipos: ['Water', 'Rock'],
    stats: [80, 145, 150, 105, 110, 110], habilidades: ['Tough Claws'],
    megaPiedra: 'Metagrossita X', sprite: 'MEGA METAGROSS' },

  // ===== Cineret · Aracamara (Bicho/Fantasma) — PROVISIONAL ====================
  { nombre: 'Cineret', tipos: ['Bug', 'Ghost'], stats: [50, 50, 45, 70, 50, 65],
    habilidades: ['Frisk', 'Compound Eyes'], oculta: 'Cursed Body', peso: 6,
    movimientos: ['Bug Bite', 'String Shot', 'Astonish', 'Flash', 'Infestation', 'Night Shade',
      'Confuse Ray', 'Sticky Web', 'Spider Web', 'Hex', 'Shadow Ball', 'Bug Buzz', 'Leech Life',
      'Lunge', 'Pounce', 'Will-O-Wisp', 'Light Screen', 'Reflect', 'Thunder Wave', 'Toxic Thread',
      'Tri Attack', 'Charge Beam', 'Signal Beam', 'Silver Wind', 'Flash Cannon', 'U-turn',
      'Shadow Sneak', 'Disable', 'Mean Look', ...MOV_COMUNES],
    sprite: 'CINERET' },
  { nombre: 'Aracamara', tipos: ['Bug', 'Ghost'], stats: [70, 70, 75, 115, 85, 100], preevo: 'Cineret',
    habilidades: ['Frisk', 'Compound Eyes'], oculta: 'Cursed Body', peso: 48,
    movimientos: ['Poltergeist', 'Phantom Force', 'Quiver Dance', 'Dazzling Gleam', 'Power Gem',
      'Mirror Shot', 'Psybeam', 'Shadow Ball', 'Energy Ball', 'Dark Pulse', 'Snipe Shot'],
    sprite: 'ARACAMARA' },

  // ===== Delibird (Planta) · Wickbird (Planta/Siniestro) ======================
  { nombre: 'Delibird', base: 'Delibird', tipos: ['Grass'],
    habilidades: ['Leaf Guard', 'Hustle'], oculta: 'Pickup',
    movimientos: ['Present', 'Leafage', 'Razor Leaf', 'Bullet Seed', 'Seed Bomb', 'Leech Seed',
      'Trailblaze', 'Grassy Glide', 'Thief', 'Covet', 'Synthesis'],
    sprite: 'DELIBIRD' },
  { nombre: 'Wickbird', tipos: ['Grass', 'Dark'], stats: [85, 115, 75, 70, 75, 105], preevo: 'Delibird',
    habilidades: ['Pickpocket', 'Hustle'], oculta: 'Magician', peso: 38,
    movimientos: ['Leaf Blade', 'Wood Hammer', 'Power Whip', 'Brave Bird', 'Drill Peck', 'Knock Off',
      'Sucker Punch', 'Throat Chop', 'Night Slash', 'Foul Play', 'Parting Shot', 'Taunt', 'Fake Out',
      'Swords Dance', 'U-turn', 'Drain Punch', 'Spiky Shield', 'Bounce', 'Switcheroo', 'Trick',
      'Snatch', 'Beat Up', 'Lash Out', 'Kowtow Cleave', 'Roost', ...MOV_PLANTA],
    sprite: 'WICKBIRD' },

  // ===== Diglett · Dugtrio (Fantasma/Tierra) ==================================
  { nombre: 'Diglett', base: 'Diglett', tipos: ['Ghost', 'Ground'],
    habilidades: ['Arena Trap', 'Cursed Body'], oculta: 'Sand Force',
    movimientos: ['Astonish', 'Shadow Sneak', 'Shadow Claw', 'Hex', 'Will-O-Wisp', 'Night Shade',
      'Curse', 'Destiny Bond', 'Spite', 'Confuse Ray'],
    sprite: 'DIGLETT' },
  { nombre: 'Dugtrio', base: 'Dugtrio', tipos: ['Ghost', 'Ground'],
    habilidades: ['Arena Trap', 'Cursed Body'], oculta: 'Sand Force',
    movimientos: ['Poltergeist', 'Phantom Force', 'Shadow Ball', 'Spirit Shackle', 'Pain Split'],
    sprite: 'DUGTRIO' },

  // ===== Eeveeluciones nuevas — PROVISIONAL (525 de total, como las oficiales) =
  { nombre: 'Dracoreon', tipos: ['Dragon'], stats: [75, 60, 65, 125, 95, 105], preevo: 'Eevee',
    habilidades: ['Marvel Scale'], oculta: "Dragon's Maw", peso: 30,
    movimientos: [...MOV_DRAGON, 'Flamethrower', 'Thunderbolt', 'Ice Beam', 'Calm Mind', 'Recover',
      'Hydro Pump', 'Dragon Cheer', 'Twister', 'Clanging Scales', 'Aqua Tail', 'Hyper Voice', 'Glare'],
    sprite: 'DRACOREON' },
  { nombre: 'Heroeon', tipos: ['Flying'], stats: [65, 120, 65, 60, 85, 130], preevo: 'Eevee',
    habilidades: ['Justified'], oculta: 'Super Luck', peso: 26,
    movimientos: ['Brave Bird', 'Acrobatics', 'Dual Wingbeat', 'Aerial Ace', 'Fly', 'Bounce',
      'Roost', 'Tailwind', 'Defog', 'Close Combat', 'Mach Punch', 'Drain Punch', 'Bulk Up',
      'Swords Dance', 'U-turn', 'Extreme Speed', 'Quick Attack', 'Thunder Punch', 'Ice Punch',
      'Fire Punch', 'Sky Uppercut', 'Air Slash', 'Wing Attack', 'Steel Wing', 'Iron Head',
      'Follow Me', 'Wide Guard'],
    sprite: 'HEROEON' },
  { nombre: 'Justeon', tipos: ['Steel'], stats: [95, 130, 110, 60, 65, 65], preevo: 'Eevee',
    habilidades: ['Steadfast'], oculta: 'Sharpness', peso: 42,
    movimientos: ['Iron Head', 'Smart Strike', 'Sacred Sword', 'Megahorn', 'Heavy Slam',
      'Iron Defense', 'Swords Dance', 'Close Combat', 'Drill Run', 'Horn Attack', 'Fury Attack',
      'Bullet Punch', 'King\'s Shield', 'Steel Beam', 'Metal Claw', 'Gyro Ball', 'Body Press',
      'Stealth Rock', 'Wild Charge', 'Behemoth Blade', 'Head Smash', 'Agility', 'Leaf Blade',
      'Psycho Cut', 'Night Slash', 'Aqua Cutter'],
    sprite: 'JUSTEON' },
  { nombre: 'Magiceon', tipos: ['Fairy'], stats: [65, 60, 65, 130, 110, 95], preevo: 'Eevee',
    habilidades: ['Magician'], oculta: 'Magic Guard', peso: 24,
    movimientos: [...MOV_HADA, 'Calm Mind', 'Psychic', 'Psyshock', 'Shadow Ball', 'Mystical Fire',
      'Energy Ball', 'Magic Coat', 'Magic Room', 'Trick', 'Trick Room', 'Wish', 'Moonlight',
      'Fleur Cannon', 'Light Screen', 'Reflect', 'Thunderbolt', 'Focus Blast', 'Stored Power',
      'Expanding Force', 'Spirit Break'],
    sprite: 'MAGICEON' },
  { nombre: 'Scorpeon', tipos: ['Poison'], stats: [65, 115, 110, 60, 95, 80], preevo: 'Eevee',
    habilidades: ['Poison Point'], oculta: 'Merciless', peso: 28,
    movimientos: ['Poison Jab', 'Cross Poison', 'Gunk Shot', 'Toxic', 'Toxic Spikes', 'Poison Tail',
      'X-Scissor', 'Leech Life', 'Knock Off', 'Sucker Punch', 'Swords Dance', 'Earthquake',
      'Dig', 'Iron Tail', 'Night Slash', 'Pin Missile', 'Venoshock', 'Baneful Bunker',
      'Mortal Spin', 'Barb Barrage', 'Dire Claw', 'Crabhammer', 'Recover', 'Sludge Bomb'],
    sprite: 'SCORPEON' },
  { nombre: 'Spectreon', tipos: ['Ghost'], stats: [65, 60, 80, 120, 110, 90], preevo: 'Eevee',
    habilidades: ['Cursed Body'], oculta: 'Infiltrator', peso: 3,
    movimientos: [...MOV_FANTASMA, 'Calm Mind', 'Dark Pulse', 'Psychic', 'Nasty Plot', 'Ominous Wind',
      'Moongeist Beam', 'Infernal Parade', 'Moonlight', 'Haze', 'Mean Look', 'Perish Song',
      'Trick', 'Grudge', 'Bitter Malice'],
    sprite: 'SPECTREON' },

  // ===== Draglett · Dragtrio (Dragón) — PROVISIONAL ===========================
  { nombre: 'Draglett', tipos: ['Dragon'], stats: [25, 70, 30, 40, 45, 100],
    habilidades: ['Arena Trap', 'Rough Skin'], oculta: 'Sand Force', peso: 1,
    movimientos: [...MOV_DRAGON, 'Dig', 'Earthquake', 'Mud-Slap', 'Sand Attack', 'Scratch',
      'Sucker Punch', 'Rock Slide', 'Stone Edge', 'Stealth Rock', 'Fire Fang', 'Bite',
      'Earth Power', 'Sandstorm', 'Slash', 'Memento', 'Fissure', 'Rock Tomb', 'Bulldoze', 'Twister',
      ...MOV_COMUNES],
    sprite: 'DRAGLETT' },
  { nombre: 'Dragtrio', tipos: ['Dragon'], stats: [50, 110, 60, 60, 75, 120], preevo: 'Draglett',
    habilidades: ['Arena Trap', 'Rough Skin'], oculta: 'Sand Force', peso: 40,
    movimientos: ['Tri Attack', 'Dragon Energy', 'Glaive Rush', 'Scale Shot', 'Swords Dance',
      'Headlong Rush', 'Iron Head'],
    sprite: 'DRAGTRIO' },

  // ===== Paradojas — PROVISIONAL ===========================================
  { nombre: 'Espina Feroz', tipos: ['Electric', 'Fighting'], stats: [80, 125, 70, 90, 75, 130],
    habilidades: ['Protosynthesis'], peso: 15,
    movimientos: ['Wild Charge', 'Close Combat', 'Drain Punch', 'Thunder Punch', 'Mach Punch',
      'Bulk Up', 'Plasma Fists', 'Supercell Slam', 'Knock Off', 'U-turn', 'Volt Switch', 'Nuzzle',
      'Thunder Wave', 'Brick Break', 'Low Kick', 'Coaching', 'Thunderbolt', 'Focus Blast',
      'Aura Sphere', 'Vacuum Wave', 'Spikes', 'Pin Missile', 'Super Fang', 'Spark', 'Quick Attack',
      'Electric Terrain', 'Rapid Spin', 'Upper Hand', 'Swords Dance', 'Earthquake', ...MOV_COMUNES],
    sprite: 'ESPINA FEROZ' },
  { nombre: 'Ferroantena', tipos: ['Electric', 'Steel'], stats: [75, 70, 95, 125, 100, 105],
    habilidades: ['Quark Drive'], peso: 30,
    movimientos: ['Thunderbolt', 'Thunder', 'Flash Cannon', 'Volt Switch', 'Discharge',
      'Parabolic Charge', 'Nuzzle', 'Thunder Wave', 'Steel Beam', 'Iron Head', 'Magnet Rise',
      'Electro Ball', 'Rising Voltage', 'Electric Terrain', 'Dazzling Gleam', 'Draining Kiss',
      'Super Fang', 'Charge Beam', 'Gyro Ball', 'Metal Sound', 'Zap Cannon', 'Electroweb',
      'Eerie Impulse', 'Shift Gear', 'Thunderclap', 'Tachyon Cutter', 'Calm Mind', 'Agility',
      'Charge', 'Light Screen', 'Reflect', 'U-turn', ...MOV_COMUNES],
    sprite: 'FERROANTENA' },

  // ===== Iniciales — PROVISIONAL ============================================
  // Fuego: Gasger · Vaporaxt · Hazmadger
  { nombre: 'Gasger', tipos: ['Fire'], stats: [44, 60, 42, 58, 45, 60],
    habilidades: ['Blaze'], oculta: 'Corrosion', peso: 7,
    movimientos: ['Ember', 'Scratch', 'Smokescreen', 'Fire Fang', 'Flame Charge', 'Flamethrower',
      'Fire Blast', 'Flare Blitz', 'Will-O-Wisp', 'Bite', 'Crunch', 'Dig', 'Fury Swipes',
      'Smog', 'Poison Gas', 'Clear Smog', 'Sludge Bomb', 'Sludge Wave', 'Poison Jab', 'Toxic',
      'Venoshock', 'Belch', 'Overheat', 'Heat Wave', 'Lava Plume', 'Mortal Spin', 'Toxic Spikes',
      'Haze', 'U-turn', 'Knock Off', 'Slash', 'Swords Dance', 'Earthquake', 'Super Fang',
      'Gunk Shot', 'Fire Punch', 'Burning Jealousy', 'Temper Flare', 'Malignant Chain',
      ...MOV_COMUNES],
    sprite: 'GASGER' },
  { nombre: 'Vaporaxt', tipos: ['Fire', 'Poison'], stats: [60, 78, 60, 80, 60, 67], preevo: 'Gasger',
    habilidades: ['Blaze'], oculta: 'Corrosion', peso: 25,
    movimientos: [], sprite: 'VAPORAXT' },
  { nombre: 'Hazmadger', tipos: ['Fire', 'Poison'], stats: [80, 105, 80, 110, 75, 80], preevo: 'Vaporaxt',
    habilidades: ['Blaze'], oculta: 'Corrosion', peso: 80,
    movimientos: ['Hammer Arm', 'Close Combat', 'Bulk Up', 'Shell Side Arm', 'Torch Song'],
    sprite: 'HAZMADGER' },

  // Planta: Pitalant · Pitaderm · Pitaraka
  { nombre: 'Pitalant', tipos: ['Grass'], stats: [45, 52, 50, 55, 52, 55],
    habilidades: ['Overgrow'], oculta: 'Ripen', peso: 6,
    movimientos: ['Tackle', 'Leafage', 'Growl', 'Vine Whip', 'Razor Leaf', 'Seed Bomb', 'Leaf Blade',
      'Wood Hammer', 'Horn Leech', 'Power Whip', 'Swords Dance', 'Dragon Claw', 'Dragon Rush',
      'Dragon Dance', 'Outrage', 'Dragon Tail', 'Dragon Pulse', 'Body Slam', 'Stomp', 'Earthquake',
      'Rock Slide', 'Stomping Tantrum', 'Leech Seed', 'Synthesis', 'Spiky Shield', 'Ingrain',
      'Fire Fang', 'Crunch', 'Bite', 'Iron Tail', 'Seed Bomb', 'Grassy Glide', 'Bullet Seed',
      'Energy Ball', 'Giga Drain', 'Leaf Storm', 'Draco Meteor', 'Trailblaze', 'Super Fang',
      ...MOV_COMUNES],
    sprite: 'PITALANT' },
  { nombre: 'Pitaderm', tipos: ['Grass', 'Dragon'], stats: [60, 70, 68, 70, 67, 70], preevo: 'Pitalant',
    habilidades: ['Overgrow'], oculta: 'Ripen', peso: 32, movimientos: ['Scale Shot', 'Breaking Swipe'],
    sprite: 'PITADERM' },
  { nombre: 'Pitaraka', tipos: ['Grass', 'Dragon'], stats: [85, 110, 85, 95, 80, 75], preevo: 'Pitaderm',
    habilidades: ['Overgrow'], oculta: 'Ripen', peso: 160,
    movimientos: ['Head Smash', 'Headlong Rush', 'Apple Acid', 'Grav Apple', 'Clanging Scales',
      'Frenzy Plant', 'Petal Blizzard', 'High Horsepower', 'Megahorn', 'Shed Tail'],
    sprite: 'PITARAKA' },

  // Agua: Sisagua · Serenaja · Sinfobra
  { nombre: 'Sisagua', tipos: ['Water'], stats: [45, 48, 45, 62, 55, 54],
    habilidades: ['Torrent'], oculta: 'Liquid Voice', peso: 5,
    movimientos: ['Water Gun', 'Wrap', 'Growl', 'Bubble Beam', 'Water Pulse', 'Aqua Ring',
      'Surf', 'Hydro Pump', 'Scald', 'Ice Beam', 'Blizzard', 'Coil', 'Glare', 'Calm Mind',
      'Disarming Voice', 'Sing', 'Perish Song', 'Hyper Voice', 'Round', 'Echoed Voice',
      'Aqua Tail', 'Flip Turn', 'Rain Dance', 'Dragon Pulse', 'Haze', 'Snarl', 'Psychic',
      'Psychic Noise', 'Recover', 'Whirlpool', 'Chilling Water', 'Alluring Voice', ...MOV_COMUNES],
    sprite: 'SISAGUA' },
  { nombre: 'Serenaja', tipos: ['Water', 'Fairy'], stats: [60, 60, 60, 80, 75, 70], preevo: 'Sisagua',
    habilidades: ['Torrent'], oculta: 'Liquid Voice', peso: 22, movimientos: [...MOV_HADA],
    sprite: 'SERENAJA' },
  { nombre: 'Sinfobra', tipos: ['Water', 'Fairy'], stats: [85, 65, 80, 115, 105, 80], preevo: 'Serenaja',
    habilidades: ['Torrent'], oculta: 'Liquid Voice', peso: 55,
    movimientos: ['Sparkling Aria', 'Boomburst', 'Hydro Cannon', 'Moonlight', 'Wish', 'Quiver Dance',
      'Torch Song'],
    sprite: 'SINFOBRA' },

  // ===== Gemouse (Normal/Psíquico) — evoluciona de Tandemaus con Armadura Dorada
  { nombre: 'Gemouse', tipos: ['Normal', 'Psychic'], stats: [75, 85, 90, 80, 90, 100], preevo: 'Tandemaus',
    habilidades: ['Technician', 'Telepathy'], oculta: 'Synchronize', peso: 4,
    movimientos: ['Population Bomb', 'Tidy Up', 'Twin Beam', 'Psychic', 'Zen Headbutt', 'Psychic Fangs',
      'Psyshock', 'Calm Mind', 'Stored Power', 'Ally Switch', 'Expanding Force', 'Psychic Terrain',
      'Iron Defense', 'Double Hit', 'Dual Chop', 'Double Kick', 'Gear Grind', 'Bullet Punch',
      'Follow Me', 'Light Screen', 'Reflect', 'Trick Room', 'Psybeam', 'Esper Wing', 'Shadow Ball'],
    sprite: 'GEMOUSE' },

  // ===== Goomy · Sliggoo · Goodra (Dragón/Fantasma) ===========================
  { nombre: 'Goomy', base: 'Goomy', tipos: ['Dragon', 'Ghost'],
    habilidades: ['Gooey', 'Cursed Body'], oculta: 'Hydration',
    movimientos: ['Astonish', 'Hex', 'Night Shade', 'Will-O-Wisp', 'Curse', 'Confuse Ray', 'Shadow Ball'],
    sprite: 'GOOMY' },
  { nombre: 'Sliggoo', base: 'Sliggoo', tipos: ['Dragon', 'Ghost'],
    habilidades: ['Gooey', 'Cursed Body'], oculta: 'Hydration',
    movimientos: ['Pain Split', 'Shadow Claw', 'Shadow Sneak', 'Infernal Parade'],
    sprite: 'SLIGGOO' },
  { nombre: 'Goodra', base: 'Goodra', tipos: ['Dragon', 'Ghost'],
    habilidades: ['Gooey', 'Cursed Body'], oculta: 'Hydration',
    movimientos: ['Poltergeist', 'Phantom Force', 'Strength Sap', 'Shadow Ball'],
    sprite: 'GOODRA' },

  // ===== Grimer · Muk (solo cambia el aspecto) ================================
  { nombre: 'Grimer', base: 'Grimer', tipos: ['Poison'], sprite: 'GRIMER' },
  { nombre: 'Muk', base: 'Muk', tipos: ['Poison'], sprite: 'MUK' },

  // ===== Grimmarch (Siniestro/Dragón) — evoluciona de Morgrem con Carta Antigua
  { nombre: 'Grimmarch', tipos: ['Dark', 'Dragon'], stats: [95, 125, 75, 95, 75, 65], preevo: 'Morgrem',
    habilidades: ['Prankster', 'Intimidate'], oculta: 'Strong Jaw', peso: 65,
    movimientos: [...MOV_DRAGON, ...MOV_SINIESTRO, 'Jaw Lock', 'Psychic Fangs', 'Fire Fang',
      'Thunder Fang', 'Hammer Arm', 'Bulk Up', 'Drain Punch', 'Power Whip', 'Darkest Lariat',
      'Wicked Torque', 'Spirit Break', 'Parting Shot', 'Thunder Wave', 'Reflect', 'Light Screen'],
    sprite: 'GRIMMARCH' },

  // ===== Legendarios retipados ================================================
  { nombre: 'Ho-Oh', base: 'Ho-Oh', tipos: ['Fire', 'Dragon'],
    movimientos: [...MOV_DRAGON, 'Dragon Hammer', 'Scorching Sands'], sprite: 'HOOH' },
  { nombre: 'Lugia', base: 'Lugia', tipos: ['Dragon', 'Flying'],
    movimientos: [...MOV_DRAGON, 'Dragon Hammer'], sprite: 'LUGIA' },
  { nombre: 'Rayquaza', base: 'Rayquaza', tipos: ['Dragon', 'Flying'], sprite: 'RAYQUAZA' },
  { nombre: 'Hoopa-Lampara', base: 'Hoopa', tipos: ['Psychic', 'Ghost'], forma: 'Lampara',
    nombreForma: 'Genio Místico de la Lámpara', stats: [80, 100, 80, 140, 120, 80],
    habilidades: ['Magician'], movimientos: ['Hyperspace Hole', 'Hyperspace Fury', 'Wish', 'Poltergeist',
      'Infernal Parade', 'Bitter Malice', 'Hex', 'Will-O-Wisp', 'Lunar Blessing'],
    sprite: 'HOOPA' },
  { nombre: 'Regigigas', base: 'Regigigas', tipos: ['Dark', 'Fighting'],
    movimientos: ['Close Combat', 'Drain Punch', 'Hammer Arm', 'Knock Off', 'Darkest Lariat',
      'Sucker Punch', 'Throat Chop', 'Bulk Up', 'Crunch', 'Payback', 'Power-Up Punch', 'Mach Punch',
      'Brick Break', 'Low Kick'],
    sprite: 'REGIGIGAS' },

  // ===== Lapras (Agua/Hada, de tarta) =========================================
  { nombre: 'Lapras', base: 'Lapras', tipos: ['Water', 'Fairy'],
    habilidades: ['Water Absorb', 'Sweet Veil'], oculta: 'Hydration',
    movimientos: [...MOV_HADA, 'Decorate', 'Wish', 'Moonlight', 'Calm Mind', 'Aromatic Mist',
      'Sparkling Aria'],
    sprite: 'LAPRAS' },

  // ===== Malichamp (Lucha/Siniestro) — evoluciona de Machoke con Carta Antigua
  { nombre: 'Malichamp', tipos: ['Fighting', 'Dark'], stats: [90, 130, 75, 80, 75, 75], preevo: 'Machoke',
    habilidades: ['Guts', 'No Guard'], oculta: 'Moxie', peso: 120,
    movimientos: [...MOV_SINIESTRO, 'Darkest Lariat', 'Close Combat', 'Dynamic Punch', 'Drain Punch',
      'Mach Punch', 'Bullet Punch', 'Bulk Up', 'Cross Chop', 'Knock Off', 'Power Trip', 'Fling',
      'Shadow Claw', 'Dual Chop', 'Fiery Wrath', 'Shadow Punch', 'Poltergeist', 'Upper Hand'],
    sprite: 'MALICHAMP' },

  // ===== Mercasir · Bazaardil (Normal) — PROVISIONAL ==========================
  { nombre: 'Mercasir', tipos: ['Normal'], stats: [60, 55, 50, 40, 45, 50],
    habilidades: ['Pickup', 'Frisk'], oculta: 'Cheek Pouch', peso: 3,
    movimientos: ['Tackle', 'Tail Whip', 'Pay Day', 'Thief', 'Covet', 'Bestow', 'Fling', 'Knock Off',
      'Bullet Seed', 'Body Slam', 'Super Fang', 'Stuff Cheeks', 'Bite', 'Crunch', 'Seed Bomb',
      'Tail Slap', 'Stockpile', 'Spit Up', 'Swallow', 'Recycle', 'Trick', 'Switcheroo', 'Last Resort',
      'Double-Edge', 'Endeavor', 'Belly Drum', 'Quick Attack', 'U-turn', 'Fake Out', 'Encore',
      'Bulldoze', 'Dig', 'Play Rough', 'Iron Tail', 'Teeter Dance', 'Make It Rain', ...MOV_COMUNES],
    sprite: 'MERCASIR' },
  { nombre: 'Bazaardil', tipos: ['Normal'], stats: [105, 95, 85, 60, 75, 50], preevo: 'Mercasir',
    habilidades: ['Pickup', 'Frisk'], oculta: 'Cheek Pouch', peso: 45,
    movimientos: ['Wood Hammer', 'Earthquake', 'Hyper Fang', 'Psychic Fangs', 'Gyro Ball',
      'Heavy Slam', 'Hammer Arm', 'Slack Off', 'Doodle'],
    sprite: 'BAZAARDIL' },

  // ===== Mimicott · Mantizard · Umbroraptor (Siniestro/Volador) — PROVISIONAL =
  { nombre: 'Mimicott', tipos: ['Dark', 'Flying'], stats: [40, 50, 40, 35, 35, 55],
    habilidades: ['Keen Eye', 'Super Luck'], oculta: 'Sniper', peso: 2,
    movimientos: ['Peck', 'Leer', 'Wing Attack', 'Pursuit', 'Feint Attack', 'Night Slash',
      'Brave Bird', 'Sucker Punch', 'Knock Off', 'Dual Wingbeat', 'Roost', 'U-turn', 'Tailwind',
      'Defog', 'Throat Chop', 'Acrobatics', 'Quick Attack', 'Swords Dance', 'Drill Peck',
      'Aerial Ace', 'Pluck', 'Assurance', 'Taunt', 'Torment', 'X-Scissor', 'Leaf Blade',
      'Dragon Claw', 'Bite', 'Crunch', 'Steel Wing', 'Hurricane', 'Air Slash', 'Dark Pulse',
      ...MOV_COMUNES],
    sprite: 'MIMICOTT' },
  { nombre: 'Mantizard', tipos: ['Dark', 'Flying'], stats: [60, 75, 55, 45, 50, 80], preevo: 'Mimicott',
    habilidades: ['Keen Eye', 'Super Luck'], oculta: 'Sniper', peso: 18,
    movimientos: ['Slash', 'Fury Cutter', 'Air Cutter'], sprite: 'MANTIZARD' },
  { nombre: 'Umbroraptor', tipos: ['Dark', 'Flying'], stats: [80, 115, 75, 60, 70, 105], preevo: 'Mantizard',
    habilidades: ['Big Pecks', 'Moxie'], oculta: 'Sniper', peso: 55,
    movimientos: ['Kowtow Cleave', 'Beak Blast', 'Bulk Up', 'Close Combat', 'Bleakwind Storm'],
    sprite: 'UMBRORAPTOR' },

  // ===== Pichu · Pikachu · Raichu (Planta) ====================================
  { nombre: 'Pichu', base: 'Pichu', tipos: ['Grass'],
    habilidades: ['Sap Sipper'], oculta: 'Chlorophyll',
    movimientos: ['Leafage', 'Vine Whip', 'Razor Leaf', 'Magical Leaf', 'Leech Seed', 'Bullet Seed',
      'Seed Bomb', 'Energy Ball', 'Giga Drain', 'Grassy Glide', 'Trailblaze', 'Synthesis'],
    sprite: 'PICHU' },
  { nombre: 'Pikachu', base: 'Pikachu', tipos: ['Grass'],
    habilidades: ['Sap Sipper'], oculta: 'Chlorophyll',
    movimientos: ['Leaf Blade', 'Leaf Storm', 'Solar Beam', 'Grassy Terrain'], sprite: 'PIKACHU' },
  { nombre: 'Raichu', base: 'Raichu', tipos: ['Grass'],
    habilidades: ['Sap Sipper'], oculta: 'Chlorophyll',
    movimientos: ['Wood Hammer', 'Horn Leech', 'Power Whip', 'Superpower', 'Swords Dance', 'Spiky Shield'],
    sprite: 'RAICHU' },

  // ===== Regis nuevos — PROVISIONAL (580 de total, como los oficiales) ========
  { nombre: 'Regigold', tipos: ['Steel'], stats: [80, 120, 150, 75, 105, 50],
    habilidades: ['Clear Body'], oculta: 'Good as Gold', peso: 300,
    movimientos: [...MOV_REGI, 'Iron Head', 'Heavy Slam', 'Gyro Ball', 'Make It Rain', 'Flash Cannon',
      'Meteor Mash', 'Bullet Punch', 'Metal Burst', 'Iron Tail', 'Steel Roller', 'Pay Day', 'Gigaton Hammer'],
    sprite: 'REGIGOLD' },
  { nombre: 'Regijewel', tipos: ['Fairy'], stats: [80, 60, 110, 140, 140, 50],
    habilidades: ['Clear Body'], oculta: 'Mirror Armor', peso: 160,
    movimientos: [...MOV_REGI, ...MOV_HADA, 'Power Gem', 'Diamond Storm', 'Meteor Beam', 'Calm Mind',
      'Reflect', 'Light Screen', 'Rock Polish', 'Moonlight', 'Psychic', 'Flash Cannon', 'Ice Beam'],
    sprite: 'REGIJEWEL' },
  { nombre: 'Regiloon', tipos: ['Flying'], stats: [80, 110, 80, 90, 80, 140],
    habilidades: ['Clear Body'], oculta: 'Aerilate', peso: 1,
    movimientos: [...MOV_REGI, 'Air Slash', 'Hurricane', 'Acrobatics', 'Brave Bird', 'Bounce',
      'Tailwind', 'Self-Destruct', 'Extreme Speed', 'Quick Attack', 'Fly', 'Defog', 'Roost',
      'Body Slam', 'Return', 'Boomburst', 'Wild Charge', 'Volt Switch', 'U-turn', 'Agility',
      'Swords Dance', 'Belly Drum'],
    sprite: 'REGILOON' },
  { nombre: 'Regisage', tipos: ['Psychic'], stats: [80, 50, 100, 150, 150, 50],
    habilidades: ['Clear Body'], oculta: 'Psychic Surge', peso: 210,
    movimientos: [...MOV_REGI, 'Psychic', 'Psyshock', 'Future Sight', 'Calm Mind', 'Expanding Force',
      'Shadow Ball', 'Energy Ball', 'Thunderbolt', 'Ice Beam', 'Stored Power', 'Cosmic Power',
      'Psychic Terrain', 'Flash Cannon', 'Dark Pulse', 'Psycho Boost', 'Lunar Blessing',
      'Light Screen', 'Reflect', 'Magic Coat', 'Teleport'],
    sprite: 'REGISAGE' },
  { nombre: 'Regiturm', tipos: ['Grass'], stats: [100, 125, 115, 50, 110, 80],
    habilidades: ['Clear Body'], oculta: 'Grassy Surge', peso: 400,
    movimientos: [...MOV_REGI, 'Wood Hammer', 'Horn Leech', 'Seed Bomb', 'Leech Seed', 'Strength Sap',
      'Spiky Shield', 'Ingrain', 'Grassy Glide', 'Power Whip', 'High Horsepower', 'Synthesis',
      'Swords Dance', 'Stone Edge', 'Head Smash', 'Bullet Seed', 'Giga Drain'],
    sprite: 'REGITURM' },

  // ===== Secgyem · Hexgyem (Psíquico → Psíquico/Siniestro) — PROVISIONAL ======
  { nombre: 'Secgyem', base: 'Elgyem', nuevo: true, tipos: ['Psychic'],
    habilidades: ['Synchronize', 'Analytic'], oculta: 'Cursed Body',
    movimientos: ['Dark Pulse', 'Nasty Plot', 'Snarl', 'Foul Play', 'Knock Off', 'Hex', 'Night Shade'],
    sprite: 'SECGYEM' },
  { nombre: 'Hexgyem', tipos: ['Psychic', 'Dark'], stats: [75, 65, 75, 125, 95, 60], preevo: 'Secgyem',
    habilidades: ['Synchronize', 'Analytic'], oculta: 'Cursed Body', peso: 34,
    movimientos: ['Night Daze', 'Fiery Wrath', 'Shadow Ball', 'Psychic Noise', 'Trick Room',
      'Calm Mind', 'Lunar Dance', 'Sucker Punch', 'Bitter Malice', 'Hypnosis', 'Dream Eater', 'Nightmare'],
    sprite: 'HEXGYEM' },

  // ===== Somnulo · Somnovel · Somnistera / Somnumbra — PROVISIONAL ============
  { nombre: 'Somnulo', tipos: ['Normal', 'Psychic'], stats: [55, 40, 50, 55, 55, 45],
    habilidades: ['Fluffy', 'Forewarn'], oculta: 'Sweet Veil', peso: 5,
    movimientos: ['Tackle', 'Growl', 'Confusion', 'Hypnosis', 'Sing', 'Yawn', 'Rest', 'Sleep Talk',
      'Snore', 'Dream Eater', 'Psychic', 'Psyshock', 'Psybeam', 'Calm Mind', 'Cotton Guard',
      'Cotton Spore', 'Body Slam', 'Hyper Voice', 'Moonlight', 'Psychic Terrain', 'Zen Headbutt',
      'Shadow Ball', 'Heal Bell', 'Wish', 'Thunder Wave', 'Light Screen', 'Reflect', 'Trick Room',
      'Future Sight', 'Stored Power', 'Draining Kiss', 'Hex', ...MOV_COMUNES],
    sprite: 'SOMNULO' },
  { nombre: 'Somnovel', tipos: ['Normal', 'Psychic'], stats: [75, 55, 70, 80, 75, 55], preevo: 'Somnulo',
    habilidades: ['Fluffy', 'Forewarn'], oculta: 'Sweet Veil', peso: 30,
    movimientos: ['Sueño dulce', 'Nightmare', 'Lunar Dance'], sprite: 'SOMNOVEL' },
  { nombre: 'Somnistera', tipos: ['Psychic', 'Fairy'], stats: [95, 60, 90, 115, 115, 60], preevo: 'Somnovel',
    habilidades: ['Sueño confortante'], peso: 48,
    movimientos: [...MOV_HADA, 'Lunar Blessing', 'Moonlight', 'Calm Mind', 'Expanding Force',
      'Esper Wing', 'Aromatic Mist', 'Quiver Dance'],
    sprite: 'SOMNISTERA' },
  { nombre: 'Somnumbra', tipos: ['Psychic', 'Dark'], stats: [85, 110, 80, 105, 80, 75], preevo: 'Somnovel',
    habilidades: ['Terror nocturno'], peso: 52,
    movimientos: [...MOV_SINIESTRO, 'Psychic Fangs', 'Bulk Up', 'Dark Void', 'Spirit Break',
      'Shadow Claw', 'Poltergeist', 'Hex', 'Bitter Malice', 'Night Daze', 'Psycho Cut', 'Drain Punch'],
    sprite: 'SOMNUMBRA' },

  // ===== Spheal · Sealeo · Zantoseal (Agua/Lucha) =============================
  { nombre: 'Spheal', base: 'Spheal', tipos: ['Water', 'Fighting'],
    habilidades: ['Thick Fat', 'Inner Focus'], oculta: 'Sharpness',
    movimientos: ['Rock Smash', 'Brick Break', 'Mach Punch', 'Bulk Up', 'Aqua Jet', 'Low Kick',
      'Detect', 'Liquidation', 'Drain Punch', 'Body Press', 'Flip Turn', 'Aqua Cutter', 'Razor Shell'],
    sprite: 'SPHEAL' },
  { nombre: 'Sealeo', base: 'Sealeo', tipos: ['Water', 'Fighting'],
    habilidades: ['Thick Fat', 'Inner Focus'], oculta: 'Sharpness',
    movimientos: ['Close Combat', 'Sacred Sword', 'Jet Punch', 'Wave Crash', 'Coaching'], sprite: 'SEALEO' },
  { nombre: 'Zantoseal', tipos: ['Water', 'Fighting'], stats: [110, 115, 90, 60, 85, 70], preevo: 'Sealeo',
    habilidades: ['Thick Fat', 'Inner Focus'], oculta: 'Sharpness', peso: 160,
    movimientos: ['Ceaseless Edge', 'Night Slash', 'Leaf Blade', 'Psycho Cut', 'Swords Dance',
      'Kowtow Cleave', 'X-Scissor', 'Aqua Step', 'Earthquake', 'Ice Spinner', 'Icicle Crash'],
    sprite: 'ZANTOSEAL' },

  // ===== Spiketch · Twinpick · Railspike (Fantasma/Roca) — PROVISIONAL ========
  // Twinpick evoluciona a Railspike (Ariete) si Ataque > At.Esp, o (Ballesta) si al revés.
  { nombre: 'Spiketch', tipos: ['Ghost', 'Rock'], stats: [50, 75, 70, 40, 45, 40],
    habilidades: ['Rock Head', 'Cursed Body'], oculta: 'Sharpness', peso: 12,
    movimientos: ['Rock Throw', 'Astonish', 'Rock Slide', 'Stone Edge', 'Shadow Claw', 'Shadow Sneak',
      'Poltergeist', 'Phantom Force', 'Stealth Rock', 'Spikes', 'Rock Blast', 'Dig', 'Drill Run',
      'Iron Head', 'Smack Down', 'Power Gem', 'Shadow Ball', 'Rock Polish', 'Curse', 'Will-O-Wisp',
      'Pain Split', 'Rapid Spin', 'Iron Defense', 'Stone Axe', 'Psycho Cut', 'Night Slash',
      'Earthquake', 'Bulldoze', 'Hex', 'Ancient Power', ...MOV_COMUNES],
    sprite: 'SPIKETCH' },
  { nombre: 'Twinpick', tipos: ['Ghost', 'Rock'], stats: [65, 95, 90, 60, 60, 50], preevo: 'Spiketch',
    habilidades: ['Rock Head', 'Cursed Body'], oculta: 'Sharpness', peso: 40,
    movimientos: ['Dual Chop', 'Double Hit'], sprite: 'TWINPICK' },
  { nombre: 'Railspike', tipos: ['Ghost', 'Rock'], forma: 'Ariete', stats: [80, 135, 120, 60, 80, 55],
    preevo: 'Twinpick', habilidades: ['Rock Head', 'Reckless'], oculta: 'Cursed Body', peso: 350,
    movimientos: ['Head Smash', 'Heavy Slam', 'Body Press', 'Wood Hammer', 'Head Charge',
      'Rock Wrecker', 'Wild Charge', 'Steel Roller', 'Rollout', 'Double-Edge', 'Flare Blitz'],
    sprite: 'RAILSPIKE - RAM' },
  { nombre: 'Railspike-Ballesta', tipos: ['Ghost', 'Rock'], forma: 'Ballesta', stats: [80, 60, 100, 135, 90, 65],
    preevo: 'Twinpick', habilidades: ['Sniper', 'Mega Launcher'], oculta: 'Cursed Body', peso: 300,
    movimientos: ['Meteor Beam', 'Aura Sphere', 'Dark Pulse', 'Flash Cannon', 'Earth Power',
      'Dragon Pulse', 'Snipe Shot', 'Spike Cannon', 'Focus Blast', 'Infernal Parade', 'Moongeist Beam',
      'Tachyon Cutter', 'Calm Mind'],
    sprite: 'RAILSPIKE - BOW' },

  // ===== Trubbish (Agua) · Garbodor (Agua/Fantasma) · Wishbaggon (Agua) =======
  { nombre: 'Trubbish', base: 'Trubbish', tipos: ['Water'],
    habilidades: ['Sticky Hold', 'Water Absorb'], oculta: 'Aftermath',
    movimientos: ['Water Gun', 'Water Pulse', 'Bubble Beam', 'Surf', 'Scald', 'Soak', 'Rain Dance',
      'Aqua Tail', 'Liquidation', 'Hydro Pump', 'Whirlpool', 'Chilling Water'],
    sprite: 'TRUBBISH' },
  { nombre: 'Garbodor', base: 'Garbodor', tipos: ['Water', 'Ghost'],
    habilidades: ['Stench', 'Cursed Body'], oculta: 'Aftermath',
    movimientos: [...MOV_FANTASMA, 'Wave Crash', 'Infernal Parade'], sprite: 'GARBODOR' },
  { nombre: 'Wishbaggon', tipos: ['Water'], stats: [100, 90, 95, 85, 85, 55], preevo: 'Trubbish',
    habilidades: ['Water Absorb', 'Sticky Hold'], oculta: 'Storm Drain', peso: 140,
    movimientos: ['Wave Crash', 'Jet Punch', 'Body Slam', 'Belly Drum', 'Slack Off', 'Wish',
      'Fishious Rend', 'Earthquake', 'Ice Punch', 'Stockpile', 'Swallow', 'Spit Up', 'Snipe Shot',
      'Water Spout', 'Life Dew', 'Rest', 'Sleep Talk', 'Yawn'],
    sprite: 'WISHBAGGON' },

  // ===== Wooper · Entsire (Planta/Tierra) =====================================
  { nombre: 'Wooper', base: 'Wooper', tipos: ['Grass', 'Ground'],
    habilidades: ['Sap Sipper', 'Unaware'], oculta: 'Harvest',
    movimientos: ['Leafage', 'Vine Whip', 'Leech Seed', 'Giga Drain', 'Seed Bomb', 'Synthesis',
      'Ingrain', 'Grassy Glide', 'Trailblaze', 'Energy Ball', 'Bullet Seed', 'Strength Sap'],
    sprite: 'WOOPER' },
  { nombre: 'Entsire', tipos: ['Grass', 'Ground'], stats: [130, 75, 60, 45, 100, 20], preevo: 'Wooper',
    habilidades: ['Sap Sipper', 'Unaware'], oculta: 'Harvest', peso: 223,
    movimientos: ['Wood Hammer', 'Horn Leech', 'Power Whip', 'Spiky Shield', 'Body Press', 'Recover',
      'Earthquake', 'High Horsepower', 'Stealth Rock', 'Spikes', 'Curse', 'Haze', 'Toxic',
      'Megahorn', 'Heavy Slam', 'Iron Defense', 'Amnesia', 'Slack Off', 'Grassy Terrain',
      'Leaf Storm', 'Earth Power', 'Sludge Bomb', 'Stone Edge', 'Rock Slide', 'Gunk Shot'],
    sprite: 'ENTSIRE' },

  // ===== Yamask · Greedigus (Fantasma/Siniestro) ==============================
  { nombre: 'Yamask', base: 'Yamask', tipos: ['Ghost'], sprite: 'YAMASK' },
  { nombre: 'Greedigus', tipos: ['Ghost', 'Dark'], stats: [70, 105, 110, 85, 90, 40], preevo: 'Yamask',
    habilidades: ['Pickpocket', 'Cursed Body'], oculta: 'Magician', peso: 70,
    movimientos: [...MOV_SINIESTRO, ...MOV_FANTASMA, 'Jaw Lock', 'Psychic Fangs', 'Fire Fang',
      'Ice Fang', 'Thunder Fang', 'Hyper Fang', 'Body Press', 'Iron Defense', 'Trick Room',
      'Pay Day', 'Make It Rain', 'Covet', 'Stockpile', 'Swallow', 'Spit Up', 'Gunk Shot', 'Fling'],
    sprite: 'GREEDIGUS' },
];

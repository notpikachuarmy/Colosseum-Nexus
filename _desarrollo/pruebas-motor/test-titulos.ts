// Títulos: qué cuenta cada combate ganado según el equipo
import './load-datos-node';
import * as fs from 'fs';
import * as vm from 'vm';
for (const f of ['avatares', 'economia', 'pases', 'titulos']) vm.runInThisContext(fs.readFileSync(`${import.meta.dir}/../../datos/${f}.js`, 'utf8'), {filename: f + '.js'});
import {buildMod} from '../../_codigo-fuente/mod';
buildMod();
let fails = 0;
const ok = (n: string, c: boolean) => { console.log((c ? 'OK  ' : 'FAIL') + ' ' + n); if (!c) fails++; };
const {contarCombate, regionDe, TITULOS} = await import('../../_codigo-fuente/titulos');
const c = (e: string[], extra: Partial<{rival: number, poderes: string[], deb: number, rem: boolean, ind: boolean}> = {}) =>
  contarCombate(e, extra.rival ?? 6, extra.poderes ?? [], extra.deb ?? 1, extra.rem ?? false, extra.ind ?? true);
ok('regiones: Pikachu Kanto, Raichu-Alola Alola, Lapras-Custom ninguna', regionDe('Pikachu') === 'kanto' && regionDe('Raichu-Alola') === 'alola' && regionDe('Lapras-Custom') === null);
ok('Hisui: Zorua-Hisui y Kleavor', regionDe('Zorua-Hisui') === 'hisui' && regionDe('Kleavor') === 'hisui');
ok('Paldea: Wooper-Paldea y Tinkaton', regionDe('Wooper-Paldea') === 'paldea' && regionDe('Tinkaton') === 'paldea');
const kanto = c(['Pikachu', 'Charizard', 'Gengar', 'Snorlax', 'Lapras', 'Dragonite']);
ok('equipo de Kanto: orgullo-kanto + purista, sin regional', kanto.includes('orgullo-kanto') && kanto.includes('purista') && !kanto.includes('maestro-regional'));
const mega = c(['Charizard-Mega-X', 'Pikachu']);
ok('megas cuentan para su región', mega.includes('orgullo-kanto'));
const reg = c(['Raichu-Alola', 'Ninetales-Alola', 'Weezing-Galar', 'Zoroark-Hisui', 'Lapras-Custom', 'Diglett-Custom']);
ok('formas regionales y Jagara: maestro-regional, sin purista', reg.includes('maestro-regional') && !reg.includes('purista'));
const jag = c(['Magiceon', 'Grimmarch', 'Lapras-Custom', 'Somnistera']);
ok('solo Fakemon y Jagara: orgullo-jagara', jag.includes('orgullo-jagara') && !jag.some(k => k.startsWith('orgullo-') && k !== 'orgullo-jagara'));
const mono = c(['Pikachu', 'Raichu', 'Jolteon', 'Magnezone', 'Zapdos', 'Electivire']);
ok('6 de tipo Eléctrico: monotipo', mono.includes('monotipo'));
ok('5 Pokémon no cuentan como monotipo', !c(['Pikachu', 'Raichu', 'Jolteon', 'Magnezone', 'Zapdos']).includes('monotipo'));
ok('mezcla de regiones: ningún orgullo', !c(['Pikachu', 'Chikorita']).some(k => k.startsWith('orgullo')));
ok('intocable solo 6 contra 6 individual sin bajas', c(['Pikachu', 'Raichu', 'Jolteon', 'Magnezone', 'Zapdos', 'Electivire'], {deb: 0}).includes('#intocable')
  && !c(['Pikachu', 'Raichu', 'Jolteon', 'Magnezone', 'Zapdos', 'Electivire'], {deb: 0, ind: false}).includes('#intocable')
  && !c(['Pikachu', 'Raichu', 'Jolteon', 'Magnezone', 'Zapdos', 'Electivire'], {deb: 1}).includes('#intocable'));
ok('remontada y poderes', c(['Pikachu'], {rem: true, poderes: ['mega', 'tera']}).join() .includes('#remontada') && c(['Pikachu'], {poderes: ['mega']}).includes('poder:mega'));
const ids = TITULOS.map(t => t.id);
ok(`35 títulos, sin repetir (${ids.length})`, ids.length === 35 && new Set(ids).size === ids.length);
process.exit(fails ? 1 : 0);

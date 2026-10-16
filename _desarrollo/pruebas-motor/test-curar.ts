// La barra (HUD) se actualiza al curarse el estado con una Baya Ziuela
import {Estado} from '../../_codigo-fuente/estado';
const e = new Estado('p1');
for (const l of ['|player|p1|A|', '|player|p2|B|', '|switch|p2a: Iron Valiant|Iron Valiant, L91|100/100', '|-status|p2a: Iron Valiant|slp|[from] ability: Sueño confortante|[of] p1a: Somnistera', '|-enditem|p2a: Iron Valiant|Lum Berry|[eat]', '|-curestatus|p2a: Iron Valiant|slp|[msg]'])
  e.aplicar(l);
console.log(e.lados.p2.activos[0]?.status === '' ? 'OK estado limpio' : 'FAIL ' + e.lados.p2.activos[0]?.status);

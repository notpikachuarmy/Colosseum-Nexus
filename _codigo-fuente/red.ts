import {tr} from './idioma';
// Conexión entre navegadores con PeerJS (WebRTC). Sin servidor propio.
// - Varios servidores STUN y TURN gratuitos para que conecte también en redes "difíciles".
// - Reintentos automáticos si el servidor de contacto falla.
// - Latido cada pocos segundos para detectar conexiones muertas.
// Con ?local=1 en la URL se usa BroadcastChannel (para probar en dos pestañas del mismo navegador).

export interface Canal {
  enviar(msg: any): void;
  onMensaje(cb: (msg: any) => void): void;
  onCerrar(cb: () => void): void;
  cerrar(): void;
  abierto(): boolean;
}

// Prefijo de las salas en PeerJS (distinto del de fanshowdown para que no se crucen las salas)
const PREFIJO = 'colosseumnexus-v1-';
const LETRAS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const generarCodigo = () => Array.from({length: 5}, () => LETRAS[Math.floor(Math.random() * LETRAS.length)]).join('');
const modoLocal = () => /[?&]local=1/.test(location.search);

/** Servidores para atravesar routers y cortafuegos. Los TURN reenvían el tráfico si la conexión directa falla. */
const REBOTE: any = (globalThis as any).SERVIDOR_REBOTE;
const ICE = {
  iceServers: [
    {urls: ['stun:stun.l.google.com:19302', 'stun:stun.relay.metered.ca:80']},
    {urls: 'stun:stun.cloudflare.com:3478'},
    // Servidor de rebote propio (datos/conexion.js)
    ...(REBOTE?.usuario ? [{urls: REBOTE.servidores, username: REBOTE.usuario, credential: REBOTE.contrasena}] : []),
    // Plan B gratuito y compartido
    {urls: ['turn:freestun.net:3478', 'turns:freestun.net:5349'], username: 'free', credential: 'free'},
  ],
  sdpSemantics: 'unified-plan',
};
const opcionesPeer = () => ({debug: 1, config: ICE, pingInterval: 4000});

const LATIDO_MS = 4000;
const SIN_RESPUESTA_MS = 16000;

function canalDesdeConexion(conn: any, alCerrarTodo?: () => void): Canal {
  const mensajes: ((m: any) => void)[] = [];
  const cierres: (() => void)[] = [];
  let cerrado = false;
  let ultimo = Date.now();
  const cerrar = () => {
    if (cerrado) return;
    cerrado = true;
    clearInterval(latido);
    try { conn.close(); } catch { /* */ }
    for (const c of cierres) { try { c(); } catch (e) { console.error(e); } }
  };
  const latido = setInterval(() => {
    if (cerrado) return;
    if (Date.now() - ultimo > SIN_RESPUESTA_MS) { cerrar(); return; }
    try { if (conn.open) conn.send({t: '__latido'}); } catch { /* */ }
  }, LATIDO_MS);
  conn.on('data', (d: any) => {
    ultimo = Date.now();
    if (d?.t === '__latido') return;
    if (d?.t === '__adios') { cerrar(); return; }
    for (const cb of mensajes) { try { cb(d); } catch (e) { console.error(e); } }
  });
  conn.on('close', cerrar);
  conn.on('error', cerrar);
  return {
    enviar: m => { try { if (conn.open && !cerrado) conn.send(m); } catch (e) { console.warn(e); } },
    onMensaje: cb => mensajes.push(cb),
    onCerrar: cb => cierres.push(cb),
    cerrar: () => {
      try { if (conn.open) conn.send({t: '__adios'}); } catch { /* */ }
      setTimeout(() => { cerrar(); alCerrarTodo?.(); }, 80);
    },
    abierto: () => !cerrado && conn.open,
  };
}

export interface Sala { codigo: string; cancelar(): void }

function errorRecuperable(e: any) {
  return ['network', 'server-error', 'socket-error', 'socket-closed', 'disconnected'].includes(e?.type);
}

/** Crea una sala y espera conexiones (acepta varias: para reconectar a mitad de combate). */
export function crearSala(onCodigo: (codigo: string) => void, onConexion: (c: Canal) => void, onError: (e: string) => void,
  onEstado?: (texto: string) => void): Sala {
  if (modoLocal()) return crearSalaLocal(onCodigo, onConexion);
  const Peer = (window as any).Peer;
  if (!Peer) { onError(tr('No se pudo cargar la librería de conexión (PeerJS). Revisa tu conexión a internet y recarga la página.', 'Could not load the connection library (PeerJS). Check your internet connection and reload the page.')); return {codigo: '', cancelar() {}}; }
  let peer: any = null;
  let intentos = 0;
  let cancelado = false;
  let codigo = generarCodigo();
  const sala: Sala = {codigo: '', cancelar() { cancelado = true; try { peer?.destroy(); } catch { /* */ } }};
  const intentar = () => {
    if (cancelado) return;
    peer = new Peer(PREFIJO + codigo, opcionesPeer());
    peer.on('open', () => { intentos = 0; sala.codigo = codigo; onCodigo(codigo); });
    peer.on('connection', (conn: any) => {
      conn.on('open', () => { if (!cancelado) onConexion(canalDesdeConexion(conn)); });
    });
    // Si se cae la conexión con el servidor de contacto, se recupera sin perder los combates en curso
    peer.on('disconnected', () => {
      if (cancelado || peer.destroyed) return;
      onEstado?.(tr('Reconectando con el servidor de salas…', 'Reconnecting to the room server…'));
      setTimeout(() => { try { if (!peer.destroyed) peer.reconnect(); } catch { /* */ } }, 1500);
    });
    peer.on('error', (e: any) => {
      if (cancelado) return;
      if (e.type === 'unavailable-id' && intentos++ < 6) { peer.destroy(); codigo = generarCodigo(); intentar(); return; }
      if (errorRecuperable(e) && intentos++ < 6) {
        onEstado?.(tr(`Problema con el servidor de salas, reintentando (${intentos}/6)…`, `Problem with the room server, retrying (${intentos}/6)…`));
        const espera = 1000 * Math.min(8, 2 ** intentos);
        try { peer.destroy(); } catch { /* */ }
        setTimeout(intentar, espera);
        return;
      }
      onError(traducirError(e));
    });
  };
  intentar();
  return sala;
}

/** Se une a la sala de otro jugador con su código (con reintentos). */
export function unirseSala(codigo: string, onConectado: (c: Canal) => void, onError: (e: string) => void,
  onEstado?: (texto: string) => void): Sala {
  codigo = codigo.trim().toUpperCase();
  if (modoLocal()) return unirseSalaLocal(codigo, onConectado);
  const Peer = (window as any).Peer;
  if (!Peer) { onError(tr('No se pudo cargar la librería de conexión (PeerJS). Revisa tu conexión a internet y recarga la página.', 'Could not load the connection library (PeerJS). Check your internet connection and reload the page.')); return {codigo, cancelar() {}}; }
  let peer: any = null;
  let cancelado = false;
  let conectado = false;
  let intentosServidor = 0;
  let intentosConexion = 0;
  const destruir = () => { try { peer?.destroy(); } catch { /* */ } };
  const conectar = () => {
    if (cancelado || conectado) return;
    intentosConexion++;
    onEstado?.(intentosConexion > 1 ? tr(`Conectando con la sala… (intento ${intentosConexion}/4)`, `Connecting to the room… (attempt ${intentosConexion}/4)`) : tr('Conectando con la sala…', 'Connecting to the room…'));
    const conn = peer.connect(PREFIJO + codigo, {reliable: true, serialization: 'json'});
    const t = setTimeout(() => {
      if (conectado || cancelado) return;
      try { conn.close(); } catch { /* */ }
      if (intentosConexion < 4) conectar();
      else onError(tr('No se ha podido conectar. Comprueba el código, que tu amigo siga en la sala y prueba otra vez. Si sigue fallando, probad con otra red (por ejemplo, datos del móvil).', "Couldn't connect. Check the code, make sure your friend is still in the room and try again. If it keeps failing, try another network (for example, mobile data)."));
    }, 12000);
    conn.on('open', () => {
      if (cancelado) { try { conn.close(); } catch { /* */ } return; }
      clearTimeout(t);
      conectado = true;
      onConectado(canalDesdeConexion(conn, destruir));
    });
    conn.on('error', () => { /* el temporizador decide */ });
  };
  const iniciar = () => {
    if (cancelado) return;
    peer = new Peer(undefined, opcionesPeer());
    peer.on('open', () => conectar());
    peer.on('error', (e: any) => {
      if (cancelado || conectado) return;
      if (e.type === 'peer-unavailable') { onError(traducirError(e)); return; }
      if (errorRecuperable(e) && intentosServidor++ < 5) {
        onEstado?.(tr(`Problema con el servidor de salas, reintentando (${intentosServidor}/5)…`, `Problem with the room server, retrying (${intentosServidor}/5)…`));
        destruir();
        setTimeout(iniciar, 1000 * Math.min(8, 2 ** intentosServidor));
        return;
      }
      onError(traducirError(e));
    });
  };
  iniciar();
  return {codigo, cancelar() { cancelado = true; if (!conectado) destruir(); }};
}

function traducirError(e: any): string {
  switch (e?.type) {
  case 'peer-unavailable': return tr('No existe ninguna sala con ese código (o tu amigo la ha cerrado).', "There's no room with that code (or your friend closed it).");
  case 'network': case 'server-error': case 'socket-error': case 'socket-closed': case 'disconnected':
    return tr('No se puede contactar con el servidor de salas. Revisa tu internet y vuelve a intentarlo en un momento.', "Can't reach the room server. Check your internet and try again in a moment.");
  case 'browser-incompatible': return tr('Tu navegador no permite conexiones directas (WebRTC). Prueba con Chrome, Firefox o Edge actualizados.', "Your browser doesn't allow direct connections (WebRTC). Try an up-to-date Chrome, Firefox or Edge.");
  case 'webrtc': return tr('Falló la conexión entre los dos navegadores. Algunas redes (de empresa o instituto) la bloquean: probad con otra red.', 'The connection between both browsers failed. Some networks (work or school) block it: try another network.');
  default: return tr('Error de conexión: ', 'Connection error: ') + (e?.message || e?.type || e);
  }
}

// ----------------------------------------------------- modo local (pruebas) --
function crearSalaLocal(onCodigo: (c: string) => void, onConexion: (c: Canal) => void): Sala {
  const codigo = generarCodigo();
  const bc = new BroadcastChannel('cnx-sala-' + codigo);
  bc.onmessage = ev => {
    if (ev.data?.t === '__hola__') {
      const canalId = ev.data.canal;
      bc.postMessage({t: '__ok__', canal: canalId});
      onConexion(canalLocal(canalId, 'host'));
    }
  };
  setTimeout(() => onCodigo(codigo), 50);
  return {codigo, cancelar() { bc.close(); }};
}
function unirseSalaLocal(codigo: string, onConectado: (c: Canal) => void): Sala {
  const bc = new BroadcastChannel('cnx-sala-' + codigo);
  const canalId = Math.random().toString(36).slice(2);
  bc.onmessage = ev => { if (ev.data?.t === '__ok__' && ev.data.canal === canalId) { bc.close(); onConectado(canalLocal(canalId, 'guest')); } };
  bc.postMessage({t: '__hola__', canal: canalId});
  return {codigo, cancelar() { bc.close(); }};
}
function canalLocal(id: string, rol: 'host' | 'guest'): Canal {
  const bc = new BroadcastChannel('cnx-canal-' + id);
  const mensajes: ((m: any) => void)[] = [];
  const cierres: (() => void)[] = [];
  let cerrado = false;
  const cerrarLocal = () => { if (cerrado) return; cerrado = true; for (const c of cierres) c(); try { bc.close(); } catch { /* */ } };
  bc.onmessage = ev => {
    if (ev.data?.de === rol || cerrado) return;
    if (ev.data?.cerrar) { cerrarLocal(); return; }
    for (const cb of mensajes) cb(ev.data.m);
  };
  return {
    enviar: m => { if (!cerrado) bc.postMessage({de: rol, m}); },
    onMensaje: cb => mensajes.push(cb),
    onCerrar: cb => cierres.push(cb),
    cerrar: () => { if (!cerrado) bc.postMessage({de: rol, cerrar: true}); cerrarLocal(); },
    abierto: () => !cerrado,
  };
}

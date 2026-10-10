// Conexión entre navegadores con PeerJS (WebRTC). Sin servidor propio.
// Con ?local=1 en la URL se usa BroadcastChannel (para probar en dos pestañas del mismo navegador).

export interface Canal {
  enviar(msg: any): void;
  onMensaje(cb: (msg: any) => void): void;
  onCerrar(cb: () => void): void;
  cerrar(): void;
}

const PREFIJO = 'arenafakemon-v1-';
const LETRAS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const generarCodigo = () => Array.from({length: 5}, () => LETRAS[Math.floor(Math.random() * LETRAS.length)]).join('');
const modoLocal = () => /[?&]local=1/.test(location.search);

function canalDesdeConexion(conn: any, peer: any): Canal {
  const mensajes: ((m: any) => void)[] = [];
  const cierres: (() => void)[] = [];
  let cerrado = false;
  const alCerrar = () => { if (cerrado) return; cerrado = true; for (const c of cierres) c(); };
  conn.on('data', (d: any) => { for (const cb of mensajes) cb(d); });
  conn.on('close', alCerrar);
  conn.on('error', alCerrar);
  return {
    enviar: m => { if (conn.open) conn.send(m); },
    onMensaje: cb => mensajes.push(cb),
    onCerrar: cb => cierres.push(cb),
    cerrar: () => { try { conn.close(); } catch { /* */ } try { peer?.destroy(); } catch { /* */ } alCerrar(); },
  };
}

export interface Sala { codigo: string; cancelar(): void }

/** Crea una sala y espera a que alguien se una. */
export function crearSala(onCodigo: (codigo: string) => void, onConexion: (c: Canal) => void, onError: (e: string) => void): Sala {
  if (modoLocal()) return crearSalaLocal(onCodigo, onConexion);
  const Peer = (window as any).Peer;
  if (!Peer) { onError('No se pudo cargar la librería de conexión (PeerJS). Revisa tu conexión a internet.'); return {codigo: '', cancelar() {}}; }
  let peer: any = null;
  let intentos = 0;
  const sala: Sala = {codigo: '', cancelar() { try { peer?.destroy(); } catch { /* */ } }};
  const intentar = () => {
    const codigo = generarCodigo();
    peer = new Peer(PREFIJO + codigo, {debug: 1});
    peer.on('open', () => { sala.codigo = codigo; onCodigo(codigo); });
    peer.on('connection', (conn: any) => {
      conn.on('open', () => onConexion(canalDesdeConexion(conn, peer)));
    });
    peer.on('error', (e: any) => {
      if (e.type === 'unavailable-id' && intentos++ < 5) { peer.destroy(); intentar(); return; }
      onError(traducirError(e));
    });
  };
  intentar();
  return sala;
}

/** Se une a la sala de otro jugador con su código. */
export function unirseSala(codigo: string, onConectado: (c: Canal) => void, onError: (e: string) => void): Sala {
  codigo = codigo.trim().toUpperCase();
  if (modoLocal()) return unirseSalaLocal(codigo, onConectado);
  const Peer = (window as any).Peer;
  if (!Peer) { onError('No se pudo cargar la librería de conexión (PeerJS). Revisa tu conexión a internet.'); return {codigo, cancelar() {}}; }
  const peer = new Peer(undefined, {debug: 1});
  let conectado = false;
  peer.on('open', () => {
    const conn = peer.connect(PREFIJO + codigo, {reliable: true, serialization: 'json'});
    conn.on('open', () => { conectado = true; onConectado(canalDesdeConexion(conn, peer)); });
    setTimeout(() => { if (!conectado) onError('No se ha podido conectar. Comprueba el código y que tu amigo siga en la sala.'); }, 20000);
  });
  peer.on('error', (e: any) => onError(traducirError(e)));
  return {codigo, cancelar() { try { peer.destroy(); } catch { /* */ } }};
}

function traducirError(e: any): string {
  switch (e?.type) {
  case 'peer-unavailable': return 'No existe ninguna sala con ese código (o tu amigo la ha cerrado).';
  case 'network': case 'server-error': case 'socket-error': case 'socket-closed':
    return 'No se puede contactar con el servidor de conexión. Revisa tu internet e inténtalo de nuevo.';
  case 'browser-incompatible': return 'Tu navegador no permite conexiones directas (WebRTC). Prueba con Chrome, Firefox o Edge.';
  case 'webrtc': return 'Falló la conexión directa entre los dos navegadores. Algunas redes (de empresa o instituto) la bloquean.';
  default: return 'Error de conexión: ' + (e?.message || e?.type || e);
  }
}

// ----------------------------------------------------- modo local (pruebas) --
function crearSalaLocal(onCodigo: (c: string) => void, onConexion: (c: Canal) => void): Sala {
  const codigo = generarCodigo();
  const bc = new BroadcastChannel('arena-sala-' + codigo);
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
  const bc = new BroadcastChannel('arena-sala-' + codigo);
  const canalId = Math.random().toString(36).slice(2);
  bc.onmessage = ev => { if (ev.data?.t === '__ok__' && ev.data.canal === canalId) { bc.close(); onConectado(canalLocal(canalId, 'guest')); } };
  bc.postMessage({t: '__hola__', canal: canalId});
  return {codigo, cancelar() { bc.close(); }};
}
function canalLocal(id: string, rol: 'host' | 'guest'): Canal {
  const bc = new BroadcastChannel('arena-canal-' + id);
  const mensajes: ((m: any) => void)[] = [];
  const cierres: (() => void)[] = [];
  bc.onmessage = ev => {
    if (ev.data?.de === rol) return;
    if (ev.data?.cerrar) { for (const c of cierres) c(); return; }
    for (const cb of mensajes) cb(ev.data.m);
  };
  return {
    enviar: m => bc.postMessage({de: rol, m}),
    onMensaje: cb => mensajes.push(cb),
    onCerrar: cb => cierres.push(cb),
    cerrar: () => { bc.postMessage({de: rol, cerrar: true}); bc.close(); },
  };
}

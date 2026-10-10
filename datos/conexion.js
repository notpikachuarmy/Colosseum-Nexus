/* =============================================================================
 *  SERVIDOR DE REBOTE (TURN) PARA LAS PARTIDAS ONLINE
 *  Se usa cuando dos jugadores no pueden conectarse directamente (routers
 *  estrictos, misma WiFi, datos móviles...). Cuenta gratuita de Metered:
 *  https://dashboard.metered.ca → TURN Server → Credentials
 *  Si cambias de credencial, copia aquí el nuevo usuario y contraseña.
 * ========================================================================== */
window.SERVIDOR_REBOTE = {
  usuario: '63de45277ee377e2a4b457d2',
  contrasena: '0pZLx09DZ6XHvqdk',
  servidores: [
    'turn:global.relay.metered.ca:80',
    'turn:global.relay.metered.ca:80?transport=tcp',
    'turn:global.relay.metered.ca:443',
    'turns:global.relay.metered.ca:443?transport=tcp',
  ],
};

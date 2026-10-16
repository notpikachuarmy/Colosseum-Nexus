/* =============================================================================
 *  SERVIDOR DE REBOTE (TURN) PARA LAS PARTIDAS ONLINE
 *  Se usa cuando dos jugadores no pueden conectarse directamente (routers
 *  estrictos, misma WiFi, datos móviles...). Cuenta gratuita de Metered:
 *  https://dashboard.metered.ca → TURN Server → Credentials
 *
 *  IMPORTANTE (léelo antes de cambiar nada):
 *  - Esta web no tiene servidor propio, así que este usuario y contraseña los
 *    puede ver cualquiera que abra la página. No es una contraseña de tu cuenta:
 *    solo sirve para rebotar partidas. Lo peor que puede pasar es que alguien
 *    gaste la cuota gratuita (500 MB al mes); entonces se usa el plan B gratuito.
 *  - Para que nunca haya gastos: NO añadas una tarjeta en Metered y quédate en
 *    el plan gratuito.
 *  - Si sospechas que alguien la usa: crea una credencial nueva en el panel,
 *    cópiala aquí, publica, y BORRA la antigua en el panel.
 *  - No pongas aquí nunca la clave de la API ni la contraseña de tu cuenta.
 * ========================================================================== */
window.SERVIDOR_REBOTE = {
  usuario: '30f33725cdc8932fb07feb59',
  contrasena: 'XvgcKOorcl/O88O3',
  servidores: [
    'turn:global.relay.metered.ca:80',
    'turn:global.relay.metered.ca:80?transport=tcp',
    'turn:global.relay.metered.ca:443',
    'turns:global.relay.metered.ca:443?transport=tcp',
  ],
};

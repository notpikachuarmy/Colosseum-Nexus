import JSChaCha20 from './jschacha20.js';
export class Chacha20 {
    constructor(key, nonce) { this.c = new JSChaCha20(key, nonce, 0); }
    encrypt(data) { return this.c.encrypt(data); }
}

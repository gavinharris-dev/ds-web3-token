/**
 * Loads the WASM modules
 */

class Loader {
  private _wasm!: any;
  private _wasm2!: any;
  private isBrowser = typeof window !== 'undefined';

  async load() {
    if (this._wasm && this._wasm2) return;
    /**
     * @private
     */

    this._wasm = this.isBrowser
      ? await import('@emurgo/cardano-serialization-lib-browser')
      : await import('@emurgo/cardano-serialization-lib-nodejs');

    this._wasm2 = this.isBrowser
      ? await import('@emurgo/cardano-message-signing-browser')
      : await import('@emurgo/cardano-message-signing-nodejs');
  }

  get Cardano() {
    return this._wasm;
  }

  get Message() {
    return this._wasm2;
  }
}

export default new Loader();

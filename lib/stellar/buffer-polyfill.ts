import { Buffer } from 'buffer';

// Fix 1: npm Buffer.prototype.subarray in Hermes returns Uint8Array instead of Buffer.
const _nativeSubarray = Uint8Array.prototype.subarray;
if ((Buffer.prototype as any).subarray === _nativeSubarray) {
  (Buffer.prototype as any).subarray = function (
    this: Buffer,
    begin?: number,
    end?: number,
  ): Buffer {
    const slice = _nativeSubarray.call(this, begin, end);
    return Buffer.from(slice.buffer, slice.byteOffset, slice.byteLength);
  };
}

// Fix 2 (the real fix): In Hermes, Uint8Array.toString('base64') ignores the
// encoding argument and returns comma-separated decimals like "0,0,0,7,133,...".
// This affects @stellar/js-xdr's encodeResult() in ALL bundles (dist/, lib/, src/)
// because XdrWriter.finalize() calls this._buffer.subarray() which returns a plain
// Uint8Array in Hermes (Buffer doesn't override subarray). Patching the prototype
// globally fixes it regardless of which bundle Metro loads.
const _nativeUAToString = Uint8Array.prototype.toString;
if (!(_nativeUAToString as any)._xdrPatched) {
  const _patchedToString = function (this: Uint8Array, encoding?: string): string {
    if (encoding === 'base64') {
      return Buffer.from(
        this.buffer as ArrayBuffer,
        this.byteOffset,
        this.byteLength,
      ).toString('base64');
    }
    if (encoding === 'hex') {
      return Buffer.from(
        this.buffer as ArrayBuffer,
        this.byteOffset,
        this.byteLength,
      ).toString('hex');
    }
    return _nativeUAToString.call(this);
  };
  (_patchedToString as any)._xdrPatched = true;
  (Uint8Array.prototype as any).toString = _patchedToString;
}

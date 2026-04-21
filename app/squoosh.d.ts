declare module '@squoosh/lib' {
  export class ImagePool {
    constructor(threads?: number);
    ingestImage(buffer: ArrayBuffer | Uint8Array): any;
    close(): Promise<void>;
  }
}

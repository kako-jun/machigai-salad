declare module 'upng-js' {
  export function encode(
    imgs: ArrayBufferLike[],
    w: number,
    h: number,
    cnum: number,
    dels?: number[]
  ): ArrayBuffer
}

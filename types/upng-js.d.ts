declare module 'upng-js' {
  /** Encode an animated PNG (APNG) from raw RGBA frames. */
  function encode(
    /** Array of ArrayBuffer, each containing RGBA pixel data */
    imgs: ArrayBuffer[],
    /** Width in pixels */
    w: number,
    /** Height in pixels */
    h: number,
    /** Color depth: 0 = lossless, 256 = max palette size for lossy */
    cnum: number,
    /** Array of delays in ms for each frame */
    dels: number[],
    /** Optional: object with `loop` (0=infinite) */
    opts?: { loop?: number }
  ): ArrayBuffer

  function decode(buf: ArrayBuffer): {
    width: number
    height: number
    frames: { data: ArrayBuffer; delay: number }[]
  }

  function toRGBA8(img: ReturnType<typeof decode>): ArrayBuffer[]
}

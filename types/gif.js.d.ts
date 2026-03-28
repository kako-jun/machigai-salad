declare module 'gif.js' {
  interface GIFOptions {
    workers?: number
    quality?: number
    width?: number
    height?: number
    workerScript?: string
    repeat?: number // 0 = infinite loop, -1 = no repeat
    transparent?: string | null
    background?: string
    dither?: boolean | string
    debug?: boolean
  }

  interface FrameOptions {
    delay?: number // ms
    copy?: boolean
    dispose?: number
  }

  class GIF {
    constructor(options?: GIFOptions)
    addFrame(
      image: CanvasRenderingContext2D | ImageData | HTMLCanvasElement | HTMLImageElement,
      options?: FrameOptions
    ): void
    on(event: 'finished', callback: (blob: Blob) => void): this
    on(event: 'progress', callback: (progress: number) => void): this
    on(event: 'start' | 'abort', callback: () => void): this
    render(): void
    abort(): void
    running: boolean
  }

  export default GIF
}

declare const parser: {
    onParseReady: ((file: any, error: string | null) => void) | null
    loadBlendFromArrayBuffer(buffer: ArrayBuffer, name?: string): void
}
export default parser

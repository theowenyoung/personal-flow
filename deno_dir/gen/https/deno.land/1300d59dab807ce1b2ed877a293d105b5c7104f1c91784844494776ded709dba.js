export const osType = (() => {
    if (globalThis.Deno != null) {
        return Deno.build.os;
    }
    const navigator = globalThis.navigator;
    if (navigator?.appVersion?.includes?.("Win") ?? false) {
        return "windows";
    }
    return "linux";
})();
export const isWindows = osType === "windows";
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoib3MuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyJvcy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFHQSxNQUFNLENBQUMsTUFBTSxNQUFNLEdBQUcsQ0FBQyxHQUFHLEVBQUU7SUFDMUIsSUFBSSxVQUFVLENBQUMsSUFBSSxJQUFJLElBQUksRUFBRTtRQUMzQixPQUFPLElBQUksQ0FBQyxLQUFLLENBQUMsRUFBRSxDQUFDO0tBQ3RCO0lBR0QsTUFBTSxTQUFTLEdBQUksVUFBa0IsQ0FBQyxTQUFTLENBQUM7SUFDaEQsSUFBSSxTQUFTLEVBQUUsVUFBVSxFQUFFLFFBQVEsRUFBRSxDQUFDLEtBQUssQ0FBQyxJQUFJLEtBQUssRUFBRTtRQUNyRCxPQUFPLFNBQVMsQ0FBQztLQUNsQjtJQUVELE9BQU8sT0FBTyxDQUFDO0FBQ2pCLENBQUMsQ0FBQyxFQUFFLENBQUM7QUFFTCxNQUFNLENBQUMsTUFBTSxTQUFTLEdBQUcsTUFBTSxLQUFLLFNBQVMsQ0FBQyIsInNvdXJjZXNDb250ZW50IjpbIi8vIENvcHlyaWdodCAyMDE4LTIwMjEgdGhlIERlbm8gYXV0aG9ycy4gQWxsIHJpZ2h0cyByZXNlcnZlZC4gTUlUIGxpY2Vuc2UuXG4vLyBUaGlzIG1vZHVsZSBpcyBicm93c2VyIGNvbXBhdGlibGUuXG5cbmV4cG9ydCBjb25zdCBvc1R5cGUgPSAoKCkgPT4ge1xuICBpZiAoZ2xvYmFsVGhpcy5EZW5vICE9IG51bGwpIHtcbiAgICByZXR1cm4gRGVuby5idWlsZC5vcztcbiAgfVxuXG4gIC8vIGRlbm8tbGludC1pZ25vcmUgbm8tZXhwbGljaXQtYW55XG4gIGNvbnN0IG5hdmlnYXRvciA9IChnbG9iYWxUaGlzIGFzIGFueSkubmF2aWdhdG9yO1xuICBpZiAobmF2aWdhdG9yPy5hcHBWZXJzaW9uPy5pbmNsdWRlcz8uKFwiV2luXCIpID8/IGZhbHNlKSB7XG4gICAgcmV0dXJuIFwid2luZG93c1wiO1xuICB9XG5cbiAgcmV0dXJuIFwibGludXhcIjtcbn0pKCk7XG5cbmV4cG9ydCBjb25zdCBpc1dpbmRvd3MgPSBvc1R5cGUgPT09IFwid2luZG93c1wiO1xuIl19
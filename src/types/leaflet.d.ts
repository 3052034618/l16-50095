import 'leaflet';

declare module 'leaflet' {
  interface GridLayer {
    _initTile: (tile: HTMLElement) => void;
  }

  function heatLayer(
    latlngs: LatLngTuple[],
    options?: {
      radius?: number;
      blur?: number;
      maxZoom?: number;
      max?: number;
      gradient?: Record<string, string>;
    }
  ): HeatLayer;

  interface HeatLayer extends Layer {
    setLatLngs(latlngs: LatLngTuple[]): this;
    addLatLng(latlng: LatLngTuple): this;
    setOptions(options: object): this;
    redraw(): this;
  }
}

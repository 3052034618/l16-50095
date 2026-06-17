import { useEffect } from "react";
import { MapContainer, TileLayer, Marker, Circle, Polygon, Popup } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

interface MapViewProps {
  center?: [number, number];
  zoom?: number;
  children?: React.ReactNode;
  showUserMarkers?: boolean;
  showBusinessMarkers?: boolean;
  showFences?: boolean;
}

const userLocations: { id: string; name: string; lat: number; lng: number }[] = [
  { id: "1", name: "张三", lat: 39.9087, lng: 116.3975 },
  { id: "2", name: "李四", lat: 39.9123, lng: 116.4056 },
  { id: "3", name: "王五", lat: 39.9045, lng: 116.3912 },
];

const businessLocations: { id: string; name: string; lat: number; lng: number; category: string }[] = [
  { id: "b1", name: "星巴克咖啡", lat: 39.9067, lng: 116.3955, category: "咖啡" },
  { id: "b2", name: "海底捞火锅", lat: 39.9105, lng: 116.4023, category: "餐饮" },
  { id: "b3", name: "7-11便利店", lat: 39.9032, lng: 116.3988, category: "零售" },
];

const circleFences = [
  { id: "f1", name: "办公区围栏", center: [39.9087, 116.3975] as [number, number], radius: 500 },
];

const polygonFences = [
  {
    id: "f2",
    name: "商业区围栏",
    positions: [
      [39.911, 116.395],
      [39.913, 116.405],
      [39.907, 116.407],
      [39.905, 116.398],
    ] as [number, number][],
  },
];

function createPulseIcon() {
  return L.divIcon({
    className: "custom-pulse-icon",
    html: `
      <div class="pulse-marker">
        <div class="pulse-ring"></div>
        <div class="pulse-dot"></div>
      </div>
    `,
    iconSize: [24, 24],
    iconAnchor: [12, 12],
  });
}

function createBusinessIcon() {
  return L.divIcon({
    className: "custom-business-icon",
    html: `
      <div class="business-marker">
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor">
          <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/>
        </svg>
      </div>
    `,
    iconSize: [20, 20],
    iconAnchor: [10, 10],
  });
}

export default function MapView({
  center = [39.9087, 116.3975],
  zoom = 15,
  children,
  showUserMarkers = true,
  showBusinessMarkers = true,
  showFences = true,
}: MapViewProps) {
  useEffect(() => {
    const originalInitTile = L.GridLayer.prototype._initTile;
    L.GridLayer.prototype._initTile = function (tile: HTMLElement) {
      originalInitTile.call(this, tile);
      tile.style.filter = "brightness(0.6) invert(1) contrast(3) hue-rotate(200deg) saturate(0.3) brightness(0.7)";
    };

    return () => {
      L.GridLayer.prototype._initTile = originalInitTile;
    };
  }, []);

  return (
    <div className="w-full h-full relative">
      <MapContainer
        center={center}
        zoom={zoom}
        className="w-full h-full z-0"
        zoomControl={false}
        attributionControl={false}
      >
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          maxZoom={19}
        />

        {showFences &&
          circleFences.map((fence) => (
            <Circle
              key={fence.id}
              center={fence.center}
              radius={fence.radius}
              pathOptions={{
                color: "#0ea5e9",
                fillColor: "#0ea5e9",
                fillOpacity: 0.1,
                weight: 2,
                dashArray: "5, 5",
              }}
            >
              <Popup className="dark-popup">{fence.name}</Popup>
            </Circle>
          ))}

        {showFences &&
          polygonFences.map((fence) => (
            <Polygon
              key={fence.id}
              positions={fence.positions}
              pathOptions={{
                color: "#f59e0b",
                fillColor: "#f59e0b",
                fillOpacity: 0.1,
                weight: 2,
                dashArray: "5, 5",
              }}
            >
              <Popup className="dark-popup">{fence.name}</Popup>
            </Polygon>
          ))}

        {showUserMarkers &&
          userLocations.map((user) => (
            <Marker
              key={user.id}
              position={[user.lat, user.lng]}
              icon={createPulseIcon()}
            >
              <Popup className="dark-popup">
                <div className="text-center">
                  <div className="font-medium text-slate-200">{user.name}</div>
                  <div className="text-xs text-slate-400 mt-1">在线</div>
                </div>
              </Popup>
            </Marker>
          ))}

        {showBusinessMarkers &&
          businessLocations.map((business) => (
            <Marker
              key={business.id}
              position={[business.lat, business.lng]}
              icon={createBusinessIcon()}
            >
              <Popup className="dark-popup">
                <div className="text-center">
                  <div className="font-medium text-slate-200">{business.name}</div>
                  <div className="text-xs text-amber-400 mt-1">{business.category}</div>
                </div>
              </Popup>
            </Marker>
          ))}

        {children}
      </MapContainer>
    </div>
  );
}

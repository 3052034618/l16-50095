import { useEffect, useRef, useState } from 'react';
import { MapContainer, TileLayer, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import 'leaflet.heat';
import { Thermometer, BarChart3, TrendingUp, MapPin } from 'lucide-react';
import { fetchHeatmapData } from '@/utils/api';
import type { HeatmapPoint } from '../../shared/types';

const center: [number, number] = [39.9042, 116.4074];

interface HeatmapStats {
  totalPoints: number;
  hottestArea: string;
  densityLevel: string;
}

function HeatmapLayer({ points }: { points: HeatmapPoint[] }) {
  const map = useMap();
  const heatLayerRef = useRef<L.HeatLayer | null>(null);

  useEffect(() => {
    if (!map || points.length === 0) return;

    const latLngPoints: [number, number, number][] = points.map((p) => [
      p.lat,
      p.lng,
      p.weight,
    ]);

    if (heatLayerRef.current) {
      heatLayerRef.current.setLatLngs(latLngPoints as L.LatLngTuple[]);
    } else {
      heatLayerRef.current = L.heatLayer(latLngPoints as L.LatLngTuple[], {
        radius: 35,
        blur: 25,
        maxZoom: 15,
        gradient: {
          0.1: '#00ffff',
          0.2: '#00ff88',
          0.4: '#88ff00',
          0.6: '#ffff00',
          0.8: '#ff8800',
          1.0: '#ff0000',
        },
      }).addTo(map);
    }

    return () => {
      if (heatLayerRef.current) {
        map.removeLayer(heatLayerRef.current);
        heatLayerRef.current = null;
      }
    };
  }, [map, points]);

  return null;
}

function generateMockHeatmapData(): HeatmapPoint[] {
  const points: HeatmapPoint[] = [];
  const baseLat = 39.9042;
  const baseLng = 116.4074;

  for (let i = 0; i < 200; i++) {
    const angle = Math.random() * Math.PI * 2;
    const radius = Math.random() * 0.02;
    const lat = baseLat + Math.sin(angle) * radius;
    const lng = baseLng + Math.cos(angle) * radius;
    const weight = Math.random() * 0.8 + 0.2;
    points.push({ lat, lng, weight });
  }

  const hotspots = [
    { latOffset: 0.005, lngOffset: 0.003, count: 30 },
    { latOffset: -0.003, lngOffset: 0.006, count: 25 },
    { latOffset: 0.002, lngOffset: -0.004, count: 20 },
    { latOffset: -0.006, lngOffset: -0.002, count: 18 },
  ];

  hotspots.forEach((hotspot) => {
    for (let i = 0; i < hotspot.count; i++) {
      const lat = baseLat + hotspot.latOffset + (Math.random() - 0.5) * 0.003;
      const lng = baseLng + hotspot.lngOffset + (Math.random() - 0.5) * 0.003;
      const weight = Math.random() * 0.5 + 0.5;
      points.push({ lat, lng, weight });
    }
  });

  return points;
}

export default function Heatmap() {
  const [heatmapPoints, setHeatmapPoints] = useState<HeatmapPoint[]>([]);
  const [stats, setStats] = useState<HeatmapStats>({
    totalPoints: 0,
    hottestArea: '加载中...',
    densityLevel: '中等',
  });

  useEffect(() => {
    const originalInitTile = L.GridLayer.prototype._initTile;
    L.GridLayer.prototype._initTile = function (tile: HTMLElement) {
      originalInitTile.call(this, tile);
      tile.style.filter =
        'brightness(0.6) invert(1) contrast(3) hue-rotate(200deg) saturate(0.3) brightness(0.7)';
    };

    return () => {
      L.GridLayer.prototype._initTile = originalInitTile;
    };
  }, []);

  useEffect(() => {
    const loadData = async () => {
      try {
        const data = await fetchHeatmapData();
        if (data && data.length > 0) {
          setHeatmapPoints(data);
          calculateStats(data);
        } else {
          const mockData = generateMockHeatmapData();
          setHeatmapPoints(mockData);
          calculateStats(mockData);
        }
      } catch (error) {
        console.error('Failed to load heatmap data:', error);
        const mockData = generateMockHeatmapData();
        setHeatmapPoints(mockData);
        calculateStats(mockData);
      }
    };

    loadData();
  }, []);

  const calculateStats = (points: HeatmapPoint[]) => {
    const totalWeight = points.reduce((sum, p) => sum + p.weight, 0);
    const avgWeight = totalWeight / points.length;

    let densityLevel = '低';
    if (avgWeight > 0.7) densityLevel = '极高';
    else if (avgWeight > 0.5) densityLevel = '高';
    else if (avgWeight > 0.3) densityLevel = '中等';

    const hottest = points.reduce((max, p) => (p.weight > max.weight ? p : max), points[0]);

    setStats({
      totalPoints: points.length,
      hottestArea: `${hottest.lat.toFixed(4)}, ${hottest.lng.toFixed(4)}`,
      densityLevel,
    });
  };

  return (
    <div className="h-full relative">
      <MapContainer
        center={center}
        zoom={14}
        className="w-full h-full z-0"
        zoomControl={false}
        attributionControl={false}
      >
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          maxZoom={19}
        />
        <HeatmapLayer points={heatmapPoints} />
      </MapContainer>

      <div className="absolute top-4 left-4 z-[1000] w-72">
        <div className="bg-slate-900/80 backdrop-blur-xl rounded-2xl border border-slate-700/50 shadow-2xl overflow-hidden">
          <div className="p-4 border-b border-slate-700/50">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-orange-500 to-red-500 flex items-center justify-center shadow-lg shadow-orange-500/30">
                <Thermometer className="w-5 h-5 text-white" />
              </div>
              <div>
                <h3 className="font-bold text-slate-100">热力图分析</h3>
                <p className="text-xs text-slate-400">人员密度分布</p>
              </div>
            </div>
          </div>

          <div className="p-4 space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-slate-800/50 rounded-xl p-3">
                <div className="flex items-center gap-2 mb-1">
                  <MapPin className="w-4 h-4 text-sky-400" />
                  <span className="text-xs text-slate-400">总数据点</span>
                </div>
                <div className="text-xl font-bold text-slate-100">{stats.totalPoints}</div>
              </div>
              <div className="bg-slate-800/50 rounded-xl p-3">
                <div className="flex items-center gap-2 mb-1">
                  <TrendingUp className="w-4 h-4 text-emerald-400" />
                  <span className="text-xs text-slate-400">密度等级</span>
                </div>
                <div className="text-xl font-bold text-emerald-400">{stats.densityLevel}</div>
              </div>
            </div>

            <div className="bg-slate-800/50 rounded-xl p-3">
              <div className="flex items-center gap-2 mb-2">
                <BarChart3 className="w-4 h-4 text-amber-400" />
                <span className="text-xs text-slate-400">最热区域</span>
              </div>
              <div className="text-sm font-mono text-slate-200">{stats.hottestArea}</div>
            </div>

            <div className="space-y-2">
              <div className="text-xs text-slate-400">密度图例</div>
              <div className="h-4 rounded-full bg-gradient-to-r from-cyan-400 via-yellow-400 to-red-500" />
              <div className="flex justify-between text-xs text-slate-500">
                <span>低密度</span>
                <span>高密度</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="absolute bottom-6 right-6 z-[1000]">
        <div className="bg-slate-900/80 backdrop-blur-xl rounded-xl border border-slate-700/50 px-4 py-3 shadow-xl">
          <div className="text-xs text-slate-400 mb-1">数据更新时间</div>
          <div className="text-sm font-medium text-slate-200">
            {new Date().toLocaleString('zh-CN')}
          </div>
        </div>
      </div>
    </div>
  );
}

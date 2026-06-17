import { useState, useEffect, useRef, useMemo, useCallback } from "react";
import {
  MapContainer,
  TileLayer,
  Polyline,
  Marker,
  Popup,
  useMap,
} from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import {
  Play,
  Pause,
  SkipBack,
  SkipForward,
  Gauge,
  User,
  Download,
  Clock,
  Calendar,
} from "lucide-react";
import { fetchTracks, fetchUsers } from "@/utils/api";
import type { TrackPoint, UserLocation } from "../../shared/types";

function MapController({ center }: { center: [number, number] }) {
  const map = useMap();
  useEffect(() => {
    map.setView(center, map.getZoom());
  }, [center, map]);
  return null;
}

function createTrackMarker() {
  return L.divIcon({
    className: "custom-track-marker",
    html: `
      <div class="track-marker-container">
        <div class="track-marker-pulse"></div>
        <div class="track-marker-dot"></div>
      </div>
    `,
    iconSize: [32, 32],
    iconAnchor: [16, 16],
  });
}

const SPEED_OPTIONS = [0.5, 1, 2, 4];

const MOCK_USERS: { userId: string; name: string }[] = [
  { userId: "user1", name: "张三" },
  { userId: "user2", name: "李四" },
  { userId: "user3", name: "王五" },
];

function generateMockTrack(userId: string): TrackPoint[] {
  const baseLat = 39.9087;
  const baseLng = 116.3975;
  const points: TrackPoint[] = [];
  const now = Date.now();

  const seed = userId.charCodeAt(userId.length - 1);

  for (let i = 0; i < 60; i++) {
    const angle = (i / 60) * Math.PI * 2 + seed;
    const radius = 0.005 + Math.sin(i * 0.3) * 0.002;
    const lat = baseLat + Math.sin(angle) * radius;
    const lng = baseLng + Math.cos(angle) * radius * 1.5;
    points.push({
      lat,
      lng,
      timestamp: now - (60 - i) * 60000,
    });
  }

  return points;
}

export default function Track() {
  const [trackPoints, setTrackPoints] = useState<TrackPoint[]>([]);
  const [allTrackPoints, setAllTrackPoints] = useState<TrackPoint[]>([]);
  const [currentTimeIndex, setCurrentTimeIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [speed, setSpeed] = useState(1);
  const [selectedUserId, setSelectedUserId] = useState("user1");
  const [users, setUsers] = useState<UserLocation[]>([]);
  const [startTime, setStartTime] = useState<number | null>(null);
  const [endTime, setEndTime] = useState<number | null>(null);
  const [showTimePicker, setShowTimePicker] = useState(false);

  const animationRef = useRef<number | null>(null);
  const lastTimeRef = useRef<number>(0);

  const currentPosition = useMemo(() => {
    if (trackPoints.length === 0) return null;
    if (currentTimeIndex <= 0) {
      return {
        lat: trackPoints[0].lat,
        lng: trackPoints[0].lng,
        timestamp: trackPoints[0].timestamp,
      };
    }
    if (currentTimeIndex >= trackPoints.length - 1) {
      return {
        lat: trackPoints[trackPoints.length - 1].lat,
        lng: trackPoints[trackPoints.length - 1].lng,
        timestamp: trackPoints[trackPoints.length - 1].timestamp,
      };
    }

    const idx = Math.floor(currentTimeIndex);
    const frac = currentTimeIndex - idx;

    const prev = trackPoints[idx];
    const next = trackPoints[Math.min(idx + 1, trackPoints.length - 1)];

    return {
      lat: prev.lat + (next.lat - prev.lat) * frac,
      lng: prev.lng + (next.lng - prev.lng) * frac,
      timestamp: prev.timestamp + (next.timestamp - prev.timestamp) * frac,
    };
  }, [trackPoints, currentTimeIndex]);

  const polylinePositions = useMemo(() => {
    if (trackPoints.length === 0) return [];
    const idx = Math.floor(currentTimeIndex);
    const positions: [number, number][] = [];

    for (let i = 0; i <= idx && i < trackPoints.length; i++) {
      positions.push([trackPoints[i].lat, trackPoints[i].lng]);
    }

    if (currentPosition && idx < trackPoints.length - 1) {
      positions.push([currentPosition.lat, currentPosition.lng]);
    }

    return positions;
  }, [trackPoints, currentTimeIndex, currentPosition]);

  useEffect(() => {
    loadUsers();
  }, []);

  useEffect(() => {
    loadTrack(selectedUserId);
  }, [selectedUserId]);

  const loadUsers = async () => {
    try {
      const data = await fetchUsers();
      if (data && data.length > 0) {
        setUsers(data);
        setSelectedUserId(data[0].userId);
      }
    } catch (error) {
      console.error("Failed to load users:", error);
    }
  };

  const loadTrack = async (userId: string) => {
    setIsPlaying(false);
    setCurrentTimeIndex(0);
    try {
      const data = await fetchTracks(userId);
      let points: TrackPoint[];
      if (data && data.length > 0) {
        points = data.sort((a, b) => a.timestamp - b.timestamp);
      } else {
        points = generateMockTrack(userId);
      }
      setAllTrackPoints(points);
      applyTimeFilter(points);
    } catch (error) {
      console.error("Failed to load track:", error);
      const points = generateMockTrack(userId);
      setAllTrackPoints(points);
      applyTimeFilter(points);
    }
  };

  const applyTimeFilter = (points: TrackPoint[]) => {
    let filtered = points;
    if (startTime !== null) {
      filtered = filtered.filter((p) => p.timestamp >= startTime);
    }
    if (endTime !== null) {
      filtered = filtered.filter((p) => p.timestamp <= endTime);
    }
    setTrackPoints(filtered);
  };

  const handleTimeRangeChange = () => {
    applyTimeFilter(allTrackPoints);
    setCurrentTimeIndex(0);
    setIsPlaying(false);
  };

  const resetTimeRange = () => {
    setStartTime(null);
    setEndTime(null);
    setTrackPoints(allTrackPoints);
    setCurrentTimeIndex(0);
    setIsPlaying(false);
  };

  const exportTrackJSON = () => {
    const data = {
      userId: selectedUserId,
      exportTime: new Date().toISOString(),
      totalPoints: trackPoints.length,
      points: trackPoints.map((p) => ({
        lat: p.lat,
        lng: p.lng,
        timestamp: p.timestamp,
        time: new Date(p.timestamp).toISOString(),
      })),
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `track_${selectedUserId}_${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const exportTrackCSV = () => {
    const header = "index,latitude,longitude,timestamp,time";
    const rows = trackPoints.map((p, i) =>
      [
        i + 1,
        p.lat,
        p.lng,
        p.timestamp,
        new Date(p.timestamp).toISOString(),
      ].join(",")
    );
    const csv = [header, ...rows].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `track_${selectedUserId}_${Date.now()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  useEffect(() => {
    if (!isPlaying || trackPoints.length === 0) {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
        animationRef.current = null;
      }
      return;
    }

    const animate = (timestamp: number) => {
      if (lastTimeRef.current === 0) {
        lastTimeRef.current = timestamp;
      }

      const delta = timestamp - lastTimeRef.current;
      lastTimeRef.current = timestamp;

      const pointsPerSecond = 2 * speed;
      const increment = (delta / 1000) * pointsPerSecond;

      setCurrentTimeIndex((prev) => {
        const next = prev + increment;
        if (next >= trackPoints.length - 1) {
          setIsPlaying(false);
          return trackPoints.length - 1;
        }
        return next;
      });

      animationRef.current = requestAnimationFrame(animate);
    };

    lastTimeRef.current = 0;
    animationRef.current = requestAnimationFrame(animate);

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [isPlaying, trackPoints.length, speed]);

  useEffect(() => {
    const originalInitTile = L.GridLayer.prototype._initTile;
    L.GridLayer.prototype._initTile = function (tile: HTMLElement) {
      originalInitTile.call(this, tile);
      tile.style.filter =
        "brightness(0.6) invert(1) contrast(3) hue-rotate(200deg) saturate(0.3) brightness(0.7)";
    };

    return () => {
      L.GridLayer.prototype._initTile = originalInitTile;
    };
  }, []);

  const handlePlayPause = useCallback(() => {
    if (currentTimeIndex >= trackPoints.length - 1) {
      setCurrentTimeIndex(0);
    }
    setIsPlaying((prev) => !prev);
  }, [currentTimeIndex, trackPoints.length]);

  const handleSkipBack = useCallback(() => {
    setCurrentTimeIndex(0);
    setIsPlaying(false);
  }, []);

  const handleSkipForward = useCallback(() => {
    setCurrentTimeIndex(trackPoints.length - 1);
    setIsPlaying(false);
  }, [trackPoints.length]);

  const handleTimelineChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const value = parseFloat(e.target.value);
      setCurrentTimeIndex(value);
      setIsPlaying(false);
    },
    []
  );

  const formatTime = (timestamp: number) => {
    const date = new Date(timestamp);
    return date.toLocaleString("zh-CN", {
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
  };

  const formatTimeShort = (timestamp: number) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString("zh-CN", {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const getUserName = (userId: string) => {
    const user = users.find((u) => u.userId === userId);
    if (user) return user.name;
    const mockUser = MOCK_USERS.find((u) => u.userId === userId);
    return mockUser?.name || userId;
  };

  const progressPercent =
    trackPoints.length > 1
      ? (currentTimeIndex / (trackPoints.length - 1)) * 100
      : 0;

  return (
    <div className="h-full flex flex-col relative">
      <div className="absolute top-4 left-4 z-20 z-10 space-y-2">
        <div className="bg-slate-900/70 backdrop-blur-xl rounded-xl border border-slate-700/30 p-3 w-56">
          <label className="block text-xs text-slate-400 mb-1.5 flex items-center gap-1.5">
            <User className="w-3.5 h-3.5" />
            选择用户
          </label>
          <select
            value={selectedUserId}
            onChange={(e) => setSelectedUserId(e.target.value)}
            className="w-full px-3 py-2 bg-slate-800/50 border border-slate-700/30 rounded-lg text-slate-200 text-sm focus:outline-none focus:border-sky-500/50 focus:ring-1 focus:ring-sky-500/30"
          >
            {users.length > 0
              ? users.map((user) => (
                  <option key={user.userId} value={user.userId}>
                    {user.name}
                  </option>
                ))
              : MOCK_USERS.map((user) => (
                  <option key={user.userId} value={user.userId}>
                    {user.name}
                  </option>
                ))}
          </select>
        </div>

        <div className="bg-slate-900/70 backdrop-blur-xl rounded-xl border border-slate-700/30 p-3 w-56">
          <button
            onClick={() => setShowTimePicker(!showTimePicker)}
            className="w-full flex items-center justify-between px-3 py-2 bg-slate-800/50 border border-slate-700/30 rounded-lg text-slate-200 text-sm hover:bg-slate-800 transition-colors"
          >
            <span className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-sky-400" />
              时间范围
            </span>
            <span className="text-xs text-slate-500">
              {startTime || endTime ? "已设置" : "全部"}
            </span>
          </button>

          {showTimePicker && (
            <div className="mt-3 space-y-2 pt-3 border-t border-slate-700/30">
              <div>
                <label className="text-xs text-slate-400 mb-1 block">开始时间</label>
                <input
                  type="datetime-local"
                  value={startTime ? new Date(startTime).toISOString().slice(0, 16) : ""}
                  onChange={(e) => setStartTime(e.target.value ? new Date(e.target.value).getTime() : null)}
                  className="w-full px-2 py-1.5 bg-slate-800/50 border border-slate-700/30 rounded-lg text-slate-200 text-xs"
                />
              </div>
              <div>
                <label className="text-xs text-slate-400 mb-1 block">结束时间</label>
                <input
                  type="datetime-local"
                  value={endTime ? new Date(endTime).toISOString().slice(0, 16) : ""}
                  onChange={(e) => setEndTime(e.target.value ? new Date(e.target.value).getTime() : null)}
                  className="w-full px-2 py-1.5 bg-slate-800/50 border border-slate-700/30 rounded-lg text-slate-200 text-xs"
                />
              </div>
              <div className="flex gap-2">
                <button
                  onClick={handleTimeRangeChange}
                  className="flex-1 px-2 py-1.5 bg-sky-500/20 text-sky-400 rounded-lg text-xs font-medium hover:bg-sky-500/30 transition-colors"
                >
                  应用
                </button>
                <button
                  onClick={resetTimeRange}
                  className="flex-1 px-2 py-1.5 bg-slate-700/50 text-slate-400 rounded-lg text-xs font-medium hover:bg-slate-700 transition-colors"
                >
                  重置
                </button>
              </div>
            </div>
          )}
        </div>

        <div className="bg-slate-900/70 backdrop-blur-xl rounded-xl border border-slate-700/30 p-3 w-56">
          <div className="text-xs text-slate-400 mb-2 flex items-center gap-1.5">
            <Download className="w-3.5 h-3.5" />
            导出轨迹
          </div>
          <div className="flex gap-2">
            <button
              onClick={exportTrackJSON}
              disabled={trackPoints.length === 0}
              className="flex-1 px-2 py-1.5 bg-emerald-500/20 text-emerald-400 rounded-lg text-xs font-medium hover:bg-emerald-500/30 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              JSON
            </button>
            <button
              onClick={exportTrackCSV}
              disabled={trackPoints.length === 0}
              className="flex-1 px-2 py-1.5 bg-amber-500/20 text-amber-400 rounded-lg text-xs font-medium hover:bg-amber-500/30 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              CSV
            </button>
          </div>
        </div>
      </div>

      <div className="flex-1 relative">
        <MapContainer
          center={[39.9087, 116.3975]}
          zoom={15}
          className="w-full h-full z-0"
          zoomControl={false}
          attributionControl={false}
        >
          <TileLayer
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            maxZoom={19}
          />

          {trackPoints.length > 1 && (
            <>
              <Polyline
                positions={trackPoints.map((p) => [p.lat, p.lng] as [number, number])}
                pathOptions={{
                  color: "#334155",
                  weight: 3,
                  opacity: 0.5,
                  dashArray: "4, 8",
                }}
              />

              <Polyline
                positions={polylinePositions as [number, number][]}
                pathOptions={{
                  color: "#0ea5e9",
                  weight: 4,
                  opacity: 1,
                }}
              />
            </>
          )}

          {currentPosition && (
            <>
              <MapController center={[currentPosition.lat, currentPosition.lng]} />
              <Marker
                position={[currentPosition.lat, currentPosition.lng]}
                icon={createTrackMarker()}
              >
                <Popup className="dark-popup">
                  <div className="text-center">
                    <div className="font-medium text-slate-200">
                      {getUserName(selectedUserId)}
                    </div>
                    <div className="text-xs text-slate-400 mt-1">
                      {formatTime(currentPosition.timestamp)}
                    </div>
                  </div>
                </Popup>
              </Marker>
            </>
          )}
        </MapContainer>
      </div>

      <div className="absolute bottom-0 left-0 right-0 z-20">
        <div className="mx-auto max-w-4xl px-4 pb-6">
          <div className="bg-slate-900/80 backdrop-blur-xl rounded-2xl border border-slate-700/30 p-4 shadow-2xl">
            <div className="flex items-center gap-4 mb-3">
              <div className="flex items-center gap-2">
                <button
                  onClick={handleSkipBack}
                  className="p-2.5 rounded-xl text-slate-400 hover:text-slate-200 hover:bg-slate-800/50 transition-all"
                  title="回到开始"
                >
                  <SkipBack className="w-5 h-5" />
                </button>

                <button
                  onClick={handlePlayPause}
                  className="relative p-3 rounded-xl bg-sky-500 hover:bg-sky-600 text-white transition-all shadow-lg shadow-sky-500/30 hover:shadow-sky-500/50 play-button-glow"
                  title={isPlaying ? "暂停" : "播放"}
                >
                  {isPlaying ? (
                    <Pause className="w-5 h-5" />
                  ) : (
                    <Play className="w-5 h-5 ml-0.5" />
                  )}
                </button>

                <button
                  onClick={handleSkipForward}
                  className="p-2.5 rounded-xl text-slate-400 hover:text-slate-200 hover:bg-slate-800/50 transition-all"
                  title="跳到结束"
                >
                  <SkipForward className="w-5 h-5" />
                </button>
              </div>

              <div className="flex-1 flex items-center gap-3">
                <span className="text-xs text-slate-400 w-16 text-right font-mono">
                  {trackPoints.length > 0
                    ? formatTimeShort(trackPoints[0].timestamp)
                    : "--:--"}
                </span>

                <div className="flex-1 relative">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full h-2 bg-slate-700/50 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-sky-500 to-cyan-400 rounded-full transition-all duration-75"
                        style={{ width: `${progressPercent}%` }}
                      />
                    </div>
                  </div>
                  <input
                    type="range"
                    min={0}
                    max={trackPoints.length - 1 || 0}
                    step={0.01}
                    value={currentTimeIndex}
                    onChange={handleTimelineChange}
                    className="relative w-full h-2 appearance-none bg-transparent cursor-pointer slider-thumb"
                  />
                </div>

                <span className="text-xs text-slate-400 w-16 font-mono">
                  {trackPoints.length > 0
                    ? formatTimeShort(trackPoints[trackPoints.length - 1].timestamp)
                    : "--:--"}
                </span>
              </div>

              <div className="flex items-center gap-1.5 bg-slate-800/50 rounded-xl p-1">
                <Gauge className="w-4 h-4 text-slate-400 mx-1" />
                {SPEED_OPTIONS.map((s) => (
                  <button
                    key={s}
                    onClick={() => setSpeed(s)}
                    className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-all ${
                      speed === s
                        ? "bg-sky-500/20 text-sky-400"
                        : "text-slate-400 hover:text-slate-200 hover:bg-slate-700/30"
                    }`}
                  >
                    {s}x
                  </button>
                ))}
              </div>
            </div>

            <div className="flex items-center justify-between text-xs text-slate-500 pt-2 border-t border-slate-700/20">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-sky-400" />
                <span>
                  当前时间:{" "}
                  <span className="text-slate-300 font-mono">
                    {currentPosition ? formatTime(currentPosition.timestamp) : "--"}
                  </span>
                </span>
              </div>
              <div>
                共 {trackPoints.length} 个轨迹点 · 速度 {speed}x
              </div>
            </div>
          </div>
        </div>
      </div>

      <style>{`
        .custom-track-marker {
          background: transparent !important;
          border: none !important;
        }

        .track-marker-container {
          position: relative;
          width: 32px;
          height: 32px;
        }

        .track-marker-dot {
          position: absolute;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          width: 14px;
          height: 14px;
          background: #0ea5e9;
          border: 3px solid #ffffff;
          border-radius: 50%;
          z-index: 2;
          box-shadow: 0 0 15px rgba(14, 165, 233, 0.6);
        }

        .track-marker-pulse {
          position: absolute;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          width: 32px;
          height: 32px;
          background: rgba(14, 165, 233, 0.3);
          border-radius: 50%;
          z-index: 1;
          animation: track-pulse 1.5s ease-out infinite;
        }

        @keyframes track-pulse {
          0% {
            transform: translate(-50%, -50%) scale(1);
            opacity: 0.8;
          }
          100% {
            transform: translate(-50%, -50%) scale(2);
            opacity: 0;
          }
        }

        input[type="range"].slider-thumb {
          -webkit-appearance: none;
          appearance: none;
          background: transparent;
        }

        input[type="range"].slider-thumb::-webkit-slider-thumb {
          -webkit-appearance: none;
          appearance: none;
          width: 16px;
          height: 16px;
          border-radius: 50%;
          background: #ffffff;
          cursor: pointer;
          border: 3px solid #0ea5e9;
          box-shadow: 0 2px 8px rgba(14, 165, 233, 0.4);
          position: relative;
          z-index: 10;
          transition: transform 0.15s ease;
        }

        input[type="range"].slider-thumb::-webkit-slider-thumb:hover {
          transform: scale(1.2);
        }

        input[type="range"].slider-thumb::-moz-range-thumb {
          width: 16px;
          height: 16px;
          border-radius: 50%;
          background: #ffffff;
          cursor: pointer;
          border: 3px solid #0ea5e9;
          box-shadow: 0 2px 8px rgba(14, 165, 233, 0.4);
        }

        .play-button-glow {
          animation: glow 2s ease-in-out infinite;
        }

        @keyframes glow {
          0%, 100% {
            box-shadow: 0 0 20px rgba(14, 165, 233, 0.4);
          }
          50% {
            box-shadow: 0 0 30px rgba(14, 165, 233, 0.6);
          }
        }
      `}</style>
    </div>
  );
}

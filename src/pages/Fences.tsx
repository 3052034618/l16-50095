import { useState, useEffect, useCallback, useRef } from "react";
import {
  MapContainer,
  TileLayer,
  Circle,
  Polygon,
  Popup,
  useMapEvents,
} from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import {
  Circle as CircleIcon,
  Pentagon,
  Trash2,
  Edit,
  ToggleLeft,
  ToggleRight,
  Bell,
  X,
  Check,
} from "lucide-react";
import { useLocationStore } from "@/store/useLocationStore";
import {
  createFence,
  updateFence,
  deleteFence,
  fetchFenceEvents,
  fetchFences,
} from "@/utils/api";
import type { Fence, FenceEvent, FenceGeometry } from "../../shared/types";

type DrawMode = "none" | "circle" | "polygon";

const FENCE_COLORS = [
  "#0ea5e9",
  "#f59e0b",
  "#10b981",
  "#ef4444",
  "#8b5cf6",
  "#ec4899",
];

function MapEventHandler({
  drawMode,
  onMapClick,
  onMouseMove,
  onDblClick,
}: {
  drawMode: DrawMode;
  onMapClick: (latlng: L.LatLng) => void;
  onMouseMove: (latlng: L.LatLng) => void;
  onDblClick: () => void;
}) {
  useMapEvents({
    click: (e) => {
      if (drawMode !== "none") {
        onMapClick(e.latlng);
      }
    },
    mousemove: (e) => {
      if (drawMode !== "none") {
        onMouseMove(e.latlng);
      }
    },
    dblclick: (e) => {
      if (drawMode === "polygon") {
        e.originalEvent.preventDefault();
        onDblClick();
      }
    },
  });

  return null;
}

export default function Fences() {
  const { fences, fenceEvents, fenceEventsLoaded, setFences, addFenceEvent, setFenceEvents } = useLocationStore();
  const [drawMode, setDrawMode] = useState<DrawMode>("none");
  const [tempCircleCenter, setTempCircleCenter] = useState<[number, number] | null>(null);
  const [tempCircleRadius, setTempCircleRadius] = useState<number>(0);
  const [tempPolygon, setTempPolygon] = useState<[number, number][]>([]);
  const [mousePos, setMousePos] = useState<[number, number]>([0, 0]);
  const [showNameModal, setShowNameModal] = useState(false);
  const [newFenceName, setNewFenceName] = useState("");
  const [selectedColor, setSelectedColor] = useState(FENCE_COLORS[0]);
  const [editingFence, setEditingFence] = useState<Fence | null>(null);
  const [loading, setLoading] = useState(false);

  const circleStep = useRef<"idle" | "center" | "radius">("idle");

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

  useEffect(() => {
    loadFences();
    if (!fenceEventsLoaded) {
      loadEvents();
    }
  }, [fenceEventsLoaded]);

  const loadFences = async () => {
    try {
      const data = await fetchFences();
      setFences(data);
    } catch (error) {
      console.error("Failed to load fences:", error);
    }
  };

  const loadEvents = async () => {
    try {
      const data = await fetchFenceEvents(50);
      setFenceEvents(data);
    } catch (error) {
      console.error("Failed to load fence events:", error);
    }
  };

  const handleMapClick = useCallback(
    (latlng: L.LatLng) => {
      if (drawMode === "circle") {
        if (circleStep.current === "idle") {
          setTempCircleCenter([latlng.lat, latlng.lng]);
          setTempCircleRadius(0);
          circleStep.current = "radius";
        } else if (circleStep.current === "radius") {
          setShowNameModal(true);
          setDrawMode("none");
          circleStep.current = "idle";
        }
      } else if (drawMode === "polygon") {
        setTempPolygon((prev) => [...prev, [latlng.lat, latlng.lng]]);
      }
    },
    [drawMode]
  );

  const handleMouseMove = useCallback(
    (latlng: L.LatLng) => {
      setMousePos([latlng.lat, latlng.lng]);
      if (drawMode === "circle" && circleStep.current === "radius" && tempCircleCenter) {
        const radius = L.latLng(tempCircleCenter).distanceTo(latlng);
        setTempCircleRadius(radius);
      }
    },
    [drawMode, tempCircleCenter]
  );

  const handleDblClick = useCallback(() => {
    if (drawMode === "polygon" && tempPolygon.length >= 3) {
      setShowNameModal(true);
      setDrawMode("none");
    }
  }, [drawMode, tempPolygon.length]);

  const handleStartDraw = (mode: "circle" | "polygon") => {
    setDrawMode(mode);
    setTempCircleCenter(null);
    setTempCircleRadius(0);
    setTempPolygon([]);
    setEditingFence(null);
    circleStep.current = "idle";
  };

  const handleCancelDraw = () => {
    setDrawMode("none");
    setTempCircleCenter(null);
    setTempCircleRadius(0);
    setTempPolygon([]);
    setShowNameModal(false);
    setNewFenceName("");
    setEditingFence(null);
    circleStep.current = "idle";
  };

  const handleCreateFence = async () => {
    if (!newFenceName.trim()) return;

    setLoading(true);
    try {
      let geometry: FenceGeometry;
      let type: "circle" | "polygon";

      if (tempCircleCenter && tempCircleRadius > 0) {
        type = "circle";
        geometry = {
          center: { lat: tempCircleCenter[0], lng: tempCircleCenter[1] },
          radius: tempCircleRadius,
        };
      } else if (tempPolygon.length >= 3) {
        type = "polygon";
        geometry = {
          paths: tempPolygon.map(([lat, lng]) => ({ lat, lng })),
        };
      } else {
        return;
      }

      const newFence = await createFence({
        name: newFenceName.trim(),
        type,
        color: selectedColor,
        geometry,
      });

      setFences([...fences, newFence]);
      setShowNameModal(false);
      setNewFenceName("");
      setTempCircleCenter(null);
      setTempCircleRadius(0);
      setTempPolygon([]);
    } catch (error) {
      console.error("Failed to create fence:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleToggleFence = async (fence: Fence) => {
    try {
      const updated = await updateFence(fence.id, {
        ...fence,
        enabled: !fence.enabled,
      });
      setFences(fences.map((f) => (f.id === fence.id ? updated : f)));
    } catch (error) {
      console.error("Failed to update fence:", error);
    }
  };

  const handleDeleteFence = async (id: string) => {
    try {
      await deleteFence(id);
      setFences(fences.filter((f) => f.id !== id));
    } catch (error) {
      console.error("Failed to delete fence:", error);
    }
  };

  const handleEditFence = (fence: Fence) => {
    setEditingFence(fence);
    setNewFenceName(fence.name);
    setSelectedColor(fence.color);
    setShowNameModal(true);
  };

  const handleUpdateFence = async () => {
    if (!editingFence || !newFenceName.trim()) return;

    setLoading(true);
    try {
      const updated = await updateFence(editingFence.id, {
        ...editingFence,
        name: newFenceName.trim(),
        color: selectedColor,
      });
      setFences(fences.map((f) => (f.id === editingFence.id ? updated : f)));
      setShowNameModal(false);
      setNewFenceName("");
      setEditingFence(null);
    } catch (error) {
      console.error("Failed to update fence:", error);
    } finally {
      setLoading(false);
    }
  };

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

  const getFenceGeometry = (fence: Fence) => {
    if (fence.type === "circle" && "center" in fence.geometry) {
      return {
        center: [fence.geometry.center.lat, fence.geometry.center.lng] as [number, number],
        radius: fence.geometry.radius,
      };
    }
    if (fence.type === "polygon" && "paths" in fence.geometry) {
      return {
        positions: fence.geometry.paths.map(
          (p) => [p.lat, p.lng] as [number, number]
        ),
      };
    }
    return null;
  };

  const getPreviewPolygon = () => {
    if (tempPolygon.length === 0) return [];
    if (drawMode === "polygon") {
      return [...tempPolygon, mousePos];
    }
    return tempPolygon;
  };

  return (
    <div className="h-full flex relative">
      <div className="w-72 flex-shrink-0 bg-slate-900/70 backdrop-blur-xl border-r border-slate-700/30 flex flex-col z-20">
        <div className="p-4 border-b border-slate-700/30">
          <h2 className="font-semibold text-slate-200 flex items-center gap-2">
            <Pentagon className="w-5 h-5 text-sky-400" />
            围栏管理
            <span className="ml-auto px-2 py-0.5 text-xs font-medium bg-sky-500/20 text-sky-400 rounded-full">
              {fences.length}
            </span>
          </h2>
        </div>

        <div className="p-3 border-b border-slate-700/30 space-y-2">
          <div className="flex gap-2">
            <button
              onClick={() => handleStartDraw("circle")}
              className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                drawMode === "circle"
                  ? "bg-sky-500/20 text-sky-400 border border-sky-500/30"
                  : "bg-slate-800/50 text-slate-400 hover:bg-slate-800 hover:text-slate-300 border border-slate-700/30"
              }`}
            >
              <CircleIcon className="w-4 h-4" />
              圆形
            </button>
            <button
              onClick={() => handleStartDraw("polygon")}
              className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                drawMode === "polygon"
                  ? "bg-amber-500/20 text-amber-400 border border-amber-500/30"
                  : "bg-slate-800/50 text-slate-400 hover:bg-slate-800 hover:text-slate-300 border border-slate-700/30"
              }`}
            >
              <Pentagon className="w-4 h-4" />
              多边形
            </button>
          </div>

          {drawMode !== "none" && (
            <button
              onClick={handleCancelDraw}
              className="w-full flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium bg-red-500/10 text-red-400 hover:bg-red-500/20 transition-all border border-red-500/20"
            >
              <X className="w-4 h-4" />
              取消绘制
            </button>
          )}

          {drawMode !== "none" && (
            <p className="text-xs text-slate-500 text-center">
              {drawMode === "circle"
                ? circleStep.current === "idle"
                  ? "点击地图设置圆心"
                  : "移动鼠标调整半径，再次点击确认"
                : "点击添加顶点，双击完成绘制"}
            </p>
          )}
        </div>

        <div className="flex-1 overflow-y-auto custom-scrollbar p-3 space-y-2">
          {fences.map((fence) => {
            const geo = getFenceGeometry(fence);
            return (
              <div
                key={fence.id}
                className="p-3 rounded-xl bg-slate-800/30 border border-slate-700/30 hover:bg-slate-800/50 transition-all"
              >
                <div className="flex items-start gap-3">
                  <div
                    className="w-3 h-3 rounded-full mt-1.5 flex-shrink-0"
                    style={{ backgroundColor: fence.color }}
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <span
                        className={`font-medium text-sm truncate ${
                          fence.enabled ? "text-slate-200" : "text-slate-500"
                        }`}
                      >
                        {fence.name}
                      </span>
                    </div>
                    <div className="text-xs text-slate-500 mt-0.5">
                      {fence.type === "circle" ? "圆形围栏" : "多边形围栏"}
                      {fence.type === "circle" && geo && "radius" in geo && (
                        <span className="ml-2">
                          {geo.radius > 1000
                            ? `${(geo.radius / 1000).toFixed(1)}km`
                            : `${geo.radius.toFixed(0)}m`}
                        </span>
                      )}
                      {fence.type === "polygon" && geo && "positions" in geo && (
                        <span className="ml-2">{geo.positions.length} 个顶点</span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between mt-3 pt-2 border-t border-slate-700/20">
                  <button
                    onClick={() => handleToggleFence(fence)}
                    className="text-slate-400 hover:text-sky-400 transition-colors"
                  >
                    {fence.enabled ? (
                      <ToggleRight className="w-5 h-5 text-emerald-400" />
                    ) : (
                      <ToggleLeft className="w-5 h-5 text-slate-500" />
                    )}
                  </button>

                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => handleEditFence(fence)}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-sky-400 hover:bg-slate-700/30 transition-all"
                    >
                      <Edit className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDeleteFence(fence.id)}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-red-400 hover:bg-red-500/10 transition-all"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}

          {fences.length === 0 && (
            <div className="text-center py-8 text-slate-500 text-sm">
              暂无围栏数据
            </div>
          )}
        </div>
      </div>

      <div className="flex-1 relative">
        <MapContainer
          center={[39.9087, 116.3975]}
          zoom={15}
          className="w-full h-full z-0"
          zoomControl={false}
          attributionControl={false}
          doubleClickZoom={drawMode !== "polygon"}
        >
          <TileLayer
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            maxZoom={19}
          />

          <MapEventHandler
            drawMode={drawMode}
            onMapClick={handleMapClick}
            onMouseMove={handleMouseMove}
            onDblClick={handleDblClick}
          />

          {fences.map((fence) => {
            const geo = getFenceGeometry(fence);
            if (!geo) return null;

            if (fence.type === "circle" && "center" in geo) {
              return (
                <Circle
                  key={fence.id}
                  center={geo.center}
                  radius={geo.radius}
                  pathOptions={{
                    color: fence.color,
                    fillColor: fence.color,
                    fillOpacity: fence.enabled ? 0.15 : 0.05,
                    weight: 2,
                    dashArray: fence.enabled ? "5, 5" : "2, 6",
                    opacity: fence.enabled ? 1 : 0.4,
                  }}
                >
                  <Popup className="dark-popup">{fence.name}</Popup>
                </Circle>
              );
            }

            if (fence.type === "polygon" && "positions" in geo) {
              return (
                <Polygon
                  key={fence.id}
                  positions={geo.positions}
                  pathOptions={{
                    color: fence.color,
                    fillColor: fence.color,
                    fillOpacity: fence.enabled ? 0.15 : 0.05,
                    weight: 2,
                    dashArray: fence.enabled ? "5, 5" : "2, 6",
                    opacity: fence.enabled ? 1 : 0.4,
                  }}
                >
                  <Popup className="dark-popup">{fence.name}</Popup>
                </Polygon>
              );
            }

            return null;
          })}

          {tempCircleCenter && drawMode === "circle" && (
            <Circle
              center={tempCircleCenter}
              radius={tempCircleRadius}
              pathOptions={{
                color: selectedColor,
                fillColor: selectedColor,
                fillOpacity: 0.2,
                weight: 2,
                dashArray: "5, 5",
              }}
            />
          )}

          {getPreviewPolygon().length >= 2 && drawMode === "polygon" && (
            <Polygon
              positions={getPreviewPolygon()}
              pathOptions={{
                color: selectedColor,
                fillColor: selectedColor,
                fillOpacity: 0.15,
                weight: 2,
                dashArray: "5, 5",
              }}
            />
          )}

          {tempPolygon.map((point, index) => (
            <Circle
              key={`vertex-${index}`}
              center={point}
              radius={3}
              pathOptions={{
                color: selectedColor,
                fillColor: selectedColor,
                fillOpacity: 1,
                weight: 2,
              }}
            />
          ))}
        </MapContainer>

        <div className="absolute top-4 left-4 right-4 flex justify-center z-10 pointer-events-none">
          {drawMode !== "none" && (
            <div className="pointer-events-auto px-4 py-2 bg-slate-900/80 backdrop-blur-xl rounded-full border border-slate-700/30 text-sm text-slate-300 flex items-center gap-2">
              <div
                className="w-2 h-2 rounded-full animate-pulse"
                style={{ backgroundColor: selectedColor }}
              />
              {drawMode === "circle"
                ? circleStep.current === "idle"
                  ? "点击地图设置圆心位置"
                  : "拖动调整半径大小，再次点击确认"
                : `已添加 ${tempPolygon.length} 个顶点，双击完成`}
            </div>
          )}
        </div>
      </div>

      <div className="w-80 flex-shrink-0 bg-slate-900/70 backdrop-blur-xl border-l border-slate-700/30 flex flex-col z-20">
        <div className="p-4 border-b border-slate-700/30">
          <h2 className="font-semibold text-slate-200 flex items-center gap-2">
            <Bell className="w-5 h-5 text-amber-400" />
            事件日志
            <span className="ml-auto px-2 py-0.5 text-xs font-medium bg-amber-500/20 text-amber-400 rounded-full">
              {fenceEvents.length}
            </span>
          </h2>
        </div>

        <div className="flex-1 overflow-y-auto custom-scrollbar p-3 space-y-2">
          {fenceEvents.map((event) => (
            <div
              key={event.id}
              className="p-3 rounded-xl bg-slate-800/30 border border-slate-700/30 hover:bg-slate-800/50 transition-all"
            >
              <div className="flex items-start gap-3">
                <div
                  className={`w-2 h-2 rounded-full mt-2 flex-shrink-0 ${
                    event.action === "enter" ? "bg-emerald-400" : "bg-red-400"
                  }`}
                />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-sm text-slate-200 truncate">
                      {event.fenceName}
                    </span>
                    <span
                      className={`px-1.5 py-0.5 text-xs font-medium rounded ${
                        event.action === "enter"
                          ? "bg-emerald-500/20 text-emerald-400"
                          : "bg-red-500/20 text-red-400"
                      }`}
                    >
                      {event.action === "enter" ? "进入" : "离开"}
                    </span>
                  </div>
                  <div className="text-xs text-slate-500 mt-1">
                    用户: {event.userId}
                  </div>
                  <div className="text-xs text-slate-500 mt-0.5">
                    {formatTime(event.timestamp)}
                  </div>
                </div>
              </div>
            </div>
          ))}

          {fenceEvents.length === 0 && (
            <div className="text-center py-8 text-slate-500 text-sm">
              暂无事件日志
            </div>
          )}
        </div>
      </div>

      {showNameModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-slate-900 rounded-2xl border border-slate-700/30 p-6 w-96 shadow-2xl">
            <h3 className="text-lg font-semibold text-slate-200 mb-4">
              {editingFence ? "编辑围栏" : "新建围栏"}
            </h3>

            <div className="space-y-4">
              <div>
                <label className="block text-sm text-slate-400 mb-1.5">
                  围栏名称
                </label>
                <input
                  type="text"
                  value={newFenceName}
                  onChange={(e) => setNewFenceName(e.target.value)}
                  placeholder="请输入围栏名称"
                  className="w-full px-3 py-2.5 bg-slate-800/50 border border-slate-700/30 rounded-lg text-slate-200 text-sm focus:outline-none focus:border-sky-500/50 focus:ring-1 focus:ring-sky-500/30 placeholder-slate-500"
                  autoFocus
                />
              </div>

              {!editingFence && (
                <div>
                  <label className="block text-sm text-slate-400 mb-2">
                    围栏颜色
                  </label>
                  <div className="flex gap-2">
                    {FENCE_COLORS.map((color) => (
                      <button
                        key={color}
                        onClick={() => setSelectedColor(color)}
                        className={`w-8 h-8 rounded-full transition-all ${
                          selectedColor === color
                            ? "ring-2 ring-white ring-offset-2 ring-offset-slate-900 scale-110"
                            : "hover:scale-105"
                        }`}
                        style={{ backgroundColor: color }}
                      />
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={handleCancelDraw}
                className="px-4 py-2 text-sm text-slate-400 hover:text-slate-200 transition-colors"
              >
                取消
              </button>
              <button
                onClick={editingFence ? handleUpdateFence : handleCreateFence}
                disabled={loading || !newFenceName.trim()}
                className="px-4 py-2 text-sm font-medium bg-sky-500 hover:bg-sky-600 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1.5"
              >
                <Check className="w-4 h-4" />
                {editingFence ? "保存" : "创建"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

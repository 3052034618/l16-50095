import { useEffect, useMemo, useRef, useState } from 'react';
import { MapContainer, TileLayer, Marker, Circle, Polygon, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Users, Navigation, Move, Wifi, WifiOff, Eye, EyeOff, UserCheck } from 'lucide-react';
import { useLocationStore } from '@/store/useLocationStore';
import { fetchMerchants, fetchCategories, fetchFences } from '@/utils/api';
import { haversineDistance, formatDistance } from '../../shared/geoUtils';
import type { UserLocation, Fence, Merchant } from '../../shared/types';

const BEIJING_CENTER: [number, number] = [39.9042, 116.4074];
const CURRENT_USER_ID = 'current_user';
const CURRENT_USER_NAME = '我';

function createPulseIcon(isCurrentUser = false) {
  return L.divIcon({
    className: 'custom-pulse-icon',
    html: `
      <div class="pulse-marker">
        <div class="pulse-ring" style="background: ${isCurrentUser ? 'rgba(34, 197, 94, 0.3)' : 'rgba(14, 165, 233, 0.3)'}"></div>
        <div class="pulse-dot" style="background: ${isCurrentUser ? '#22c55e' : '#0ea5e9'}"></div>
      </div>
    `,
    iconSize: [24, 24],
    iconAnchor: [12, 12],
  });
}

function createMerchantIcon() {
  return L.divIcon({
    className: 'custom-business-icon',
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

function MapController({ center }: { center: [number, number] }) {
  const map = useMap();
  useEffect(() => {
    map.setView(center, map.getZoom());
  }, [center, map]);
  return null;
}

export default function Home() {
  const {
    onlineUsers,
    currentPosition,
    fences,
    merchants,
    isConnected,
    subscribedUserId,
    setSubscribedUser,
    setCurrentPosition,
    addOrUpdateUser,
    setFences,
    setMerchants,
    setCategories,
  } = useLocationStore();

  const [mapCenter, setMapCenter] = useState<[number, number]>(BEIJING_CENTER);
  const moveIntervalRef = useRef<number | null>(null);
  const currentPosRef = useRef(currentPosition);

  const onlineUsersArray = useMemo(() => {
    return Array.from(onlineUsers.values());
  }, [onlineUsers]);

  const usersWithDistance = useMemo(() => {
    return onlineUsersArray
      .filter((user) => user.userId !== CURRENT_USER_ID)
      .map((user) => ({
        ...user,
        distance: haversineDistance(
          currentPosition.lat,
          currentPosition.lng,
          user.lat,
          user.lng
        ),
      }))
      .sort((a, b) => a.distance - b.distance);
  }, [onlineUsersArray, currentPosition]);

  const subscribedUser = useMemo(() => {
    if (!subscribedUserId) return null;
    return onlineUsers.get(subscribedUserId) || null;
  }, [subscribedUserId, onlineUsers]);

  useEffect(() => {
    const currentUser: UserLocation = {
      userId: CURRENT_USER_ID,
      name: CURRENT_USER_NAME,
      lat: BEIJING_CENTER[0],
      lng: BEIJING_CENTER[1],
      timestamp: Date.now(),
      online: true,
    };
    addOrUpdateUser(currentUser);
  }, [addOrUpdateUser]);

  useEffect(() => {
    if (subscribedUser) {
      setMapCenter([subscribedUser.lat, subscribedUser.lng]);
    } else {
      setMapCenter([currentPosition.lat, currentPosition.lng]);
    }
  }, [subscribedUser, currentPosition]);

  useEffect(() => {
    currentPosRef.current = currentPosition;
  }, [currentPosition]);

  useEffect(() => {
    const loadData = async () => {
      try {
        const [merchantsData, categoriesData, fencesData] = await Promise.all([
          fetchMerchants(),
          fetchCategories(),
          fetchFences(),
        ]);
        setMerchants(merchantsData);
        setCategories(categoriesData);
        setFences(fencesData);
      } catch (error) {
        console.error('Failed to load initial data:', error);
      }
    };
    loadData();
  }, [setMerchants, setCategories, setFences]);

  const handleMoveMe = () => {
    if (subscribedUserId) {
      setSubscribedUser(null);
    }

    const latDelta = (Math.random() - 0.5) * 0.02;
    const lngDelta = (Math.random() - 0.5) * 0.02;
    const newLat = currentPosRef.current.lat + latDelta;
    const newLng = currentPosRef.current.lng + lngDelta;

    setCurrentPosition(newLat, newLng);
    setMapCenter([newLat, newLng]);

    const currentUser: UserLocation = {
      userId: CURRENT_USER_ID,
      name: CURRENT_USER_NAME,
      lat: newLat,
      lng: newLng,
      timestamp: Date.now(),
      online: true,
    };
    addOrUpdateUser(currentUser);
  };

  const handleStartAutoMove = () => {
    if (moveIntervalRef.current) {
      clearInterval(moveIntervalRef.current);
      moveIntervalRef.current = null;
      return;
    }

    if (subscribedUserId) {
      setSubscribedUser(null);
    }

    moveIntervalRef.current = window.setInterval(() => {
      const latDelta = (Math.random() - 0.5) * 0.008;
      const lngDelta = (Math.random() - 0.5) * 0.008;
      const newLat = currentPosRef.current.lat + latDelta;
      const newLng = currentPosRef.current.lng + lngDelta;

      setCurrentPosition(newLat, newLng);
      setMapCenter([newLat, newLng]);

      const currentUser: UserLocation = {
        userId: CURRENT_USER_ID,
        name: CURRENT_USER_NAME,
        lat: newLat,
        lng: newLng,
        timestamp: Date.now(),
        online: true,
      };
      addOrUpdateUser(currentUser);
    }, 2000);
  };

  const handleSubscribeUser = (userId: string) => {
    if (subscribedUserId === userId) {
      setSubscribedUser(null);
      setMapCenter([currentPosition.lat, currentPosition.lng]);
    } else {
      setSubscribedUser(userId);
    }
  };

  useEffect(() => {
    return () => {
      if (moveIntervalRef.current) {
        clearInterval(moveIntervalRef.current);
      }
    };
  }, []);

  useEffect(() => {
    const GridLayerProto = L.GridLayer.prototype as unknown as {
      _initTile: (tile: HTMLElement) => void;
    };
    const originalInitTile = GridLayerProto._initTile;
    GridLayerProto._initTile = function (tile: HTMLElement) {
      originalInitTile.call(this, tile);
      tile.style.filter = 'brightness(0.6) invert(1) contrast(3) hue-rotate(200deg) saturate(0.3) brightness(0.7)';
    };

    return () => {
      GridLayerProto._initTile = originalInitTile;
    };
  }, []);

  const renderFence = (fence: Fence) => {
    if (fence.type === 'circle') {
      const geom = fence.geometry as { center: { lat: number; lng: number }; radius: number };
      return (
        <Circle
          key={fence.id}
          center={[geom.center.lat, geom.center.lng]}
          radius={geom.radius}
          pathOptions={{
            color: fence.color || '#0ea5e9',
            fillColor: fence.color || '#0ea5e9',
            fillOpacity: 0.1,
            weight: 2,
            dashArray: '5, 5',
          }}
        >
          <Popup className="dark-popup">{fence.name}</Popup>
        </Circle>
      );
    } else {
      const geom = fence.geometry as { paths: { lat: number; lng: number }[] };
      const positions: [number, number][] = geom.paths.map((p) => [p.lat, p.lng]);
      return (
        <Polygon
          key={fence.id}
          positions={positions}
          pathOptions={{
            color: fence.color || '#f59e0b',
            fillColor: fence.color || '#f59e0b',
            fillOpacity: 0.1,
            weight: 2,
            dashArray: '5, 5',
          }}
        >
          <Popup className="dark-popup">{fence.name}</Popup>
        </Polygon>
      );
    }
  };

  return (
    <div className="h-full w-full flex">
      <aside className="w-72 h-full bg-slate-900/70 backdrop-blur-xl border-r border-slate-700/30 glass-effect flex flex-col flex-shrink-0">
        <div className="p-4 border-b border-slate-700/30">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Users className="w-5 h-5 text-sky-400" />
              <span className="font-semibold text-slate-200">在线用户</span>
              <span className="px-2 py-0.5 text-xs font-medium bg-sky-500/20 text-sky-400 rounded-full">
                {usersWithDistance.length}
              </span>
            </div>
            <div className="flex items-center gap-1">
              {isConnected ? (
                <Wifi className="w-4 h-4 text-emerald-400" />
              ) : (
                <WifiOff className="w-4 h-4 text-slate-500" />
              )}
            </div>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto custom-scrollbar p-3 space-y-2">
          <div className="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
            <div className="flex items-center gap-3">
              <div className="relative flex-shrink-0">
                <div className="w-10 h-10 rounded-full bg-emerald-500/20 flex items-center justify-center ring-2 ring-emerald-500/30">
                  <span className="text-emerald-400 font-medium text-sm">我</span>
                </div>
                <span className="absolute bottom-0 right-0 w-3 h-3 rounded-full ring-2 ring-slate-900 bg-emerald-400" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <span className="font-medium text-sm text-emerald-400">{CURRENT_USER_NAME}</span>
                </div>
                <div className="flex items-center gap-1 mt-0.5">
                  <Navigation className="w-3 h-3 text-emerald-400" />
                  <span className="text-xs text-emerald-400/70">当前位置</span>
                </div>
              </div>
            </div>
          </div>

          {usersWithDistance.map((user) => (
            <div
              key={user.userId}
              onClick={() => handleSubscribeUser(user.userId)}
              className={`group flex items-center gap-3 p-2.5 rounded-xl transition-all duration-200 cursor-pointer ${
                subscribedUserId === user.userId
                  ? 'bg-sky-500/20 border border-sky-500/30'
                  : 'hover:bg-slate-800/50 border border-transparent'
              }`}
            >
              <div className="relative flex-shrink-0">
                <div
                  className={`w-10 h-10 rounded-full flex items-center justify-center ring-2 ${
                    subscribedUserId === user.userId
                      ? 'bg-sky-500/30 ring-sky-500/50'
                      : 'bg-slate-700 ring-slate-700/50'
                  }`}
                >
                  <span
                    className={`font-medium text-sm ${
                      subscribedUserId === user.userId ? 'text-sky-300' : 'text-slate-300'
                    }`}
                  >
                    {user.name.charAt(0)}
                  </span>
                </div>
                <span
                  className={`absolute bottom-0 right-0 w-3 h-3 rounded-full ring-2 ring-slate-900 ${
                    user.online ? 'bg-emerald-400' : 'bg-slate-500'
                  }`}
                />
                {subscribedUserId === user.userId && (
                  <div className="absolute -top-1 -right-1 w-4 h-4 bg-sky-500 rounded-full flex items-center justify-center ring-2 ring-slate-900">
                    <Eye className="w-2.5 h-2.5 text-white" />
                  </div>
                )}
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <span
                    className={`font-medium text-sm truncate ${
                      user.online
                        ? subscribedUserId === user.userId
                          ? 'text-sky-300'
                          : 'text-slate-200'
                        : 'text-slate-500'
                    }`}
                  >
                    {user.name}
                  </span>
                </div>
                <div className="flex items-center gap-1 mt-0.5">
                  <Navigation
                    className={`w-3 h-3 ${
                      subscribedUserId === user.userId ? 'text-sky-400' : 'text-sky-400'
                    }`}
                  />
                  <span
                    className={`text-xs ${
                      subscribedUserId === user.userId ? 'text-sky-400' : 'text-slate-500'
                    }`}
                  >
                    {subscribedUserId === user.userId
                      ? '跟随中'
                      : formatDistance(user.distance)}
                  </span>
                </div>
              </div>
            </div>
          ))}

          {usersWithDistance.length === 0 && (
            <div className="text-center py-8">
              <Users className="w-8 h-8 text-slate-600 mx-auto mb-2" />
              <p className="text-sm text-slate-500">暂无其他在线用户</p>
            </div>
          )}
        </div>

        <div className="p-4 border-t border-slate-700/30 space-y-2">
          <button
            onClick={handleMoveMe}
            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-sky-500/20 text-sky-400 rounded-xl hover:bg-sky-500/30 transition-colors text-sm font-medium"
          >
            <Move className="w-4 h-4" />
            随机移动
          </button>
          <button
            onClick={handleStartAutoMove}
            className={`w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl transition-colors text-sm font-medium ${
              moveIntervalRef.current
                ? 'bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30'
                : 'bg-slate-700/50 text-slate-300 hover:bg-slate-700'
            }`}
          >
            {moveIntervalRef.current ? '停止自动移动' : '开始自动移动'}
          </button>
        </div>
      </aside>

      <div className="flex-1 relative">
        <MapContainer
          center={mapCenter}
          zoom={14}
          className="w-full h-full z-0"
          zoomControl={false}
          attributionControl={false}
        >
          <TileLayer
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            maxZoom={19}
          />

          <MapController center={mapCenter} />

          {fences.map((fence) => renderFence(fence))}

          {merchants.map((merchant: Merchant) => (
            <Marker
              key={merchant.id}
              position={[merchant.lat, merchant.lng]}
              icon={createMerchantIcon()}
            >
              <Popup className="dark-popup">
                <div className="text-center">
                  <div className="font-medium text-slate-200">{merchant.name}</div>
                  <div className="text-xs text-amber-400 mt-1">{merchant.category}</div>
                </div>
              </Popup>
            </Marker>
          ))}

          {onlineUsersArray.map((user) => (
            <Marker
              key={user.userId}
              position={[user.lat, user.lng]}
              icon={createPulseIcon(user.userId === CURRENT_USER_ID)}
            >
              <Popup className="dark-popup">
                <div className="text-center">
                  <div className="font-medium text-slate-200">{user.name}</div>
                  <div className="text-xs text-slate-400 mt-1">
                    {user.online ? '在线' : '离线'}
                  </div>
                </div>
              </Popup>
            </Marker>
          ))}
        </MapContainer>

        <div className="absolute top-4 right-4 z-[1000] glass-effect rounded-xl p-3 border border-slate-700/30">
          <div className="text-xs text-slate-400 mb-1">当前位置</div>
          <div className="text-sm font-mono text-slate-200">
            {currentPosition.lat.toFixed(4)}, {currentPosition.lng.toFixed(4)}
          </div>
        </div>

        <div className="absolute bottom-4 right-4 z-[1000] flex gap-2">
          <div className="glass-effect rounded-xl px-3 py-2 border border-slate-700/30 flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-sky-500" />
            <span className="text-xs text-slate-300">用户</span>
          </div>
          <div className="glass-effect rounded-xl px-3 py-2 border border-slate-700/30 flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-amber-500" />
            <span className="text-xs text-slate-300">商家</span>
          </div>
          <div className="glass-effect rounded-xl px-3 py-2 border border-slate-700/30 flex items-center gap-2">
            <div className="w-3 h-3 rounded-full border-2 border-dashed border-sky-500" />
            <span className="text-xs text-slate-300">围栏</span>
          </div>
        </div>
      </div>
    </div>
  );
}

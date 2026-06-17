import { useState, useMemo, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Circle, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Search, Navigation, Filter, MapPin, Users, Store, ToggleLeft, ToggleRight } from 'lucide-react';
import { useLocationStore } from '@/store/useLocationStore';
import { fetchNearby, fetchCategories } from '@/utils/api';
import { formatDistance } from '../../shared/geoUtils';
import type { NearbyItem, Category } from '../../shared/types';

const BEIJING_CENTER: [number, number] = [39.9042, 116.4074];

function createResultIcon(type: 'user' | 'merchant') {
  const color = type === 'user' ? '#0ea5e9' : '#f59e0b';
  return L.divIcon({
    className: 'custom-result-icon',
    html: `
      <div style="
        width: 28px;
        height: 28px;
        background: ${color};
        border: 3px solid #ffffff;
        border-radius: 50%;
        box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
        display: flex;
        align-items: center;
        justify-content: center;
      ">
        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="white">
          ${type === 'user' 
            ? '<path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/>'
            : '<path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/>'
          }
        </svg>
      </div>
    `,
    iconSize: [28, 28],
    iconAnchor: [14, 14],
  });
}

function MapController({ center, zoom }: { center: [number, number]; zoom: number }) {
  const map = useMap();
  useEffect(() => {
    map.setView(center, zoom);
  }, [center, zoom, map]);
  return null;
}

export default function Nearby() {
  const { currentPosition, categories, setCategories, setCurrentPosition, setCurrentUser } = useLocationStore();
  const [radius, setRadius] = useState(1000);
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [showUsers, setShowUsers] = useState(true);
  const [showMerchants, setShowMerchants] = useState(true);
  const [results, setResults] = useState<NearbyItem[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [mapCenter, setMapCenter] = useState<[number, number]>(BEIJING_CENTER);
  const [mapZoom, setMapZoom] = useState(14);

  useEffect(() => {
    setCurrentUser('current_user');
    setCurrentPosition(BEIJING_CENTER[0], BEIJING_CENTER[1]);
    setMapCenter(BEIJING_CENTER);
  }, [setCurrentUser, setCurrentPosition]);

  useEffect(() => {
    const loadCategories = async () => {
      try {
        const cats = await fetchCategories();
        setCategories(cats);
      } catch (error) {
        console.error('Failed to load categories:', error);
      }
    };
    if (categories.length === 0) {
      loadCategories();
    }
  }, [categories.length, setCategories]);

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

  const sortedResults = useMemo(() => {
    return [...results].sort((a, b) => a.distance - b.distance);
  }, [results]);

  const toggleCategory = (categoryId: string) => {
    setSelectedCategories((prev) =>
      prev.includes(categoryId)
        ? prev.filter((id) => id !== categoryId)
        : [...prev, categoryId]
    );
  };

  const getSearchType = (): 'user' | 'merchant' | 'all' => {
    if (showUsers && showMerchants) return 'all';
    if (showUsers) return 'user';
    if (showMerchants) return 'merchant';
    return 'all';
  };

  const handleSearch = async () => {
    if (!showUsers && !showMerchants) {
      setResults([]);
      setHasSearched(true);
      return;
    }

    setIsSearching(true);
    setHasSearched(true);
    try {
      const searchType = getSearchType();
      let allResults: NearbyItem[] = [];

      if (selectedCategories.length === 0 || searchType === 'user') {
        if (searchType !== 'merchant') {
          const result = await fetchNearby(
            currentPosition.lat || BEIJING_CENTER[0],
            currentPosition.lng || BEIJING_CENTER[1],
            radius,
            undefined,
            searchType === 'all' ? 'user' : searchType
          );
          allResults = result.items;
        }

        if (searchType === 'all' || searchType === 'merchant') {
          const merchantResult = await fetchNearby(
            currentPosition.lat || BEIJING_CENTER[0],
            currentPosition.lng || BEIJING_CENTER[1],
            radius,
            undefined,
            'merchant'
          );
          allResults = [...allResults, ...merchantResult.items];
        }
      } else {
        const promises = selectedCategories.map((cat) =>
          fetchNearby(
            currentPosition.lat || BEIJING_CENTER[0],
            currentPosition.lng || BEIJING_CENTER[1],
            radius,
            cat,
            'merchant'
          )
        );
        const resultsArray = await Promise.all(promises);
        const seenIds = new Set<string>();
        resultsArray.forEach((res) => {
          res.items.forEach((item) => {
            if (!seenIds.has(item.id)) {
              seenIds.add(item.id);
              allResults.push(item);
            }
          });
        });

        if (showUsers && searchType === 'all') {
          const userResult = await fetchNearby(
            currentPosition.lat || BEIJING_CENTER[0],
            currentPosition.lng || BEIJING_CENTER[1],
            radius,
            undefined,
            'user'
          );
          allResults = [...userResult.items, ...allResults];
        }
      }

      const uniqueResults = allResults.filter(
        (item, index, self) => index === self.findIndex((t) => t.id === item.id && t.type === item.type)
      );

      setResults(uniqueResults);

      if (uniqueResults.length > 0) {
        const lats = uniqueResults.map((r) => r.lat);
        const lngs = uniqueResults.map((r) => r.lng);
        const minLat = Math.min(...lats, currentPosition.lat || BEIJING_CENTER[0]);
        const maxLat = Math.max(...lats, currentPosition.lat || BEIJING_CENTER[0]);
        const minLng = Math.min(...lngs, currentPosition.lng || BEIJING_CENTER[1]);
        const maxLng = Math.max(...lngs, currentPosition.lng || BEIJING_CENTER[1]);
        const centerLat = (minLat + maxLat) / 2;
        const centerLng = (minLng + maxLng) / 2;
        setMapCenter([centerLat, centerLng]);
        setMapZoom(13);
      }
    } catch (error) {
      console.error('Search failed:', error);
    } finally {
      setIsSearching(false);
    }
  };

  const getCategoryName = (categoryId?: string) => {
    if (!categoryId) return '';
    const cat = categories.find((c: Category) => c.id === categoryId);
    return cat?.name || categoryId;
  };

  const handleResultClick = (item: NearbyItem) => {
    setMapCenter([item.lat, item.lng]);
    setMapZoom(16);
  };

  return (
    <div className="h-full w-full flex flex-col">
      <div className="flex-1 flex min-h-0">
        <div className="flex-1 relative">
          <MapContainer
            center={mapCenter}
            zoom={mapZoom}
            className="w-full h-full z-0"
            zoomControl={false}
            attributionControl={false}
          >
            <TileLayer
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              maxZoom={19}
            />

            <MapController center={mapCenter} zoom={mapZoom} />

            <Circle
              center={[currentPosition.lat || BEIJING_CENTER[0], currentPosition.lng || BEIJING_CENTER[1]]}
              radius={radius}
              pathOptions={{
                color: '#0ea5e9',
                fillColor: '#0ea5e9',
                fillOpacity: 0.05,
                weight: 2,
                dashArray: '5, 5',
              }}
            />

            <Marker
              position={[currentPosition.lat || BEIJING_CENTER[0], currentPosition.lng || BEIJING_CENTER[1]]}
              icon={L.divIcon({
                className: 'custom-current-icon',
                html: `
                  <div style="
                    position: relative;
                    width: 24px;
                    height: 24px;
                  ">
                    <div style="
                      position: absolute;
                      top: 50%;
                      left: 50%;
                      transform: translate(-50%, -50%);
                      width: 16px;
                      height: 16px;
                      background: #22c55e;
                      border: 3px solid #ffffff;
                      border-radius: 50%;
                      box-shadow: 0 0 10px rgba(34, 197, 94, 0.5);
                    "></div>
                  </div>
                `,
                iconSize: [24, 24],
                iconAnchor: [12, 12],
              })}
            >
              <Popup className="dark-popup">
                <div className="text-center">
                  <div className="font-medium text-emerald-400">我的位置</div>
                </div>
              </Popup>
            </Marker>

            {sortedResults.map((item) => (
              <Marker
                key={item.id}
                position={[item.lat, item.lng]}
                icon={createResultIcon(item.type)}
              >
                <Popup className="dark-popup">
                  <div className="text-center">
                    <div className="font-medium text-slate-200">{item.name}</div>
                    <div className={`text-xs mt-1 ${item.type === 'user' ? 'text-sky-400' : 'text-amber-400'}`}>
                      {item.type === 'user' ? '用户' : getCategoryName(item.category)}
                    </div>
                    <div className="text-xs text-slate-400 mt-1">
                      {formatDistance(item.distance)}
                    </div>
                  </div>
                </Popup>
              </Marker>
            ))}
          </MapContainer>

          <div className="absolute top-4 left-4 z-[1000] glass-effect rounded-xl p-3 border border-slate-700/30">
            <div className="text-xs text-slate-400 mb-1">搜索范围</div>
            <div className="text-sm font-medium text-sky-400">{formatDistance(radius)}</div>
          </div>

          <div className="absolute top-4 right-4 z-[1000] glass-effect rounded-xl p-3 border border-slate-700/30">
            <div className="text-xs text-slate-400 mb-1">找到结果</div>
            <div className="text-sm font-medium text-amber-400">{results.length} 个</div>
          </div>
        </div>

        <aside className="w-80 h-full bg-slate-900/70 backdrop-blur-xl border-l border-slate-700/30 glass-effect flex flex-col flex-shrink-0">
          <div className="p-4 border-b border-slate-700/30">
            <div className="flex items-center gap-2 mb-4">
              <Filter className="w-5 h-5 text-sky-400" />
              <span className="font-semibold text-slate-200">筛选条件</span>
            </div>

            <div className="mb-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-slate-400">距离范围</span>
                <span className="text-sm font-medium text-sky-400">{formatDistance(radius)}</span>
              </div>
              <input
                type="range"
                min="500"
                max="5000"
                step="100"
                value={radius}
                onChange={(e) => setRadius(Number(e.target.value))}
                className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-sky-500"
                style={{
                  background: `linear-gradient(to right, #0ea5e9 0%, #0ea5e9 ${((radius - 500) / 4500) * 100}%, #334155 ${((radius - 500) / 4500) * 100}%, #334155 100%)`,
                }}
              />
              <div className="flex justify-between mt-1">
                <span className="text-xs text-slate-500">500m</span>
                <span className="text-xs text-slate-500">5km</span>
              </div>
            </div>

            <div className="mb-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-slate-400">搜索类型</span>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => setShowUsers(!showUsers)}
                  className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium transition-all ${
                    showUsers
                      ? 'bg-sky-500/20 text-sky-400 border border-sky-500/30'
                      : 'bg-slate-800/50 text-slate-500 border border-slate-700/30 hover:bg-slate-800'
                  }`}
                >
                  <Users className="w-4 h-4" />
                  用户
                </button>
                <button
                  onClick={() => setShowMerchants(!showMerchants)}
                  className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium transition-all ${
                    showMerchants
                      ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                      : 'bg-slate-800/50 text-slate-500 border border-slate-700/30 hover:bg-slate-800'
                  }`}
                >
                  <Store className="w-4 h-4" />
                  商家
                </button>
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-slate-400">类别筛选</span>
                {selectedCategories.length > 0 && (
                  <button
                    onClick={() => setSelectedCategories([])}
                    className="text-xs text-sky-400 hover:text-sky-300 transition-colors"
                  >
                    清除
                  </button>
                )}
              </div>
              <div className="flex flex-wrap gap-2">
                {categories.map((category: Category) => (
                  <button
                    key={category.id}
                    onClick={() => toggleCategory(category.id)}
                    disabled={!showMerchants}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-200 ${
                      selectedCategories.includes(category.id)
                        ? 'bg-sky-500/30 text-sky-400 border border-sky-500/50'
                        : showMerchants
                        ? 'bg-slate-700/50 text-slate-300 border border-slate-600/50 hover:bg-slate-700 hover:border-slate-500'
                        : 'bg-slate-800/30 text-slate-600 border border-slate-700/20 cursor-not-allowed'
                    }`}
                  >
                    {category.name}
                  </button>
                ))}
                {categories.length === 0 && (
                  <span className="text-xs text-slate-500">加载中...</span>
                )}
              </div>
              {!showMerchants && selectedCategories.length > 0 && (
                <p className="text-xs text-amber-400/70 mt-2">
                  已关闭商家搜索，类别筛选暂不生效
                </p>
              )}
            </div>
          </div>

          <div className="p-4 border-t border-slate-700/30">
            <button
              onClick={handleSearch}
              disabled={isSearching}
              className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-sky-500 text-white rounded-xl hover:bg-sky-600 transition-colors text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Search className="w-4 h-4" />
              {isSearching ? '搜索中...' : '搜索附近'}
            </button>
          </div>
        </aside>
      </div>

      <div className="h-64 border-t border-slate-700/30 glass-effect bg-slate-900/70 backdrop-blur-xl flex-shrink-0">
        <div className="p-3 border-b border-slate-700/30 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <MapPin className="w-4 h-4 text-sky-400" />
            <span className="text-sm font-medium text-slate-200">搜索结果</span>
            <span className="px-2 py-0.5 text-xs font-medium bg-sky-500/20 text-sky-400 rounded-full">
              {sortedResults.length}
            </span>
          </div>
          <span className="text-xs text-slate-500">按距离排序</span>
        </div>
        <div className="h-[calc(100%-44px)] overflow-y-auto custom-scrollbar p-3">
          <div className="grid grid-cols-4 gap-3">
            {sortedResults.map((item) => (
              <div
                key={item.id}
                onClick={() => handleResultClick(item)}
                className="group bg-slate-800/50 hover:bg-slate-700/50 border border-slate-700/50 hover:border-sky-500/30 rounded-xl p-3 cursor-pointer transition-all duration-200"
              >
                <div className="flex items-start gap-3">
                  <div
                    className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${
                      item.type === 'user' ? 'bg-sky-500/20' : 'bg-amber-500/20'
                    }`}
                  >
                    {item.type === 'user' ? (
                      <span className="text-sky-400 font-medium text-sm">
                        {item.name.charAt(0)}
                      </span>
                    ) : (
                      <MapPin className="w-5 h-5 text-amber-400" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-sm text-slate-200 truncate group-hover:text-sky-400 transition-colors">
                      {item.name}
                    </div>
                    <div className="flex items-center gap-2 mt-1">
                      <span
                        className={`text-xs ${
                          item.type === 'user' ? 'text-sky-400' : 'text-amber-400'
                        }`}
                      >
                        {item.type === 'user' ? '用户' : getCategoryName(item.category)}
                      </span>
                      <span className="text-slate-600">·</span>
                      <div className="flex items-center gap-1">
                        <Navigation className="w-3 h-3 text-slate-400" />
                        <span className="text-xs text-slate-400">
                          {formatDistance(item.distance)}
                        </span>
                      </div>
                    </div>
                    {item.type === 'user' && item.online !== undefined && (
                      <div className="flex items-center gap-1 mt-1">
                        <span
                          className={`w-2 h-2 rounded-full ${
                            item.online ? 'bg-emerald-400' : 'bg-slate-500'
                          }`}
                        />
                        <span className="text-xs text-slate-500">
                          {item.online ? '在线' : '离线'}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}

            {sortedResults.length === 0 && (
              <div className="col-span-4 text-center py-8">
                <Search className="w-10 h-10 text-slate-600 mx-auto mb-2" />
                <p className="text-sm text-slate-500">点击搜索按钮查找附近</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

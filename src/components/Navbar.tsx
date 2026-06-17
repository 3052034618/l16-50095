import { NavLink } from 'react-router-dom';
import { Map, Search, Shield, Route, Thermometer, Wifi, WifiOff } from 'lucide-react';
import { useLocationStore } from '@/store/useLocationStore';

export default function Navbar() {
  const isConnected = useLocationStore((state) => state.isConnected);

  const navItems = [
    { path: "/", label: "实时地图", icon: Map },
    { path: "/nearby", label: "附近搜索", icon: Search },
    { path: "/fences", label: "围栏管理", icon: Shield },
    { path: "/track", label: "轨迹回放", icon: Route },
    { path: "/heatmap", label: "热力图", icon: Thermometer },
  ];

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 h-16 bg-slate-900/90 backdrop-blur-md border-b border-slate-700/50">
      <div className="h-full px-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-sky-500 to-cyan-400 flex items-center justify-center shadow-lg shadow-sky-500/30">
            <Map className="w-6 h-6 text-white" />
          </div>
          <div className="flex flex-col">
            <span className="text-xl font-bold bg-gradient-to-r from-sky-400 to-cyan-300 bg-clip-text text-transparent">
              GeoLoc
            </span>
            <span className="text-xs text-slate-500">实时定位系统</span>
          </div>
        </div>

        <div className="flex items-center gap-1">
          {navItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              end={item.path === "/"}
              className={({ isActive }) =>
                `px-4 py-2 rounded-lg flex items-center gap-2 text-sm font-medium transition-all duration-200 ${
                  isActive
                    ? "bg-sky-500/20 text-sky-400 shadow-inner"
                    : "text-slate-400 hover:text-sky-300 hover:bg-slate-800/50"
                }`
              }
            >
              <item.icon className="w-4 h-4" />
              {item.label}
            </NavLink>
          ))}
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-800/50 border border-slate-700/50">
            <div className="relative">
              {isConnected ? (
                <Wifi className="w-4 h-4 text-emerald-400" />
              ) : (
                <WifiOff className="w-4 h-4 text-red-400" />
              )}
              <span
                className={`absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full ${
                  isConnected ? "bg-emerald-400 animate-pulse" : "bg-red-400"
                }`}
              />
            </div>
            <span
              className={`text-xs font-medium ${
                isConnected ? "text-emerald-400" : "text-red-400"
              }`}
            >
              {isConnected ? "已连接" : "未连接"}
            </span>
          </div>
        </div>
      </div>
    </nav>
  );
}

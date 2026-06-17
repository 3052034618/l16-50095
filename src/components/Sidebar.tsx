import { useState, useMemo } from 'react';
import { Users, ChevronLeft, ChevronRight, Navigation } from 'lucide-react';
import { useLocationStore } from '@/store/useLocationStore';
import { haversineDistance, formatDistance } from '../../shared/geoUtils';

interface SidebarProps {
  defaultCollapsed?: boolean;
}

export default function Sidebar({ defaultCollapsed = false }: SidebarProps) {
  const [collapsed, setCollapsed] = useState(defaultCollapsed);
  const onlineUsers = useLocationStore((state) => state.onlineUsers);
  const currentPosition = useLocationStore((state) => state.currentPosition);
  const currentUserId = useLocationStore((state) => state.currentUserId);

  const userList = useMemo(() => {
    const users = Array.from(onlineUsers.values()).filter(
      (u) => u.userId !== currentUserId
    );

    return users
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
  }, [onlineUsers, currentPosition, currentUserId]);

  const onlineCount = userList.length;

  return (
    <aside
      className={`fixed top-16 left-0 bottom-0 z-40 transition-all duration-300 ease-in-out ${
        collapsed ? "w-16" : "w-72"
      }`}
    >
      <div className="h-full bg-slate-900/70 backdrop-blur-xl border-r border-slate-700/30 glass-effect flex flex-col">
        <div className="p-4 border-b border-slate-700/30 flex items-center justify-between">
          {!collapsed && (
            <div className="flex items-center gap-2">
              <Users className="w-5 h-5 text-sky-400" />
              <span className="font-semibold text-slate-200">在线用户</span>
              <span className="px-2 py-0.5 text-xs font-medium bg-sky-500/20 text-sky-400 rounded-full">
                {onlineCount}
              </span>
            </div>
          )}
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="p-1.5 rounded-lg text-slate-400 hover:text-sky-400 hover:bg-slate-800/50 transition-colors"
          >
            {collapsed ? (
              <ChevronRight className="w-5 h-5" />
            ) : (
              <ChevronLeft className="w-5 h-5" />
            )}
          </button>
        </div>

        <div className="flex-1 overflow-y-auto custom-scrollbar p-3 space-y-2">
          {userList.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <Users className="w-10 h-10 text-slate-600 mb-2" />
              <span className="text-sm text-slate-500">暂无在线用户</span>
            </div>
          ) : (
            userList.map((user) => (
              <div
                key={user.userId}
                className={`group flex items-center gap-3 p-2.5 rounded-xl transition-all duration-200 cursor-pointer hover:bg-slate-800/50 ${
                  collapsed ? 'justify-center' : ''
                }`}
              >
                <div className="relative flex-shrink-0">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-sky-500 to-cyan-400 flex items-center justify-center text-white font-semibold text-sm ring-2 ring-slate-700/50">
                    {user.name.charAt(0)}
                  </div>
                  <span
                    className={`absolute bottom-0 right-0 w-3 h-3 rounded-full ring-2 ring-slate-900 ${
                      user.online ? 'bg-emerald-400 animate-pulse' : 'bg-slate-500'
                    }`}
                  />
                </div>

                {!collapsed && (
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <span
                        className={`font-medium text-sm truncate ${
                          user.online ? 'text-slate-200' : 'text-slate-500'
                        }`}
                      >
                        {user.name}
                      </span>
                    </div>
                    <div className="flex items-center gap-1 mt-0.5">
                      <Navigation className="w-3 h-3 text-sky-400" />
                      <span className="text-xs text-slate-500">
                        {formatDistance(user.distance)}
                      </span>
                    </div>
                  </div>
                )}
              </div>
            ))
          )}
        </div>

        {!collapsed && (
          <div className="p-4 border-t border-slate-700/30">
            <div className="text-xs text-slate-500 text-center">
              共 {userList.length} 位在线用户
            </div>
          </div>
        )}
      </div>
    </aside>
  );
}

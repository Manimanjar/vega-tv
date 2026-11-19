import React from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { Home, Search, Bookmark, Settings } from 'lucide-react';

export const BottomNav: React.FC = () => {
  const location = useLocation();

  const navItems = [
    { name: 'Home', path: '/', icon: Home },
    { name: 'Search', path: '/search', icon: Search },
    { name: 'Library', path: '/library', icon: Bookmark },
    { name: 'Settings', path: '/settings', icon: Settings },
  ];

  return (
    <nav
      data-nav-section="navigation-bar"
      className="fixed bottom-0 inset-x-0 z-40 bg-vega-black/95 backdrop-blur-2xl border-t border-white/10 safe-area-pb"
    >
      <div className="max-w-md sm:max-w-xl mx-auto flex items-center justify-around h-16 px-4">
        {navItems.map((item) => {
          const isActive =
            item.path === '/'
              ? location.pathname === '/'
              : location.pathname.startsWith(item.path);

          const Icon = item.icon;

          return (
            <NavLink
              key={item.path}
              to={item.path}
              data-focusable="true"
              data-nav-section="navigation-bar"
              className="flex flex-col items-center justify-center flex-1 h-full py-1 group focus:outline-none select-none transition-transform active:scale-90"
            >
              {/* Material 3 active pill background */}
              <div
                className={`flex items-center justify-center w-16 h-8 rounded-full transition-all duration-300 ${
                  isActive
                    ? 'bg-vega-navPill text-white shadow-md'
                    : 'bg-transparent text-vega-textSecondary group-hover:text-white'
                }`}
              >
                <Icon
                  className={`w-5 h-5 transition-transform duration-200 ${
                    isActive ? 'scale-110 text-vega-ctaPrimary' : 'group-hover:scale-105'
                  }`}
                />
              </div>

              {/* Label */}
              <span
                className={`text-[11px] font-medium tracking-tight transition-colors duration-200 mt-0.5 ${
                  isActive ? 'text-white font-bold' : 'text-vega-textSecondary group-hover:text-white'
                }`}
              >
                {item.name}
              </span>
            </NavLink>
          );
        })}
      </div>
    </nav>
  );
};

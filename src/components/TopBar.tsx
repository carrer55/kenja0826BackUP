import React from 'react';
import { Menu } from 'lucide-react';

interface TopBarProps {
  onMenuClick: () => void;
  onNavigate?: (view: string) => void;
}

function TopBar({ onMenuClick, onNavigate }: TopBarProps) {
  return (
    <div className="h-16 backdrop-blur-xl bg-white/10 border-b border-white/20 flex items-center justify-between px-4 lg:px-6 shadow-xl relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-r from-white/20 via-white/10 to-white/20 backdrop-blur-xl"></div>
      <div className="absolute inset-0 bg-gradient-to-r from-blue-50/20 to-indigo-50/20"></div>
      
      <div className="flex items-center space-x-4">
        <button
          onClick={onMenuClick}
          className="lg:hidden p-3 text-gray-600 hover:text-gray-800 hover:bg-white/30 rounded-lg transition-all duration-200 backdrop-blur-sm hover:shadow-lg relative z-10 touch-manipulation"
        >
          <Menu className="w-6 h-6" />
        </button>
      </div>

      <div className="flex items-center space-x-2 lg:space-x-4 relative z-10">
        <div className="w-20 h-10 bg-gradient-to-br from-navy-600 to-navy-800 rounded-full flex items-center justify-center ml-2 shadow-lg px-4">
          <span className="text-white text-sm font-bold">Pro</span>
        </div>
      </div>
    </div>
  );
}

export default TopBar;
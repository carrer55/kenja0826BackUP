import React from 'react';
import StatsCards from './StatsCards';
import QuickActions from './QuickActions';

interface MainContentProps {
  onNavigate: (view: string) => void;
  onShowDetail: (type: 'business-trip' | 'expense', id: string) => void;
  onCreateApplication: (type: 'business_trip' | 'expense') => void;
  onShowNotifications: () => void;
}

function MainContent({ onNavigate, onShowDetail, onCreateApplication, onShowNotifications }: MainContentProps) {
  return (
    <div className="flex-1 overflow-auto p-4 lg:p-6">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-6 lg:mb-8">
          <h1 className="text-2xl lg:text-3xl font-bold text-slate-800">ダッシュボード</h1>
        </div>
        
        <StatsCards />
        <QuickActions onNavigate={onNavigate} onCreateApplication={onCreateApplication} />
      </div>
    </div>
  );
}

export default MainContent;
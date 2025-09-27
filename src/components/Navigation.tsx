import React from 'react';
import { Home, Users, Gamepad2, MapPin, TrendingUp, User, Crown } from 'lucide-react';
import { TabType } from '../App';

interface NavigationProps {
  activeTab: TabType;
  setActiveTab: (tab: TabType) => void;
  isPremium: boolean;
}

export default function Navigation({ activeTab, setActiveTab, isPremium }: NavigationProps) {
  const navItems = [
    { id: 'dashboard' as TabType, icon: Home, label: 'Home' },
    { id: 'matching' as TabType, icon: Users, label: 'Match' },
    { id: 'games' as TabType, icon: Gamepad2, label: 'Games' },
    { id: 'dates' as TabType, icon: MapPin, label: 'Dates' },
    { id: 'improvement' as TabType, icon: TrendingUp, label: 'Improve' },
    { id: 'profile' as TabType, icon: User, label: 'Profile' },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white/90 backdrop-blur-sm border-t border-purple-100 px-2 py-2 z-50">
      <div className="flex justify-around items-center max-w-md mx-auto">
        {navItems.map(({ id, icon: Icon, label }) => (
          <button
            key={id}
            onClick={() => setActiveTab(id)}
            className={`flex flex-col items-center space-y-1 px-3 py-2 rounded-lg transition-all duration-200 ${
              activeTab === id
                ? 'text-purple-600 bg-purple-50'
                : 'text-gray-500 hover:text-purple-500'
            }`}
          >
            <Icon className="h-5 w-5" />
            <span className="text-xs font-medium">{label}</span>
          </button>
        ))}
        
        <button
          onClick={() => setActiveTab('premium')}
          className={`flex flex-col items-center space-y-1 px-3 py-2 rounded-lg transition-all duration-200 ${
            activeTab === 'premium'
              ? 'text-yellow-600 bg-yellow-50'
              : 'text-yellow-500 hover:text-yellow-600'
          }`}
        >
          <Crown className="h-5 w-5" />
          <span className="text-xs font-medium">Premium</span>
        </button>
      </div>
    </nav>
  );
}
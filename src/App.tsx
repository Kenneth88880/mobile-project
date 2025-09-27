import React, { useState } from 'react';
import { Heart, Users, Gamepad2, MapPin, Star, Settings, Crown, Camera, TrendingUp } from 'lucide-react';
import Header from './components/Header';
import Navigation from './components/Navigation';
import Dashboard from './components/Dashboard';
import Matching from './components/Matching';
import Games from './components/Games';
import DateIdeas from './components/DateIdeas';
import SelfImprovement from './components/SelfImprovement';
import Profile from './components/Profile';
import Premium from './components/Premium';

export type TabType = 'dashboard' | 'matching' | 'games' | 'dates' | 'improvement' | 'profile' | 'premium';

function App() {
  const [activeTab, setActiveTab] = useState<TabType>('dashboard');
  const [userRank, setUserRank] = useState(4.3);
  const [isPremium, setIsPremium] = useState(false);

  const renderActiveComponent = () => {
    switch (activeTab) {
      case 'dashboard':
        return <Dashboard userRank={userRank} isPremium={isPremium} />;
      case 'matching':
        return <Matching userRank={userRank} isPremium={isPremium} />;
      case 'games':
        return <Games isPremium={isPremium} />;
      case 'dates':
        return <DateIdeas isPremium={isPremium} />;
      case 'improvement':
        return <SelfImprovement isPremium={isPremium} />;
      case 'profile':
        return <Profile userRank={userRank} isPremium={isPremium} />;
      case 'premium':
        return <Premium isPremium={isPremium} setIsPremium={setIsPremium} />;
      default:
        return <Dashboard userRank={userRank} isPremium={isPremium} />;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-pink-50 to-white">
      <Header userRank={userRank} isPremium={isPremium} />
      <main className="pb-20">
        {renderActiveComponent()}
      </main>
      <Navigation activeTab={activeTab} setActiveTab={setActiveTab} isPremium={isPremium} />
    </div>
  );
}

export default App;
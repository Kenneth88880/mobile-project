import React from 'react';
import { Crown, Bell, MessageCircle } from 'lucide-react';

interface HeaderProps {
  userRank: number;
  isPremium: boolean;
}

export default function Header({ userRank, isPremium }: HeaderProps) {
  return (
    <header className="bg-white/80 backdrop-blur-sm border-b border-purple-100 px-4 py-3 sticky top-0 z-50">
      <div className="flex items-center justify-between max-w-md mx-auto">
        <div className="flex items-center space-x-3">
          <div className="bg-gradient-to-r from-purple-600 to-pink-600 text-white px-3 py-1.5 rounded-full text-lg font-bold">
            Doubly
          </div>
          {isPremium && (
            <Crown className="h-5 w-5 text-yellow-500" />
          )}
        </div>
        
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2">
            <div className="flex">
              {[...Array(5)].map((_, i) => (
                <div
                  key={i}
                  className={`h-2 w-2 rounded-full ${
                    i < Math.floor(userRank) ? 'bg-yellow-400' : 'bg-gray-200'
                  }`}
                />
              ))}
            </div>
            <span className="text-sm font-semibold text-gray-700">{userRank}</span>
          </div>
          
          <div className="flex items-center space-x-3">
            <MessageCircle className="h-6 w-6 text-gray-600 cursor-pointer hover:text-purple-600 transition-colors" />
            <Bell className="h-6 w-6 text-gray-600 cursor-pointer hover:text-purple-600 transition-colors" />
          </div>
        </div>
      </div>
    </header>
  );
}
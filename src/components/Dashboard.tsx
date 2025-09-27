import React from 'react';
import { Users, Heart, Star, TrendingUp, MessageSquare, Calendar } from 'lucide-react';

interface DashboardProps {
  userRank: number;
  isPremium: boolean;
}

export default function Dashboard({ userRank, isPremium }: DashboardProps) {
  const stats = [
    { label: 'Active Matches', value: '3', icon: Users, color: 'bg-purple-500' },
    { label: 'Double Dates', value: '7', icon: Heart, color: 'bg-pink-500' },
    { label: 'Your Rating', value: userRank.toString(), icon: Star, color: 'bg-yellow-500' },
    { label: 'Completed Games', value: '12', icon: TrendingUp, color: 'bg-green-500' },
  ];

  const recentActivity = [
    { type: 'match', text: 'New double match with Sarah & Mike!', time: '2h ago' },
    { type: 'game', text: 'Won Connect Four against Alex', time: '5h ago' },
    { type: 'date', text: 'Date idea liked: Mini Golf Adventure', time: '1d ago' },
    { type: 'rating', text: 'Received 5-star rating from Emma', time: '2d ago' },
  ];

  return (
    <div className="px-4 py-6 max-w-md mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Welcome back!</h1>
        <p className="text-gray-600">Ready for your next double date adventure?</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 gap-4 mb-8">
        {stats.map((stat, index) => (
          <div key={index} className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
            <div className="flex items-center space-x-3">
              <div className={`${stat.color} p-2 rounded-lg`}>
                <stat.icon className="h-4 w-4 text-white" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">{stat.value}</p>
                <p className="text-xs text-gray-500">{stat.label}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Quick Actions */}
      <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100 mb-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h3>
        <div className="grid grid-cols-2 gap-3">
          <button className="flex items-center space-x-2 bg-gradient-to-r from-purple-500 to-purple-600 text-white px-4 py-3 rounded-lg hover:from-purple-600 hover:to-purple-700 transition-all">
            <Users className="h-4 w-4" />
            <span className="text-sm font-medium">Find Matches</span>
          </button>
          <button className="flex items-center space-x-2 bg-gradient-to-r from-pink-500 to-pink-600 text-white px-4 py-3 rounded-lg hover:from-pink-600 hover:to-pink-700 transition-all">
            <Calendar className="h-4 w-4" />
            <span className="text-sm font-medium">Plan Date</span>
          </button>
        </div>
      </div>

      {/* Recent Activity */}
      <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Recent Activity</h3>
        <div className="space-y-3">
          {recentActivity.map((activity, index) => (
            <div key={index} className="flex items-start space-x-3 p-3 bg-gray-50 rounded-lg">
              <div className="flex-shrink-0 w-2 h-2 rounded-full bg-purple-400 mt-2"></div>
              <div className="flex-1 min-w-0">
                <p className="text-sm text-gray-900">{activity.text}</p>
                <p className="text-xs text-gray-500 mt-1">{activity.time}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {!isPremium && (
        <div className="mt-6 bg-gradient-to-r from-yellow-400 to-orange-500 rounded-xl p-4 text-white">
          <h3 className="font-semibold mb-2">Upgrade to Premium</h3>
          <p className="text-sm opacity-90 mb-3">Unlock unlimited matches, advanced features, and more!</p>
          <button className="bg-white/20 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-white/30 transition-colors">
            Learn More
          </button>
        </div>
      )}
    </div>
  );
}
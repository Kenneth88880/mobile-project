import React, { useState } from 'react';
import { User, Star, Eye, MessageSquare, Settings, Shield, Heart, Edit, Camera, Award } from 'lucide-react';

interface ProfileProps {
  userRank: number;
  isPremium: boolean;
}

export default function Profile({ userRank, isPremium }: ProfileProps) {
  const [activeTab, setActiveTab] = useState<'profile' | 'ratings' | 'settings'>('profile');

  const profileStats = [
    { label: 'Profile Views', value: isPremium ? '127' : '?', icon: Eye },
    { label: 'Likes Received', value: '89', icon: Heart },
    { label: 'Messages Sent', value: '156', icon: MessageSquare },
    { label: 'Games Won', value: '23', icon: Award },
  ];

  const recentRatings = [
    { date: '2d ago', rating: 5, comment: 'Amazing conversation and so fun to be around!', from: 'Sarah M.' },
    { date: '1w ago', rating: 4, comment: 'Great date at the mini golf place. Very genuine person.', from: 'Alex K.' },
    { date: '2w ago', rating: 5, comment: 'Perfect gentleman, would double date again!', from: 'Emma R.' },
  ];

  const hiddenRatings = [
    { date: '3d ago', rating: '?', comment: 'Upgrade to see this review...', from: 'Anonymous', locked: true },
    { date: '1w ago', rating: '?', comment: 'Upgrade to see this review...', from: 'Anonymous', locked: true },
  ];

  return (
    <div className="px-4 py-6 max-w-md mx-auto">
      <div className="mb-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-gray-900">Profile</h1>
          <button className="bg-gray-100 p-2 rounded-lg hover:bg-gray-200 transition-colors">
            <Settings className="h-5 w-5 text-gray-600" />
          </button>
        </div>
      </div>

      {/* Profile Header */}
      <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100 mb-6">
        <div className="flex items-center space-x-4 mb-4">
          <div className="relative">
            <div className="w-20 h-20 bg-gradient-to-r from-purple-400 to-pink-400 rounded-full flex items-center justify-center">
              <User className="h-8 w-8 text-white" />
            </div>
            <button className="absolute -bottom-1 -right-1 bg-purple-600 text-white p-1.5 rounded-full hover:bg-purple-700 transition-colors">
              <Camera className="h-3 w-3" />
            </button>
          </div>
          <div className="flex-1">
            <div className="flex items-center space-x-2 mb-1">
              <h2 className="text-xl font-bold text-gray-900">Jordan Smith</h2>
              {isPremium && (
                <div className="bg-yellow-100 text-yellow-600 px-2 py-1 rounded-full text-xs font-bold">
                  PRO
                </div>
              )}
            </div>
            <p className="text-gray-600 mb-2">25 years old • San Francisco, CA</p>
            <div className="flex items-center space-x-2">
              <div className="flex">
                {[...Array(5)].map((_, i) => (
                  <Star
                    key={i}
                    className={`h-4 w-4 ${
                      i < Math.floor(userRank) ? 'text-yellow-400 fill-current' : 'text-gray-300'
                    }`}
                  />
                ))}
              </div>
              <span className="text-sm font-semibold text-gray-700">{userRank}/5.0</span>
              <span className="text-sm text-gray-500">(43 reviews)</span>
            </div>
          </div>
        </div>

        <div className="flex items-center space-x-2 mb-4">
          <Shield className="h-4 w-4 text-green-500" />
          <span className="text-sm text-green-600 font-medium">Verified Profile</span>
          <span className="text-sm text-gray-500">• ID & Photo Verified</span>
        </div>

        <button className="w-full bg-gradient-to-r from-purple-500 to-pink-500 text-white py-2 px-4 rounded-lg hover:from-purple-600 hover:to-pink-600 transition-all flex items-center justify-center space-x-2">
          <Edit className="h-4 w-4" />
          <span>Edit Profile</span>
        </button>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        {profileStats.map((stat, index) => (
          <div key={index} className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
            <div className="flex items-center space-x-3">
              <div className="bg-purple-100 p-2 rounded-lg">
                <stat.icon className="h-4 w-4 text-purple-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">
                  {stat.value === '?' && !isPremium ? (
                    <span className="text-gray-400">?</span>
                  ) : (
                    stat.value
                  )}
                </p>
                <p className="text-xs text-gray-500">{stat.label}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Tab Navigation */}
      <div className="bg-gray-100 p-1 rounded-lg flex mb-6">
        <button
          onClick={() => setActiveTab('profile')}
          className={`flex-1 py-2 px-3 rounded-md text-sm font-medium transition-all ${
            activeTab === 'profile'
              ? 'bg-white text-purple-600 shadow-sm'
              : 'text-gray-600'
          }`}
        >
          About
        </button>
        <button
          onClick={() => setActiveTab('ratings')}
          className={`flex-1 py-2 px-3 rounded-md text-sm font-medium transition-all ${
            activeTab === 'ratings'
              ? 'bg-white text-purple-600 shadow-sm'
              : 'text-gray-600'
          }`}
        >
          Reviews
        </button>
        <button
          onClick={() => setActiveTab('settings')}
          className={`flex-1 py-2 px-3 rounded-md text-sm font-medium transition-all ${
            activeTab === 'settings'
              ? 'bg-white text-purple-600 shadow-sm'
              : 'text-gray-600'
          }`}
        >
          Privacy
        </button>
      </div>

      {/* Tab Content */}
      {activeTab === 'profile' && (
        <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
          <h3 className="font-semibold text-gray-900 mb-3">About Me</h3>
          <p className="text-gray-600 text-sm mb-4">
            Love exploring the city, trying new restaurants, and playing board games. 
            Looking for fun double date adventures with like-minded couples!
          </p>
          
          <h4 className="font-medium text-gray-900 mb-2">Interests</h4>
          <div className="flex flex-wrap gap-2 mb-4">
            {['Gaming', 'Coffee', 'Hiking', 'Photography', 'Cooking', 'Art'].map((interest) => (
              <span
                key={interest}
                className="bg-purple-100 text-purple-600 px-3 py-1 rounded-full text-sm"
              >
                {interest}
              </span>
            ))}
          </div>

          <h4 className="font-medium text-gray-900 mb-2">Looking For</h4>
          <p className="text-gray-600 text-sm">
            Casual double dates, new friendships, and fun group activities
          </p>
        </div>
      )}

      {activeTab === 'ratings' && (
        <div className="space-y-4">
          <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
            <h3 className="font-semibold text-gray-900 mb-4">Recent Reviews</h3>
            <div className="space-y-4">
              {recentRatings.map((rating, index) => (
                <div key={index} className="border-b border-gray-100 pb-3 last:border-b-0">
                  <div className="flex justify-between items-start mb-2">
                    <div className="flex">
                      {[...Array(rating.rating)].map((_, i) => (
                        <Star key={i} className="h-4 w-4 text-yellow-400 fill-current" />
                      ))}
                    </div>
                    <span className="text-xs text-gray-500">{rating.date}</span>
                  </div>
                  <p className="text-sm text-gray-700 mb-1">"{rating.comment}"</p>
                  <p className="text-xs text-gray-500">- {rating.from}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Premium Reviews */}
          {!isPremium && (
            <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
              <div className="text-center mb-4">
                <h3 className="font-semibold text-gray-900 mb-2">Hidden Reviews</h3>
                <p className="text-sm text-gray-600">Upgrade to see what others really think about you</p>
              </div>
              
              <div className="space-y-3 mb-4">
                {hiddenRatings.map((rating, index) => (
                  <div key={index} className="border border-gray-200 rounded-lg p-3 bg-gray-50 relative">
                    <div className="blur-sm">
                      <div className="flex justify-between items-start mb-2">
                        <div className="flex">
                          {[...Array(5)].map((_, i) => (
                            <Star key={i} className="h-4 w-4 text-gray-400" />
                          ))}
                        </div>
                        <span className="text-xs text-gray-400">{rating.date}</span>
                      </div>
                      <p className="text-sm text-gray-500 mb-1">This review is hidden...</p>
                      <p className="text-xs text-gray-400">- {rating.from}</p>
                    </div>
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="bg-yellow-100 text-yellow-600 px-3 py-1 rounded-full text-xs font-bold">
                        PREMIUM
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <button className="w-full bg-gradient-to-r from-yellow-500 to-orange-500 text-white py-2 px-4 rounded-lg font-medium hover:from-yellow-600 hover:to-orange-600 transition-all">
                Unlock Reviews - $4.99/month
              </button>
            </div>
          )}
        </div>
      )}

      {activeTab === 'settings' && (
        <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
          <h3 className="font-semibold text-gray-900 mb-4">Privacy Settings</h3>
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <div>
                <p className="font-medium text-gray-900">Profile Visibility</p>
                <p className="text-sm text-gray-600">Who can see your profile</p>
              </div>
              <select className="border border-gray-200 rounded-md px-3 py-1 text-sm">
                <option>Everyone</option>
                <option>Matched only</option>
                <option>Friends only</option>
              </select>
            </div>
            
            <div className="flex justify-between items-center">
              <div>
                <p className="font-medium text-gray-900">Show Rating</p>
                <p className="text-sm text-gray-600">Display your rating publicly</p>
              </div>
              <input type="checkbox" defaultChecked className="toggle" />
            </div>
            
            <div className="flex justify-between items-center">
              <div>
                <p className="font-medium text-gray-900">Online Status</p>
                <p className="text-sm text-gray-600">Show when you're active</p>
              </div>
              <input type="checkbox" defaultChecked className="toggle" />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
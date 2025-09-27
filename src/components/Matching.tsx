import React, { useState } from 'react';
import { Users, Star, MapPin, Heart, X, Eye, ArrowLeft, ArrowRight } from 'lucide-react';

interface MatchingProps {
  userRank: number;
  isPremium: boolean;
}

export default function Matching({ userRank, isPremium }: MatchingProps) {
  const [activeMode, setActiveMode] = useState<'browse' | 'team' | 'swipe'>('browse');
  const [currentSwipeIndex, setCurrentSwipeIndex] = useState(0);

  const matches = [
    {
      id: 1,
      primaryUser: { name: 'Sarah', age: 25, rating: 4.8 },
      secondaryUser: { name: 'Emma', age: 23, rating: 4.6 },
      location: '2.3 miles away',
      interests: ['Gaming', 'Coffee', 'Hiking'],
      verified: true,
      bio: 'Love exploring new places and trying different cuisines together!',
      photos: ['https://images.pexels.com/photos/1239291/pexels-photo-1239291.jpeg?auto=compress&cs=tinysrgb&w=400']
    },
    {
      id: 2,
      primaryUser: { name: 'Alex', age: 27, rating: 4.5 },
      secondaryUser: { name: 'Jordan', age: 26, rating: 4.7 },
      location: '1.8 miles away',
      interests: ['Art', 'Music', 'Food'],
      verified: false,
      bio: 'Creative couple who loves art galleries and live music venues.',
      photos: ['https://images.pexels.com/photos/1024993/pexels-photo-1024993.jpeg?auto=compress&cs=tinysrgb&w=400']
    },
    {
      id: 3,
      primaryUser: { name: 'Mike', age: 29, rating: 4.9 },
      secondaryUser: { name: 'Lisa', age: 27, rating: 4.8 },
      location: '3.1 miles away',
      interests: ['Fitness', 'Travel', 'Photography'],
      verified: true,
      bio: 'Adventure seekers always looking for the next great photo opportunity!',
      photos: ['https://images.pexels.com/photos/1516680/pexels-photo-1516680.jpeg?auto=compress&cs=tinysrgb&w=400']
    }
  ];

  const teamRequests = [
    { id: 1, name: 'Mike', age: 24, rating: 4.2, mutual: 3 },
    { id: 2, name: 'David', age: 28, rating: 4.6, mutual: 7 },
  ];

  const handleCoupleSwipe = (direction: 'left' | 'right') => {
    if (direction === 'right') {
      console.log('Liked couple:', matches[currentSwipeIndex].primaryUser.name, '&', matches[currentSwipeIndex].secondaryUser.name);
    } else {
      console.log('Passed on couple:', matches[currentSwipeIndex].primaryUser.name, '&', matches[currentSwipeIndex].secondaryUser.name);
    }
    
    if (currentSwipeIndex < matches.length - 1) {
      setCurrentSwipeIndex(currentSwipeIndex + 1);
    } else {
      setCurrentSwipeIndex(0);
    }
  };

  return (
    <div className="px-4 py-6 max-w-md mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-4">Find Your Match</h1>
        
        {/* Mode Toggle */}
        <div className="bg-gray-100 p-1 rounded-lg grid grid-cols-3 gap-1">
          <button
            onClick={() => setActiveMode('browse')}
            className={`flex-1 py-2 px-3 rounded-md text-sm font-medium transition-all ${
              activeMode === 'browse'
                ? 'bg-white text-purple-600 shadow-sm'
                : 'text-gray-600'
            }`}
          >
            Browse
          </button>
          <button
            onClick={() => setActiveMode('swipe')}
            className={`flex-1 py-2 px-3 rounded-md text-sm font-medium transition-all ${
              activeMode === 'swipe'
                ? 'bg-white text-purple-600 shadow-sm'
                : 'text-gray-600'
            }`}
          >
            Swipe
          </button>
          <button
            onClick={() => setActiveMode('team')}
            className={`flex-1 py-2 px-3 rounded-md text-sm font-medium transition-all ${
              activeMode === 'team'
                ? 'bg-white text-purple-600 shadow-sm'
                : 'text-gray-600'
            }`}
          >
            Team Up
          </button>
        </div>
      </div>

      {activeMode === 'swipe' ? (
        <div className="relative">
          {matches.length > 0 && (
            <div className="bg-white rounded-xl shadow-lg border border-gray-100 overflow-hidden">
              {/* Couple Photo */}
              <div className="relative h-80">
                <img
                  src={matches[currentSwipeIndex].photos[0]}
                  alt="Couple"
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
                
                {/* Verification Badge */}
                {matches[currentSwipeIndex].verified && (
                  <div className="absolute top-4 right-4 bg-blue-500 text-white px-2 py-1 rounded-full text-xs font-medium flex items-center space-x-1">
                    <div className="w-2 h-2 bg-white rounded-full"></div>
                    <span>Verified</span>
                  </div>
                )}
                
                {/* Names Overlay */}
                <div className="absolute bottom-4 left-4 right-4">
                  <div className="flex items-end justify-between">
                    <div>
                      <h2 className="text-2xl font-bold text-white mb-1">
                        {matches[currentSwipeIndex].primaryUser.name} & {matches[currentSwipeIndex].secondaryUser.name}
                      </h2>
                      <p className="text-white/90 text-sm">
                        {matches[currentSwipeIndex].primaryUser.age} & {matches[currentSwipeIndex].secondaryUser.age}
                      </p>
                    </div>
                    <div className="flex items-center space-x-1">
                      <Star className="h-4 w-4 text-yellow-400 fill-current" />
                      <span className="text-white text-sm font-medium">
                        {((matches[currentSwipeIndex].primaryUser.rating + matches[currentSwipeIndex].secondaryUser.rating) / 2).toFixed(1)}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Couple Info */}
              <div className="p-4">
                <div className="flex items-center space-x-1 text-sm text-gray-500 mb-3">
                  <MapPin className="h-4 w-4" />
                  <span>{matches[currentSwipeIndex].location}</span>
                </div>

                <p className="text-gray-700 text-sm mb-4">
                  {matches[currentSwipeIndex].bio}
                </p>

                {/* Individual Ratings */}
                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div className="bg-purple-50 p-3 rounded-lg text-center">
                    <p className="font-semibold text-gray-900">{matches[currentSwipeIndex].primaryUser.name}</p>
                    <div className="flex items-center justify-center space-x-1 mt-1">
                      <Star className="h-3 w-3 text-yellow-400 fill-current" />
                      <span className="text-sm text-gray-600">{matches[currentSwipeIndex].primaryUser.rating}</span>
                    </div>
                  </div>
                  <div className="bg-pink-50 p-3 rounded-lg text-center">
                    <p className="font-semibold text-gray-900">{matches[currentSwipeIndex].secondaryUser.name}</p>
                    <div className="flex items-center justify-center space-x-1 mt-1">
                      <Star className="h-3 w-3 text-yellow-400 fill-current" />
                      <span className="text-sm text-gray-600">{matches[currentSwipeIndex].secondaryUser.rating}</span>
                    </div>
                  </div>
                </div>

                {/* Interests */}
                <div className="flex flex-wrap gap-2 mb-6">
                  {matches[currentSwipeIndex].interests.map((interest, index) => (
                    <span
                      key={index}
                      className="bg-purple-100 text-purple-600 px-3 py-1 rounded-full text-xs font-medium"
                    >
                      {interest}
                    </span>
                  ))}
                </div>

                {/* Swipe Actions */}
                <div className="flex justify-center space-x-6">
                  <button
                    onClick={() => handleCoupleSwipe('left')}
                    className="bg-gray-100 text-gray-600 p-4 rounded-full hover:bg-gray-200 transition-all transform hover:scale-105 active:scale-95"
                  >
                    <X className="h-7 w-7" />
                  </button>
                  
                  {isPremium && (
                    <button className="bg-blue-100 text-blue-600 p-4 rounded-full hover:bg-blue-200 transition-all transform hover:scale-105 active:scale-95">
                      <Eye className="h-6 w-6" />
                    </button>
                  )}
                  
                  <button
                    onClick={() => handleCoupleSwipe('right')}
                    className="bg-gradient-to-r from-pink-500 to-purple-600 text-white p-4 rounded-full hover:from-pink-600 hover:to-purple-700 transition-all transform hover:scale-105 active:scale-95"
                  >
                    <Heart className="h-7 w-7" />
                  </button>
                </div>
                
                {/* Swipe Indicators */}
                <div className="flex justify-center space-x-2 mt-4">
                  {matches.map((_, index) => (
                    <div
                      key={index}
                      className={`w-2 h-2 rounded-full transition-all ${
                        index === currentSwipeIndex ? 'bg-purple-600' : 'bg-gray-300'
                      }`}
                    />
                  ))}
                </div>
              </div>
            </div>
          )}
          
          {/* Swipe Instructions */}
          <div className="mt-4 text-center">
            <p className="text-sm text-gray-500">
              Swipe or tap the buttons to like or pass
            </p>
          </div>
        </div>
      ) : activeMode === 'browse' ? (
        <div className="space-y-4">
          {matches.map((match) => (
            <div key={match.id} className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
              <div className="flex items-start justify-between mb-3">
                <div className="flex space-x-3">
                  <div className="space-y-1">
                    <div className="flex items-center space-x-2">
                      <h3 className="font-semibold text-gray-900">
                        {match.primaryUser.name} & {match.secondaryUser.name}
                      </h3>
                      {match.verified && (
                        <div className="bg-blue-100 text-blue-600 px-2 py-0.5 rounded-full text-xs font-medium">
                          Verified
                        </div>
                      )}
                    </div>
                    <p className="text-sm text-gray-600">
                      {match.primaryUser.age} & {match.secondaryUser.age}
                    </p>
                    <div className="flex items-center space-x-1">
                      <Star className="h-4 w-4 text-yellow-400 fill-current" />
                      <span className="text-sm text-gray-600">
                        {match.primaryUser.rating} & {match.secondaryUser.rating}
                      </span>
                    </div>
                  </div>
                </div>
                
                {isPremium && (
                  <Eye className="h-5 w-5 text-gray-400 cursor-pointer hover:text-purple-600 transition-colors" />
                )}
              </div>

              <div className="flex items-center space-x-1 text-sm text-gray-500 mb-3">
                <MapPin className="h-4 w-4" />
                <span>{match.location}</span>
              </div>

              <div className="flex flex-wrap gap-2 mb-4">
                {match.interests.map((interest, index) => (
                  <span
                    key={index}
                    className="bg-purple-50 text-purple-600 px-2 py-1 rounded-full text-xs font-medium"
                  >
                    {interest}
                  </span>
                ))}
              </div>

              <div className="flex space-x-3">
                <button className="flex-1 bg-gray-100 text-gray-600 py-2 px-4 rounded-lg hover:bg-gray-200 transition-colors flex items-center justify-center space-x-2">
                  <X className="h-4 w-4" />
                  <span className="text-sm font-medium">Pass</span>
                </button>
                <button className="flex-1 bg-gradient-to-r from-pink-500 to-purple-600 text-white py-2 px-4 rounded-lg hover:from-pink-600 hover:to-purple-700 transition-all flex items-center justify-center space-x-2">
                  <Heart className="h-4 w-4" />
                  <span className="text-sm font-medium">Like</span>
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="space-y-4">
          <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
            <h3 className="font-semibold text-gray-900 mb-3">Team Up Requests</h3>
            {teamRequests.map((request) => (
              <div key={request.id} className="flex items-center justify-between py-3 border-b border-gray-100 last:border-b-0">
                <div className="flex items-center space-x-3">
                  <div className="w-12 h-12 bg-gradient-to-r from-purple-400 to-pink-400 rounded-full flex items-center justify-center">
                    <span className="text-white font-semibold">{request.name[0]}</span>
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">{request.name}, {request.age}</p>
                    <div className="flex items-center space-x-2 text-sm text-gray-500">
                      <Star className="h-3 w-3 text-yellow-400 fill-current" />
                      <span>{request.rating}</span>
                      <span>•</span>
                      <span>{request.mutual} mutual friends</span>
                    </div>
                  </div>
                </div>
                <div className="flex space-x-2">
                  <button className="bg-gray-100 text-gray-600 px-3 py-1 rounded-md text-sm hover:bg-gray-200 transition-colors">
                    Decline
                  </button>
                  <button className="bg-purple-600 text-white px-3 py-1 rounded-md text-sm hover:bg-purple-700 transition-colors">
                    Accept
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {!isPremium && (
        <div className="mt-6 bg-yellow-50 border border-yellow-200 rounded-xl p-4">
          <h3 className="font-semibold text-yellow-800 mb-2">Limited Matches</h3>
          <p className="text-sm text-yellow-700 mb-3">You've seen 3 of 5 daily matches. Upgrade for unlimited browsing!</p>
          <button className="bg-yellow-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-yellow-700 transition-colors">
            Upgrade Now
          </button>
        </div>
      )}
    </div>
  );
}
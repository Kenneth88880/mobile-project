import React, { useState } from 'react';
import { MapPin, Heart, X, Lightbulb, Filter, Search, Star, Clock } from 'lucide-react';

interface DateIdeasProps {
  isPremium: boolean;
}

export default function DateIdeas({ isPremium }: DateIdeasProps) {
  const [activeMode, setActiveMode] = useState<'browse' | 'swipe' | 'ai'>('browse');
  const [currentSwipeIndex, setCurrentSwipeIndex] = useState(0);

  const dateIdeas = [
    {
      id: 1,
      title: 'Mini Golf Adventure',
      description: 'Fun 18-hole mini golf with arcade games',
      location: 'Adventure Zone',
      distance: '1.2 miles',
      rating: 4.8,
      price: '$$',
      category: 'Entertainment',
      duration: '2-3 hours',
      ideal: 'First Double Date',
      image: 'https://images.pexels.com/photos/6249567/pexels-photo-6249567.jpeg?auto=compress&cs=tinysrgb&w=400'
    },
    {
      id: 2,
      title: 'Cooking Class',
      description: 'Learn to make pasta together',
      location: 'Culinary Studio',
      distance: '2.1 miles',
      rating: 4.6,
      price: '$$$',
      category: 'Food & Drink',
      duration: '3 hours',
      ideal: 'Adventurous Couples',
      image: 'https://images.pexels.com/photos/3184183/pexels-photo-3184183.jpeg?auto=compress&cs=tinysrgb&w=400'
    },
    {
      id: 3,
      title: 'Board Game Café',
      description: 'Coffee, games, and great conversation',
      location: 'Game On Café',
      distance: '0.8 miles',
      rating: 4.7,
      price: '$',
      category: 'Gaming',
      duration: '2-4 hours',
      ideal: 'Gamers',
      image: 'https://images.pexels.com/photos/4691673/pexels-photo-4691673.jpeg?auto=compress&cs=tinysrgb&w=400'
    }
  ];

  const aiSuggestions = [
    {
      title: 'Gaming Café Experience',
      description: 'Based on your love for gaming and coffee preferences',
      confidence: 92,
      reasons: ['Both couples love gaming', 'Casual atmosphere', 'Budget-friendly']
    },
    {
      title: 'Outdoor Adventure Park',
      description: 'Perfect for active couples who enjoy challenges',
      confidence: 87,
      reasons: ['High activity level match', 'Team building', 'Great for photos']
    }
  ];

  const handleSwipe = (direction: 'left' | 'right') => {
    if (direction === 'right') {
      // Liked the date idea
      console.log('Liked:', dateIdeas[currentSwipeIndex].title);
    }
    
    if (currentSwipeIndex < dateIdeas.length - 1) {
      setCurrentSwipeIndex(currentSwipeIndex + 1);
    } else {
      setCurrentSwipeIndex(0);
    }
  };

  return (
    <div className="px-4 py-6 max-w-md mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-4">Date Ideas</h1>
        
        {/* Mode Toggle */}
        <div className="bg-gray-100 p-1 rounded-lg flex">
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
            onClick={() => setActiveMode('ai')}
            className={`flex-1 py-2 px-3 rounded-md text-sm font-medium transition-all ${
              activeMode === 'ai'
                ? 'bg-white text-purple-600 shadow-sm'
                : 'text-gray-600'
            }`}
          >
            AI Picks
          </button>
        </div>
      </div>

      {activeMode === 'browse' && (
        <div>
          {/* Search and Filter */}
          <div className="flex space-x-3 mb-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search date ideas..."
                className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              />
            </div>
            <button className="bg-gray-100 p-2 rounded-lg hover:bg-gray-200 transition-colors">
              <Filter className="h-4 w-4 text-gray-600" />
            </button>
          </div>

          <div className="space-y-4">
            {dateIdeas.map((idea) => (
              <div key={idea.id} className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="aspect-w-16 aspect-h-9">
                  <img
                    src={idea.image}
                    alt={idea.title}
                    className="w-full h-48 object-cover"
                  />
                </div>
                <div className="p-4">
                  <div className="flex justify-between items-start mb-2">
                    <h3 className="text-lg font-semibold text-gray-900">{idea.title}</h3>
                    <div className="flex items-center space-x-1">
                      <Star className="h-4 w-4 text-yellow-400 fill-current" />
                      <span className="text-sm text-gray-600">{idea.rating}</span>
                    </div>
                  </div>
                  
                  <p className="text-gray-600 text-sm mb-3">{idea.description}</p>
                  
                  <div className="flex items-center space-x-4 text-sm text-gray-500 mb-3">
                    <div className="flex items-center space-x-1">
                      <MapPin className="h-4 w-4" />
                      <span>{idea.distance}</span>
                    </div>
                    <div className="flex items-center space-x-1">
                      <Clock className="h-4 w-4" />
                      <span>{idea.duration}</span>
                    </div>
                    <span className="bg-green-100 text-green-600 px-2 py-1 rounded-full text-xs font-medium">
                      {idea.price}
                    </span>
                  </div>
                  
                  <div className="flex justify-between items-center">
                    <div className="flex space-x-2">
                      <span className="bg-purple-100 text-purple-600 px-2 py-1 rounded-full text-xs font-medium">
                        {idea.category}
                      </span>
                      <span className="bg-pink-100 text-pink-600 px-2 py-1 rounded-full text-xs font-medium">
                        {idea.ideal}
                      </span>
                    </div>
                    <button className="bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 transition-colors">
                      Save Idea
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {activeMode === 'swipe' && (
        <div className="relative h-96">
          {dateIdeas.length > 0 && (
            <div className="bg-white rounded-xl shadow-lg border border-gray-100 overflow-hidden">
              <div className="aspect-w-16 aspect-h-9">
                <img
                  src={dateIdeas[currentSwipeIndex].image}
                  alt={dateIdeas[currentSwipeIndex].title}
                  className="w-full h-48 object-cover"
                />
              </div>
              <div className="p-4">
                <h3 className="text-xl font-semibold text-gray-900 mb-2">
                  {dateIdeas[currentSwipeIndex].title}
                </h3>
                <p className="text-gray-600 mb-4">{dateIdeas[currentSwipeIndex].description}</p>
                
                <div className="flex justify-center space-x-4 mt-6">
                  <button
                    onClick={() => handleSwipe('left')}
                    className="bg-gray-100 text-gray-600 p-4 rounded-full hover:bg-gray-200 transition-colors"
                  >
                    <X className="h-6 w-6" />
                  </button>
                  <button
                    onClick={() => handleSwipe('right')}
                    className="bg-gradient-to-r from-pink-500 to-purple-600 text-white p-4 rounded-full hover:from-pink-600 hover:to-purple-700 transition-all"
                  >
                    <Heart className="h-6 w-6" />
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {activeMode === 'ai' && (
        <div className="space-y-4">
          <div className="bg-gradient-to-r from-purple-100 to-pink-100 rounded-xl p-4 border border-purple-200">
            <div className="flex items-center space-x-2 mb-3">
              <Lightbulb className="h-5 w-5 text-purple-600" />
              <h3 className="text-lg font-semibold text-gray-900">AI Recommendations</h3>
            </div>
            <p className="text-sm text-gray-600">Based on your preferences, interests, and successful date history</p>
          </div>

          {aiSuggestions.map((suggestion, index) => (
            <div key={index} className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
              <div className="flex justify-between items-start mb-2">
                <h3 className="text-lg font-semibold text-gray-900">{suggestion.title}</h3>
                <div className="bg-green-100 text-green-600 px-2 py-1 rounded-full text-xs font-bold">
                  {suggestion.confidence}% match
                </div>
              </div>
              
              <p className="text-gray-600 text-sm mb-3">{suggestion.description}</p>
              
              <div className="space-y-2">
                <p className="text-sm font-medium text-gray-700">Why this works:</p>
                <ul className="space-y-1">
                  {suggestion.reasons.map((reason, idx) => (
                    <li key={idx} className="text-sm text-gray-600 flex items-center space-x-2">
                      <div className="w-1.5 h-1.5 bg-purple-400 rounded-full"></div>
                      <span>{reason}</span>
                    </li>
                  ))}
                </ul>
              </div>
              
              <button className="w-full mt-4 bg-gradient-to-r from-purple-500 to-pink-500 text-white py-2 px-4 rounded-lg hover:from-purple-600 hover:to-pink-600 transition-all">
                Explore This Idea
              </button>
            </div>
          ))}
        </div>
      )}

      {!isPremium && (
        <div className="mt-6 bg-blue-50 border border-blue-200 rounded-xl p-4">
          <h3 className="font-semibold text-blue-800 mb-2">Unlock Premium Features</h3>
          <p className="text-sm text-blue-700 mb-3">Get personalized AI recommendations, unlimited saves, and priority booking!</p>
          <button className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors">
            Try Premium
          </button>
        </div>
      )}
    </div>
  );
}
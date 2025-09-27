import React from 'react';
import { Crown, Check, Star, Eye, MessageCircle, Zap, Shield, Heart, Gamepad2, Camera } from 'lucide-react';

interface PremiumProps {
  isPremium: boolean;
  setIsPremium: (isPremium: boolean) => void;
}

export default function Premium({ isPremium, setIsPremium }: PremiumProps) {
  const features = [
    {
      icon: Eye,
      title: 'See Who Viewed Your Profile',
      description: 'Know exactly who\'s checking you out',
      free: false
    },
    {
      icon: MessageCircle,
      title: 'Unlimited Group Chats',
      description: 'Chat with as many matches as you want',
      free: '5 max'
    },
    {
      icon: Star,
      title: 'See Your Hidden Reviews',
      description: 'Read what dates really think about you',
      free: false
    },
    {
      icon: Zap,
      title: 'Reset Your Ranking',
      description: 'Fresh start with a clean slate',
      free: false
    },
    {
      icon: Camera,
      title: 'AI Face Analysis',
      description: 'Get personalized improvement tips',
      free: false
    },
    {
      icon: Heart,
      title: 'Priority Matching',
      description: 'Get matched with top-rated users first',
      free: false
    },
    {
      icon: Gamepad2,
      title: 'Exclusive Games',
      description: 'Access premium mini-games and tournaments',
      free: false
    },
    {
      icon: Shield,
      title: 'Advanced Verification',
      description: 'Extra trust badges and priority support',
      free: false
    }
  ];

  const plans = [
    {
      name: 'Monthly',
      price: '$9.99',
      period: '/month',
      savings: null,
      popular: false
    },
    {
      name: 'Quarterly',
      price: '$24.99',
      period: '/3 months',
      savings: 'Save 17%',
      popular: true
    },
    {
      name: 'Annual',
      price: '$79.99',
      period: '/year',
      savings: 'Save 33%',
      popular: false
    }
  ];

  const referralStats = {
    referred: 8,
    earned: 24.99,
    pending: 2
  };

  return (
    <div className="px-4 py-6 max-w-md mx-auto">
      {isPremium ? (
        <div>
          <div className="mb-6">
            <div className="flex items-center space-x-2 mb-2">
              <Crown className="h-6 w-6 text-yellow-500" />
              <h1 className="text-2xl font-bold text-gray-900">Premium Member</h1>
            </div>
            <p className="text-gray-600">You're enjoying all premium features!</p>
          </div>

          {/* Current Plan */}
          <div className="bg-gradient-to-r from-yellow-400 to-orange-500 rounded-xl p-4 text-white mb-6">
            <h3 className="font-semibold mb-2">Current Plan: Annual Pro</h3>
            <p className="text-sm opacity-90">Renews on March 15, 2025</p>
            <div className="flex items-center justify-between mt-3">
              <span className="text-lg font-bold">$79.99/year</span>
              <button className="bg-white/20 text-white px-3 py-1 rounded-lg text-sm hover:bg-white/30 transition-colors">
                Manage
              </button>
            </div>
          </div>

          {/* Referral Program */}
          <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100 mb-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
              <Heart className="h-5 w-5 text-pink-500 mr-2" />
              Referral Rewards
            </h3>
            <div className="grid grid-cols-3 gap-4 mb-4">
              <div className="text-center">
                <p className="text-2xl font-bold text-purple-600">{referralStats.referred}</p>
                <p className="text-xs text-gray-500">Friends Joined</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-green-600">${referralStats.earned}</p>
                <p className="text-xs text-gray-500">Earned</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-yellow-600">{referralStats.pending}</p>
                <p className="text-xs text-gray-500">Pending</p>
              </div>
            </div>
            <div className="bg-purple-50 p-3 rounded-lg">
              <p className="text-sm text-purple-700 font-medium">Your Referral Code</p>
              <div className="flex items-center space-x-2 mt-1">
                <code className="bg-white px-2 py-1 rounded text-purple-800 font-mono text-sm">JORDAN2025</code>
                <button className="text-purple-600 text-sm hover:text-purple-800">Copy</button>
              </div>
            </div>
          </div>

          {/* Usage Stats */}
          <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">This Month's Usage</h3>
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Profile views revealed</span>
                <span className="font-semibold text-gray-900">47</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Face scans used</span>
                <span className="font-semibold text-gray-900">3</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Premium games played</span>
                <span className="font-semibold text-gray-900">12</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Priority matches</span>
                <span className="font-semibold text-gray-900">∞</span>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div>
          <div className="mb-6">
            <h1 className="text-2xl font-bold text-gray-900 mb-2">Upgrade to Premium</h1>
            <p className="text-gray-600">Unlock exclusive features and boost your dating success</p>
          </div>

          {/* Features List */}
          <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100 mb-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Premium Features</h3>
            <div className="space-y-4">
              {features.map((feature, index) => (
                <div key={index} className="flex items-start space-x-3">
                  <div className="bg-purple-100 p-2 rounded-lg flex-shrink-0">
                    <feature.icon className="h-4 w-4 text-purple-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-gray-900">{feature.title}</p>
                    <p className="text-sm text-gray-600">{feature.description}</p>
                  </div>
                  <div className="flex-shrink-0">
                    {feature.free ? (
                      <span className="text-xs text-orange-600 bg-orange-100 px-2 py-1 rounded-full">
                        {feature.free}
                      </span>
                    ) : (
                      <Check className="h-5 w-5 text-green-500" />
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Pricing Plans */}
          <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100 mb-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Choose Your Plan</h3>
            <div className="space-y-3">
              {plans.map((plan, index) => (
                <div
                  key={index}
                  className={`relative border-2 rounded-lg p-4 cursor-pointer transition-all ${
                    plan.popular
                      ? 'border-purple-300 bg-purple-50'
                      : 'border-gray-200 hover:border-purple-200'
                  }`}
                >
                  {plan.popular && (
                    <div className="absolute -top-2 left-1/2 transform -translate-x-1/2">
                      <span className="bg-purple-600 text-white px-3 py-1 rounded-full text-xs font-bold">
                        MOST POPULAR
                      </span>
                    </div>
                  )}
                  
                  <div className="flex justify-between items-center">
                    <div>
                      <h4 className="font-semibold text-gray-900">{plan.name}</h4>
                      <div className="flex items-baseline space-x-1">
                        <span className="text-2xl font-bold text-gray-900">{plan.price}</span>
                        <span className="text-sm text-gray-500">{plan.period}</span>
                      </div>
                      {plan.savings && (
                        <span className="text-sm text-green-600 font-medium">{plan.savings}</span>
                      )}
                    </div>
                    <div className="w-4 h-4 border-2 border-gray-300 rounded-full"></div>
                  </div>
                </div>
              ))}
            </div>
            
            <button
              onClick={() => setIsPremium(true)}
              className="w-full mt-4 bg-gradient-to-r from-purple-600 to-pink-600 text-white py-3 px-4 rounded-lg font-semibold hover:from-purple-700 hover:to-pink-700 transition-all"
            >
              Start Premium Trial
            </button>
            
            <p className="text-xs text-gray-500 text-center mt-2">
              7-day free trial, then auto-renews. Cancel anytime.
            </p>
          </div>

          {/* Testimonials */}
          <div className="bg-gradient-to-r from-purple-100 to-pink-100 rounded-xl p-4 border border-purple-200">
            <h3 className="font-semibold text-gray-900 mb-3">What Premium Users Say</h3>
            <div className="space-y-3">
              <div className="bg-white/80 rounded-lg p-3">
                <p className="text-sm text-gray-700 italic mb-2">
                  "The face analysis feature helped me improve my profile pics so much! Got 3x more matches."
                </p>
                <p className="text-xs text-gray-500">- Sarah, Premium User</p>
              </div>
              <div className="bg-white/80 rounded-lg p-3">
                <p className="text-sm text-gray-700 italic mb-2">
                  "Being able to see who viewed my profile was a game changer. Met my current partner through it!"
                </p>
                <p className="text-xs text-gray-500">- Mike, Premium User</p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
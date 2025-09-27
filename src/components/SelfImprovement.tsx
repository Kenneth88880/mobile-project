import React, { useState } from 'react';
import { Camera, TrendingUp, Target, Award, Eye, Zap, Star } from 'lucide-react';

interface SelfImprovementProps {
  isPremium: boolean;
}

export default function SelfImprovement({ isPremium }: SelfImprovementProps) {
  const [analysisResult, setAnalysisResult] = useState<any>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  const improvements = [
    {
      category: 'Skincare',
      score: 85,
      recommendations: ['Use daily moisturizer', 'Try vitamin C serum', 'Get more sleep'],
      priority: 'High'
    },
    {
      category: 'Style',
      score: 72,
      recommendations: ['Update wardrobe colors', 'Better fitting clothes', 'Experiment with accessories'],
      priority: 'Medium'
    },
    {
      category: 'Fitness',
      score: 78,
      recommendations: ['Improve posture', 'Add cardio routine', 'Focus on core strength'],
      priority: 'Medium'
    },
    {
      category: 'Grooming',
      score: 90,
      recommendations: ['Maintain current routine', 'Try new hairstyle', 'Update eyebrow shape'],
      priority: 'Low'
    }
  ];

  const achievements = [
    { name: 'First Scan', description: 'Completed your first face analysis', earned: true, points: 50 },
    { name: 'Week Streak', description: 'Scanned for 7 days straight', earned: false, points: 100 },
    { name: 'Improvement Champion', description: 'Improved overall score by 10+', earned: false, points: 200 },
    { name: 'Style Icon', description: 'Maxed out style category', earned: false, points: 150 },
  ];

  const handleFaceScan = () => {
    if (!isPremium) return;
    
    setIsAnalyzing(true);
    // Simulate AI analysis
    setTimeout(() => {
      setAnalysisResult({
        overall: 82,
        attractiveness: 78,
        symmetry: 85,
        skinHealth: 80,
        recommendations: [
          'Consider a more defined jawline through facial exercises',
          'Improve skin texture with a consistent skincare routine',
          'Update eyebrow shape for better face framing'
        ]
      });
      setIsAnalyzing(false);
    }, 3000);
  };

  return (
    <div className="px-4 py-6 max-w-md mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Self Improvement</h1>
        <p className="text-gray-600">AI-powered insights to help you look and feel your best</p>
      </div>

      {/* Face Analysis Section */}
      <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100 mb-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
          <Camera className="h-5 w-5 text-purple-600 mr-2" />
          Face Analysis
        </h3>

        {!isPremium ? (
          <div className="text-center py-8">
            <div className="bg-yellow-100 p-4 rounded-full w-16 h-16 mx-auto mb-4 flex items-center justify-center">
              <Camera className="h-8 w-8 text-yellow-600" />
            </div>
            <h4 className="font-semibold text-gray-900 mb-2">Premium Feature</h4>
            <p className="text-sm text-gray-600 mb-4">Unlock AI-powered face analysis with detailed improvement recommendations</p>
            <button className="bg-gradient-to-r from-yellow-500 to-orange-500 text-white px-6 py-2 rounded-lg font-medium hover:from-yellow-600 hover:to-orange-600 transition-all">
              Upgrade to Premium
            </button>
          </div>
        ) : (
          <div>
            {!analysisResult ? (
              <div className="text-center py-6">
                <button
                  onClick={handleFaceScan}
                  disabled={isAnalyzing}
                  className={`bg-gradient-to-r from-purple-500 to-pink-500 text-white px-6 py-3 rounded-xl font-medium hover:from-purple-600 hover:to-pink-600 transition-all flex items-center space-x-2 mx-auto ${
                    isAnalyzing ? 'opacity-50 cursor-not-allowed' : ''
                  }`}
                >
                  <Camera className="h-5 w-5" />
                  <span>{isAnalyzing ? 'Analyzing...' : 'Start Face Scan'}</span>
                </button>
                <p className="text-sm text-gray-500 mt-3">
                  {isAnalyzing ? 'AI is analyzing your features...' : 'Tap to begin your personalized analysis'}
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-purple-50 p-3 rounded-lg text-center">
                    <p className="text-2xl font-bold text-purple-600">{analysisResult.overall}</p>
                    <p className="text-xs text-purple-700">Overall Score</p>
                  </div>
                  <div className="bg-pink-50 p-3 rounded-lg text-center">
                    <p className="text-2xl font-bold text-pink-600">{analysisResult.attractiveness}</p>
                    <p className="text-xs text-pink-700">Attractiveness</p>
                  </div>
                </div>
                
                <div className="space-y-2">
                  <h4 className="font-semibold text-gray-900">AI Recommendations:</h4>
                  {analysisResult.recommendations.map((rec: string, index: number) => (
                    <div key={index} className="flex items-start space-x-2 text-sm">
                      <Zap className="h-4 w-4 text-yellow-500 mt-0.5 flex-shrink-0" />
                      <span className="text-gray-700">{rec}</span>
                    </div>
                  ))}
                </div>
                
                <button
                  onClick={() => setAnalysisResult(null)}
                  className="w-full bg-gray-100 text-gray-600 py-2 rounded-lg hover:bg-gray-200 transition-colors"
                >
                  Scan Again
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Improvement Categories */}
      <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100 mb-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
          <Target className="h-5 w-5 text-green-600 mr-2" />
          Improvement Areas
        </h3>
        <div className="space-y-4">
          {improvements.map((item, index) => (
            <div key={index} className="border border-gray-100 rounded-lg p-3">
              <div className="flex justify-between items-center mb-2">
                <h4 className="font-semibold text-gray-900">{item.category}</h4>
                <div className="flex items-center space-x-2">
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                    item.priority === 'High' ? 'bg-red-100 text-red-600' :
                    item.priority === 'Medium' ? 'bg-yellow-100 text-yellow-600' :
                    'bg-green-100 text-green-600'
                  }`}>
                    {item.priority}
                  </span>
                  <span className="text-sm font-semibold text-gray-700">{item.score}/100</span>
                </div>
              </div>
              
              <div className="w-full bg-gray-200 rounded-full h-2 mb-3">
                <div
                  className="bg-gradient-to-r from-purple-500 to-pink-500 h-2 rounded-full"
                  style={{ width: `${item.score}%` }}
                ></div>
              </div>
              
              <div className="space-y-1">
                {item.recommendations.map((rec, idx) => (
                  <div key={idx} className="flex items-center space-x-2 text-sm">
                    <div className="w-1.5 h-1.5 bg-purple-400 rounded-full"></div>
                    <span className="text-gray-600">{rec}</span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Achievements */}
      <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
        <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
          <Award className="h-5 w-5 text-yellow-500 mr-2" />
          Achievements
        </h3>
        <div className="grid grid-cols-1 gap-3">
          {achievements.map((achievement, index) => (
            <div
              key={index}
              className={`p-3 rounded-lg border flex items-center space-x-3 ${
                achievement.earned
                  ? 'border-yellow-200 bg-yellow-50'
                  : 'border-gray-200 bg-gray-50'
              }`}
            >
              <div className={`p-2 rounded-full ${
                achievement.earned
                  ? 'bg-yellow-200 text-yellow-600'
                  : 'bg-gray-200 text-gray-400'
              }`}>
                <Star className="h-4 w-4" />
              </div>
              <div className="flex-1">
                <h4 className={`text-sm font-medium ${
                  achievement.earned ? 'text-yellow-800' : 'text-gray-600'
                }`}>
                  {achievement.name}
                </h4>
                <p className={`text-xs ${
                  achievement.earned ? 'text-yellow-700' : 'text-gray-500'
                }`}>
                  {achievement.description}
                </p>
              </div>
              <div className={`text-xs font-bold ${
                achievement.earned ? 'text-yellow-600' : 'text-gray-400'
              }`}>
                +{achievement.points}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
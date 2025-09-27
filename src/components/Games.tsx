import React, { useState } from 'react';
import { Gamepad2, Users, Trophy, Play, Clock, Star } from 'lucide-react';

interface GamesProps {
  isPremium: boolean;
}

export default function Games({ isPremium }: GamesProps) {
  const [activeGame, setActiveGame] = useState<string | null>(null);

  const games = [
    {
      id: 'battleship',
      name: 'Battleship',
      description: 'Classic naval strategy game',
      players: '2-4 players',
      duration: '15-20 min',
      difficulty: 'Easy',
      icon: '🚢'
    },
    {
      id: 'connect4',
      name: 'Connect Four',
      description: 'Drop checkers to connect four',
      players: '2 players',
      duration: '5-10 min',
      difficulty: 'Easy',
      icon: '🔴'
    },
    {
      id: 'trivia',
      name: 'Couple Trivia',
      description: 'Test how well you know each other',
      players: '2-4 players',
      duration: '10-15 min',
      difficulty: 'Medium',
      icon: '🧠',
      premium: true
    },
    {
      id: 'icebreaker',
      name: 'Icebreaker Cards',
      description: 'Fun questions to spark conversation',
      players: '2-4 players',
      duration: '5-30 min',
      difficulty: 'Easy',
      icon: '💬'
    }
  ];

  const activeGames = [
    { opponent: 'Sarah & Mike', game: 'Battleship', status: 'Your turn', lastMove: '2 min ago' },
    { opponent: 'Emma & Alex', game: 'Connect Four', status: 'Waiting', lastMove: '1h ago' },
  ];

  const achievements = [
    { name: 'First Victory', description: 'Won your first game', earned: true },
    { name: 'Social Butterfly', description: 'Played with 10 different couples', earned: true },
    { name: 'Strategic Genius', description: 'Won 5 Battleship games', earned: false },
    { name: 'Quick Thinker', description: 'Won Connect Four in under 2 minutes', earned: false },
  ];

  return (
    <div className="px-4 py-6 max-w-md mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Mini Games</h1>
        <p className="text-gray-600">Break the ice and have fun together!</p>
      </div>

      {/* Active Games */}
      {activeGames.length > 0 && (
        <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100 mb-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
            <Clock className="h-5 w-5 text-purple-600 mr-2" />
            Active Games
          </h3>
          <div className="space-y-3">
            {activeGames.map((game, index) => (
              <div key={index} className="flex items-center justify-between p-3 bg-purple-50 rounded-lg">
                <div>
                  <p className="font-medium text-gray-900">{game.game}</p>
                  <p className="text-sm text-gray-600">vs {game.opponent}</p>
                  <p className="text-xs text-purple-600 font-medium">{game.status}</p>
                </div>
                <div className="text-right">
                  <button className="bg-purple-600 text-white px-3 py-1 rounded-md text-sm hover:bg-purple-700 transition-colors">
                    Play
                  </button>
                  <p className="text-xs text-gray-500 mt-1">{game.lastMove}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Available Games */}
      <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100 mb-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Available Games</h3>
        <div className="grid gap-4">
          {games.map((game) => (
            <div
              key={game.id}
              className={`relative p-4 rounded-lg border-2 border-dashed transition-all cursor-pointer ${
                game.premium && !isPremium
                  ? 'border-gray-200 bg-gray-50 opacity-60'
                  : 'border-gray-200 hover:border-purple-300 hover:bg-purple-50'
              }`}
              onClick={() => !game.premium || isPremium ? setActiveGame(game.id) : null}
            >
              {game.premium && !isPremium && (
                <div className="absolute top-2 right-2">
                  <div className="bg-yellow-400 text-yellow-900 px-2 py-1 rounded-full text-xs font-bold">
                    PRO
                  </div>
                </div>
              )}
              
              <div className="flex items-start space-x-3">
                <div className="text-3xl">{game.icon}</div>
                <div className="flex-1">
                  <h4 className="font-semibold text-gray-900 mb-1">{game.name}</h4>
                  <p className="text-sm text-gray-600 mb-2">{game.description}</p>
                  <div className="flex items-center space-x-4 text-xs text-gray-500">
                    <div className="flex items-center space-x-1">
                      <Users className="h-3 w-3" />
                      <span>{game.players}</span>
                    </div>
                    <div className="flex items-center space-x-1">
                      <Clock className="h-3 w-3" />
                      <span>{game.duration}</span>
                    </div>
                    <div className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                      game.difficulty === 'Easy' ? 'bg-green-100 text-green-600' :
                      game.difficulty === 'Medium' ? 'bg-yellow-100 text-yellow-600' :
                      'bg-red-100 text-red-600'
                    }`}>
                      {game.difficulty}
                    </div>
                  </div>
                </div>
                <Play className="h-5 w-5 text-purple-600" />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Achievements */}
      <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
        <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
          <Trophy className="h-5 w-5 text-yellow-500 mr-2" />
          Achievements
        </h3>
        <div className="grid grid-cols-2 gap-3">
          {achievements.map((achievement, index) => (
            <div
              key={index}
              className={`p-3 rounded-lg border ${
                achievement.earned
                  ? 'border-yellow-200 bg-yellow-50'
                  : 'border-gray-200 bg-gray-50'
              }`}
            >
              <div className="flex items-center space-x-2 mb-1">
                <Trophy className={`h-4 w-4 ${
                  achievement.earned ? 'text-yellow-500' : 'text-gray-400'
                }`} />
                <h4 className={`text-sm font-medium ${
                  achievement.earned ? 'text-yellow-800' : 'text-gray-600'
                }`}>
                  {achievement.name}
                </h4>
              </div>
              <p className={`text-xs ${
                achievement.earned ? 'text-yellow-700' : 'text-gray-500'
              }`}>
                {achievement.description}
              </p>
            </div>
          ))}
        </div>
      </div>

      {!isPremium && (
        <div className="mt-6 bg-gradient-to-r from-purple-500 to-pink-500 rounded-xl p-4 text-white">
          <h3 className="font-semibold mb-2">Unlock Premium Games</h3>
          <p className="text-sm opacity-90 mb-3">Access exclusive games, tournaments, and special achievements!</p>
          <button className="bg-white/20 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-white/30 transition-colors">
            Upgrade Now
          </button>
        </div>
      )}
    </div>
  );
}
import React, { useState, useEffect } from 'react';
import { Zap, Trophy, Users, TrendingUp, Gamepad2, Swords, Sparkles, Target, Award } from 'lucide-react';

interface MousePosition {
    x: number;
    y: number;
}

const BattleHubHero: React.FC = () => {
    const [activePlayer, setActivePlayer] = useState<number>(12547);
    const [tournaments, setTournaments] = useState<number>(89);
    const [prizePool, setPrizePool] = useState<number>(250000);
    const [mousePosition, setMousePosition] = useState<MousePosition>({ x: 0, y: 0 });

    // Animated counter effect
    useEffect(() => {
        const interval = setInterval(() => {
            setActivePlayer(prev => prev + Math.floor(Math.random() * 5));
        }, 3000);
        return () => clearInterval(interval);
    }, []);

    // Mouse tracking for parallax effect
    useEffect(() => {
        const handleMouseMove = (e: MouseEvent) => {
            setMousePosition({
                x: (e.clientX / window.innerWidth - 0.5) * 20,
                y: (e.clientY / window.innerHeight - 0.5) * 20
            });
        };
        window.addEventListener('mousemove', handleMouseMove);
        return () => window.removeEventListener('mousemove', handleMouseMove);
    }, []);

    return (
        <div className="relative min-h-screen bg-black overflow-hidden">
            {/* Cinematic Background */}
            <div className="absolute inset-0">
                {/* Animated gradient mesh */}
                <div className="absolute inset-0 bg-gradient-to-br from-black via-slate-950 to-black"></div>

                {/* Dynamic grid */}
                <div className="absolute inset-0 bg-[linear-gradient(rgba(6,182,212,0.05)_1px,transparent_1px),linear-gradient(90deg,rgba(6,182,212,0.05)_1px,transparent_1px)] bg-[size:80px_80px] [mask-image:radial-gradient(ellipse_80%_50%_at_50%_0%,#000,transparent)]"></div>

                {/* Scanline effect */}
                <div className="absolute inset-0 bg-[linear-gradient(transparent_50%,rgba(6,182,212,0.02)_50%)] bg-[size:100%_4px] animate-scan"></div>
            </div>

            {/* Advanced Neon Glow Effects */}
            <div className="absolute top-0 left-1/4 w-[600px] h-[600px] bg-cyan-500/30 rounded-full blur-[150px] animate-pulse-slow"></div>
            <div className="absolute top-1/3 right-1/4 w-[500px] h-[500px] bg-blue-600/20 rounded-full blur-[140px] animate-pulse-slower"></div>
            <div className="absolute bottom-0 left-1/2 w-[700px] h-[700px] bg-cyan-400/20 rounded-full blur-[160px] animate-pulse-slow"></div>

            {/* Floating Particles */}
            <div className="absolute inset-0 overflow-hidden">
                {[...Array(20)].map((_, i) => (
                    <div
                        key={i}
                        className="absolute w-1 h-1 bg-cyan-400 rounded-full animate-float-particle"
                        style={{
                            left: `${Math.random() * 100}%`,
                            top: `${Math.random() * 100}%`,
                            animationDelay: `${Math.random() * 5}s`,
                            animationDuration: `${15 + Math.random() * 10}s`
                        }}
                    ></div>
                ))}
            </div>

            {/* Parallax Elements */}
            <div
                className="absolute top-1/4 left-10 opacity-5 transition-transform duration-1000 ease-out"
                style={{ transform: `translate(${mousePosition.x}px, ${mousePosition.y}px)` }}
            >
                <Gamepad2 className="w-64 h-64 text-cyan-400" />
            </div>
            <div
                className="absolute bottom-1/4 right-10 opacity-5 transition-transform duration-1000 ease-out"
                style={{ transform: `translate(${-mousePosition.x}px, ${-mousePosition.y}px)` }}
            >
                <Trophy className="w-48 h-48 text-cyan-400" />
            </div>

            {/* Main Content */}
            <div className="relative z-10 container mx-auto px-6 pt-24 pb-20">
                <div className="max-w-7xl mx-auto">

                    {/* Live Indicator */}
                    <div className="flex justify-center mb-6 animate-slide-down">
                        <div className="inline-flex items-center gap-3 px-6 py-3 bg-gradient-to-r from-cyan-500/10 via-blue-500/10 to-cyan-500/10 border border-cyan-500/30 rounded-full backdrop-blur-md shadow-[0_0_30px_rgba(6,182,212,0.2)]">
                            <div className="relative flex items-center gap-2">
                                <span className="relative flex h-3 w-3">
                                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75"></span>
                                    <span className="relative inline-flex rounded-full h-3 w-3 bg-cyan-500 shadow-[0_0_10px_rgba(6,182,212,0.8)]"></span>
                                </span>
                                <span className="text-cyan-400 font-bold text-sm tracking-widest">LIVE NOW</span>
                            </div>
                            <div className="w-px h-4 bg-cyan-500/30"></div>
                            <span className="text-gray-400 font-medium text-sm">Tournament in Progress</span>
                        </div>
                    </div>

                    {/* Main Headline - Ultra Professional */}
                    <div className="text-center mb-12 space-y-6">
                        {/* Battle Hub - Animated gradient */}
                        <div className="relative inline-block">
                            <h1 className="text-7xl md:text-9xl font-black tracking-tighter leading-none mb-4">
                                <span className="block relative">
                                    <span className="absolute inset-0 bg-gradient-to-r from-cyan-400 via-blue-500 to-cyan-400 bg-clip-text text-transparent blur-lg opacity-50 animate-gradient-slow"></span>
                                    <span className="relative bg-gradient-to-r from-cyan-400 via-blue-500 to-cyan-400 bg-clip-text text-transparent animate-gradient-slow">
                                        BATTLE HUB
                                    </span>
                                </span>
                            </h1>

                            {/* Underline effect */}
                            <div className="flex justify-center gap-2 mb-6">
                                <div className="h-1 w-20 bg-gradient-to-r from-transparent via-cyan-500 to-transparent animate-pulse-slow"></div>
                                <div className="h-1 w-20 bg-gradient-to-r from-transparent via-blue-500 to-transparent animate-pulse-slower"></div>
                            </div>
                        </div>

                        {/* Esports - Clean white */}
                        <h2 className="text-5xl md:text-7xl font-black text-white tracking-wider relative">
                            <span className="relative">
                                ESPORTS
                                <div className="absolute -right-8 top-0 opacity-0 animate-fade-in-delayed">
                                    <Sparkles className="w-6 h-6 text-cyan-400 animate-spin-slow" />
                                </div>
                            </span>
                        </h2>

                        {/* Tagline */}
                        <div className="max-w-4xl mx-auto pt-8">
                            <p className="text-xl md:text-3xl text-gray-300 font-light leading-relaxed animate-fade-in-up">
                                Compete in <span className="text-cyan-400 font-semibold">epic tournaments</span>.
                                Dominate the <span className="text-cyan-400 font-semibold">leaderboards</span>.
                                Claim <span className="text-cyan-400 font-semibold animate-pulse-text">real prizes</span>.
                            </p>
                        </div>
                    </div>

                    {/* CTA Button - Single, Powerful */}
                    <div className="flex justify-center mb-20 animate-fade-in-up-delayed">
                        <button className="group relative">
                            {/* Outer glow */}
                            <div className="absolute -inset-1 bg-gradient-to-r from-cyan-500 via-blue-600 to-cyan-500 rounded-xl blur opacity-75 group-hover:opacity-100 transition duration-500 group-hover:duration-200 animate-gradient-slow"></div>

                            {/* Button */}
                            <div className="relative px-12 py-5 bg-gradient-to-r from-cyan-500 to-blue-600 rounded-lg leading-none flex items-center gap-3">
                                <Swords className="w-6 h-6 text-white group-hover:rotate-12 transition-transform duration-300" />
                                <span className="text-white font-black text-xl tracking-wider group-hover:tracking-widest transition-all duration-300">
                                    ENTER THE ARENA
                                </span>
                                <div className="w-0 group-hover:w-6 transition-all duration-300 overflow-hidden">
                                    <Target className="w-6 h-6 text-white animate-spin-slow" />
                                </div>
                            </div>

                            {/* Bottom accent line */}
                            <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-0 group-hover:w-full h-0.5 bg-cyan-400 transition-all duration-500"></div>
                        </button>
                    </div>

                    {/* Stats Section - Premium Design */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-6xl mx-auto">
                        {/* Active Players */}
                        <div className="group relative animate-fade-in-up" style={{ animationDelay: '0.1s' }}>
                            <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/20 to-blue-600/20 rounded-2xl blur-xl opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                            <div className="relative bg-gradient-to-br from-gray-900/90 to-gray-800/50 border border-cyan-500/30 rounded-2xl p-8 backdrop-blur-xl hover:border-cyan-400/50 transition-all duration-500 overflow-hidden">
                                {/* Animated corner accent */}
                                <div className="absolute top-0 right-0 w-20 h-20 bg-gradient-to-br from-cyan-500/20 to-transparent rounded-bl-full"></div>

                                <div className="flex items-start justify-between mb-4">
                                    <div className="p-4 bg-gradient-to-br from-cyan-500/20 to-blue-600/10 rounded-xl border border-cyan-500/20 group-hover:scale-110 transition-transform duration-300">
                                        <Users className="w-10 h-10 text-cyan-400" />
                                    </div>
                                    <div className="flex items-center gap-1 text-xs text-green-400 font-bold bg-green-500/10 px-3 py-1 rounded-full border border-green-500/30">
                                        <div className="w-1.5 h-1.5 bg-green-400 rounded-full animate-pulse"></div>
                                        LIVE
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <div className="text-5xl font-black text-white tracking-tight">
                                        {activePlayer.toLocaleString()}
                                        <span className="text-2xl text-cyan-400">+</span>
                                    </div>
                                    <div className="text-sm text-gray-400 font-semibold tracking-wide uppercase">Active Players</div>

                                    <div className="flex items-center gap-2 pt-3 text-xs">
                                        <TrendingUp className="w-4 h-4 text-cyan-400 animate-bounce-slow" />
                                        <span className="text-cyan-400 font-semibold">+234 joined this hour</span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Live Tournaments */}
                        <div className="group relative animate-fade-in-up" style={{ animationDelay: '0.2s' }}>
                            <div className="absolute inset-0 bg-gradient-to-br from-blue-500/20 to-cyan-600/20 rounded-2xl blur-xl opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                            <div className="relative bg-gradient-to-br from-gray-900/90 to-gray-800/50 border border-cyan-500/30 rounded-2xl p-8 backdrop-blur-xl hover:border-cyan-400/50 transition-all duration-500 overflow-hidden">
                                <div className="absolute top-0 right-0 w-20 h-20 bg-gradient-to-br from-blue-500/20 to-transparent rounded-bl-full"></div>

                                <div className="flex items-start justify-between mb-4">
                                    <div className="p-4 bg-gradient-to-br from-blue-500/20 to-cyan-600/10 rounded-xl border border-blue-500/20 group-hover:scale-110 transition-transform duration-300">
                                        <Trophy className="w-10 h-10 text-blue-400" />
                                    </div>
                                    <div className="flex items-center gap-1 text-xs text-orange-400 font-bold bg-orange-500/10 px-3 py-1 rounded-full border border-orange-500/30 animate-pulse-slow">
                                        <Zap className="w-3 h-3" />
                                        HOT
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <div className="text-5xl font-black text-white tracking-tight">{tournaments}</div>
                                    <div className="text-sm text-gray-400 font-semibold tracking-wide uppercase">Live Tournaments</div>

                                    <div className="flex items-center gap-2 pt-3 text-xs">
                                        <Gamepad2 className="w-4 h-4 text-blue-400" />
                                        <span className="text-blue-400 font-semibold">12 starting in 10min</span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Prize Pool */}
                        <div className="group relative animate-fade-in-up" style={{ animationDelay: '0.3s' }}>
                            <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/20 to-blue-600/20 rounded-2xl blur-xl opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                            <div className="relative bg-gradient-to-br from-gray-900/90 to-gray-800/50 border border-cyan-500/30 rounded-2xl p-8 backdrop-blur-xl hover:border-cyan-400/50 transition-all duration-500 overflow-hidden">
                                <div className="absolute top-0 right-0 w-20 h-20 bg-gradient-to-br from-cyan-500/20 to-transparent rounded-bl-full"></div>

                                <div className="flex items-start justify-between mb-4">
                                    <div className="p-4 bg-gradient-to-br from-cyan-500/20 to-blue-600/10 rounded-xl border border-cyan-500/20 group-hover:scale-110 transition-transform duration-300">
                                        <Award className="w-10 h-10 text-cyan-400" />
                                    </div>
                                    <Sparkles className="w-5 h-5 text-yellow-400 animate-spin-slow" />
                                </div>

                                <div className="space-y-2">
                                    <div className="text-5xl font-black text-transparent bg-gradient-to-r from-yellow-400 via-orange-400 to-yellow-400 bg-clip-text animate-gradient-slow tracking-tight">
                                        ₹{prizePool.toLocaleString()}
                                    </div>
                                    <div className="text-sm text-gray-400 font-semibold tracking-wide uppercase">Total Prize Pool</div>

                                    <div className="flex items-center gap-2 pt-3 text-xs">
                                        <TrendingUp className="w-4 h-4 text-yellow-400 animate-bounce-slow" />
                                        <span className="text-yellow-400 font-semibold">₹50K+ won this week</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Bottom gradient fade */}
            <div className="absolute bottom-0 left-0 right-0 h-40 bg-gradient-to-t from-black via-black/50 to-transparent pointer-events-none"></div>

            <style jsx>{`
        @keyframes gradient {
          0%, 100% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
        }
        
        @keyframes gradient-slow {
          0%, 100% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
        }
        
        @keyframes float-particle {
          0% { 
            transform: translateY(100vh) translateX(0) scale(0);
            opacity: 0;
          }
          10% {
            opacity: 1;
          }
          90% {
            opacity: 1;
          }
          100% { 
            transform: translateY(-100vh) translateX(100px) scale(1);
            opacity: 0;
          }
        }

        @keyframes scan {
          0% { transform: translateY(-100%); }
          100% { transform: translateY(100%); }
        }

        @keyframes pulse-slow {
          0%, 100% { opacity: 0.3; transform: scale(1); }
          50% { opacity: 0.5; transform: scale(1.05); }
        }

        @keyframes pulse-slower {
          0%, 100% { opacity: 0.2; transform: scale(1); }
          50% { opacity: 0.4; transform: scale(1.08); }
        }

        @keyframes pulse-text {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.7; }
        }

        @keyframes slide-down {
          from { 
            opacity: 0;
            transform: translateY(-20px);
          }
          to { 
            opacity: 1;
            transform: translateY(0);
          }
        }

        @keyframes fade-in-up {
          from {
            opacity: 0;
            transform: translateY(30px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        @keyframes fade-in-up-delayed {
          0% {
            opacity: 0;
            transform: translateY(30px);
          }
          50% {
            opacity: 0;
            transform: translateY(30px);
          }
          100% {
            opacity: 1;
            transform: translateY(0);
          }
        }

        @keyframes fade-in-delayed {
          0%, 60% { opacity: 0; }
          100% { opacity: 1; }
        }

        @keyframes spin-slow {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }

        @keyframes bounce-slow {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-5px); }
        }

        .animate-gradient {
          background-size: 200% 200%;
          animation: gradient 3s ease infinite;
        }

        .animate-gradient-slow {
          background-size: 200% 200%;
          animation: gradient-slow 8s ease infinite;
        }

        .animate-float-particle {
          animation: float-particle linear infinite;
        }

        .animate-scan {
          animation: scan 8s linear infinite;
        }

        .animate-pulse-slow {
          animation: pulse-slow 4s ease-in-out infinite;
        }

        .animate-pulse-slower {
          animation: pulse-slower 6s ease-in-out infinite;
        }

        .animate-pulse-text {
          animation: pulse-text 2s ease-in-out infinite;
        }

        .animate-slide-down {
          animation: slide-down 0.8s ease-out;
        }

        .animate-fade-in-up {
          animation: fade-in-up 1s ease-out;
          animation-fill-mode: both;
        }

        .animate-fade-in-up-delayed {
          animation: fade-in-up-delayed 2s ease-out;
        }

        .animate-fade-in-delayed {
          animation: fade-in-delayed 2s ease-out;
        }

        .animate-spin-slow {
          animation: spin-slow 4s linear infinite;
        }

        .animate-bounce-slow {
          animation: bounce-slow 2s ease-in-out infinite;
        }
      `}</style>
        </div>
    );
};

export default BattleHubHero;
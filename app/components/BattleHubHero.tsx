"use client";

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";

interface MousePosition {
    x: number;
    y: number;
}

/* ── ANIMATED COUNTER ── */
function Counter({ target, duration = 1800 }: { target: number; duration?: number }) {
    const [value, setValue] = useState(0);
    const started = useRef(false);
    const ref = useRef<HTMLSpanElement>(null);

    useEffect(() => {
        const observer = new IntersectionObserver(([entry]) => {
            if (entry.isIntersecting && !started.current) {
                started.current = true;
                const start = Date.now();
                const tick = () => {
                    const elapsed = Date.now() - start;
                    const progress = Math.min(elapsed / duration, 1);
                    const ease = 1 - Math.pow(1 - progress, 3);
                    setValue(Math.floor(ease * target));
                    if (progress < 1) requestAnimationFrame(tick);
                };
                requestAnimationFrame(tick);
            }
        });
        if (ref.current) observer.observe(ref.current);
        return () => observer.disconnect();
    }, [target, duration]);

    return <span ref={ref}>{value.toLocaleString()}</span>;
}

/* ── GLITCH TEXT ── */
function GlitchText({ text, className }: { text: string; className?: string }) {
    return (
        <span className={`relative inline-block ${className ?? ""}`} data-text={text}>
            {text}
            <span
                aria-hidden
                className="absolute inset-0 text-[var(--accent-cyan)] opacity-0 hover:opacity-100
          transition-opacity duration-100"
                style={{ clipPath: "inset(45% 0 40% 0)", transform: "translateX(-2px)" }}
            >
                {text}
            </span>
            <span
                aria-hidden
                className="absolute inset-0 text-[var(--accent-fire)] opacity-0 hover:opacity-100
          transition-opacity duration-100"
                style={{ clipPath: "inset(20% 0 60% 0)", transform: "translateX(2px)" }}
            >
                {text}
            </span>
        </span>
    );
}

/* ── MAIN HERO ── */
export default function BattleHubHero() {
    const [mouse, setMouse] = useState<MousePosition>({ x: 0, y: 0 });
    const [livePlayers, setLivePlayers] = useState(12547);
    const [tick, setTick] = useState(0);

    useEffect(() => {
        const id = setInterval(() => {
            setLivePlayers((p) => p + Math.floor(Math.random() * 4 + 1));
            setTick((t) => t + 1);
        }, 3000);
        return () => clearInterval(id);
    }, []);

    useEffect(() => {
        const move = (e: MouseEvent) => {
            setMouse({
                x: (e.clientX / window.innerWidth - 0.5) * 30,
                y: (e.clientY / window.innerHeight - 0.5) * 30,
            });
        };
        window.addEventListener("mousemove", move, { passive: true });
        return () => window.removeEventListener("mousemove", move);
    }, []);

    const stats = [
        {
            value: livePlayers,
            suffix: "+",
            label: "Active Warriors",
            sub: "+234 joined this hour",
            live: true,
            color: "var(--accent-cyan)",
            icon: (
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                    <circle cx="9" cy="7" r="4" />
                    <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
                    <path d="M16 3.13a4 4 0 0 1 0 7.75" />
                </svg>
            ),
        },
        {
            value: 89,
            suffix: "",
            label: "Live Tournaments",
            sub: "12 starting soon",
            live: false,
            hot: true,
            color: "var(--accent-fire)",
            icon: (
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                    <path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6" />
                    <path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18" />
                    <path d="M4 22h16" />
                    <path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22" />
                    <path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22" />
                    <path d="M18 2H6v7a6 6 0 0 0 12 0V2Z" />
                </svg>
            ),
        },
        {
            value: 250000,
            prefix: "₹",
            suffix: "",
            label: "Prize Pool",
            sub: "₹50K+ won this week",
            live: false,
            gold: true,
            color: "var(--accent-gold)",
            icon: (
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                    <circle cx="12" cy="8" r="6" />
                    <path d="M15.477 12.89 17 22l-5-3-5 3 1.523-9.11" />
                </svg>
            ),
        },
    ];

    return (
        <section className="relative min-h-screen overflow-hidden flex flex-col justify-center">

            {/* ── BACKGROUND LAYERS ── */}
            {/* Radial vignette */}
            <div className="absolute inset-0 bg-radial-hero pointer-events-none" />

            {/* Parallax fire orb */}
            <div
                className="absolute top-[-10%] left-[10%] w-[700px] h-[700px] rounded-full pointer-events-none transition-transform duration-[1200ms] ease-out"
                style={{
                    background: "radial-gradient(circle, rgba(255,69,0,0.12) 0%, transparent 65%)",
                    transform: `translate(${mouse.x * 0.6}px, ${mouse.y * 0.6}px)`,
                }}
            />
            {/* Parallax cyan orb */}
            <div
                className="absolute bottom-[-10%] right-[5%] w-[600px] h-[600px] rounded-full pointer-events-none transition-transform duration-[1200ms] ease-out"
                style={{
                    background: "radial-gradient(circle, rgba(0,212,255,0.10) 0%, transparent 65%)",
                    transform: `translate(${-mouse.x * 0.4}px, ${-mouse.y * 0.4}px)`,
                }}
            />

            {/* Floating particles */}
            <div className="absolute inset-0 pointer-events-none overflow-hidden">
                {Array.from({ length: 18 }).map((_, i) => (
                    <div
                        key={i}
                        className="absolute rounded-full"
                        style={{
                            width: i % 3 === 0 ? "3px" : "2px",
                            height: i % 3 === 0 ? "3px" : "2px",
                            left: `${(i * 37 + 11) % 100}%`,
                            top: `${(i * 53 + 7) % 100}%`,
                            background: i % 2 === 0 ? "var(--accent-cyan)" : "var(--accent-fire)",
                            opacity: 0.4,
                            animation: `heroFloat ${14 + (i % 7)}s ease-in-out infinite`,
                            animationDelay: `${(i * 0.7) % 6}s`,
                        }}
                    />
                ))}
            </div>

            {/* Parallax icon left */}
            <div
                className="absolute left-8 top-1/3 pointer-events-none transition-transform duration-[1000ms] ease-out opacity-[0.04]"
                style={{ transform: `translate(${mouse.x * 0.8}px, ${mouse.y * 0.8}px)` }}
            >
                <svg width="220" height="220" viewBox="0 0 24 24" fill="none" stroke="var(--accent-cyan)" strokeWidth="0.5">
                    <rect x="2" y="6" width="20" height="12" rx="2" />
                    <path d="M12 12h.01M7.5 12h.01M16.5 12h.01M12 9v6" />
                </svg>
            </div>

            {/* Parallax icon right */}
            <div
                className="absolute right-8 bottom-1/4 pointer-events-none transition-transform duration-[1000ms] ease-out opacity-[0.04]"
                style={{ transform: `translate(${-mouse.x * 0.6}px, ${-mouse.y * 0.6}px)` }}
            >
                <svg width="180" height="180" viewBox="0 0 24 24" fill="none" stroke="var(--accent-fire)" strokeWidth="0.5">
                    <path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6" /><path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18" />
                    <path d="M4 22h16" /><path d="M18 2H6v7a6 6 0 0 0 12 0V2Z" />
                </svg>
            </div>

            {/* ── CONTENT ── */}
            <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 pt-16 pb-20 w-full">

                {/* LIVE PILL */}
                <div className="flex justify-center mb-10 animate-hero-slide-down">
                    <div className="inline-flex items-center gap-3 px-5 py-2.5 rounded-full border border-[rgba(0,212,255,0.2)] bg-[rgba(0,212,255,0.04)] backdrop-blur-md">
                        <span className="relative flex h-2 w-2">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[var(--accent-fire)] opacity-75" />
                            <span className="relative inline-flex rounded-full h-2 w-2 bg-[var(--accent-fire)]" style={{ boxShadow: "0 0 8px var(--accent-fire)" }} />
                        </span>
                        <span className="font-ui font-700 text-xs uppercase tracking-[0.2em] text-[var(--accent-fire)]">Live Now</span>
                        <span className="w-px h-3 bg-[var(--border-subtle)]" />
                        <span className="font-body text-xs text-[var(--text-muted)]">Tournament in Progress</span>
                    </div>
                </div>

                {/* HEADLINE */}
                <div className="text-center mb-10">
                    <div className="mb-2 animate-hero-fade-up" style={{ animationDelay: "0.1s" }}>
                        <h1
                            className="font-display text-[clamp(3.5rem,12vw,9rem)] font-900 leading-none tracking-tighter"
                            style={{
                                background: "linear-gradient(135deg, #ffffff 0%, var(--accent-cyan) 50%, #ffffff 100%)",
                                backgroundSize: "200% 200%",
                                WebkitBackgroundClip: "text",
                                WebkitTextFillColor: "transparent",
                                backgroundClip: "text",
                                animation: "heroGradientShift 6s ease infinite",
                            }}
                        >
                            <GlitchText text="BATTLE HUB" />
                        </h1>
                    </div>

                    {/* Accent line */}
                    <div className="flex justify-center gap-1.5 mb-6 animate-hero-fade-up" style={{ animationDelay: "0.2s" }}>
                        <div className="h-px w-24 bg-gradient-to-r from-transparent via-[var(--accent-fire)] to-transparent" />
                        <div className="h-px w-12 bg-gradient-to-r from-transparent via-[var(--accent-cyan)] to-transparent" />
                    </div>

                    <h2
                        className="font-display text-[clamp(1.5rem,5vw,4rem)] font-700 tracking-[0.25em] uppercase mb-8 animate-hero-fade-up text-[var(--text-secondary)]"
                        style={{ animationDelay: "0.25s" }}
                    >
                        Esports Arena
                    </h2>

                    <p
                        className="max-w-2xl mx-auto font-body text-base sm:text-lg text-[var(--text-secondary)] leading-relaxed animate-hero-fade-up"
                        style={{ animationDelay: "0.35s" }}
                    >
                        Compete in{" "}
                        <span className="text-[var(--accent-cyan)] font-semibold">epic tournaments</span>.
                        {" "}Dominate the{" "}
                        <span className="text-[var(--accent-cyan)] font-semibold">leaderboards</span>.
                        {" "}Claim{" "}
                        <span className="text-[var(--accent-gold)] font-semibold">real prizes</span>.
                    </p>
                </div>

                {/* CTA */}
                <div className="flex justify-center gap-4 mb-20 animate-hero-fade-up" style={{ animationDelay: "0.45s" }}>
                    <Link href="/#tournaments" className="relative group">
                        {/* Glow behind button */}
                        <div className="absolute -inset-px rounded-xl bg-gradient-to-r from-[var(--accent-fire)] to-[#ff8c00] blur-md opacity-70 group-hover:opacity-100 transition-opacity duration-300" />
                        <div className="relative flex items-center gap-2.5 px-8 py-4 rounded-xl btn-fire font-ui font-700 text-base uppercase tracking-wider">
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M14.5 10c-.83 0-1.5-.67-1.5-1.5v-5c0-.83.67-1.5 1.5-1.5s1.5.67 1.5 1.5v5c0 .83-.67 1.5-1.5 1.5z" />
                                <path d="M20.5 10H19V8.5c0-.83.67-1.5 1.5-1.5s1.5.67 1.5 1.5-.67 1.5-1.5 1.5z" />
                                <path d="M9.5 14c.83 0 1.5.67 1.5 1.5v5c0 .83-.67 1.5-1.5 1.5S8 21.33 8 20.5v-5c0-.83.67-1.5 1.5-1.5z" />
                                <path d="M3.5 14H5v1.5c0 .83-.67 1.5-1.5 1.5S2 16.33 2 15.5 2.67 14 3.5 14z" />
                                <path d="M14 14.5c0-.83.67-1.5 1.5-1.5h5c.83 0 1.5.67 1.5 1.5s-.67 1.5-1.5 1.5h-5c-.83 0-1.5-.67-1.5-1.5z" />
                                <path d="M15.5 19H14v1.5c0 .83.67 1.5 1.5 1.5s1.5-.67 1.5-1.5-.67-1.5-1.5-1.5z" />
                                <path d="M10 9.5C10 8.67 9.33 8 8.5 8H3.5C2.67 8 2 8.67 2 9.5S2.67 11 3.5 11h5c.83 0 1.5-.67 1.5-1.5z" />
                                <path d="M8.5 5H10V3.5C10 2.67 9.33 2 8.5 2S7 2.67 7 3.5 7.67 5 8.5 5z" />
                            </svg>
                            Enter the Arena
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"
                                className="group-hover:translate-x-1 transition-transform duration-200">
                                <polyline points="9 18 15 12 9 6" />
                            </svg>
                        </div>
                    </Link>

                    <Link href="/login"
                        className="relative flex items-center gap-2.5 px-8 py-4 rounded-xl btn-cyan font-ui font-700 text-base uppercase tracking-wider">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                            <circle cx="12" cy="7" r="4" />
                        </svg>
                        Join Free
                    </Link>
                </div>

                {/* ── STATS GRID ── */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 max-w-4xl mx-auto">
                    {stats.map((s, i) => (
                        <div
                            key={i}
                            className="battle-card corner-tl corner-br group p-6 animate-hero-fade-up"
                            style={{ animationDelay: `${0.55 + i * 0.1}s` }}
                        >
                            <div className="card-accent-line" />

                            {/* TOP ROW */}
                            <div className="flex items-start justify-between mb-4">
                                <div
                                    className="p-2.5 rounded-lg border transition-transform duration-300 group-hover:scale-110"
                                    style={{
                                        background: `rgba(${s.gold ? "255,215,0" : s.color === "var(--accent-fire)" ? "255,69,0" : "0,212,255"},0.07)`,
                                        borderColor: `rgba(${s.gold ? "255,215,0" : s.color === "var(--accent-fire)" ? "255,69,0" : "0,212,255"},0.2)`,
                                        color: s.color,
                                    }}
                                >
                                    {s.icon}
                                </div>

                                {s.live && (
                                    <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[rgba(0,255,136,0.07)] border border-[rgba(0,255,136,0.2)]">
                                        <span className="w-1.5 h-1.5 rounded-full bg-[var(--accent-green)] animate-pulse" />
                                        <span className="font-ui font-700 text-[9px] uppercase tracking-widest text-[var(--accent-green)]">Live</span>
                                    </div>
                                )}
                                {s.hot && (
                                    <div className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-[rgba(255,69,0,0.08)] border border-[rgba(255,69,0,0.2)]">
                                        <svg width="9" height="9" viewBox="0 0 24 24" fill="var(--accent-fire)"><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" /></svg>
                                        <span className="font-ui font-700 text-[9px] uppercase tracking-widest text-[var(--accent-fire)]">Hot</span>
                                    </div>
                                )}
                                {s.gold && (
                                    <svg width="16" height="16" viewBox="0 0 24 24" fill="var(--accent-gold)" className="animate-spin-slow opacity-70">
                                        <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                                    </svg>
                                )}
                            </div>

                            {/* VALUE */}
                            <div className="mb-1">
                                <span
                                    className="font-display text-3xl sm:text-4xl font-900 tracking-tight"
                                    style={{ color: s.color }}
                                >
                                    {s.prefix ?? ""}
                                    <Counter target={s.value} />
                                    {s.suffix}
                                </span>
                            </div>

                            {/* LABEL */}
                            <p className="font-ui font-600 text-xs uppercase tracking-widest text-[var(--text-muted)] mb-3">{s.label}</p>

                            {/* DIVIDER */}
                            <div className="h-px bg-[var(--border-subtle)] mb-3" />

                            {/* SUB */}
                            <div className="flex items-center gap-1.5">
                                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"
                                    style={{ color: s.color }} className="opacity-70">
                                    <polyline points="23 6 13.5 15.5 8.5 10.5 1 18" />
                                    <polyline points="17 6 23 6 23 12" />
                                </svg>
                                <span className="font-ui font-600 text-xs" style={{ color: s.color, opacity: 0.8 }}>{s.sub}</span>
                            </div>
                        </div>
                    ))}
                </div>

                {/* SCROLL HINT */}
                <div className="flex flex-col items-center mt-14 gap-2 opacity-40 animate-hero-fade-up" style={{ animationDelay: "0.9s" }}>
                    <span className="font-ui font-600 text-[10px] uppercase tracking-[0.3em] text-[var(--text-muted)]">Scroll to Battles</span>
                    <div className="w-px h-8 bg-gradient-to-b from-[var(--accent-cyan)] to-transparent animate-pulse" />
                </div>
            </div>

            {/* Bottom fade */}
            <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-[var(--bg-void)] to-transparent pointer-events-none" />

            {/* ── KEYFRAMES ── */}
            <style>{`
        @keyframes heroFloat {
          0%, 100% { transform: translateY(0) translateX(0); opacity: 0.4; }
          33% { transform: translateY(-18px) translateX(8px); opacity: 0.7; }
          66% { transform: translateY(-8px) translateX(-6px); opacity: 0.5; }
        }
        @keyframes heroGradientShift {
          0%, 100% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
        }
        @keyframes heroSlideDown {
          from { opacity: 0; transform: translateY(-16px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes heroFadeUp {
          from { opacity: 0; transform: translateY(24px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes spinSlow {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        .animate-hero-slide-down {
          animation: heroSlideDown 0.7s cubic-bezier(0.4,0,0.2,1) both;
        }
        .animate-hero-fade-up {
          animation: heroFadeUp 0.8s cubic-bezier(0.4,0,0.2,1) both;
        }
        .animate-spin-slow {
          animation: spinSlow 5s linear infinite;
        }
        .bg-radial-hero {
          background: radial-gradient(ellipse 80% 60% at 50% 0%, rgba(0,212,255,0.04) 0%, transparent 60%);
        }
      `}</style>
        </section>
    );
}
"use client";

import { useEffect, useState, useCallback } from "react";
import { collection, getDocs, doc, getDoc } from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";
import { auth, db } from "../firebase";
import { motion } from "framer-motion";
import Link from "next/link";

type Tournament = {
    id: string;
    name: string;
    entryFee: number;
    joinedPlayers: number;
    maxPlayers: number;
    prizePool?: number;
    matchDate?: string;
    matchTime?: string;
    type?: string;
    status?: string;
    slot?: number;
    roomId?: string;
    roomPassword?: string;
};

type StatusType = "upcoming" | "live" | "past";

/* ── helpers ── */
function getMsUntilMatch(matchDate: string, matchTime: string): number {
    return new Date(`${matchDate}T${matchTime}:00`).getTime() - Date.now();
}

function getCountdownLabel(matchDate: string, matchTime: string): string {
    const ms = getMsUntilMatch(matchDate, matchTime);
    if (isNaN(ms)) return "";
    if (ms <= 0) return "Match Started";
    const h = Math.floor(ms / (1000 * 60 * 60));
    const m = Math.floor((ms / (1000 * 60)) % 60);
    const s = Math.floor((ms / 1000) % 60);
    return h > 0 ? `${h}h ${m}m ${s}s` : `${m}m ${s}s`;
}

function getTournamentStatus(matchDate: string, matchTime: string, status: string): StatusType {
    if (status === "completed") return "past";
    if (!matchDate || !matchTime) return "upcoming";

    const now = new Date();
    const matchDT = new Date(`${matchDate}T${matchTime}:00`);
    const todayStart = new Date(); todayStart.setHours(0, 0, 0, 0);
    const matchDayStart = new Date(matchDate); matchDayStart.setHours(0, 0, 0, 0);

    if (matchDayStart.getTime() === todayStart.getTime()) return "live";
    if (matchDT < now) return "past";
    return "upcoming";
}

/* ── status badge ── */
function StatusBadge({ status }: { status: StatusType }) {
    if (status === "live") return <span className="text-xs bg-green-600/20 text-green-400 px-2 py-1 rounded-full">🔴 Live</span>;
    if (status === "upcoming") return <span className="text-xs bg-yellow-600/20 text-yellow-400 px-2 py-1 rounded-full">📅 Upcoming</span>;
    return <span className="text-xs bg-gray-600/20 text-gray-400 px-2 py-1 rounded-full">✅ Past</span>;
}

/* ════════════════════════════════════
   TOURNAMENT CARD
════════════════════════════════════ */
function TournamentCard({ t }: { t: Tournament }) {
    const [countdown, setCountdown] = useState("");
    const [showRoom, setShowRoom] = useState(false);
    const [showPassword, setShowPassword] = useState(false);

    const status = getTournamentStatus(t.matchDate ?? "", t.matchTime ?? "", t.status ?? "");

    useEffect(() => {
        if (!t.matchDate || !t.matchTime) return;

        const tick = () => {
            setCountdown(getCountdownLabel(t.matchDate!, t.matchTime!));
            const ms = getMsUntilMatch(t.matchDate!, t.matchTime!);
            setShowRoom(ms <= 10 * 60 * 1000);
        };

        tick();
        const id = setInterval(tick, 1000);
        return () => clearInterval(id);
    }, [t.matchDate, t.matchTime]);

    const msLeft = t.matchDate && t.matchTime ? getMsUntilMatch(t.matchDate, t.matchTime) : null;
    const minsUntilReveal = msLeft !== null && msLeft > 10 * 60 * 1000
        ? Math.ceil((msLeft - 10 * 60 * 1000) / 60000)
        : null;

    const copyToClipboard = (text: string, label: string) => {
        navigator.clipboard.writeText(text).then(() => alert(`${label} copied!`)).catch(() => alert("Copy failed"));
    };

    return (
        <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-[#0b0f1a] border border-white/10 rounded-xl p-5 sm:p-6 hover:border-blue-500/40 transition-all"
        >
            {/* Top row */}
            <div className="flex items-start justify-between gap-4 mb-3">
                <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2 mb-2">
                        <h2 className="text-lg sm:text-xl font-bold truncate">{t.name}</h2>
                        <StatusBadge status={status} />
                    </div>

                    <div className="flex flex-wrap gap-3 text-sm text-gray-400">
                        {t.type && <span>🎮 {t.type.toUpperCase()}</span>}
                        <span>👥 {t.joinedPlayers}/{t.maxPlayers}</span>
                        <span>💰 Entry ₹{t.entryFee}</span>
                        {t.prizePool && <span>🏆 Pool ₹{t.prizePool.toLocaleString()}</span>}
                    </div>

                    {t.matchDate && t.matchTime && (
                        <p className="mt-2 text-sm text-blue-400">📅 {t.matchDate} ⏰ {t.matchTime}</p>
                    )}
                </div>
            </div>

            {/* Slot badge */}
            {t.slot && (
                <span className="inline-block text-xs bg-blue-600/20 text-blue-400 px-3 py-1 rounded-full font-semibold mb-3">
                    Your Slot: #{t.slot}
                </span>
            )}

            {/* Countdown */}
            {t.matchDate && t.matchTime && countdown && (
                <p className={`text-sm font-semibold mb-4 ${countdown === "Match Started" ? "text-red-400" : "text-yellow-400"}`}>
                    ⏳ {countdown}
                </p>
            )}

            {/* 🔐 Room Details */}
            {t.roomId ? (
                showRoom ? (
                    <motion.div
                        initial={{ opacity: 0, y: 6 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="bg-yellow-500/10 border border-yellow-500/40 rounded-xl p-4 space-y-3 mb-4"
                    >
                        <p className="text-yellow-400 font-semibold text-sm">🔓 Room Details Unlocked!</p>

                        <div className="flex items-center justify-between bg-black/50 rounded-lg px-4 py-3">
                            <div>
                                <p className="text-xs text-gray-400 mb-0.5">Room ID</p>
                                <p className="font-mono font-bold text-white text-base">{t.roomId}</p>
                            </div>
                            <button
                                onClick={() => copyToClipboard(t.roomId!, "Room ID")}
                                className="text-xs bg-white/10 hover:bg-white/20 px-3 py-1.5 rounded-lg transition-all"
                            >
                                📋 Copy
                            </button>
                        </div>

                        <div className="flex items-center justify-between bg-black/50 rounded-lg px-4 py-3">
                            <div>
                                <p className="text-xs text-gray-400 mb-0.5">Password</p>
                                <p className="font-mono font-bold text-white text-base">
                                    {showPassword ? t.roomPassword : "••••••••"}
                                </p>
                            </div>
                            <div className="flex gap-2">
                                <button
                                    onClick={() => setShowPassword((p) => !p)}
                                    className="text-xs bg-white/10 hover:bg-white/20 px-3 py-1.5 rounded-lg transition-all"
                                >
                                    {showPassword ? "🙈 Hide" : "👁 Show"}
                                </button>
                                <button
                                    onClick={() => copyToClipboard(t.roomPassword!, "Password")}
                                    className="text-xs bg-white/10 hover:bg-white/20 px-3 py-1.5 rounded-lg transition-all"
                                >
                                    📋 Copy
                                </button>
                            </div>
                        </div>
                    </motion.div>
                ) : (
                    <div className="bg-gray-800/50 border border-gray-700 rounded-xl p-4 mb-4">
                        <p className="text-gray-300 text-sm font-semibold">🔒 Room details available soon</p>
                        <p className="text-gray-500 text-xs mt-1">
                            Unlocks <span className="text-yellow-400 font-semibold">10 minutes before</span> match
                            {minsUntilReveal !== null && ` (~${minsUntilReveal} min${minsUntilReveal !== 1 ? "s" : ""} left)`}
                        </p>
                    </div>
                )
            ) : (
                status !== "past" && (
                    <div className="bg-gray-800/30 border border-gray-700/50 rounded-xl p-4 mb-4">
                        <p className="text-gray-500 text-xs">
                            🕐 Room ID & Password will appear 10 minutes before match starts
                        </p>
                    </div>
                )
            )}

            <div className="inline-block bg-green-600/20 border border-green-500 text-green-400 text-sm px-4 py-2 rounded-lg font-semibold">
                ✅ Joined
            </div>
        </motion.div>
    );
}

/* ════════════════════════════════════
   MAIN PAGE
════════════════════════════════════ */
export default function MyTournamentsPage() {
    const [user, setUser] = useState<any>(null);
    const [tournaments, setTournaments] = useState<Tournament[]>([]);
    const [loading, setLoading] = useState(true);

    const [searchQuery, setSearchQuery] = useState("");
    const [statusFilter, setStatusFilter] = useState<"all" | StatusType>("all");
    const [typeFilter, setTypeFilter] = useState<"all" | "solo" | "duo" | "squad">("all");

    useEffect(() => {
        const unsub = onAuthStateChanged(auth, (u) => {
            if (!u) { window.location.href = "/login"; return; }
            setUser(u);
        });
        return () => unsub();
    }, []);

    const fetchMyTournaments = useCallback(async (uid: string) => {
        try {
            const snap = await getDocs(collection(db, "tournaments"));
            const joined: Tournament[] = [];

            await Promise.all(
                snap.docs.map(async (d) => {
                    try {
                        const participantSnap = await getDoc(doc(db, "tournaments", d.id, "participants", uid));
                        if (participantSnap.exists()) {
                            // ✅ FIX: spread tData first, then override id to avoid duplicate key error
                            const tData = d.data() as Omit<Tournament, "id">;
                            joined.push({
                                ...tData,
                                id: d.id,
                                slot: participantSnap.data().slotNumber || participantSnap.data().slot,
                            });
                        }
                    } catch {
                        // Skip tournaments with permission errors
                    }
                })
            );

            const order: Record<string, number> = { upcoming: 0, live: 1, past: 2 };
            joined.sort((a, b) => {
                const sa = getTournamentStatus(a.matchDate ?? "", a.matchTime ?? "", a.status ?? "");
                const sb = getTournamentStatus(b.matchDate ?? "", b.matchTime ?? "", b.status ?? "");
                return (order[sa] ?? 0) - (order[sb] ?? 0);
            });

            setTournaments(joined);
        } catch (err) {
            console.error("fetchMyTournaments:", err);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        if (user) fetchMyTournaments(user.uid);
    }, [user, fetchMyTournaments]);

    const filtered = tournaments.filter((t) => {
        const matchesSearch = !searchQuery || t.name.toLowerCase().includes(searchQuery.toLowerCase());
        const s = getTournamentStatus(t.matchDate ?? "", t.matchTime ?? "", t.status ?? "");
        const matchesStatus = statusFilter === "all" || s === statusFilter;
        const matchesType = typeFilter === "all" || (t.type ?? "").toLowerCase() === typeFilter;
        return matchesSearch && matchesStatus && matchesType;
    });

    const counts = {
        upcoming: tournaments.filter((t) => getTournamentStatus(t.matchDate ?? "", t.matchTime ?? "", t.status ?? "") === "upcoming").length,
        live: tournaments.filter((t) => getTournamentStatus(t.matchDate ?? "", t.matchTime ?? "", t.status ?? "") === "live").length,
        past: tournaments.filter((t) => getTournamentStatus(t.matchDate ?? "", t.matchTime ?? "", t.status ?? "") === "past").length,
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-black text-white flex items-center justify-center">
                <p className="text-gray-400 animate-pulse">Loading your tournaments...</p>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-black text-white p-4 sm:p-6">
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="max-w-6xl mx-auto">

                <div className="mb-8">
                    <h1 className="text-3xl sm:text-4xl font-bold mb-2">🎮 My Tournaments</h1>
                    <p className="text-gray-400">Tournaments you&apos;ve joined</p>
                </div>

                {tournaments.length === 0 ? (
                    <div className="bg-[#0b0f1a] border border-white/10 rounded-xl p-12 text-center">
                        <p className="text-gray-400 text-lg mb-4">You haven&apos;t joined any tournaments yet</p>
                        <Link href="/" className="inline-block bg-blue-600 hover:bg-blue-500 px-6 py-3 rounded-lg font-semibold transition-all">
                            Browse Tournaments
                        </Link>
                    </div>
                ) : (
                    <>
                        <div className="mb-6">
                            <input
                                type="text"
                                placeholder="🔍 Search tournaments..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="w-full bg-[#0b0f1a] border border-white/10 rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-blue-500/50"
                            />
                        </div>

                        <div className="mb-8 space-y-4">
                            <div>
                                <p className="text-sm text-gray-400 mb-2">Status</p>
                                <div className="flex flex-wrap gap-2">
                                    {([
                                        { key: "all", label: `All (${tournaments.length})`, activeClass: "bg-blue-600" },
                                        { key: "upcoming", label: `📅 Upcoming (${counts.upcoming})`, activeClass: "bg-yellow-600" },
                                        { key: "live", label: `🔴 Live (${counts.live})`, activeClass: "bg-green-600" },
                                        { key: "past", label: `✅ Past (${counts.past})`, activeClass: "bg-gray-600" },
                                    ] as const).map(({ key, label, activeClass }) => (
                                        <button
                                            key={key}
                                            onClick={() => setStatusFilter(key)}
                                            className={`px-4 py-2 rounded-lg font-semibold transition-all ${statusFilter === key ? `${activeClass} text-white` : "bg-[#0b0f1a] text-gray-400 hover:bg-white/5"}`}
                                        >
                                            {label}
                                        </button>
                                    ))}
                                </div>
                            </div>
                            <div>
                                <p className="text-sm text-gray-400 mb-2">Game Type</p>
                                <div className="flex flex-wrap gap-2">
                                    {(["all", "solo", "duo", "squad"] as const).map((type) => (
                                        <button
                                            key={type}
                                            onClick={() => setTypeFilter(type)}
                                            className={`px-4 py-2 rounded-lg font-semibold transition-all ${typeFilter === type ? "bg-purple-600 text-white" : "bg-[#0b0f1a] text-gray-400 hover:bg-white/5"}`}
                                        >
                                            {type === "all" ? "All Types" : type === "solo" ? "🎮 Solo" : type === "duo" ? "👥 Duo" : "🎯 Squad"}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>

                        <p className="text-gray-400 text-sm mb-4">
                            Showing {filtered.length} tournament{filtered.length !== 1 ? "s" : ""}
                        </p>

                        {filtered.length === 0 ? (
                            <div className="bg-[#0b0f1a] border border-white/10 rounded-xl p-12 text-center">
                                <p className="text-gray-400">No tournaments match your filters</p>
                            </div>
                        ) : (
                            <div className="space-y-4">
                                {filtered.map((t) => <TournamentCard key={t.id} t={t} />)}
                            </div>
                        )}
                    </>
                )}
            </motion.div>
        </div>
    );
}
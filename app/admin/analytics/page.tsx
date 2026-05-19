"use client";

import { useEffect, useState, useMemo } from "react";
import { collection, getDocs, doc, getDoc } from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";
import { auth, db } from "../../firebase";
import { motion } from "framer-motion";
import Link from "next/link";

const ADMIN_EMAIL = "battlehubsofficial@gmail.com";

type Tournament = {
    id: string;
    name?: string;
    entryFee?: number;
    joinedPlayers?: number;
    maxPlayers?: number;
    prizePool?: number;
    type?: string;
    matchDate?: string;
    matchTime?: string;
    status?: string;
    prizesDistributed?: boolean;
    game?: string;
    createdBy?: string;
    createdByEmail?: string;
    createdByRole?: "admin" | "influencer" | "superadmin";
};

type UserRole = "superadmin" | "admin" | "influencer";

type FilterPeriod = "day" | "month" | "year";

// ── helpers ──────────────────────────────────────────────────────
function getRevenue(t: Tournament): number {
    return (t.entryFee ?? 0) * (t.joinedPlayers ?? 0);
}

function getPrizePool(t: Tournament): number {
    return t.prizePool ?? 0;
}

function getProfit(t: Tournament): number {
    return getRevenue(t) - getPrizePool(t);
}

function formatCurrency(n: number): string {
    return `₹${n.toLocaleString("en-IN")}`;
}

function getDateParts(dateStr: string) {
    const d = new Date(dateStr);
    return {
        day: dateStr, // YYYY-MM-DD
        month: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`,
        year: `${d.getFullYear()}`,
    };
}

// ── Stat Card ────────────────────────────────────────────────────
function StatCard({ label, value, sub, color = "blue" }: {
    label: string; value: string; sub?: string; color?: string;
}) {
    const colors: Record<string, string> = {
        blue: "border-blue-500/30 bg-blue-500/5",
        green: "border-green-500/30 bg-green-500/5",
        purple: "border-purple-500/30 bg-purple-500/5",
        yellow: "border-yellow-500/30 bg-yellow-500/5",
        red: "border-red-500/30 bg-red-500/5",
    };
    const textColors: Record<string, string> = {
        blue: "text-blue-400", green: "text-green-400",
        purple: "text-purple-400", yellow: "text-yellow-400", red: "text-red-400",
    };
    return (
        <div className={`rounded-xl border p-4 ${colors[color] ?? colors.blue}`}>
            <p className="text-xs text-gray-400 mb-1">{label}</p>
            <p className={`text-2xl font-bold ${textColors[color] ?? textColors.blue}`}>{value}</p>
            {sub && <p className="text-xs text-gray-500 mt-1">{sub}</p>}
        </div>
    );
}

// ── Main Page ────────────────────────────────────────────────────
export default function AnalyticsPage() {
    const [role, setRole] = useState<UserRole | null>(null);
    const [currentUserUid, setCurrentUserUid] = useState("");
    const [currentUserEmail, setCurrentUserEmail] = useState("");
    const [loading, setLoading] = useState(true);

    const [tournaments, setTournaments] = useState<Tournament[]>([]);
    const [admins, setAdmins] = useState<{ email: string; uid?: string }[]>([]);
    const [influencers, setInfluencers] = useState<{ email: string; uid?: string }[]>([]);

    // Filters
    const [period, setPeriod] = useState<FilterPeriod>("month");
    const [selectedValue, setSelectedValue] = useState<string>("");
    const [searchCreator, setSearchCreator] = useState("");

    // ── Auth ──
    useEffect(() => {
        const unsub = onAuthStateChanged(auth, async (user) => {
            if (!user) { window.location.href = "/login"; return; }

            setCurrentUserUid(user.uid);
            setCurrentUserEmail(user.email ?? "");

            const isSuperAdmin = user.email === ADMIN_EMAIL;
            const adminSnap = await getDoc(doc(db, "admins", user.email ?? ""));
            const isAdmin = adminSnap.exists();
            const influencerSnap = await getDoc(doc(db, "influencers", user.email ?? ""));
            const isInfluencer = influencerSnap.exists();

            if (isSuperAdmin) setRole("superadmin");
            else if (isAdmin) setRole("admin");
            else if (isInfluencer) setRole("influencer");
            else { window.location.href = "/"; return; }
        });
        return () => unsub();
    }, []);

    // ── Fetch data ──
    useEffect(() => {
        if (!role) return;
        const fetch = async () => {
            try {
                const [tSnap, aSnap, iSnap] = await Promise.all([
                    getDocs(collection(db, "tournaments")),
                    getDocs(collection(db, "admins")),
                    getDocs(collection(db, "influencers")),
                ]);

                const tList: Tournament[] = tSnap.docs.map((d) => ({ id: d.id, ...d.data() } as Tournament));
                setTournaments(tList);
                setAdmins(aSnap.docs.map((d) => ({ email: d.id, ...d.data() })));
                setInfluencers(iSnap.docs.map((d) => ({ email: d.id, ...d.data() })));

                // Default selected value = current month
                const now = new Date();
                if (period === "day") setSelectedValue(now.toISOString().split("T")[0]);
                else if (period === "month") setSelectedValue(`${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`);
                else setSelectedValue(`${now.getFullYear()}`);
            } catch (err) {
                console.error("Analytics fetch error:", err);
            } finally {
                setLoading(false);
            }
        };
        fetch();
    }, [role]);

    // Set default selectedValue when period changes
    useEffect(() => {
        const now = new Date();
        if (period === "day") setSelectedValue(now.toISOString().split("T")[0]);
        else if (period === "month") setSelectedValue(`${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`);
        else setSelectedValue(`${now.getFullYear()}`);
    }, [period]);

    // ── Filter tournaments by role ──
    const myTournaments = useMemo(() => {
        if (role === "superadmin") return tournaments;
        // Sub admin / influencer — only their own
        return tournaments.filter(
            (t) => t.createdBy === currentUserUid || t.createdByEmail === currentUserEmail
        );
    }, [tournaments, role, currentUserUid, currentUserEmail]);

    // ── Filter by period ──
    const periodFiltered = useMemo(() => {
        if (!selectedValue) return myTournaments;
        return myTournaments.filter((t) => {
            if (!t.matchDate) return false;
            const parts = getDateParts(t.matchDate);
            return parts[period] === selectedValue;
        });
    }, [myTournaments, period, selectedValue]);

    // ── Filter by creator search (super admin only) ──
    const displayTournaments = useMemo(() => {
        if (role !== "superadmin" || !searchCreator.trim()) return periodFiltered;
        const q = searchCreator.toLowerCase().trim();
        return periodFiltered.filter(
            (t) =>
                (t.createdByEmail ?? "").toLowerCase().includes(q) ||
                (t.createdBy ?? "").toLowerCase().includes(q) ||
                (t.id ?? "").toLowerCase().includes(q)
        );
    }, [periodFiltered, searchCreator, role]);

    // ── Overall stats for current view ──
    const stats = useMemo(() => {
        const totalMatches = displayTournaments.length;
        const totalRevenue = displayTournaments.reduce((s, t) => s + getRevenue(t), 0);
        const totalPrizePool = displayTournaments.reduce((s, t) => s + getPrizePool(t), 0);
        const totalProfit = displayTournaments.reduce((s, t) => s + getProfit(t), 0);
        const totalPlayers = displayTournaments.reduce((s, t) => s + (t.joinedPlayers ?? 0), 0);
        const completed = displayTournaments.filter((t) => t.prizesDistributed || t.status === "completed").length;
        return { totalMatches, totalRevenue, totalPrizePool, totalProfit, totalPlayers, completed };
    }, [displayTournaments]);

    // ── Creator breakdown (super admin) ──
    const creatorBreakdown = useMemo(() => {
        if (role !== "superadmin") return [];

        const map: Record<string, { email: string; role: string; matches: number; revenue: number; profit: number; players: number }> = {};

        for (const t of periodFiltered) {
            const key = t.createdByEmail ?? t.createdBy ?? "unknown";
            if (!map[key]) {
                map[key] = {
                    email: t.createdByEmail ?? t.createdBy ?? "Unknown",
                    role: t.createdByRole ?? "admin",
                    matches: 0, revenue: 0, profit: 0, players: 0,
                };
            }
            map[key].matches++;
            map[key].revenue += getRevenue(t);
            map[key].profit += getProfit(t);
            map[key].players += t.joinedPlayers ?? 0;
        }

        return Object.values(map).sort((a, b) => b.revenue - a.revenue);
    }, [periodFiltered, role]);

    // Filtered creator breakdown by search
    const filteredCreatorBreakdown = useMemo(() => {
        if (!searchCreator.trim()) return creatorBreakdown;
        const q = searchCreator.toLowerCase();
        return creatorBreakdown.filter((c) => c.email.toLowerCase().includes(q));
    }, [creatorBreakdown, searchCreator]);

    // ── Period label options ──
    const periodOptions = useMemo(() => {
        const allDates = myTournaments.map((t) => t.matchDate).filter(Boolean) as string[];
        const set = new Set<string>();
        allDates.forEach((d) => {
            const parts = getDateParts(d);
            set.add(parts[period]);
        });
        return Array.from(set).sort().reverse();
    }, [myTournaments, period]);

    if (loading || !role) {
        return (
            <div className="min-h-screen bg-black text-white flex items-center justify-center">
                <p className="text-gray-400 animate-pulse">Loading analytics...</p>
            </div>
        );
    }

    const roleLabel = role === "superadmin" ? "👑 Super Admin" : role === "admin" ? "🛡 Admin" : "🎥 Influencer";

    return (
        <div className="min-h-screen bg-black text-white p-4 sm:p-6">
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="max-w-6xl mx-auto space-y-8">

                {/* Header */}
                <div className="flex items-center justify-between flex-wrap gap-4">
                    <div>
                        <h1 className="text-2xl sm:text-3xl font-bold">📊 Analytics</h1>
                        <p className="text-gray-400 text-sm mt-1">{roleLabel} • {role === "superadmin" ? "All tournaments" : "Your tournaments"}</p>
                    </div>
                    <Link href="/admin/dashboard" className="bg-gray-700 hover:bg-gray-600 px-4 py-2 rounded-lg text-sm font-semibold transition-all">
                        ← Dashboard
                    </Link>
                </div>

                {/* ── Period Filter ── */}
                <div className="bg-[#0b0f1a] border border-white/10 rounded-xl p-5">
                    <p className="text-sm text-gray-400 mb-3">Filter By</p>
                    <div className="flex flex-wrap gap-3 mb-4">
                        {(["day", "month", "year"] as FilterPeriod[]).map((p) => (
                            <button key={p} onClick={() => setPeriod(p)}
                                className={`px-4 py-2 rounded-lg font-semibold capitalize transition-all ${period === p ? "bg-blue-600 text-white" : "bg-black/40 text-gray-400 hover:bg-white/5"}`}>
                                {p === "day" ? "📅 Day" : p === "month" ? "📆 Month" : "🗓 Year"}
                            </button>
                        ))}
                    </div>

                    {/* Period value selector */}
                    <div className="flex flex-wrap gap-2">
                        {periodOptions.length === 0 ? (
                            <p className="text-gray-500 text-sm">No data available</p>
                        ) : (
                            periodOptions.map((opt) => (
                                <button key={opt} onClick={() => setSelectedValue(opt)}
                                    className={`px-3 py-1.5 rounded-lg text-sm font-mono transition-all ${selectedValue === opt ? "bg-blue-600 text-white" : "bg-black/40 text-gray-400 hover:bg-white/5 border border-white/10"}`}>
                                    {opt}
                                </button>
                            ))
                        )}
                    </div>
                </div>

                {/* ── Super Admin: Creator Search ── */}
                {role === "superadmin" && (
                    <div>
                        <input
                            type="text"
                            placeholder="🔍 Search by email or influencer ID..."
                            value={searchCreator}
                            onChange={(e) => setSearchCreator(e.target.value)}
                            className="w-full bg-[#0b0f1a] border border-white/10 rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-blue-500/50"
                        />
                    </div>
                )}

                {/* ── Overall Stats ── */}
                <div>
                    <p className="text-sm text-gray-400 mb-3">
                        Overview — <span className="text-white font-semibold">{selectedValue || "All"}</span>
                        {searchCreator && <span className="text-blue-400"> • Filtered: "{searchCreator}"</span>}
                    </p>
                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
                        <StatCard label="Total Matches" value={`${stats.totalMatches}`} color="blue" />
                        <StatCard label="Revenue" value={formatCurrency(stats.totalRevenue)} color="green" />
                        <StatCard label="Prize Pool" value={formatCurrency(stats.totalPrizePool)} color="yellow" />
                        <StatCard label="Profit" value={formatCurrency(stats.totalProfit)} color="purple" />
                        <StatCard label="Total Players" value={`${stats.totalPlayers}`} color="blue" />
                        <StatCard label="Completed" value={`${stats.completed}`} sub={`of ${stats.totalMatches}`} color="green" />
                    </div>
                </div>

                {/* ── Super Admin: Creator Breakdown ── */}
                {role === "superadmin" && (
                    <div className="bg-[#0b0f1a] border border-white/10 rounded-xl p-5">
                        <h2 className="font-semibold mb-4">
                            👥 Host Breakdown
                            <span className="text-gray-400 text-sm font-normal ml-2">
                                ({filteredCreatorBreakdown.length} hosts)
                            </span>
                        </h2>

                        {filteredCreatorBreakdown.length === 0 ? (
                            <p className="text-gray-500 text-sm text-center py-6">No data for this period</p>
                        ) : (
                            <div className="space-y-3">
                                {filteredCreatorBreakdown.map((c, i) => (
                                    <motion.div key={c.email}
                                        initial={{ opacity: 0, x: -10 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        transition={{ delay: i * 0.04 }}
                                        className="bg-black/40 border border-white/10 rounded-xl p-4"
                                    >
                                        <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
                                            <div>
                                                <div className="flex items-center gap-2">
                                                    <p className="font-semibold text-sm">{c.email}</p>
                                                    <span className={`text-xs px-2 py-0.5 rounded-full ${c.role === "influencer"
                                                            ? "bg-purple-500/20 text-purple-400"
                                                            : c.role === "superadmin"
                                                                ? "bg-yellow-500/20 text-yellow-400"
                                                                : "bg-blue-500/20 text-blue-400"
                                                        }`}>
                                                        {c.role === "influencer" ? "🎥 Influencer" : c.role === "superadmin" ? "👑 Super Admin" : "🛡 Admin"}
                                                    </span>
                                                </div>
                                            </div>
                                            <p className="text-green-400 font-bold">{formatCurrency(c.revenue)}</p>
                                        </div>

                                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                                            <div className="bg-black/30 rounded-lg p-3 text-center">
                                                <p className="text-xs text-gray-400">Matches</p>
                                                <p className="font-bold text-blue-400">{c.matches}</p>
                                            </div>
                                            <div className="bg-black/30 rounded-lg p-3 text-center">
                                                <p className="text-xs text-gray-400">Revenue</p>
                                                <p className="font-bold text-green-400">{formatCurrency(c.revenue)}</p>
                                            </div>
                                            <div className="bg-black/30 rounded-lg p-3 text-center">
                                                <p className="text-xs text-gray-400">Profit</p>
                                                <p className="font-bold text-purple-400">{formatCurrency(c.profit)}</p>
                                            </div>
                                            <div className="bg-black/30 rounded-lg p-3 text-center">
                                                <p className="text-xs text-gray-400">Players</p>
                                                <p className="font-bold text-yellow-400">{c.players}</p>
                                            </div>
                                        </div>
                                    </motion.div>
                                ))}
                            </div>
                        )}
                    </div>
                )}

                {/* ── Match List ── */}
                <div className="bg-[#0b0f1a] border border-white/10 rounded-xl p-5">
                    <h2 className="font-semibold mb-4">
                        🏆 Match Details
                        <span className="text-gray-400 text-sm font-normal ml-2">
                            ({displayTournaments.length} matches)
                        </span>
                    </h2>

                    {displayTournaments.length === 0 ? (
                        <p className="text-gray-500 text-sm text-center py-8">No matches found for this period</p>
                    ) : (
                        <div className="space-y-3 max-h-[600px] overflow-y-auto pr-1">
                            {displayTournaments.map((t, i) => {
                                const revenue = getRevenue(t);
                                const profit = getProfit(t);
                                const isCompleted = t.prizesDistributed || t.status === "completed";
                                return (
                                    <motion.div key={t.id}
                                        initial={{ opacity: 0, y: 6 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        transition={{ delay: i * 0.03 }}
                                        className="bg-black/40 border border-white/10 rounded-xl p-4"
                                    >
                                        <div className="flex flex-wrap items-start justify-between gap-3 mb-3">
                                            <div>
                                                <div className="flex items-center gap-2 flex-wrap">
                                                    <p className="font-semibold">{t.name ?? t.id}</p>
                                                    <span className={`text-xs px-2 py-0.5 rounded-full ${isCompleted ? "bg-green-500/20 text-green-400" : "bg-yellow-500/20 text-yellow-400"
                                                        }`}>
                                                        {isCompleted ? "✅ Completed" : "📅 Upcoming"}
                                                    </span>
                                                </div>
                                                <p className="text-xs text-gray-500 mt-0.5">
                                                    {t.matchDate} {t.matchTime && `⏰ ${t.matchTime}`} • {(t.type ?? "solo").toUpperCase()}
                                                    {role === "superadmin" && t.createdByEmail && (
                                                        <span className="text-blue-400 ml-2">• {t.createdByEmail}</span>
                                                    )}
                                                </p>
                                            </div>
                                            <p className="text-green-400 font-bold">{formatCurrency(revenue)}</p>
                                        </div>

                                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                                            <div className="bg-black/30 rounded-lg p-2.5 text-center">
                                                <p className="text-xs text-gray-400">Entry</p>
                                                <p className="font-semibold text-blue-400">₹{t.entryFee ?? 0}</p>
                                            </div>
                                            <div className="bg-black/30 rounded-lg p-2.5 text-center">
                                                <p className="text-xs text-gray-400">Players</p>
                                                <p className="font-semibold text-yellow-400">{t.joinedPlayers ?? 0}/{t.maxPlayers ?? 50}</p>
                                            </div>
                                            <div className="bg-black/30 rounded-lg p-2.5 text-center">
                                                <p className="text-xs text-gray-400">Prize Pool</p>
                                                <p className="font-semibold text-orange-400">{formatCurrency(t.prizePool ?? 0)}</p>
                                            </div>
                                            <div className="bg-black/30 rounded-lg p-2.5 text-center">
                                                <p className="text-xs text-gray-400">Profit</p>
                                                <p className={`font-semibold ${profit >= 0 ? "text-green-400" : "text-red-400"}`}>{formatCurrency(profit)}</p>
                                            </div>
                                        </div>
                                    </motion.div>
                                );
                            })}
                        </div>
                    )}
                </div>

            </motion.div>
        </div>
    );
}
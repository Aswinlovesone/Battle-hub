"use client";

import { useEffect, useState, useMemo } from "react";
import {
    collection,
    getDocs,
    deleteDoc,
    updateDoc,
    doc,
    setDoc,
    getDoc,
    serverTimestamp,
} from "firebase/firestore";
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
    roomId?: string;
    roomPassword?: string;
    createdBy?: string;
    createdByEmail?: string;
    createdByRole?: string;
};

type Influencer = { email: string };
type Admin = { email: string; addedAt?: any };
type FilterPeriod = "day" | "month" | "year";
type ActiveTab = "dashboard" | "analytics";

// ── Analytics helpers ──────────────────────────────────────────
function getRevenue(t: Tournament) { return (t.entryFee ?? 0) * (t.joinedPlayers ?? 0); }
function getPrizePool(t: Tournament) { return t.prizePool ?? 0; }
function getProfit(t: Tournament) { return getRevenue(t) - getPrizePool(t); }
function formatCurrency(n: number) { return `₹${n.toLocaleString("en-IN")}`; }
function getDateParts(dateStr: string): Record<FilterPeriod, string> {
    const d = new Date(dateStr);
    return {
        day: dateStr,
        month: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`,
        year: `${d.getFullYear()}`,
    };
}

function StatCard({ label, value, sub, color = "blue" }: {
    label: string; value: string; sub?: string; color?: string;
}) {
    const border: Record<string, string> = {
        blue: "border-blue-500/30 bg-blue-500/5", green: "border-green-500/30 bg-green-500/5",
        purple: "border-purple-500/30 bg-purple-500/5", yellow: "border-yellow-500/30 bg-yellow-500/5",
    };
    const text: Record<string, string> = {
        blue: "text-blue-400", green: "text-green-400", purple: "text-purple-400", yellow: "text-yellow-400",
    };
    return (
        <div className={`rounded-xl border p-4 ${border[color] ?? border.blue}`}>
            <p className="text-xs text-gray-400 mb-1">{label}</p>
            <p className={`text-xl font-bold ${text[color] ?? text.blue}`}>{value}</p>
            {sub && <p className="text-xs text-gray-500 mt-1">{sub}</p>}
        </div>
    );
}

export default function AdminDashboard() {
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<ActiveTab>("dashboard");
    const [tournaments, setTournaments] = useState<Tournament[]>([]);
    const [influencers, setInfluencers] = useState<Influencer[]>([]);
    const [admins, setAdmins] = useState<Admin[]>([]);
    const [adminUid, setAdminUid] = useState("");
    const [adminEmail, setAdminEmail] = useState("");
    const [isSuperAdmin, setIsSuperAdmin] = useState(false);

    /* CREATE */
    const [entryFee, setEntryFee] = useState(0);
    const [game, setGame] = useState("freefire");
    const [type, setType] = useState("solo");
    const [matchDate, setMatchDate] = useState("");
    const [matchTime, setMatchTime] = useState("");

    /* EDIT */
    const [editingId, setEditingId] = useState<string | null>(null);
    const [editEntryFee, setEditEntryFee] = useState(0);
    const [editType, setEditType] = useState("solo");
    const [editDate, setEditDate] = useState("");
    const [editTime, setEditTime] = useState("");

    /* INFLUENCER / ADMIN */
    const [influencerEmail, setInfluencerEmail] = useState("");
    const [newAdminEmail, setNewAdminEmail] = useState("");

    /* ANALYTICS */
    const [period, setPeriod] = useState<FilterPeriod>("month");
    const [selectedValue, setSelectedValue] = useState("");
    const [searchCreator, setSearchCreator] = useState("");

    const maxPlayers = 50;

    /* ── auth ── */
    useEffect(() => {
        const unsub = onAuthStateChanged(auth, async (user) => {
            if (!user) { alert("Please login first"); window.location.href = "/login"; return; }
            const superAdmin = user.email === ADMIN_EMAIL;
            const adminSnap = await getDoc(doc(db, "admins", user.email ?? ""));
            if (!superAdmin && !adminSnap.exists()) { alert("Admin access only"); window.location.href = "/"; return; }
            setIsSuperAdmin(superAdmin);
            setAdminUid(user.uid);
            setAdminEmail(user.email ?? "");
        });
        return () => unsub();
    }, []);

    /* ── fetch ── */
    const fetchData = async () => {
        try {
            const [tSnap, iSnap, aSnap] = await Promise.all([
                getDocs(collection(db, "tournaments")),
                getDocs(collection(db, "influencers")),
                getDocs(collection(db, "admins")),
            ]);
            const tList: Tournament[] = tSnap.docs.map((d) => ({ id: d.id, ...d.data() } as Tournament));
            tList.sort((a, b) => (b.matchDate ?? "").localeCompare(a.matchDate ?? ""));
            setTournaments(tList);
            setInfluencers(iSnap.docs.map((d) => ({ email: d.id })));
            setAdmins(aSnap.docs.map((d) => ({ email: d.id, ...d.data() } as Admin)));
        } catch (err) {
            console.error("fetchData:", err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { if (adminUid) fetchData(); }, [adminUid]);

    /* Set default analytics period value */
    useEffect(() => {
        const now = new Date();
        if (period === "day") setSelectedValue(now.toISOString().split("T")[0]);
        else if (period === "month") setSelectedValue(`${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`);
        else setSelectedValue(`${now.getFullYear()}`);
    }, [period]);

    /* ── create tournament ── */
    const createTournament = async () => {
        if (entryFee <= 0 || !matchDate || !matchTime) { alert("Fill all fields"); return; }
        const prizePool = Math.round(entryFee * maxPlayers * 0.8);
        const prizes = { first: Math.round(prizePool * 0.5), second: Math.round(prizePool * 0.3), third: Math.round(prizePool * 0.2) };
        try {
            const gamePrefix = game.toUpperCase();
            const sameDayGame = tournaments.filter((t) => t.matchDate === matchDate && t.game === game);
            const countStr = (sameDayGame.length + 1).toString().padStart(3, "0");
            const tournamentId = `${gamePrefix}-${matchDate}-${countStr}`;
            const gameLabel: Record<string, string> = { freefire: "Free Fire", pubg: "PUBG", chess: "Chess" };
            const name = `${gameLabel[game] ?? game} ${type.charAt(0).toUpperCase() + type.slice(1)} - ${matchDate}`;
            await setDoc(doc(db, "tournaments", tournamentId), {
                name, entryFee, game, type, maxPlayers, joinedPlayers: 0,
                prizePool, prizes, matchDate, matchTime,
                createdBy: adminUid,
                createdByEmail: adminEmail,
                createdByRole: isSuperAdmin ? "superadmin" : "admin",
                createdAt: serverTimestamp(),
                status: "open",
            });
            setEntryFee(0); setGame("freefire"); setType("solo"); setMatchDate(""); setMatchTime("");
            alert(`✅ Tournament Created!\nID: ${tournamentId}`);
            fetchData();
        } catch (err) { console.error("createTournament:", err); alert("Failed to create tournament"); }
    };

    /* ── edit ── */
    const startEdit = (t: Tournament) => {
        setEditingId(t.id); setEditEntryFee(t.entryFee ?? 0);
        setEditType(t.type ?? "solo"); setEditDate(t.matchDate ?? ""); setEditTime(t.matchTime ?? "");
    };
    const saveEdit = async () => {
        if (!editingId) return;
        const prizePool = Math.round(editEntryFee * maxPlayers * 0.8);
        const prizes = { first: Math.round(prizePool * 0.5), second: Math.round(prizePool * 0.3), third: Math.round(prizePool * 0.2) };
        try {
            await updateDoc(doc(db, "tournaments", editingId), {
                entryFee: editEntryFee, type: editType, prizePool, prizes, matchDate: editDate, matchTime: editTime,
            });
            setEditingId(null); fetchData();
        } catch (err) { console.error("saveEdit:", err); alert("Failed to save"); }
    };

    /* ── delete ── */
    const deleteTournament = async (id: string) => {
        if (!confirm("Delete this tournament?")) return;
        try { await deleteDoc(doc(db, "tournaments", id)); fetchData(); }
        catch (err) { console.error("deleteTournament:", err); alert("Failed to delete"); }
    };

    /* ── influencer ── */
    const addInfluencer = async () => {
        if (!influencerEmail.trim()) { alert("Enter email"); return; }
        try {
            await setDoc(doc(db, "influencers", influencerEmail.trim()), { email: influencerEmail.trim(), role: "influencer", createdAt: serverTimestamp() });
            setInfluencerEmail(""); fetchData();
        } catch { alert("Failed to add influencer"); }
    };
    const removeInfluencer = async (email: string) => {
        if (!confirm(`Remove influencer ${email}?`)) return;
        await deleteDoc(doc(db, "influencers", email)); fetchData();
    };

    /* ── admin ── */
    const addAdmin = async () => {
        if (!newAdminEmail.trim()) { alert("Enter email"); return; }
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(newAdminEmail)) { alert("Invalid email"); return; }
        if (newAdminEmail === ADMIN_EMAIL) { alert("Already super admin"); return; }
        try {
            await setDoc(doc(db, "admins", newAdminEmail.trim()), { email: newAdminEmail.trim(), role: "admin", addedAt: serverTimestamp() });
            setNewAdminEmail(""); fetchData();
        } catch { alert("Failed to add admin"); }
    };
    const removeAdmin = async (email: string) => {
        if (!confirm(`Remove admin ${email}?`)) return;
        await deleteDoc(doc(db, "admins", email)); fetchData();
    };

    /* ── tournament status ── */
    const getTournamentStatus = (t: Tournament): "upcoming" | "live" | "completed" => {
        if (t.status === "completed" || t.prizesDistributed) return "completed";
        if (!t.matchDate || !t.matchTime) return "upcoming";
        const today = new Date(); today.setHours(0, 0, 0, 0);
        const matchDay = new Date(t.matchDate); matchDay.setHours(0, 0, 0, 0);
        if (matchDay.getTime() === today.getTime()) return "live";
        return "upcoming";
    };

    /* ══════════════════════════════════════
       ANALYTICS COMPUTED VALUES
    ══════════════════════════════════════ */
    const myTournaments = useMemo(() => {
        if (isSuperAdmin) return tournaments;
        return tournaments.filter((t) => t.createdBy === adminUid || t.createdByEmail === adminEmail);
    }, [tournaments, isSuperAdmin, adminUid, adminEmail]);

    const periodOptions = useMemo(() => {
        const set = new Set<string>();
        myTournaments.forEach((t) => { if (t.matchDate) set.add(getDateParts(t.matchDate)[period]); });
        return Array.from(set).sort().reverse();
    }, [myTournaments, period]);

    const periodFiltered = useMemo(() => {
        if (!selectedValue) return myTournaments;
        return myTournaments.filter((t) => t.matchDate && getDateParts(t.matchDate)[period] === selectedValue);
    }, [myTournaments, period, selectedValue]);

    const displayTournaments = useMemo(() => {
        if (!isSuperAdmin || !searchCreator.trim()) return periodFiltered;
        const q = searchCreator.toLowerCase();
        return periodFiltered.filter((t) =>
            (t.createdByEmail ?? "").toLowerCase().includes(q) ||
            (t.createdBy ?? "").toLowerCase().includes(q)
        );
    }, [periodFiltered, searchCreator, isSuperAdmin]);

    const stats = useMemo(() => ({
        totalMatches: displayTournaments.length,
        totalRevenue: displayTournaments.reduce((s, t) => s + getRevenue(t), 0),
        totalPrizePool: displayTournaments.reduce((s, t) => s + getPrizePool(t), 0),
        totalProfit: displayTournaments.reduce((s, t) => s + getProfit(t), 0),
        totalPlayers: displayTournaments.reduce((s, t) => s + (t.joinedPlayers ?? 0), 0),
        completed: displayTournaments.filter((t) => t.prizesDistributed || t.status === "completed").length,
    }), [displayTournaments]);

    const creatorBreakdown = useMemo(() => {
        if (!isSuperAdmin) return [];
        const map: Record<string, { email: string; role: string; matches: number; revenue: number; profit: number; players: number }> = {};
        for (const t of periodFiltered) {
            const key = t.createdByEmail ?? t.createdBy ?? "unknown";
            if (!map[key]) map[key] = { email: key, role: t.createdByRole ?? "admin", matches: 0, revenue: 0, profit: 0, players: 0 };
            map[key].matches++;
            map[key].revenue += getRevenue(t);
            map[key].profit += getProfit(t);
            map[key].players += t.joinedPlayers ?? 0;
        }
        return Object.values(map).sort((a, b) => b.revenue - a.revenue);
    }, [periodFiltered, isSuperAdmin]);

    const filteredCreatorBreakdown = useMemo(() => {
        if (!searchCreator.trim()) return creatorBreakdown;
        const q = searchCreator.toLowerCase();
        return creatorBreakdown.filter((c) => c.email.toLowerCase().includes(q));
    }, [creatorBreakdown, searchCreator]);

    /* ── loading ── */
    if (loading) {
        return (
            <div className="min-h-screen bg-black text-white flex items-center justify-center">
                <p className="text-gray-400 animate-pulse">Loading...</p>
            </div>
        );
    }

    return (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="min-h-screen bg-black text-white p-4 sm:p-6 max-w-5xl mx-auto">

            {/* ── HEADER ── */}
            <div className="flex items-center justify-between flex-wrap gap-3 mb-6">
                <h1 className="text-2xl sm:text-3xl font-bold">👑 Admin Dashboard</h1>
                <span className="text-xs text-gray-400 bg-white/5 px-3 py-1.5 rounded-lg">
                    {isSuperAdmin ? "👑 Super Admin" : "🛡 Admin"} • {adminEmail}
                </span>
            </div>

            {/* ── TABS ── */}
            <div className="flex gap-1 mb-8 bg-white/5 p-1 rounded-xl w-fit">
                <button
                    onClick={() => setActiveTab("dashboard")}
                    className={`px-5 py-2 font-semibold text-sm rounded-lg transition-all ${activeTab === "dashboard" ? "bg-blue-600 text-white shadow-lg" : "text-gray-400 hover:text-white"}`}
                >
                    🏠 Dashboard
                </button>
                <button
                    onClick={() => setActiveTab("analytics")}
                    className={`px-5 py-2 font-semibold text-sm rounded-lg transition-all ${activeTab === "analytics" ? "bg-purple-600 text-white shadow-lg" : "text-gray-400 hover:text-white"}`}
                >
                    📊 Analytics
                </button>
            </div>

            {/* ══════════════════════════════════════
                DASHBOARD TAB
            ══════════════════════════════════════ */}
            {activeTab === "dashboard" && (
                <div className="space-y-8">

                    {/* Manage Admins - super admin only */}
                    {isSuperAdmin && (
                        <section className="bg-[#0b0f1a] border border-white/10 rounded-xl p-5">
                            <h2 className="font-semibold mb-3">👑 Manage Admins</h2>
                            <div className="flex gap-2 mb-4">
                                <input value={newAdminEmail} onChange={(e) => setNewAdminEmail(e.target.value)}
                                    placeholder="Admin email" onKeyDown={(e) => e.key === "Enter" && addAdmin()}
                                    className="flex-1 bg-black border border-white/10 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-orange-500" />
                                <button onClick={addAdmin} className="bg-orange-600 hover:bg-orange-500 px-4 py-2 rounded-lg font-semibold transition-all">Add</button>
                            </div>
                            <div className="space-y-2">
                                <div className="flex items-center justify-between bg-gradient-to-r from-yellow-900/40 to-orange-900/40 p-3 rounded-lg border border-yellow-500/30">
                                    <span className="font-semibold text-sm">{ADMIN_EMAIL}</span>
                                    <span className="text-xs bg-yellow-500/20 text-yellow-400 px-2 py-0.5 rounded-full">SUPER ADMIN</span>
                                </div>
                                {admins.map((admin) => (
                                    <div key={admin.email} className="flex items-center justify-between bg-black/40 p-3 rounded-lg border border-white/10">
                                        <span className="text-sm">{admin.email}</span>
                                        <button onClick={() => removeAdmin(admin.email)} className="text-red-400 hover:text-red-300 text-sm font-semibold">Remove</button>
                                    </div>
                                ))}
                                {admins.length === 0 && <p className="text-gray-500 text-sm text-center py-2">No additional admins</p>}
                            </div>
                        </section>
                    )}

                    {/* Influencers */}
                    <section className="bg-[#0b0f1a] border border-white/10 rounded-xl p-5">
                        <h2 className="font-semibold mb-3">🎥 Influencers</h2>
                        <div className="flex gap-2 mb-3">
                            <input value={influencerEmail} onChange={(e) => setInfluencerEmail(e.target.value)}
                                placeholder="Influencer email" onKeyDown={(e) => e.key === "Enter" && addInfluencer()}
                                className="flex-1 bg-black border border-white/10 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-purple-500" />
                            <button onClick={addInfluencer} className="bg-purple-600 hover:bg-purple-500 px-4 py-2 rounded-lg font-semibold transition-all">Add</button>
                        </div>
                        <div className="space-y-2">
                            {influencers.map((i) => (
                                <div key={i.email} className="flex items-center justify-between bg-black/40 p-3 rounded-lg border border-white/10">
                                    <span className="text-sm">{i.email}</span>
                                    <button onClick={() => removeInfluencer(i.email)} className="text-red-400 hover:text-red-300 text-sm font-semibold">Remove</button>
                                </div>
                            ))}
                            {influencers.length === 0 && <p className="text-gray-500 text-sm text-center py-2">No influencers added</p>}
                        </div>
                    </section>

                    {/* Create Tournament */}
                    <section className="bg-[#0b0f1a] border border-white/10 rounded-xl p-5">
                        <h2 className="font-semibold mb-3">➕ Create Tournament</h2>
                        <div className="grid gap-3 sm:grid-cols-3">
                            <input type="number" value={entryFee || ""} onChange={(e) => setEntryFee(Number(e.target.value))}
                                placeholder="Entry Fee (₹)" className="bg-black border border-white/10 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500" />
                            <select value={game} onChange={(e) => setGame(e.target.value)}
                                className="bg-black border border-white/10 rounded-lg px-3 py-2 text-sm focus:outline-none">
                                <option value="freefire">🔥 Free Fire</option>
                                <option value="pubg">🎮 PUBG</option>
                                <option value="chess">♟️ Chess</option>
                            </select>
                            <select value={type} onChange={(e) => setType(e.target.value)}
                                className="bg-black border border-white/10 rounded-lg px-3 py-2 text-sm focus:outline-none">
                                <option value="solo">Solo</option>
                                <option value="duo">Duo</option>
                                <option value="squad">Squad</option>
                            </select>
                            <input type="date" value={matchDate} onChange={(e) => setMatchDate(e.target.value)}
                                className="bg-black border border-white/10 rounded-lg px-3 py-2 text-sm focus:outline-none" />
                            <input type="time" value={matchTime} onChange={(e) => setMatchTime(e.target.value)}
                                className="bg-black border border-white/10 rounded-lg px-3 py-2 text-sm focus:outline-none" />
                        </div>
                        <button onClick={createTournament} className="mt-4 bg-blue-600 hover:bg-blue-500 px-6 py-2 rounded-lg font-semibold transition-all">
                            Create Tournament
                        </button>
                    </section>

                    {/* Tournament List */}
                    <section className="space-y-4">
                        <h2 className="font-semibold text-lg">🏆 All Tournaments ({tournaments.length})</h2>
                        {tournaments.length === 0 ? (
                            <div className="bg-[#0b0f1a] border border-white/10 rounded-xl p-8 text-center">
                                <p className="text-gray-400">No tournaments yet</p>
                            </div>
                        ) : (
                            tournaments.map((t) => {
                                const tStatus = getTournamentStatus(t);
                                return (
                                    <div key={t.id} className="bg-[#0b0f1a] border border-white/10 rounded-xl p-4">
                                        <div className="flex items-start justify-between mb-3 gap-3">
                                            <div className="flex-1 min-w-0">
                                                <div className="flex flex-wrap items-center gap-2 mb-1">
                                                    <h3 className="font-semibold truncate">{t.name || t.id}</h3>
                                                    {tStatus === "completed" && <span className="text-xs bg-green-600/20 text-green-400 px-2 py-0.5 rounded-full">✅ Completed</span>}
                                                    {tStatus === "live" && <span className="text-xs bg-red-600/20 text-red-400 px-2 py-0.5 rounded-full">🔴 Live</span>}
                                                    {t.roomId && <span className="text-xs bg-yellow-600/20 text-yellow-400 px-2 py-0.5 rounded-full">🔐 Room Set</span>}
                                                </div>
                                                <p className="text-xs text-gray-400">
                                                    {t.type?.toUpperCase()} • {t.joinedPlayers ?? 0}/{t.maxPlayers ?? 50} players • ₹{t.entryFee} entry
                                                </p>
                                                <p className="text-xs text-blue-400 mt-0.5">📅 {t.matchDate} ⏰ {t.matchTime}</p>
                                                {isSuperAdmin && t.createdByEmail && (
                                                    <p className="text-xs text-purple-400 mt-0.5">👤 {t.createdByEmail}</p>
                                                )}
                                            </div>
                                            <div className="text-sm bg-blue-500/20 text-blue-400 px-3 py-1 rounded-lg whitespace-nowrap">
                                                Pool ₹{t.prizePool?.toLocaleString() ?? 0}
                                            </div>
                                        </div>
                                        <div className="flex flex-wrap gap-2">
                                            <Link href={`/admin/tournament/${t.id}/participants`}
                                                className="text-xs bg-blue-600/20 text-blue-400 hover:bg-blue-600/30 px-3 py-1.5 rounded-lg border border-blue-500/30 font-semibold transition-all">
                                                👥 Participants ({t.joinedPlayers ?? 0})
                                            </Link>
                                            {!t.prizesDistributed && (
                                                <Link href={`/admin/tournament/${t.id}/upload-result`}
                                                    className="text-xs bg-purple-600/20 text-purple-400 hover:bg-purple-600/30 px-3 py-1.5 rounded-lg border border-purple-500/30 font-semibold transition-all">
                                                    📊 Upload Result & Set Room
                                                </Link>
                                            )}
                                            {tStatus !== "completed" && (
                                                <button onClick={() => startEdit(t)}
                                                    className="text-xs bg-yellow-600/20 text-yellow-400 hover:bg-yellow-600/30 px-3 py-1.5 rounded-lg border border-yellow-500/30 transition-all">
                                                    ✏️ Edit
                                                </button>
                                            )}
                                            <button onClick={() => deleteTournament(t.id)}
                                                className="text-xs bg-red-600/20 text-red-400 hover:bg-red-600/30 px-3 py-1.5 rounded-lg border border-red-500/30 transition-all">
                                                🗑️ Delete
                                            </button>
                                        </div>
                                    </div>
                                );
                            })
                        )}
                    </section>
                </div>
            )}

            {/* ══════════════════════════════════════
                ANALYTICS TAB
            ══════════════════════════════════════ */}
            {activeTab === "analytics" && (
                <div className="space-y-8">

                    {/* Period Filter */}
                    <section className="bg-[#0b0f1a] border border-white/10 rounded-xl p-5">
                        <p className="text-sm text-gray-400 mb-3">Filter By Period</p>
                        <div className="flex flex-wrap gap-2 mb-4">
                            {(["day", "month", "year"] as FilterPeriod[]).map((p) => (
                                <button key={p} onClick={() => setPeriod(p)}
                                    className={`px-4 py-2 rounded-lg font-semibold transition-all ${period === p ? "bg-blue-600 text-white" : "bg-black/40 text-gray-400 hover:bg-white/5"}`}>
                                    {p === "day" ? "📅 Day" : p === "month" ? "📆 Month" : "🗓 Year"}
                                </button>
                            ))}
                        </div>
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
                    </section>

                    {/* Creator Search - super admin only */}
                    {isSuperAdmin && (
                        <input type="text"
                            placeholder="🔍 Search by email or influencer ID..."
                            value={searchCreator}
                            onChange={(e) => setSearchCreator(e.target.value)}
                            className="w-full bg-[#0b0f1a] border border-white/10 rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-blue-500/50"
                        />
                    )}

                    {/* Stats Overview */}
                    <div>
                        <p className="text-sm text-gray-400 mb-3">
                            Overview — <span className="text-white font-semibold">{selectedValue || "All"}</span>
                            {searchCreator && <span className="text-blue-400"> • "{searchCreator}"</span>}
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

                    {/* Host Breakdown - super admin only */}
                    {isSuperAdmin && (
                        <section className="bg-[#0b0f1a] border border-white/10 rounded-xl p-5">
                            <h2 className="font-semibold mb-4">
                                👥 Host Breakdown
                                <span className="text-gray-400 text-sm font-normal ml-2">({filteredCreatorBreakdown.length} hosts)</span>
                            </h2>
                            {filteredCreatorBreakdown.length === 0 ? (
                                <p className="text-gray-500 text-sm text-center py-6">No data for this period</p>
                            ) : (
                                <div className="space-y-3">
                                    {filteredCreatorBreakdown.map((c, i) => (
                                        <motion.div key={c.email}
                                            initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.04 }}
                                            className="bg-black/40 border border-white/10 rounded-xl p-4">
                                            <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
                                                <div className="flex items-center gap-2 flex-wrap">
                                                    <p className="font-semibold text-sm">{c.email}</p>
                                                    <span className={`text-xs px-2 py-0.5 rounded-full ${c.role === "influencer" ? "bg-purple-500/20 text-purple-400" : c.role === "superadmin" ? "bg-yellow-500/20 text-yellow-400" : "bg-blue-500/20 text-blue-400"}`}>
                                                        {c.role === "influencer" ? "🎥 Influencer" : c.role === "superadmin" ? "👑 Super Admin" : "🛡 Admin"}
                                                    </span>
                                                </div>
                                                <p className="text-green-400 font-bold">{formatCurrency(c.revenue)}</p>
                                            </div>
                                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                                                <div className="bg-black/30 rounded-lg p-2.5 text-center">
                                                    <p className="text-xs text-gray-400">Matches</p>
                                                    <p className="font-bold text-blue-400">{c.matches}</p>
                                                </div>
                                                <div className="bg-black/30 rounded-lg p-2.5 text-center">
                                                    <p className="text-xs text-gray-400">Revenue</p>
                                                    <p className="font-bold text-green-400">{formatCurrency(c.revenue)}</p>
                                                </div>
                                                <div className="bg-black/30 rounded-lg p-2.5 text-center">
                                                    <p className="text-xs text-gray-400">Profit</p>
                                                    <p className="font-bold text-purple-400">{formatCurrency(c.profit)}</p>
                                                </div>
                                                <div className="bg-black/30 rounded-lg p-2.5 text-center">
                                                    <p className="text-xs text-gray-400">Players</p>
                                                    <p className="font-bold text-yellow-400">{c.players}</p>
                                                </div>
                                            </div>
                                        </motion.div>
                                    ))}
                                </div>
                            )}
                        </section>
                    )}

                    {/* Match Details */}
                    <section className="bg-[#0b0f1a] border border-white/10 rounded-xl p-5">
                        <h2 className="font-semibold mb-4">
                            🏆 Match Details
                            <span className="text-gray-400 text-sm font-normal ml-2">({displayTournaments.length} matches)</span>
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
                                            initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.03 }}
                                            className="bg-black/40 border border-white/10 rounded-xl p-4">
                                            <div className="flex flex-wrap items-start justify-between gap-3 mb-3">
                                                <div>
                                                    <div className="flex items-center gap-2 flex-wrap">
                                                        <p className="font-semibold">{t.name ?? t.id}</p>
                                                        <span className={`text-xs px-2 py-0.5 rounded-full ${isCompleted ? "bg-green-500/20 text-green-400" : "bg-yellow-500/20 text-yellow-400"}`}>
                                                            {isCompleted ? "✅ Completed" : "📅 Upcoming"}
                                                        </span>
                                                    </div>
                                                    <p className="text-xs text-gray-500 mt-0.5">
                                                        {t.matchDate} {t.matchTime && `⏰ ${t.matchTime}`} • {(t.type ?? "solo").toUpperCase()}
                                                        {isSuperAdmin && t.createdByEmail && <span className="text-blue-400 ml-2">• {t.createdByEmail}</span>}
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
                    </section>
                </div>
            )}

            {/* ── EDIT MODAL ── */}
            {editingId && (
                <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <div className="bg-[#0b0f1a] border border-white/10 rounded-xl p-6 max-w-md w-full">
                        <h2 className="font-semibold text-lg mb-4">✏️ Edit Tournament</h2>
                        <div className="space-y-3">
                            <input type="number" value={editEntryFee || ""} onChange={(e) => setEditEntryFee(Number(e.target.value))}
                                placeholder="Entry Fee" className="w-full bg-black border border-white/10 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500" />
                            <select value={editType} onChange={(e) => setEditType(e.target.value)}
                                className="w-full bg-black border border-white/10 rounded-lg px-3 py-2 text-sm focus:outline-none">
                                <option value="solo">Solo</option>
                                <option value="duo">Duo</option>
                                <option value="squad">Squad</option>
                            </select>
                            <input type="date" value={editDate} onChange={(e) => setEditDate(e.target.value)}
                                className="w-full bg-black border border-white/10 rounded-lg px-3 py-2 text-sm focus:outline-none" />
                            <input type="time" value={editTime} onChange={(e) => setEditTime(e.target.value)}
                                className="w-full bg-black border border-white/10 rounded-lg px-3 py-2 text-sm focus:outline-none" />
                        </div>
                        <div className="flex gap-3 mt-5">
                            <button onClick={saveEdit} className="flex-1 bg-blue-600 hover:bg-blue-500 py-2 rounded-lg font-semibold transition-all">Save</button>
                            <button onClick={() => setEditingId(null)} className="flex-1 bg-gray-700 hover:bg-gray-600 py-2 rounded-lg font-semibold transition-all">Cancel</button>
                        </div>
                    </div>
                </div>
            )}
        </motion.div>
    );
}
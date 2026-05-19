"use client";

import { useEffect, useState } from "react";
import {
    collection,
    addDoc,
    getDocs,
    query,
    where,
    serverTimestamp,
    doc,
    getDoc,
    setDoc,
    updateDoc,
    increment,
} from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";
import { auth, db } from "../../firebase";
import { motion } from "framer-motion";
import Link from "next/link";

/* ---------------- TYPES ---------------- */

type Tournament = {
    id: string;
    name?: string;
    entryFee?: number;
    joinedPlayers?: number;
    prizePool?: number;
    type?: string;
    matchDate?: string;
    matchTime?: string;
    status?: string;
    prizesDistributed?: boolean;
};

type Wallet = {
    totalEarnings: number;
    available: number;
    withdrawn: number;
};

/* ---------------- COMPONENT ---------------- */

export default function InfluencerDashboard() {
    const [user, setUser] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [withdrawing, setWithdrawing] = useState(false);

    const [tournaments, setTournaments] = useState<Tournament[]>([]);
    const [wallet, setWallet] = useState<Wallet>({
        totalEarnings: 0,
        available: 0,
        withdrawn: 0,
    });

    /* CREATE TOURNAMENT */
    const [name, setName] = useState("");
    const [entryFee, setEntryFee] = useState<number>(0);
    const [game, setGame] = useState("freefire");
    const [type, setType] = useState("solo");
    const [matchDate, setMatchDate] = useState("");
    const [matchTime, setMatchTime] = useState("");

    /* WITHDRAW */
    const [withdrawAmount, setWithdrawAmount] = useState<number>(0);
    const [upiId, setUpiId] = useState("");

    const maxPlayers = 50;
    const COMMISSION_RATE = 0.1;

    /* ---------------- AUTH ---------------- */

    useEffect(() => {
        const unsub = onAuthStateChanged(auth, async (u) => {
            if (!u || !u.uid || !u.email) {
                window.location.href = "/login";
                return;
            }

            const influencerRef = doc(db, "influencers", u.email);
            const influencerSnap = await getDoc(influencerRef);

            if (!influencerSnap.exists()) {
                alert("You are not an approved influencer");
                window.location.href = "/";
                return;
            }

            setUser(u);
            await ensureWallet(u.uid);
            await fetchWallet(u.uid);
            await fetchTournaments(u.uid);
            setLoading(false);
        });

        return () => unsub();
    }, []);

    /* ---------------- WALLET ---------------- */

    const ensureWallet = async (uid: string) => {
        const ref = doc(db, "influencerWallets", uid);
        const snap = await getDoc(ref);

        if (!snap.exists()) {
            await setDoc(ref, {
                totalEarnings: 0,
                available: 0,
                withdrawn: 0,
                createdAt: serverTimestamp(),
            });
        }
    };

    const fetchWallet = async (uid: string) => {
        const ref = doc(db, "influencerWallets", uid);
        const snap = await getDoc(ref);
        if (snap.exists()) {
            setWallet(snap.data() as Wallet);
        }
    };

    /* ---------------- FETCH TOURNAMENTS ---------------- */

    const fetchTournaments = async (uid: string) => {
        const q = query(
            collection(db, "tournaments"),
            where("createdBy", "==", uid)
        );

        const snap = await getDocs(q);
        const list: Tournament[] = [];
        snap.forEach((d) => list.push({ id: d.id, ...d.data() }));
        setTournaments(list);
    };

    /* ---------------- CREATE TOURNAMENT ---------------- */

    const createTournament = async () => {
        if (!name || entryFee <= 0 || !matchDate || !matchTime) {
            alert("Fill all fields (Name, Fee, Date, Time)");
            return;
        }

        const totalPool = entryFee * maxPlayers;
        const prizePool = Math.round(totalPool * 0.8);

        const prizes = {
            first: Math.round(prizePool * 0.5),
            second: Math.round(prizePool * 0.3),
            third: Math.round(prizePool * 0.2),
        };

        try {
            // Generate tournament ID: GAME-YYYY-MM-DD-XXX
            const dateStr = matchDate; // Already in YYYY-MM-DD format
            const gamePrefix = game.toUpperCase(); // FREEFIRE, PUBG, or CHESS

            // Get count of tournaments for this game on this date
            const sameDayGameTournaments = tournaments.filter(
                t => t.matchDate === matchDate && t.game === game
            );
            const count = sameDayGameTournaments.length + 1;
            const countStr = count.toString().padStart(3, '0');

            const tournamentId = `${gamePrefix}-${dateStr}-${countStr}`;

            await setDoc(doc(db, "tournaments", tournamentId), {
                name,
                entryFee,
                game,
                type,
                matchDate,
                matchTime,
                maxPlayers,
                joinedPlayers: 0,
                prizePool,
                prizes,

                createdBy: user.uid,
                influencerEmail: user.email,
                createdByRole: "influencer",

                commissionRate: COMMISSION_RATE,
                createdAt: serverTimestamp(),
                status: "open",
            });

            setName("");
            setEntryFee(0);
            setGame("freefire");
            setType("solo");
            setMatchDate("");
            setMatchTime("");

            alert(`✅ Tournament Created!\nID: ${tournamentId}`);
            fetchTournaments(user.uid);
        } catch (error) {
            console.error("Error creating tournament:", error);
            alert("Failed to create tournament");
        }
    };

    /* ---------------- INSTANT WITHDRAW (NO APPROVAL) ---------------- */

    const instantWithdraw = async () => {
        if (withdrawAmount <= 0) {
            alert("Enter valid amount");
            return;
        }

        if (withdrawAmount > wallet.available) {
            alert("Insufficient balance");
            return;
        }

        if (!upiId) {
            alert("Enter UPI ID");
            return;
        }

        if (!confirm(`Withdraw ₹${withdrawAmount} to ${upiId}?\n\nThis will be processed instantly.`)) {
            return;
        }

        setWithdrawing(true);

        try {
            const walletRef = doc(db, "influencerWallets", user.uid);

            // Deduct from available, add to withdrawn
            await updateDoc(walletRef, {
                available: increment(-withdrawAmount),
                withdrawn: increment(withdrawAmount),
            });

            // Create transaction record
            await addDoc(collection(db, "walletTransactions"), {
                uid: user.uid,
                role: "influencer",
                type: "withdraw",
                direction: "debit",
                amount: withdrawAmount,
                upiId: upiId,
                status: "completed",
                reference: "Instant Withdrawal",
                createdAt: serverTimestamp(),
            });

            alert(`✅ Withdrawal Successful!\n\n₹${withdrawAmount} has been processed to ${upiId}`);

            // Refresh wallet
            await fetchWallet(user.uid);

            // Reset form
            setWithdrawAmount(0);
            setUpiId("");
        } catch (error) {
            console.error("Withdrawal error:", error);
            alert("❌ Withdrawal failed. Please try again.");
        } finally {
            setWithdrawing(false);
        }
    };

    /* ---------------- UI ---------------- */

    if (loading) {
        return <div className="p-6 text-white">Loading influencer dashboard…</div>;
    }

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="p-4 sm:p-6 text-white space-y-10"
        >
            <h1 className="text-2xl font-bold">🎥 Influencer Dashboard</h1>

            {/* WALLET */}
            <div className="grid sm:grid-cols-3 gap-4">
                <WalletCard title="Total Earnings" value={`₹${wallet.totalEarnings}`} />
                <WalletCard title="Available" value={`₹${wallet.available}`} />
                <WalletCard title="Withdrawn" value={`₹${wallet.withdrawn}`} />
            </div>

            {/* WITHDRAW SECTION */}
            <section className="bg-[#0b0f1a] border border-white/10 rounded-xl p-4">
                <h2 className="font-semibold mb-3">💰 Instant Withdrawal</h2>

                <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-3 mb-4">
                    <p className="text-sm text-blue-400">
                        ⚡ Instant withdrawal - No admin approval needed
                    </p>
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                    <input
                        type="number"
                        value={withdrawAmount}
                        onChange={(e) => setWithdrawAmount(Number(e.target.value))}
                        placeholder="Amount to withdraw"
                        className="bg-black border border-white/10 rounded px-3 py-2 text-sm"
                        disabled={withdrawing}
                    />

                    <input
                        value={upiId}
                        onChange={(e) => setUpiId(e.target.value)}
                        placeholder="UPI ID (e.g., name@upi)"
                        className="bg-black border border-white/10 rounded px-3 py-2 text-sm"
                        disabled={withdrawing}
                    />
                </div>

                <button
                    onClick={instantWithdraw}
                    disabled={withdrawing}
                    className="mt-4 bg-green-600 hover:bg-green-500 disabled:bg-gray-600 
                    disabled:cursor-not-allowed px-4 py-2 rounded font-semibold"
                >
                    {withdrawing ? "Processing..." : "💸 Withdraw Now"}
                </button>

                <p className="text-xs text-gray-400 mt-2">
                    Available Balance: ₹{wallet.available.toLocaleString()}
                </p>
            </section>

            {/* CREATE */}
            <section className="bg-[#0b0f1a] border border-white/10 rounded-xl p-4">
                <h2 className="font-semibold mb-3">➕ Create Tournament</h2>

                <div className="grid gap-3 sm:grid-cols-3">
                    <input
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="Tournament Name"
                        className="bg-black border border-white/10 rounded px-3 py-2 text-sm"
                    />

                    <input
                        type="number"
                        value={entryFee}
                        onChange={(e) => setEntryFee(Number(e.target.value))}
                        placeholder="Entry Fee"
                        className="bg-black border border-white/10 rounded px-3 py-2 text-sm"
                    />

                    <select
                        value={game}
                        onChange={(e) => setGame(e.target.value)}
                        className="bg-black border border-white/10 rounded px-3 py-2 text-sm"
                    >
                        <option value="freefire">🔥 Free Fire</option>
                        <option value="pubg">🎮 PUBG</option>
                        <option value="chess">♟️ Chess</option>
                    </select>

                    <select
                        value={type}
                        onChange={(e) => setType(e.target.value)}
                        className="bg-black border border-white/10 rounded px-3 py-2 text-sm"
                    >
                        <option value="solo">Solo</option>
                        <option value="duo">Duo</option>
                        <option value="squad">Squad</option>
                    </select>

                    <input
                        type="date"
                        value={matchDate}
                        onChange={(e) => setMatchDate(e.target.value)}
                        className="bg-black border border-white/10 rounded px-3 py-2 text-sm"
                    />

                    <input
                        type="time"
                        value={matchTime}
                        onChange={(e) => setMatchTime(e.target.value)}
                        className="bg-black border border-white/10 rounded px-3 py-2 text-sm"
                    />
                </div>

                <button
                    onClick={createTournament}
                    className="mt-4 bg-purple-600 hover:bg-purple-500 px-4 py-2 rounded"
                >
                    Create Tournament
                </button>
            </section>

            {/* MY TOURNAMENTS LIST */}
            <section className="space-y-4">
                <h2 className="font-semibold text-lg">🏆 My Tournaments</h2>

                {tournaments.length === 0 ? (
                    <div className="bg-[#0b0f1a] border border-white/10 rounded-xl p-8 text-center">
                        <p className="text-gray-400">No tournaments created yet</p>
                        <p className="text-sm text-gray-500 mt-2">
                            Create your first tournament above to start earning commissions!
                        </p>
                    </div>
                ) : (
                    tournaments.map((t) => (
                        <div
                            key={t.id}
                            className="bg-[#0b0f1a] border border-white/10 rounded-xl p-4"
                        >
                            <div className="flex items-start justify-between mb-3">
                                <div>
                                    <div className="flex items-center gap-2">
                                        <h2 className="font-semibold text-lg">{t.name}</h2>
                                        {t.status === "completed" && (
                                            <span className="text-xs bg-green-600/20 text-green-400 px-2 py-0.5 rounded">
                                                ✅ Completed
                                            </span>
                                        )}
                                    </div>
                                    <p className="text-xs text-gray-400 mt-1">
                                        {t.type?.toUpperCase()} • {t.joinedPlayers || 0}/{maxPlayers} players
                                    </p>
                                    <p className="text-xs text-blue-400 mt-1">
                                        📅 {t.matchDate} ⏰ {t.matchTime}
                                    </p>
                                </div>
                                <div className="text-right">
                                    <p className="text-sm text-green-400 font-semibold">
                                        Prize Pool: ₹{t.prizePool}
                                    </p>
                                    <p className="text-xs text-purple-400 mt-1">
                                        Your Commission: {COMMISSION_RATE * 100}%
                                    </p>
                                </div>
                            </div>

                            {/* ACTION BUTTONS */}
                            <div className="flex flex-wrap gap-2">
                                {/* View Participants */}
                                <Link
                                    href={`/admin/tournament/${t.id}/participants`}
                                    className="text-xs bg-purple-600/20 text-purple-400 
                                    hover:bg-purple-600/30 px-4 py-2 rounded
                                    border border-purple-500/30 font-semibold
                                    transition-all"
                                >
                                    👥 View Participants ({t.joinedPlayers || 0})
                                </Link>

                                {/* Upload Result Button - Only if not completed and has participants */}
                                {!t.prizesDistributed && (t.joinedPlayers || 0) > 0 && (
                                    <Link
                                        href={`/admin/tournament/${t.id}/upload-result`}
                                        className="text-xs bg-gradient-to-r from-orange-600/20 to-pink-600/20 
                                        text-orange-400 hover:from-orange-600/30 hover:to-pink-600/30 
                                        px-4 py-2 rounded border border-orange-500/30 font-semibold
                                        transition-all"
                                    >
                                        📊 Upload Result & Pay Winners
                                    </Link>
                                )}
                            </div>
                        </div>
                    ))
                )}
            </section>
        </motion.div>
    );
}

/* ---------------- WALLET CARD ---------------- */

function WalletCard({ title, value }: { title: string; value: string }) {
    return (
        <div className="bg-[#111827] border border-white/10 rounded-xl p-4">
            <p className="text-xs text-gray-400 mb-1">{title}</p>
            <p className="text-lg font-bold text-purple-400">{value}</p>
        </div>
    );
}
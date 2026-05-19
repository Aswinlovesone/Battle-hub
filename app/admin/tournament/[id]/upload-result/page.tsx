"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import {
    doc,
    getDoc,
    collection,
    getDocs,
    writeBatch,
    serverTimestamp,
    updateDoc,
    increment,
} from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";
import { auth, db } from "../../../../firebase";
import { motion } from "framer-motion";

const ADMIN_EMAIL = "battlehubsofficial@gmail.com";

type Participant = {
    uid: string;
    userName: string;
    userEmail: string;
    slotNumber: number;
    gameIds: string[];
};

type Tournament = {
    name: string;
    entryFee: number;
    joinedPlayers: number;
    prizePool: number;
    matchDate?: string;
    matchTime?: string;
    createdBy?: string;
    createdByRole?: string;
    roomId?: string;
    roomPassword?: string;
};

function getMsUntilMatch(matchDate: string, matchTime: string): number {
    return new Date(`${matchDate}T${matchTime}:00`).getTime() - Date.now();
}

export default function UploadResult() {
    const params = useParams();
    const router = useRouter();
    const tournamentId = params.id as string;

    const [authChecked, setAuthChecked] = useState(false);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [savingRoom, setSavingRoom] = useState(false);

    const [tournament, setTournament] = useState<Tournament | null>(null);
    const [participants, setParticipants] = useState<Participant[]>([]);
    const [showPreview, setShowPreview] = useState(false);
    const [resultScreenshot, setResultScreenshot] = useState("");

    const [roomId, setRoomId] = useState("");
    const [roomPassword, setRoomPassword] = useState("");
    const [roomSaved, setRoomSaved] = useState(false);

    // Live lock state — admin can enter only within 15 mins of match
    const [canEnter, setCanEnter] = useState(false);
    const [minsUntilAllow, setMinsUntilAllow] = useState<number | null>(null);

    const [slotInputs, setSlotInputs] = useState<Record<number, string>>({});

    /* ── auth check ── */
    useEffect(() => {
        const unsub = onAuthStateChanged(auth, async (user) => {
            if (!user) { router.push("/login"); return; }
            try {
                const isSuperAdmin = user.email === ADMIN_EMAIL;
                const adminSnap = await getDoc(doc(db, "admins", user.email ?? ""));
                const isAdmin = isSuperAdmin || adminSnap.exists();
                const influencerSnap = await getDoc(doc(db, "influencers", user.email ?? ""));
                if (!isAdmin && !influencerSnap.exists()) {
                    alert("Access denied");
                    router.push("/");
                    return;
                }
            } catch {
                alert("Auth check failed");
                router.push("/");
                return;
            }
            setAuthChecked(true);
        });
        return () => unsub();
    }, [router]);

    /* ── fetch tournament + participants ── */
    const fetchData = useCallback(async () => {
        try {
            const tSnap = await getDoc(doc(db, "tournaments", tournamentId));
            if (!tSnap.exists()) { alert("Tournament not found"); router.push("/admin/dashboard"); return; }

            const tData = tSnap.data() as Tournament;
            setTournament(tData);
            if (tData.roomId) { setRoomId(tData.roomId); setRoomSaved(true); }
            if (tData.roomPassword) setRoomPassword(tData.roomPassword);

            const pSnap = await getDocs(collection(db, "tournaments", tournamentId, "participants"));
            const pList: Participant[] = pSnap.docs.map((d) => {
                const data = d.data();
                return {
                    uid: data.uid ?? d.id,
                    userName: data.userName || data.name || "Unknown",
                    userEmail: data.userEmail || data.email || "",
                    slotNumber: data.slotNumber || data.slot || 0,
                    gameIds: Array.isArray(data.gameIds) ? data.gameIds : [],
                };
            });
            pList.sort((a, b) => a.slotNumber - b.slotNumber);
            setParticipants(pList);
        } catch (err) {
            console.error("fetchData:", err);
            alert("Error loading data");
        } finally {
            setLoading(false);
        }
    }, [tournamentId, router]);

    useEffect(() => { if (authChecked) fetchData(); }, [authChecked, fetchData]);

    /* ── live 15-min lock timer ── */
    useEffect(() => {
        if (!tournament?.matchDate || !tournament?.matchTime) return;
        const tick = () => {
            const ms = getMsUntilMatch(tournament.matchDate!, tournament.matchTime!);
            const within15 = ms <= 15 * 60 * 1000;
            setCanEnter(within15);
            setMinsUntilAllow(within15 ? null : Math.ceil((ms - 15 * 60 * 1000) / 60000));
        };
        tick();
        const id = setInterval(tick, 1000);
        return () => clearInterval(id);
    }, [tournament]);

    /* ── save room details ── */
    const saveRoomDetails = async () => {
        if (!canEnter) { alert("Room entry unlocks 15 mins before match"); return; }
        if (!roomId.trim()) { alert("Please enter Room ID"); return; }
        if (!roomPassword.trim()) { alert("Please enter Room Password"); return; }

        setSavingRoom(true);
        try {
            await updateDoc(doc(db, "tournaments", tournamentId), {
                roomId: roomId.trim(),
                roomPassword: roomPassword.trim(),
                roomSetAt: serverTimestamp(),
            });
            setRoomSaved(true);
            alert("✅ Room details saved! Players will see it 10 mins before match.");
        } catch (err) {
            console.error("saveRoomDetails:", err);
            alert("❌ Failed to save room details");
        } finally {
            setSavingRoom(false);
        }
    };

    /* ── prize calc ── */
    const topWinnersCount = Math.max(1, Math.ceil(participants.length * 0.2));

    const calculatePrize = (position: number): number => {
        if (!tournament) return 0;
        const p = tournament.prizePool;
        if (position === 1) return Math.round(p * 0.3);
        if (position === 2) return Math.round(p * 0.2);
        if (position === 3) return Math.round(p * 0.1);
        const rest = topWinnersCount - 3;
        return rest > 0 ? Math.round((p * 0.4) / rest) : 0;
    };

    /* ── winners validation ── */
    const getWinners = useCallback(() => {
        const winners: { position: number; slot: number; participant: Participant }[] = [];
        const usedSlots = new Set<number>();
        for (let i = 1; i <= topWinnersCount; i++) {
            const raw = slotInputs[i]?.trim();
            if (!raw) { alert(`Enter slot for position #${i}`); return null; }
            const slotNum = parseInt(raw, 10);
            if (isNaN(slotNum)) { alert(`Invalid slot for position #${i}`); return null; }
            if (usedSlots.has(slotNum)) { alert(`Slot #${slotNum} already used`); return null; }
            const participant = participants.find((p) => p.slotNumber === slotNum);
            if (!participant) { alert(`Slot #${slotNum} not found`); return null; }
            usedSlots.add(slotNum);
            winners.push({ position: i, slot: slotNum, participant });
        }
        return winners;
    }, [slotInputs, topWinnersCount, participants]);

    /* ── file ── */
    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        if (file.size > 5 * 1024 * 1024) { alert("Max 5MB"); return; }
        const reader = new FileReader();
        reader.onloadend = () => setResultScreenshot(reader.result as string);
        reader.readAsDataURL(file);
    };

    /* ── submit results ── */
    const submitResults = async () => {
        if (!tournament) return;
        if (!resultScreenshot) { alert("Upload result screenshot first"); return; }
        const winners = getWinners();
        if (!winners) return;

        setSubmitting(true);
        try {
            const batch = writeBatch(db);
            const winnersData: object[] = [];

            for (const w of winners) {
                const prize = calculatePrize(w.position);
                winnersData.push({ slotNumber: w.slot, position: w.position, amount: prize, uid: w.participant.uid, name: w.participant.userName });

                const walletSnap = await getDoc(doc(db, "playerWallets", w.participant.uid));
                if (walletSnap.exists()) {
                    batch.update(doc(db, "playerWallets", w.participant.uid), { balance: increment(prize) });
                }
                const txRef = doc(collection(db, "walletTransactions"));
                batch.set(txRef, {
                    uid: w.participant.uid, type: "win", amount: prize,
                    tournamentId, tournamentName: tournament.name,
                    position: w.position, slotNumber: w.slot,
                    status: "completed", createdAt: serverTimestamp(),
                });
            }

            if (tournament.createdByRole === "influencer" && tournament.createdBy) {
                const commission = Math.round(tournament.entryFee * tournament.joinedPlayers * 0.1);
                batch.update(doc(db, "influencerWallets", tournament.createdBy), {
                    totalEarnings: increment(commission), available: increment(commission),
                });
                const txRef = doc(collection(db, "walletTransactions"));
                batch.set(txRef, {
                    uid: tournament.createdBy, role: "influencer", type: "commission",
                    amount: commission, status: "success",
                    reference: `${tournament.name} - Commission`,
                    tournamentId, createdAt: serverTimestamp(),
                });
            }

            batch.update(doc(db, "tournaments", tournamentId), {
                status: "completed", resultScreenshot,
                winners: winnersData, prizesDistributed: true,
                completedAt: serverTimestamp(),
            });

            await batch.commit();
            alert("✅ Results submitted! Winners paid.");
            router.push("/admin/dashboard");
        } catch (err) {
            console.error("submitResults:", err);
            alert("❌ Error submitting results");
        } finally {
            setSubmitting(false);
        }
    };

    /* ── guards ── */
    if (!authChecked || loading) {
        return (
            <div className="min-h-screen bg-black text-white flex items-center justify-center">
                <p className="text-gray-400 animate-pulse">Loading...</p>
            </div>
        );
    }
    if (!tournament) {
        return (
            <div className="min-h-screen bg-black text-white flex items-center justify-center">
                <p className="text-red-400">Tournament not found</p>
            </div>
        );
    }

    const previewWinners = showPreview ? getWinners() : null;
    const medal = (pos: number) => pos === 1 ? "🥇" : pos === 2 ? "🥈" : pos === 3 ? "🥉" : "🏅";

    return (
        <div className="min-h-screen bg-black text-white p-4 sm:p-6">
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="max-w-4xl mx-auto">

                {/* Header */}
                <div className="mb-8">
                    <div className="flex items-center gap-4 mb-3">
                        <button onClick={() => router.back()} className="bg-gray-700 hover:bg-gray-600 px-4 py-2 rounded-lg font-semibold transition-all">
                            ← Back
                        </button>
                        <h1 className="text-2xl sm:text-3xl font-bold">📊 Upload Tournament Result</h1>
                    </div>
                    <p className="text-gray-400">{tournament.name}</p>
                    <p className="text-sm text-blue-400 mt-1">
                        Prize Pool: ₹{tournament.prizePool.toLocaleString()} • {participants.length} Players • Top {topWinnersCount} Winners
                    </p>
                </div>

                {!showPreview ? (
                    <div className="space-y-6">

                        {/* 🔐 Room ID & Password */}
                        <div className="bg-[#0b0f1a] border border-yellow-500/30 rounded-xl p-6">
                            <div className="flex items-center gap-2 mb-1">
                                <h2 className="font-semibold text-yellow-400">🔐 Set Room ID & Password</h2>
                                {roomSaved && <span className="text-xs bg-green-500/20 text-green-400 px-2 py-0.5 rounded-full">✅ Saved</span>}
                            </div>

                            {canEnter ? (
                                <p className="text-xs text-gray-400 mb-4">
                                    Players will see this <span className="text-yellow-400 font-semibold">10 minutes before</span> match starts.
                                </p>
                            ) : (
                                <div className="bg-orange-500/10 border border-orange-500/30 rounded-lg p-3 mb-4">
                                    <p className="text-orange-400 text-sm font-semibold">🔒 Locked — available 15 mins before match</p>
                                    {minsUntilAllow !== null && (
                                        <p className="text-gray-400 text-xs mt-1">
                                            Unlocks in ~{minsUntilAllow} minute{minsUntilAllow !== 1 ? "s" : ""}
                                        </p>
                                    )}
                                </div>
                            )}

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
                                <div>
                                    <label className="block text-sm text-gray-300 mb-1.5">Room ID <span className="text-red-400">*</span></label>
                                    <input
                                        type="text"
                                        value={roomId}
                                        disabled={!canEnter}
                                        onChange={(e) => { setRoomId(e.target.value); setRoomSaved(false); }}
                                        placeholder={canEnter ? "Enter Room ID" : "Locked"}
                                        className={`w-full bg-black border rounded-lg px-4 py-2.5 font-mono text-white placeholder-gray-600 focus:outline-none transition-all
                                            ${canEnter ? "border-white/20 focus:border-yellow-500" : "border-white/10 opacity-50 cursor-not-allowed"}`}
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm text-gray-300 mb-1.5">Room Password <span className="text-red-400">*</span></label>
                                    <input
                                        type="text"
                                        value={roomPassword}
                                        disabled={!canEnter}
                                        onChange={(e) => { setRoomPassword(e.target.value); setRoomSaved(false); }}
                                        placeholder={canEnter ? "Enter Password" : "Locked"}
                                        className={`w-full bg-black border rounded-lg px-4 py-2.5 font-mono text-white placeholder-gray-600 focus:outline-none transition-all
                                            ${canEnter ? "border-white/20 focus:border-yellow-500" : "border-white/10 opacity-50 cursor-not-allowed"}`}
                                    />
                                </div>
                            </div>

                            <button
                                onClick={saveRoomDetails}
                                disabled={!canEnter || savingRoom}
                                className={`px-6 py-2.5 rounded-lg font-semibold transition-all
                                    ${canEnter && !savingRoom ? "bg-yellow-500 hover:bg-yellow-400 text-black" : "bg-gray-700 text-gray-500 cursor-not-allowed"}`}
                            >
                                {savingRoom ? "Saving..." : roomSaved ? "🔄 Update Room Details" : "💾 Save Room Details"}
                            </button>
                        </div>

                        {/* Screenshot */}
                        <div className="bg-[#0b0f1a] border border-white/10 rounded-xl p-6">
                            <h2 className="font-semibold mb-4">📸 Upload Result Screenshot</h2>
                            <input type="file" accept="image/*" onChange={handleFileChange}
                                className="w-full bg-black border border-white/10 rounded-lg px-3 py-2 text-sm text-gray-300 cursor-pointer" />
                            {resultScreenshot && (
                                <img src={resultScreenshot} alt="Result preview" className="mt-4 max-w-xs rounded-lg border border-white/20" />
                            )}
                        </div>

                        {/* Participants */}
                        <div className="bg-[#0b0f1a] border border-white/10 rounded-xl p-6">
                            <h2 className="font-semibold mb-4">👥 All Participants</h2>
                            <div className="max-h-80 overflow-y-auto space-y-2 pr-1">
                                {participants.map((p) => (
                                    <div key={p.uid} className="bg-black/40 p-3 rounded-lg border border-white/10">
                                        <div className="flex items-center gap-3">
                                            <span className="font-bold text-blue-400 w-10">#{p.slotNumber}</span>
                                            <div className="flex-1 min-w-0">
                                                <p className="font-semibold truncate">{p.userName}</p>
                                                <p className="text-xs text-gray-500 truncate">{p.userEmail}</p>
                                            </div>
                                        </div>
                                        {p.gameIds.length > 0 && (
                                            <div className="flex flex-wrap gap-1.5 mt-2 ml-10">
                                                {p.gameIds.map((id, idx) => (
                                                    <span key={idx} className="text-xs bg-green-500/20 text-green-400 px-2 py-0.5 rounded font-mono">{id}</span>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Winner Slots */}
                        <div className="bg-[#0b0f1a] border border-white/10 rounded-xl p-6">
                            <h2 className="font-semibold mb-1">🏆 Enter Winner Slot Numbers</h2>
                            <p className="text-sm text-gray-400 mb-4">Top {topWinnersCount} winners — 1st place first</p>
                            <div className="space-y-3">
                                {Array.from({ length: topWinnersCount }, (_, i) => i + 1).map((pos) => {
                                    const prize = calculatePrize(pos);
                                    const slotNum = parseInt(slotInputs[pos] || "", 10);
                                    const matched = !isNaN(slotNum) ? participants.find((p) => p.slotNumber === slotNum) : null;
                                    return (
                                        <div key={pos} className="bg-black/40 border border-white/10 rounded-lg p-4">
                                            <div className="flex flex-wrap items-center gap-3">
                                                <div className="w-20 flex-shrink-0">
                                                    <p className="font-semibold">{medal(pos)} #{pos}</p>
                                                    <p className="text-xs text-green-400">₹{prize.toLocaleString()}</p>
                                                </div>
                                                <input
                                                    type="number" min={1}
                                                    value={slotInputs[pos] || ""}
                                                    onChange={(e) => setSlotInputs((prev) => ({ ...prev, [pos]: e.target.value }))}
                                                    placeholder="Slot #"
                                                    className="w-28 bg-black border border-white/20 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500"
                                                />
                                                {matched && (
                                                    <div className="text-sm">
                                                        <p className="text-blue-400 font-semibold">{matched.userName}</p>
                                                        <p className="text-gray-500 text-xs">{matched.userEmail}</p>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>

                        <button
                            onClick={() => { const w = getWinners(); if (w) setShowPreview(true); }}
                            className="w-full bg-blue-600 hover:bg-blue-500 py-3 rounded-xl font-semibold transition-all"
                        >
                            Preview Results →
                        </button>
                    </div>
                ) : (
                    <div className="space-y-6">
                        <div className="bg-[#0b0f1a] border border-white/10 rounded-xl p-6">
                            <h2 className="font-semibold mb-4">✅ Preview — Prize Distribution</h2>
                            <div className="space-y-3">
                                {previewWinners?.map((w) => {
                                    const prize = calculatePrize(w.position);
                                    return (
                                        <div key={w.position} className="flex justify-between items-center bg-black/40 p-4 rounded-lg border border-white/10">
                                            <div>
                                                <p className="font-semibold">{medal(w.position)} Position #{w.position}</p>
                                                <p className="text-sm text-gray-400">Slot #{w.slot} — {w.participant.userName}</p>
                                            </div>
                                            <span className="text-green-400 font-bold text-lg">₹{prize.toLocaleString()}</span>
                                        </div>
                                    );
                                })}
                            </div>
                            <div className="mt-6 pt-4 border-t border-white/10 flex justify-between font-bold text-lg">
                                <span>Total Payout:</span>
                                <span className="text-green-400">
                                    ₹{previewWinners?.reduce((sum, w) => sum + calculatePrize(w.position), 0).toLocaleString()}
                                </span>
                            </div>
                        </div>
                        <div className="flex gap-4">
                            <button onClick={() => setShowPreview(false)} disabled={submitting}
                                className="flex-1 bg-gray-700 hover:bg-gray-600 disabled:opacity-50 py-3 rounded-xl font-semibold transition-all">
                                ← Back to Edit
                            </button>
                            <button onClick={submitResults} disabled={submitting}
                                className="flex-1 bg-green-600 hover:bg-green-500 disabled:opacity-50 disabled:cursor-not-allowed py-3 rounded-xl font-semibold transition-all">
                                {submitting ? "Processing..." : "✅ Confirm & Pay Winners"}
                            </button>
                        </div>
                    </div>
                )}
            </motion.div>
        </div>
    );
}
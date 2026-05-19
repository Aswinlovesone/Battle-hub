"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import {
    collection,
    getDocs,
    doc,
    getDoc,
    updateDoc,
    addDoc,
    increment,
    serverTimestamp,
} from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";
import { auth, db } from "../../../../firebase";
import { motion, AnimatePresence } from "framer-motion";

/* 🔐 ADMIN EMAIL */
const ADMIN_EMAIL = "battlehubsofficial@gmail.com";

/* ---------------- TYPES ---------------- */

type Participant = {
    uid: string;
    name: string;
    email: string;
    slot: number;
    gameIds: string[];
    joinedAt: any;
};

type Tournament = {
    name: string;
    type: string;
    entryFee: number;
    maxPlayers: number;
    joinedPlayers: number;
    prizePool: number;
    createdBy?: string;
    createdByRole?: string;
    status?: string;
    winners?: Record<string, Winner>;
    prizesDistributed?: boolean;
    matchDate?: string;
    matchTime?: string;
    roomDetails?: {
        roomId: string;
        password: string;
        enteredBy: string;
        enteredAt: any;
    };
    roomDetailsPublished?: boolean;
};

type Winner = {
    uid: string;
    slot: number;
    name: string;
    prize: number;
};

/* ---------------- COMPONENT ---------------- */

export default function ParticipantsPage() {
    const params = useParams();
    const router = useRouter();
    const tournamentId = params.id as string;

    const [user, setUser] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [tournament, setTournament] = useState<Tournament | null>(null);
    const [participants, setParticipants] = useState<Participant[]>([]);
    const [searchQuery, setSearchQuery] = useState("");

    // 🏆 Winner Entry
    const [showWinnerModal, setShowWinnerModal] = useState(false);
    const [distributing, setDistributing] = useState(false);
    const [selectedWinners, setSelectedWinners] = useState<Record<number, string>>({});

    // 🎮 Room Details
    const [showRoomModal, setShowRoomModal] = useState(false);
    const [roomId, setRoomId] = useState("");
    const [roomPassword, setRoomPassword] = useState("");
    const [publishingRoom, setPublishingRoom] = useState(false);

    /* 🔐 AUTH + ACCESS CHECK */
    useEffect(() => {
        const unsub = onAuthStateChanged(auth, async (currentUser) => {
            if (!currentUser) {
                alert("Please login first");
                router.push("/login");
                return;
            }

            setUser(currentUser);

            const tournamentRef = doc(db, "tournaments", tournamentId);
            const tournamentSnap = await getDoc(tournamentRef);

            if (!tournamentSnap.exists()) {
                alert("Tournament not found");
                router.push("/");
                return;
            }

            const tournamentData = tournamentSnap.data() as Tournament;
            setTournament(tournamentData);

            const isAdmin = currentUser.email === ADMIN_EMAIL;
            const isCreator = tournamentData.createdBy === currentUser.uid ||
                tournamentData.createdBy === currentUser.email;

            if (!isAdmin && !isCreator) {
                alert("Access denied");
                router.push("/");
                return;
            }

            await fetchParticipants();
        });

        return () => unsub();
    }, [tournamentId, router]);

    /* 📥 FETCH PARTICIPANTS */
    const fetchParticipants = async () => {
        try {
            const participantsSnap = await getDocs(
                collection(db, "tournaments", tournamentId, "participants")
            );

            const list: Participant[] = [];
            participantsSnap.forEach((d) => {
                const data = d.data();
                list.push({
                    uid: data.uid,
                    name: data.name || "Unknown",
                    email: data.email || "",
                    slot: data.slot || 0,
                    gameIds: data.gameIds || [],
                    joinedAt: data.joinedAt,
                });
            });

            list.sort((a, b) => a.slot - b.slot);
            setParticipants(list);
            setLoading(false);
        } catch (err) {
            console.error("Error fetching participants:", err);
            setLoading(false);
        }
    };

    /* 🏆 CALCULATE TOP 10 PRIZES */
    const calculatePrizes = () => {
        if (!tournament) return {};

        const prizePool = tournament.prizePool;
        const totalWinners = 10; // Top 10

        return {
            1: Math.round(prizePool * 0.40), // 40%
            2: Math.round(prizePool * 0.25), // 25%
            3: Math.round(prizePool * 0.15), // 15%
            4: Math.round(prizePool * 0.20 / 7), // 20% split among 4-10
            5: Math.round(prizePool * 0.20 / 7),
            6: Math.round(prizePool * 0.20 / 7),
            7: Math.round(prizePool * 0.20 / 7),
            8: Math.round(prizePool * 0.20 / 7),
            9: Math.round(prizePool * 0.20 / 7),
            10: Math.round(prizePool * 0.20 / 7),
        };
    };

    /* 🏆 OPEN WINNER MODAL */
    const openWinnerModal = () => {
        // Initialize with existing winners if any
        if (tournament?.winners) {
            const existing: Record<number, string> = {};
            Object.entries(tournament.winners).forEach(([rank, winner]) => {
                existing[Number(rank)] = winner.uid;
            });
            setSelectedWinners(existing);
        }
        setShowWinnerModal(true);
    };

    /* 🏆 SELECT WINNER */
    const selectWinner = (rank: number, uid: string) => {
        setSelectedWinners(prev => ({
            ...prev,
            [rank]: uid
        }));
    };

    /* ✅ VALIDATE WINNERS */
    const validateWinners = (): boolean => {
        const prizes = calculatePrizes();

        // Check all top 10 are selected
        for (let i = 1; i <= 10; i++) {
            if (!selectedWinners[i]) {
                alert(`Please select winner for rank #${i}`);
                return false;
            }
        }

        // Check no duplicates
        const uids = Object.values(selectedWinners);
        const uniqueUids = new Set(uids);
        if (uids.length !== uniqueUids.size) {
            alert("Cannot select the same participant multiple times!");
            return false;
        }

        return true;
    };

    /* 💰 DISTRIBUTE PRIZES */
    const distributePrizes = async () => {
        if (!validateWinners()) return;
        if (!tournament) return;

        if (!confirm("Distribute prizes to winners? This cannot be undone!")) return;

        setDistributing(true);

        try {
            const prizes = calculatePrizes();
            const winnersData: Record<string, Winner> = {};

            // Process each winner
            for (let rank = 1; rank <= 10; rank++) {
                const uid = selectedWinners[rank];
                const participant = participants.find(p => p.uid === uid);
                if (!participant) continue;

                const prize = prizes[rank as keyof typeof prizes];

                // Save winner data
                winnersData[rank] = {
                    uid: participant.uid,
                    slot: participant.slot,
                    name: participant.name,
                    prize: prize
                };

                // Credit player wallet
                const walletRef = doc(db, "playerWallets", uid);
                const walletSnap = await getDoc(walletRef);

                if (walletSnap.exists()) {
                    await updateDoc(walletRef, {
                        balance: increment(prize)
                    });
                } else {
                    // Create wallet if doesn't exist
                    await updateDoc(walletRef, {
                        balance: prize,
                        createdAt: serverTimestamp()
                    });
                }

                // Create transaction record
                await addDoc(collection(db, "walletTransactions"), {
                    uid: uid,
                    role: "player",
                    type: "win",
                    direction: "credit",
                    amount: prize,
                    status: "success",
                    reference: `${tournament.name} - Rank #${rank}`,
                    tournamentId: tournamentId,
                    rank: rank,
                    createdAt: serverTimestamp()
                });
            }

            // Credit influencer commission if applicable
            if (tournament.createdByRole === "influencer" && tournament.createdBy) {
                const commission = Math.round(tournament.entryFee * tournament.joinedPlayers * 0.1);

                const influencerWalletRef = doc(db, "influencerWallets", tournament.createdBy);
                await updateDoc(influencerWalletRef, {
                    totalEarnings: increment(commission),
                    available: increment(commission)
                });

                // Create transaction
                await addDoc(collection(db, "walletTransactions"), {
                    uid: tournament.createdBy,
                    role: "influencer",
                    type: "commission",
                    direction: "credit",
                    amount: commission,
                    status: "success",
                    reference: `${tournament.name} - Tournament Commission`,
                    tournamentId: tournamentId,
                    createdAt: serverTimestamp()
                });
            }

            // Update tournament with winners
            await updateDoc(doc(db, "tournaments", tournamentId), {
                winners: winnersData,
                status: "completed",
                prizesDistributed: true,
                completedAt: serverTimestamp()
            });

            alert("✅ Prizes distributed successfully!");
            setShowWinnerModal(false);

            // Refresh tournament data
            const tournamentSnap = await getDoc(doc(db, "tournaments", tournamentId));
            if (tournamentSnap.exists()) {
                setTournament(tournamentSnap.data() as Tournament);
            }

        } catch (err) {
            console.error("Prize distribution error:", err);
            alert("❌ Failed to distribute prizes");
        } finally {
            setDistributing(false);
        }
    };

    /* 📋 COPY ALL GAME IDs */
    const copyAllGameIds = () => {
        let text = `${tournament?.name || "Tournament"} - Game IDs\n\n`;

        participants.forEach((p) => {
            text += `Slot #${p.slot} - ${p.name}\n`;
            text += `Game IDs: ${p.gameIds.join(", ")}\n\n`;
        });

        navigator.clipboard.writeText(text);
        alert("✅ All Game IDs copied!");
    };

    /* 📥 DOWNLOAD CSV */
    const downloadCSV = () => {
        const maxGameIds = Math.max(...participants.map(p => p.gameIds.length), 1);

        let csv = "Slot,Name,Email";
        for (let i = 1; i <= maxGameIds; i++) {
            csv += `,Game ID ${i}`;
        }
        csv += "\n";

        participants.forEach((p) => {
            csv += `${p.slot},"${p.name}","${p.email}"`;
            for (let i = 0; i < maxGameIds; i++) {
                csv += `,"${p.gameIds[i] || ""}"`;
            }
            csv += "\n";
        });

        const blob = new Blob([csv], { type: "text/csv" });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `${tournament?.name || "tournament"}_participants.csv`;
        a.click();
        window.URL.revokeObjectURL(url);
    };

    /* 🔍 FILTER PARTICIPANTS */
    const filteredParticipants = participants.filter((p) => {
        const query = searchQuery.toLowerCase();
        return (
            p.name.toLowerCase().includes(query) ||
            p.email.toLowerCase().includes(query) ||
            p.slot.toString().includes(query) ||
            p.gameIds.some(id => id.toLowerCase().includes(query))
        );
    });

    /* 🎮 CHECK IF CAN PUBLISH ROOM DETAILS */
    const canPublishRoomDetails = () => {
        if (!tournament?.matchDate || !tournament?.matchTime) return false;

        const matchDateTime = new Date(`${tournament.matchDate}T${tournament.matchTime}:00`);
        const now = new Date();
        const timeDiff = matchDateTime.getTime() - now.getTime();
        const minutesUntilMatch = Math.floor(timeDiff / (1000 * 60));

        // Show 15 mins before to 1 hour after match
        return minutesUntilMatch <= 15 && minutesUntilMatch >= -60;
    };

    /* 🎮 PUBLISH ROOM DETAILS */
    const publishRoomDetails = async () => {
        if (!roomId.trim() || !roomPassword.trim()) {
            alert("Please enter both Room ID and Password");
            return;
        }

        if (!confirm("Publish room details? All participants will see this immediately.")) {
            return;
        }

        setPublishingRoom(true);

        try {
            await updateDoc(doc(db, "tournaments", tournamentId), {
                roomDetails: {
                    roomId: roomId.trim(),
                    password: roomPassword.trim(),
                    enteredBy: user.email,
                    enteredAt: serverTimestamp()
                },
                roomDetailsPublished: true
            });

            alert("✅ Room details published successfully!");
            setShowRoomModal(false);
            setRoomId("");
            setRoomPassword("");

            // Refresh tournament data
            const tournamentSnap = await getDoc(doc(db, "tournaments", tournamentId));
            if (tournamentSnap.exists()) {
                setTournament(tournamentSnap.data() as Tournament);
            }
        } catch (err) {
            console.error("Publish room error:", err);
            alert("❌ Failed to publish room details");
        } finally {
            setPublishingRoom(false);
        }
    };

    /* 📋 COPY TO CLIPBOARD */
    const copyToClipboard = (text: string, label: string) => {
        navigator.clipboard.writeText(text);
        alert(`✅ ${label} copied!`);
    };
    const getWinnerRank = (uid: string): number | null => {
        if (!tournament?.winners) return null;
        for (const [rank, winner] of Object.entries(tournament.winners)) {
            if (winner.uid === uid) return Number(rank);
        }
        return null;
    };

    if (loading) {
        return (
            <div className="p-6 text-white text-center">
                Loading participants…
            </div>
        );
    }

    return (
        <>
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="p-6 max-w-5xl mx-auto text-white space-y-6"
            >
                {/* HEADER */}
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-2xl font-bold">👥 Tournament Participants</h1>
                        <p className="text-gray-400 text-sm mt-1">
                            {tournament?.name} • {tournament?.type?.toUpperCase()}
                        </p>
                        {tournament?.status === "completed" && (
                            <span className="inline-block mt-2 bg-green-600/20 text-green-400 
                            text-xs px-3 py-1 rounded-full">
                                ✅ Completed
                            </span>
                        )}
                    </div>
                    <button
                        onClick={() => router.back()}
                        className="bg-gray-700 hover:bg-gray-600 px-4 py-2 rounded"
                    >
                        ← Back
                    </button>
                </div>

                {/* STATS */}
                <div className="bg-[#0b0f1a] border border-white/10 rounded-xl p-4">
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-center">
                        <div>
                            <p className="text-2xl font-bold text-blue-400">
                                {participants.length}
                            </p>
                            <p className="text-xs text-gray-400">Total Joined</p>
                        </div>
                        <div>
                            <p className="text-2xl font-bold text-green-400">
                                ₹{tournament?.prizePool || 0}
                            </p>
                            <p className="text-xs text-gray-400">Prize Pool</p>
                        </div>
                        <div>
                            <p className="text-2xl font-bold text-purple-400">
                                {participants.filter(p => p.gameIds.length > 0).length}
                            </p>
                            <p className="text-xs text-gray-400">IDs Submitted</p>
                        </div>
                        <div>
                            <p className="text-2xl font-bold text-yellow-400">
                                {tournament?.winners ? Object.keys(tournament.winners).length : 0}
                            </p>
                            <p className="text-xs text-gray-400">Winners</p>
                        </div>
                    </div>
                </div>

                {/* ACTIONS */}
                <div className="flex flex-col sm:flex-row gap-3">
                    <input
                        type="text"
                        placeholder="🔍 Search..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="flex-1 bg-black border border-white/20 rounded-lg px-4 py-2.5"
                    />

                    {/* 🎮 ADD ROOM DETAILS BUTTON */}
                    {!tournament?.roomDetailsPublished && canPublishRoomDetails() && (
                        <button
                            onClick={() => setShowRoomModal(true)}
                            className="bg-gradient-to-r from-purple-600 to-pink-600 
                            hover:from-purple-500 hover:to-pink-500
                            px-6 py-2.5 rounded-lg font-semibold whitespace-nowrap
                            shadow-lg hover:shadow-purple-500/50 transition-all"
                        >
                            🎮 Add Room Details
                        </button>
                    )}

                    {/* 🏆 ENTER WINNERS BUTTON */}
                    {!tournament?.prizesDistributed && participants.length >= 10 && (
                        <button
                            onClick={openWinnerModal}
                            className="bg-gradient-to-r from-yellow-600 to-orange-600 
                            hover:from-yellow-500 hover:to-orange-500
                            px-6 py-2.5 rounded-lg font-semibold whitespace-nowrap
                            shadow-lg hover:shadow-yellow-500/50 transition-all"
                        >
                            🏆 Enter Winners
                        </button>
                    )}

                    <button
                        onClick={copyAllGameIds}
                        className="bg-blue-600 hover:bg-blue-500 px-4 py-2.5 rounded-lg font-semibold whitespace-nowrap"
                    >
                        📋 Copy IDs
                    </button>
                    <button
                        onClick={downloadCSV}
                        className="bg-green-600 hover:bg-green-500 px-4 py-2.5 rounded-lg font-semibold whitespace-nowrap"
                    >
                        📥 CSV
                    </button>
                </div>

                {/* 🎮 ROOM DETAILS DISPLAY (if published) */}
                {tournament?.roomDetailsPublished && tournament?.roomDetails && (
                    <div className="bg-gradient-to-r from-purple-600/20 to-pink-600/20 
                    border border-purple-500/50 rounded-xl p-6">
                        <h3 className="text-lg font-bold text-purple-400 mb-4 flex items-center gap-2">
                            🎮 Room Details Published
                        </h3>
                        <div className="grid sm:grid-cols-2 gap-4">
                            <div className="bg-black/40 border border-white/20 rounded-lg p-4">
                                <p className="text-xs text-gray-400 mb-2">Room ID</p>
                                <div className="flex items-center justify-between">
                                    <p className="text-xl font-mono font-bold text-white">
                                        {tournament.roomDetails.roomId}
                                    </p>
                                    <button
                                        onClick={() => copyToClipboard(tournament.roomDetails!.roomId, "Room ID")}
                                        className="bg-blue-600 hover:bg-blue-500 px-3 py-1 rounded text-sm"
                                    >
                                        📋 Copy
                                    </button>
                                </div>
                            </div>
                            <div className="bg-black/40 border border-white/20 rounded-lg p-4">
                                <p className="text-xs text-gray-400 mb-2">Password</p>
                                <div className="flex items-center justify-between">
                                    <p className="text-xl font-mono font-bold text-white">
                                        {tournament.roomDetails.password}
                                    </p>
                                    <button
                                        onClick={() => copyToClipboard(tournament.roomDetails!.password, "Password")}
                                        className="bg-blue-600 hover:bg-blue-500 px-3 py-1 rounded text-sm"
                                    >
                                        📋 Copy
                                    </button>
                                </div>
                            </div>
                        </div>
                        <p className="text-xs text-gray-400 mt-3">
                            Published by {tournament.roomDetails.enteredBy}
                        </p>
                    </div>
                )}

                {/* PARTICIPANTS LIST */}
                <div className="space-y-3">
                    {filteredParticipants.map((p) => {
                        const winnerRank = getWinnerRank(p.uid);
                        const isWinner = winnerRank !== null;

                        return (
                            <motion.div
                                key={p.uid}
                                className={`bg-[#0b0f1a] border rounded-xl p-4 transition-all
                                ${isWinner
                                        ? 'border-yellow-500/50 bg-gradient-to-r from-yellow-500/10 to-orange-500/10'
                                        : 'border-white/10 hover:border-blue-500/40'
                                    }`}
                            >
                                <div className="flex items-start justify-between mb-3">
                                    <div className="flex-1">
                                        <div className="flex items-center gap-3 flex-wrap">
                                            <span className="bg-blue-500/20 text-blue-400 
                                            text-xs font-bold px-3 py-1 rounded-full">
                                                Slot #{p.slot}
                                            </span>

                                            {isWinner && (
                                                <span className="bg-yellow-500/20 text-yellow-400 
                                                text-xs font-bold px-3 py-1 rounded-full">
                                                    {winnerRank === 1 ? "🥇" : winnerRank === 2 ? "🥈" : winnerRank === 3 ? "🥉" : "🏅"}
                                                    {" "}Rank #{winnerRank} • ₹{tournament?.winners?.[winnerRank]?.prize}
                                                </span>
                                            )}

                                            <h3 className="font-semibold text-lg">
                                                {p.name}
                                            </h3>
                                        </div>
                                        <p className="text-sm text-gray-400 mt-1">
                                            {p.email}
                                        </p>
                                    </div>
                                </div>

                                {/* GAME IDs */}
                                <div className="bg-black/40 border border-white/10 rounded-lg p-3">
                                    <p className="text-xs text-gray-400 mb-2">🎮 Game IDs:</p>
                                    {p.gameIds.length > 0 ? (
                                        <div className="flex flex-wrap gap-2">
                                            {p.gameIds.map((id, index) => (
                                                <span
                                                    key={index}
                                                    className="bg-green-500/20 text-green-400 
                                                    text-sm font-mono px-3 py-1 rounded"
                                                >
                                                    {id}
                                                </span>
                                            ))}
                                        </div>
                                    ) : (
                                        <p className="text-sm text-red-400">❌ No IDs</p>
                                    )}
                                </div>
                            </motion.div>
                        );
                    })}
                </div>
            </motion.div>

            {/* 🏆 WINNER ENTRY MODAL */}
            <AnimatePresence>
                {showWinnerModal && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 bg-black/90 backdrop-blur-sm z-50
                        flex items-center justify-center p-4 overflow-y-auto"
                        onClick={() => setShowWinnerModal(false)}
                    >
                        <motion.div
                            initial={{ scale: 0.9 }}
                            animate={{ scale: 1 }}
                            exit={{ scale: 0.9 }}
                            onClick={(e) => e.stopPropagation()}
                            className="bg-[#0b0f1a] border border-yellow-500/30 rounded-2xl
                            p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto space-y-4"
                        >
                            <h2 className="text-2xl font-bold text-yellow-400">
                                🏆 Enter Top 10 Winners
                            </h2>

                            <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-3">
                                <p className="text-sm text-blue-400">
                                    Prize Pool: ₹{tournament?.prizePool}
                                </p>
                            </div>

                            {/* WINNER SELECTIONS */}
                            <div className="space-y-4">
                                {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((rank) => {
                                    const prizes = calculatePrizes();
                                    const prize = prizes[rank as keyof typeof prizes];

                                    return (
                                        <div key={rank} className="bg-black/40 border border-white/10 rounded-lg p-3">
                                            <div className="flex items-center justify-between mb-2">
                                                <span className="font-semibold">
                                                    {rank === 1 ? "🥇" : rank === 2 ? "🥈" : rank === 3 ? "🥉" : "🏅"}
                                                    {" "}Rank #{rank}
                                                </span>
                                                <span className="text-green-400 font-bold">
                                                    ₹{prize}
                                                </span>
                                            </div>
                                            <select
                                                value={selectedWinners[rank] || ""}
                                                onChange={(e) => selectWinner(rank, e.target.value)}
                                                className="w-full bg-black border border-white/20 rounded px-3 py-2"
                                            >
                                                <option value="">Select Winner...</option>
                                                {participants.map((p) => (
                                                    <option key={p.uid} value={p.uid}>
                                                        Slot #{p.slot} - {p.name}
                                                    </option>
                                                ))}
                                            </select>
                                        </div>
                                    );
                                })}
                            </div>

                            {/* ACTIONS */}
                            <div className="flex gap-3 pt-4">
                                <button
                                    onClick={() => setShowWinnerModal(false)}
                                    disabled={distributing}
                                    className="flex-1 bg-gray-700 hover:bg-gray-600 
                                    disabled:opacity-50 py-3 rounded-lg font-semibold"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={distributePrizes}
                                    disabled={distributing}
                                    className="flex-1 bg-gradient-to-r from-green-600 to-emerald-600
                                    hover:from-green-500 hover:to-emerald-500
                                    disabled:opacity-50 disabled:cursor-not-allowed
                                    py-3 rounded-lg font-semibold"
                                >
                                    {distributing ? "Distributing..." : "💰 Distribute Prizes"}
                                </button>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </>
    );
}
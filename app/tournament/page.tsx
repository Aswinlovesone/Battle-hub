"use client";

import { useEffect, useState } from "react";
import {
    collection,
    getDocs,
    doc,
    getDoc,
    runTransaction,
    serverTimestamp,
} from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";
import { auth, db } from "../firebase";

/* ---------------- TYPES ---------------- */

type Tournament = {
    id: string;
    name: string;
    entryFee: number;
    maxPlayers: number;
    joinedPlayers: number;
    prizePool: number;
    status?: "open" | "closed";
};

export default function TournamentsPage() {
    const [tournaments, setTournaments] = useState<Tournament[]>([]);
    const [user, setUser] = useState<any>(null);

    // tournamentId -> joined?
    const [joinedMap, setJoinedMap] = useState<Record<string, boolean>>({});

    // tournamentId -> slot number
    const [slotMap, setSlotMap] = useState<Record<string, number>>({});

    const [loading, setLoading] = useState(true);
    const [joiningId, setJoiningId] = useState<string | null>(null);

    /* 🔐 AUTH CHECK */
    useEffect(() => {
        const unsub = onAuthStateChanged(auth, (u) => {
            if (!u) {
                window.location.href = "/login";
            } else {
                setUser(u);
            }
        });
        return () => unsub();
    }, []);

    /* 📥 FETCH TOURNAMENTS + SLOT */
    useEffect(() => {
        if (!user) return;

        const fetchTournaments = async () => {
            const snap = await getDocs(collection(db, "tournaments"));

            const list: Tournament[] = [];
            const joinedStatus: Record<string, boolean> = {};
            const slots: Record<string, number> = {};

            for (const d of snap.docs) {
                const data = d.data() as Tournament;
                list.push({ id: d.id, ...data });

                const participantRef = doc(
                    db,
                    "tournaments",
                    d.id,
                    "participants",
                    user.uid
                );

                const participantSnap = await getDoc(participantRef);

                if (participantSnap.exists()) {
                    joinedStatus[d.id] = true;
                    slots[d.id] = participantSnap.data().slot;
                } else {
                    joinedStatus[d.id] = false;
                }
            }

            setTournaments(list);
            setJoinedMap(joinedStatus);
            setSlotMap(slots);
            setLoading(false);
        };

        fetchTournaments();
    }, [user]);

    /* 🎯 JOIN TOURNAMENT (SAFE) */
    const joinTournament = async (tournamentId: string) => {
        if (!user || joiningId) return;

        setJoiningId(tournamentId);

        const tournamentRef = doc(db, "tournaments", tournamentId);
        const participantRef = doc(
            db,
            "tournaments",
            tournamentId,
            "participants",
            user.uid
        );

        try {
            let assignedSlot = 0;

            await runTransaction(db, async (transaction) => {
                const tournamentSnap = await transaction.get(tournamentRef);
                if (!tournamentSnap.exists()) {
                    throw new Error("Tournament not found");
                }

                const data = tournamentSnap.data();

                if (data.status && data.status !== "open") {
                    throw new Error("Tournament closed");
                }

                if (data.joinedPlayers >= data.maxPlayers) {
                    throw new Error("Tournament full");
                }

                const participantSnap = await transaction.get(participantRef);
                if (participantSnap.exists()) {
                    throw new Error("Already joined");
                }

                assignedSlot = data.joinedPlayers + 1;

                // 🧑 Save participant
                transaction.set(participantRef, {
                    uid: user.uid,
                    name: user.displayName || "Player",
                    slot: assignedSlot,
                    joinedAt: serverTimestamp(),
                });

                // 🔄 Update counter
                transaction.update(tournamentRef, {
                    joinedPlayers: assignedSlot,
                });
            });

            // ✅ UI update
            setJoinedMap((prev) => ({
                ...prev,
                [tournamentId]: true,
            }));

            setSlotMap((prev) => ({
                ...prev,
                [tournamentId]: assignedSlot,
            }));

            setTournaments((prev) =>
                prev.map((t) =>
                    t.id === tournamentId
                        ? { ...t, joinedPlayers: t.joinedPlayers + 1 }
                        : t
                )
            );

            alert(`🎯 Joined Successfully!\nYour Slot Number: ${assignedSlot}`);
        } catch (err: any) {
            alert(err.message || "Join failed");
        } finally {
            setJoiningId(null);
        }
    };

    if (loading) {
        return <div className="p-6 text-white">Loading tournaments…</div>;
    }

    /* ---------------- UI ---------------- */

    return (
        <div className="p-6 text-white">
            <h1 className="text-2xl font-bold text-blue-500 mb-6">
                🏆 Tournaments
            </h1>

            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                {tournaments.map((t) => {
                    const alreadyJoined = joinedMap[t.id];
                    const slot = slotMap[t.id];

                    return (
                        <div
                            key={t.id}
                            className="bg-gray-900 border border-gray-800 rounded-xl p-6"
                        >
                            <h2 className="text-xl font-bold text-blue-400 mb-2">
                                {t.name}
                            </h2>

                            <p className="text-gray-400">Entry ₹{t.entryFee}</p>
                            <p className="text-gray-400">
                                Players {t.joinedPlayers} / {t.maxPlayers}
                            </p>
                            <p className="text-gray-400 mb-4">
                                Prize Pool ₹{t.prizePool}
                            </p>

                            {alreadyJoined ? (
                                <div className="bg-green-600/20 border border-green-600 rounded-lg p-3 text-green-400 font-semibold">
                                    ✅ Joined <br />
                                    🎯 Slot #{slot}
                                </div>
                            ) : (
                                <button
                                    disabled={joiningId === t.id}
                                    onClick={() => joinTournament(t.id)}
                                    className="w-full bg-blue-600 hover:bg-blue-500 disabled:opacity-50 py-2 rounded font-semibold"
                                >
                                    {joiningId === t.id ? "Joining…" : "Join Battle"}
                                </button>
                            )}
                        </div>
                    );
                })}
            </div>
        </div>
    );
}

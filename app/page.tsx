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
import { auth, db } from "./firebase";
import { motion, AnimatePresence } from "framer-motion";

type Tournament = {
  id: string;
  name?: string;
  entryFee?: number;
  maxPlayers?: number;
  joinedPlayers?: number;
  prizePool?: number;
  type?: string;
  matchDate?: string;
  matchTime?: string;
  status?: string;
  prizesDistributed?: boolean;
  prizes?: {
    first?: number;
    second?: number;
    third?: number;
    others?: number;
  };
};

type MatchStatus = "upcoming" | "started" | "completed";

function getMatchStatus(t: Tournament): MatchStatus {
  if (t.prizesDistributed || t.status === "completed") return "completed";
  if (!t.matchDate || !t.matchTime) return "upcoming";
  const matchDT = new Date(`${t.matchDate}T${t.matchTime}:00`).getTime();
  const now = Date.now();
  if (now >= matchDT + 15 * 60 * 1000) return "completed";
  if (now >= matchDT) return "started";
  return "upcoming";
}

function getStatusBadge(status: MatchStatus) {
  if (status === "completed")
    return (
      <span className="text-xs bg-green-600/20 text-green-400 px-2 py-1 rounded-full">
        ✅ Completed
      </span>
    );
  if (status === "started")
    return (
      <span className="text-xs bg-red-600/20 text-red-400 px-2 py-1 rounded-full animate-pulse">
        🔴 Started
      </span>
    );
  return (
    <span className="text-xs bg-yellow-600/20 text-yellow-400 px-2 py-1 rounded-full">
      📅 Upcoming
    </span>
  );
}

type FilterStatus = "all" | "upcoming" | "started" | "completed";

export default function Home() {
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [openPrizeId, setOpenPrizeId] = useState<string | null>(null);

  const [joinedMap, setJoinedMap] = useState<Record<string, boolean>>({});
  const [slotMap, setSlotMap] = useState<Record<string, number>>({});
  const [joiningId, setJoiningId] = useState<string | null>(null);

  const [showGameIdModal, setShowGameIdModal] = useState(false);
  const [selectedTournament, setSelectedTournament] = useState<Tournament | null>(null);
  const [gameIds, setGameIds] = useState<string[]>([""]);

  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<FilterStatus>("all");
  const [typeFilter, setTypeFilter] = useState<"all" | "solo" | "duo" | "squad">("all");

  const [, setTick] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setTick((n) => n + 1), 1000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => setUser(u));
    return () => unsub();
  }, []);

  useEffect(() => {
    const fetchTournaments = async () => {
      try {
        const snap = await getDocs(collection(db, "tournaments"));
        const list: Tournament[] = [];
        const joined: Record<string, boolean> = {};
        const slots: Record<string, number> = {};

        for (const d of snap.docs) {
          // ✅ FIX: cast as Omit<Tournament, "id">, spread first, then set id
          const data = d.data() as Omit<Tournament, "id">;
          list.push({ ...data, id: d.id });

          if (user) {
            try {
              const participantRef = doc(db, "tournaments", d.id, "participants", user.uid);
              const participantSnap = await getDoc(participantRef);
              if (participantSnap.exists()) {
                joined[d.id] = true;
                slots[d.id] =
                  participantSnap.data().slotNumber ||
                  participantSnap.data().slot ||
                  0;
              }
            } catch (err) {
              console.error(`Error checking participant for ${d.id}:`, err);
            }
          }
        }

        setTournaments(list);
        setJoinedMap(joined);
        setSlotMap(slots);
      } catch (err) {
        console.error("Error fetching tournaments:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchTournaments();
  }, [user]);

  const todayMidnight = (() => {
    const d = new Date(); d.setHours(0, 0, 0, 0); return d.getTime();
  })();

  const visibleTournaments = tournaments.filter((t) => {
    if (!t.matchDate) return true;
    const matchDay = new Date(t.matchDate); matchDay.setHours(0, 0, 0, 0);
    return matchDay.getTime() >= todayMidnight;
  });

  const filteredTournaments = visibleTournaments.filter((t) => {
    const matchesSearch = (t.name || t.id || "")
      .toLowerCase()
      .includes(searchQuery.toLowerCase());
    const status = getMatchStatus(t);
    const matchesStatus = statusFilter === "all" || status === statusFilter;
    const matchesType = typeFilter === "all" || (t.type || "").toLowerCase() === typeFilter;
    return matchesSearch && matchesStatus && matchesType;
  });

  const upcomingCount = visibleTournaments.filter((t) => getMatchStatus(t) === "upcoming").length;
  const startedCount = visibleTournaments.filter((t) => getMatchStatus(t) === "started").length;
  const completedCount = visibleTournaments.filter((t) => getMatchStatus(t) === "completed").length;

  const openGameIdModal = (tournament: Tournament) => {
    if (!user) {
      alert("Please login first");
      window.location.href = "/login";
      return;
    }
    setSelectedTournament(tournament);
    const type = tournament.type?.toLowerCase() || "solo";
    setGameIds(
      type === "duo" ? ["", ""] : type === "squad" ? ["", "", "", ""] : [""]
    );
    setShowGameIdModal(true);
  };

  const closeGameIdModal = () => {
    setShowGameIdModal(false);
    setSelectedTournament(null);
    setGameIds([""]);
  };

  const updateGameId = (index: number, value: string) => {
    const newIds = [...gameIds];
    newIds[index] = value.trim();
    setGameIds(newIds);
  };

  const validateGameIds = (): boolean => {
    for (let i = 0; i < gameIds.length; i++) {
      if (!gameIds[i] || gameIds[i].trim() === "") {
        alert(`Please enter Game ID ${i + 1}`);
        return false;
      }
    }
    return true;
  };

  const submitAndJoinTournament = async () => {
    if (!selectedTournament || !user) return;
    if (!validateGameIds()) return;
    if (joiningId) return;

    if (getMatchStatus(selectedTournament) !== "upcoming") {
      alert("This match has already started. You cannot join now.");
      closeGameIdModal();
      return;
    }

    setJoiningId(selectedTournament.id);

    const tournamentRef = doc(db, "tournaments", selectedTournament.id);
    const participantRef = doc(
      db,
      "tournaments",
      selectedTournament.id,
      "participants",
      user.uid
    );

    try {
      let assignedSlot = 0;

      await runTransaction(db, async (transaction) => {
        const tournamentSnap = await transaction.get(tournamentRef);
        if (!tournamentSnap.exists()) throw new Error("Tournament not found");

        const data = tournamentSnap.data();

        if (data.prizesDistributed || data.status === "completed")
          throw new Error("This tournament is already completed");

        const matchDT = new Date(`${data.matchDate}T${data.matchTime}:00`).getTime();
        if (Date.now() >= matchDT)
          throw new Error("Match has already started. You cannot join now.");

        if (data.joinedPlayers >= data.maxPlayers)
          throw new Error("Tournament is full");

        const participantSnap = await transaction.get(participantRef);
        if (participantSnap.exists())
          throw new Error("You already joined this tournament");

        assignedSlot = data.joinedPlayers + 1;

        transaction.set(participantRef, {
          uid: user.uid,
          userName: user.displayName || "Player",
          userEmail: user.email,
          slotNumber: assignedSlot,
          gameIds,
          joinedAt: serverTimestamp(),
        });

        transaction.update(tournamentRef, { joinedPlayers: assignedSlot });
      });

      setJoinedMap((prev) => ({ ...prev, [selectedTournament.id]: true }));
      setSlotMap((prev) => ({ ...prev, [selectedTournament.id]: assignedSlot }));
      setTournaments((prev) =>
        prev.map((t) =>
          t.id === selectedTournament.id
            ? { ...t, joinedPlayers: (t.joinedPlayers || 0) + 1 }
            : t
        )
      );

      closeGameIdModal();
      alert(`🎯 Joined Successfully!\n\nYour Slot Number: #${assignedSlot}`);
    } catch (err: any) {
      alert(err.message || "Join failed");
    } finally {
      setJoiningId(null);
    }
  };

  if (loading) {
    return (
      <div className="p-4 sm:p-6 grid gap-4 sm:gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-72 rounded-2xl bg-[#111827] animate-pulse" />
        ))}
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white p-4 sm:p-6">
      <div className="max-w-7xl mx-auto">

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <h1 className="text-4xl font-bold mb-2">🏆 Tournaments</h1>
          <p className="text-gray-400">Join exciting tournaments and win prizes!</p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="mb-6"
        >
          <input
            type="text"
            placeholder="🔍 Search tournaments..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-[#0b0f1a] border border-white/10 rounded-lg px-4 py-3
            text-white placeholder-gray-500 focus:outline-none focus:border-blue-500/50"
          />
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="mb-8 space-y-4"
        >
          <div>
            <p className="text-sm text-gray-400 mb-2">Status</p>
            <div className="flex flex-wrap gap-2">
              {([
                { key: "all", label: `All (${visibleTournaments.length})`, active: "bg-blue-600" },
                { key: "upcoming", label: `📅 Upcoming (${upcomingCount})`, active: "bg-yellow-600" },
                { key: "started", label: `🔴 Started (${startedCount})`, active: "bg-red-600" },
                { key: "completed", label: `✅ Completed (${completedCount})`, active: "bg-green-700" },
              ] as const).map(({ key, label, active }) => (
                <button
                  key={key}
                  onClick={() => setStatusFilter(key)}
                  className={`px-4 py-2 rounded-lg font-semibold transition-all ${statusFilter === key
                    ? `${active} text-white`
                    : "bg-[#0b0f1a] text-gray-400 hover:bg-white/5"
                    }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <p className="text-sm text-gray-400 mb-2">Game Type</p>
            <div className="flex flex-wrap gap-2">
              {([
                { key: "all", label: "All Types" },
                { key: "solo", label: "🎮 Solo" },
                { key: "duo", label: "👥 Duo" },
                { key: "squad", label: "🎯 Squad" },
              ] as const).map(({ key, label }) => (
                <button
                  key={key}
                  onClick={() => setTypeFilter(key)}
                  className={`px-4 py-2 rounded-lg font-semibold transition-all ${typeFilter === key
                    ? "bg-purple-600 text-white"
                    : "bg-[#0b0f1a] text-gray-400 hover:bg-white/5"
                    }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
        </motion.div>

        <div className="mb-4">
          <p className="text-gray-400 text-sm">
            Showing {filteredTournaments.length} tournament{filteredTournaments.length !== 1 ? "s" : ""}
          </p>
        </div>

        {filteredTournaments.length === 0 ? (
          <div className="bg-[#0b0f1a] border border-white/10 rounded-xl p-12 text-center">
            <p className="text-gray-400 text-lg">No tournaments found</p>
            <p className="text-gray-500 text-sm mt-2">
              Try adjusting your filters or search query
            </p>
          </div>
        ) : (
          <motion.div
            initial="hidden"
            animate="show"
            variants={{ hidden: {}, show: { transition: { staggerChildren: 0.08 } } }}
            className="grid gap-4 sm:gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3"
          >
            {filteredTournaments.map((t) => {
              const status = getMatchStatus(t);
              const typeLabel = (t.type ?? "solo").toUpperCase();
              const maxPlayers = t.maxPlayers ?? 50;
              const joinedPlayers = t.joinedPlayers ?? 0;
              const first = Math.round(t.prizes?.first ?? 0);
              const second = Math.round(t.prizes?.second ?? 0);
              const third = Math.round(t.prizes?.third ?? 0);
              const others = Math.round(t.prizes?.others ?? 0);
              const isOpen = openPrizeId === t.id;
              const alreadyJoined = joinedMap[t.id] || false;
              const slot = slotMap[t.id] || 0;

              const isFull = joinedPlayers >= maxPlayers;
              const isStartedOrDone = status === "started" || status === "completed";
              const isJoining = joiningId === t.id;
              const joinDisabled = isFull || isStartedOrDone || isJoining;

              const joinLabel = isJoining
                ? "Joining..."
                : status === "completed"
                  ? "Completed"
                  : status === "started"
                    ? "Match Started"
                    : isFull
                      ? "Tournament Full"
                      : "Join Battle";

              return (
                <motion.div
                  key={t.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4, ease: "easeOut" }}
                  whileTap={{ scale: 0.97 }}
                  className="relative overflow-hidden rounded-2xl
                  bg-[#0b0f1a] border border-white/10
                  p-4 sm:p-6 text-white
                  transition-all duration-300
                  hover:-translate-y-1.5
                  hover:border-blue-500/40
                  hover:shadow-[0_12px_40px_-10px_rgba(37,99,235,0.35)]"
                >
                  <div className="flex items-center justify-between mb-4">
                    <span className="text-[10px] sm:text-[11px] uppercase tracking-wide
                    bg-purple-500/10 text-purple-400 px-2.5 sm:px-3 py-1 rounded-full">
                      {typeLabel}
                    </span>
                    <span className="text-[10px] sm:text-[11px]
                    bg-blue-500/10 text-blue-400 px-2.5 sm:px-3 py-1 rounded-full">
                      Entry ₹{t.entryFee ?? 0}
                    </span>
                  </div>

                  <div className="flex items-center gap-2 mb-2 flex-wrap">
                    <h2 className="text-base sm:text-lg font-semibold">
                      {t.name ?? t.id ?? "Tournament"}
                    </h2>
                    {getStatusBadge(status)}
                  </div>

                  {t.matchDate && t.matchTime && (
                    <p className="text-xs text-blue-400 mb-2">
                      📅 {t.matchDate} ⏰ {t.matchTime}
                    </p>
                  )}

                  <p className="text-xs sm:text-sm text-gray-400 mb-3">
                    {joinedPlayers} / {maxPlayers} players joined
                  </p>

                  <p className="text-sm text-gray-300 mb-4">
                    Prize Pool
                    <span className="ml-2 text-base font-semibold text-green-400">
                      ₹{Math.round(t.prizePool ?? 0)}
                    </span>
                  </p>

                  <button
                    onClick={() => setOpenPrizeId(isOpen ? null : t.id)}
                    className="flex items-center justify-between w-full
                    text-xs sm:text-sm text-yellow-400 hover:text-yellow-300 mb-4 transition"
                  >
                    <span>🏆 Prize Details</span>
                    <span className="opacity-60">{isOpen ? "▲" : "▼"}</span>
                  </button>

                  <AnimatePresence>
                    {isOpen && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.3 }}
                        className="overflow-hidden text-sm bg-black/60
                        border border-white/10 rounded-xl p-4 mb-4 space-y-1"
                      >
                        <p>🥇 1st: ₹{first}</p>
                        <p>🥈 2nd: ₹{second}</p>
                        <p>🥉 3rd: ₹{third}</p>
                        {others > 0 && (
                          <p className="text-gray-400">🎖 Others: ₹{others} each</p>
                        )}
                      </motion.div>
                    )}
                  </AnimatePresence>

                  {alreadyJoined ? (
                    <div className="w-full bg-green-600/20 border border-green-500
                    rounded-xl p-4 text-center">
                      <p className="text-green-400 font-semibold text-sm mb-1">
                        ✅ Already Joined
                      </p>
                      <p className="text-blue-400 font-bold text-base">
                        🎯 Your Slot: #{slot}
                      </p>
                    </div>
                  ) : (
                    <button
                      onClick={() => !joinDisabled && openGameIdModal(t)}
                      disabled={joinDisabled}
                      className={`w-full py-3.5 sm:py-3 rounded-xl text-sm sm:text-base
                      font-semibold transition-all duration-150 active:scale-[0.97]
                      ${joinDisabled
                          ? "bg-gray-700 text-gray-400 cursor-not-allowed"
                          : "bg-blue-600 hover:bg-blue-500 text-white"
                        }`}
                    >
                      {joinLabel}
                    </button>
                  )}
                </motion.div>
              );
            })}
          </motion.div>
        )}
      </div>

      <AnimatePresence>
        {showGameIdModal && selectedTournament && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50
            flex items-center justify-center p-4"
            onClick={closeGameIdModal}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-[#0b0f1a] border border-white/20 rounded-2xl
              p-6 w-full max-w-md space-y-4"
            >
              <h2 className="text-xl font-bold text-white">🎮 Enter Game IDs</h2>

              <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-3">
                <p className="text-sm text-blue-400 font-semibold">
                  {selectedTournament.name ?? selectedTournament.id}
                </p>
                <p className="text-xs text-gray-400 mt-1">
                  Type: {selectedTournament.type?.toUpperCase()} • Entry: ₹{selectedTournament.entryFee}
                </p>
              </div>

              <div className="space-y-3">
                {gameIds.map((id, index) => (
                  <div key={index}>
                    <label className="block text-sm text-gray-300 mb-1.5">
                      {index === 0 ? "Your Game ID" : `Player ${index + 1} Game ID`}
                      <span className="text-red-400 ml-1">*</span>
                    </label>
                    <input
                      type="text"
                      value={id}
                      onChange={(e) => updateGameId(index, e.target.value)}
                      placeholder={`Enter Game ID ${index + 1}`}
                      className="w-full bg-black border border-white/20 rounded-lg
                      px-4 py-2.5 text-white placeholder-gray-500
                      focus:border-blue-500 focus:outline-none"
                    />
                  </div>
                ))}
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  onClick={closeGameIdModal}
                  className="flex-1 bg-gray-700 hover:bg-gray-600 py-3 rounded-lg font-semibold"
                >
                  Cancel
                </button>
                <button
                  onClick={submitAndJoinTournament}
                  disabled={joiningId !== null}
                  className="flex-1 bg-blue-600 hover:bg-blue-500
                  disabled:bg-gray-600 disabled:cursor-not-allowed
                  py-3 rounded-lg font-semibold"
                >
                  {joiningId ? "Joining..." : "Submit & Join →"}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
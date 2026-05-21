"use client";

import { useEffect, useState } from "react";
import {
  collection, getDocs, doc, getDoc, runTransaction, serverTimestamp,
} from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";
import { auth, db } from "./firebase";
import { motion, AnimatePresence } from "framer-motion";
import BattleHubHero from "./components/BattleHubHero";

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
  prizes?: { first?: number; second?: number; third?: number; others?: number };
};

type MatchStatus = "upcoming" | "started" | "completed";
type FilterStatus = "all" | "upcoming" | "started" | "completed";

function getMatchStatus(t: Tournament): MatchStatus {
  if (t.prizesDistributed || t.status === "completed") return "completed";
  if (!t.matchDate || !t.matchTime) return "upcoming";
  const matchDT = new Date(`${t.matchDate}T${t.matchTime}:00`).getTime();
  const now = Date.now();
  if (now >= matchDT + 15 * 60 * 1000) return "completed";
  if (now >= matchDT) return "started";
  return "upcoming";
}

const STATUS_CONFIG = {
  upcoming: { label: "Upcoming", className: "badge badge-upcoming" },
  started: { label: "Live", className: "badge badge-started" },
  completed: { label: "Ended", className: "badge badge-completed" },
};

const TYPE_ICONS: Record<string, string> = {
  solo: "◈", duo: "◈◈", squad: "⬡", default: "◈",
};

function Countdown({ matchDate, matchTime }: { matchDate: string; matchTime: string }) {
  const [timeStr, setTimeStr] = useState("");

  useEffect(() => {
    const update = () => {
      const target = new Date(`${matchDate}T${matchTime}:00`).getTime();
      const diff = target - Date.now();
      if (diff <= 0) { setTimeStr(""); return; }
      const h = Math.floor(diff / 3600000);
      const m = Math.floor((diff % 3600000) / 60000);
      const s = Math.floor((diff % 60000) / 1000);
      setTimeStr(`${h > 0 ? `${h}h ` : ""}${m}m ${s}s`);
    };
    update();
    const id = setInterval(update, 1000);
    return () => clearInterval(id);
  }, [matchDate, matchTime]);

  if (!timeStr) return null;

  return (
    <div className="flex items-center gap-1.5">
      <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="text-[var(--accent-cyan)]">
        <circle cx="12" cy="12" r="10" />
        <polyline points="12 6 12 12 16 14" />
      </svg>
      <span className="text-[var(--accent-cyan)] font-ui font-600 text-xs tracking-wider">{timeStr}</span>
    </div>
  );
}

function TournamentCard({
  t, alreadyJoined, slot, joiningId, onJoin, openPrizeId, setOpenPrizeId,
}: {
  t: Tournament;
  alreadyJoined: boolean;
  slot: number;
  joiningId: string | null;
  onJoin: (t: Tournament) => void;
  openPrizeId: string | null;
  setOpenPrizeId: (id: string | null) => void;
}) {
  const status = getMatchStatus(t);
  const cfg = STATUS_CONFIG[status];
  const typeLabel = (t.type ?? "solo").toUpperCase();
  const typeIcon = TYPE_ICONS[(t.type ?? "solo").toLowerCase()] ?? TYPE_ICONS.default;
  const maxPlayers = t.maxPlayers ?? 50;
  const joinedPlayers = t.joinedPlayers ?? 0;
  const fillPct = Math.min((joinedPlayers / maxPlayers) * 100, 100);
  const isFull = joinedPlayers >= maxPlayers;
  const isStartedOrDone = status === "started" || status === "completed";
  const isJoining = joiningId === t.id;
  const joinDisabled = isFull || isStartedOrDone || isJoining;
  const isOpen = openPrizeId === t.id;

  const first = Math.round(t.prizes?.first ?? 0);
  const second = Math.round(t.prizes?.second ?? 0);
  const third = Math.round(t.prizes?.third ?? 0);
  const others = Math.round(t.prizes?.others ?? 0);

  const joinLabel = isJoining
    ? "Joining..."
    : status === "completed"
      ? "Battle Ended"
      : status === "started"
        ? "Battle Live"
        : isFull
          ? "Full"
          : "Join Battle";

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      transition={{ duration: 0.35, ease: [0.4, 0, 0.2, 1] }}
      className="battle-card corner-tl corner-br group"
    >
      <div className="card-accent-line" />
      <div className="p-5">

        <div className="flex items-start justify-between mb-4 gap-2">
          <span className="font-display text-[9px] font-700 tracking-[0.15em] text-[var(--accent-cyan)] bg-[rgba(0,212,255,0.06)] border border-[rgba(0,212,255,0.15)] px-2.5 py-1 rounded-sm uppercase">
            {typeIcon} {typeLabel}
          </span>
          <div className="flex items-center gap-1.5">
            {status === "started" && <span className="pulse-dot" />}
            <span className={cfg.className}>{cfg.label}</span>
          </div>
        </div>

        <h2 className="font-ui font-700 text-base text-[var(--text-primary)] mb-1 leading-tight">
          {t.name ?? t.id ?? "Tournament"}
        </h2>

        {t.matchDate && t.matchTime && (
          <div className="flex items-center justify-between mb-3">
            <span className="text-[var(--text-muted)] text-xs font-body">
              {t.matchDate} · {t.matchTime}
            </span>
            {status === "upcoming" && (
              <Countdown matchDate={t.matchDate} matchTime={t.matchTime} />
            )}
          </div>
        )}

        <div className="h-px bg-[var(--border-subtle)] mb-4" />

        <div className="grid grid-cols-2 gap-3 mb-4">
          <div className="bg-[var(--bg-deep)] rounded-lg p-3">
            <p className="text-[10px] font-ui font-600 uppercase tracking-wider text-[var(--text-muted)] mb-1">Entry</p>
            <p className="font-display text-sm text-[var(--text-primary)]">₹{t.entryFee ?? 0}</p>
          </div>
          <div className="bg-[var(--bg-deep)] rounded-lg p-3">
            <p className="text-[10px] font-ui font-600 uppercase tracking-wider text-[var(--text-muted)] mb-1">Prize Pool</p>
            <p className="font-display text-sm text-[var(--accent-gold)] glow-gold">₹{Math.round(t.prizePool ?? 0)}</p>
          </div>
        </div>

        <div className="mb-4">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-xs font-ui font-600 uppercase tracking-wide text-[var(--text-muted)]">Slots</span>
            <span className="text-xs font-ui text-[var(--text-secondary)]">
              <span className={fillPct >= 90 ? "text-[var(--accent-fire)]" : "text-[var(--accent-cyan)]"}>
                {joinedPlayers}
              </span>
              <span className="text-[var(--text-muted)]">/{maxPlayers}</span>
            </span>
          </div>
          <div className="slot-bar">
            <div className="slot-bar-fill" style={{ width: `${fillPct}%` }} />
          </div>
          {fillPct >= 90 && !isFull && (
            <p className="text-[10px] font-ui text-[var(--accent-fire)] mt-1 uppercase tracking-wide">Filling fast!</p>
          )}
        </div>

        <button
          onClick={() => setOpenPrizeId(isOpen ? null : t.id)}
          className="w-full flex items-center justify-between py-2.5 px-3 rounded-lg border border-[var(--border-subtle)] hover:border-[rgba(255,215,0,0.3)] bg-[var(--bg-deep)] hover:bg-[rgba(255,215,0,0.04)] transition-all mb-3"
        >
          <span className="text-xs font-ui font-600 uppercase tracking-wider text-[var(--accent-gold)]">
            🏆 Prize Breakdown
          </span>
          <svg
            width="12" height="12" viewBox="0 0 24 24"
            fill="none" stroke="currentColor" strokeWidth="2.5"
            className={`text-[var(--text-muted)] transition-transform duration-300 ${isOpen ? "rotate-180" : ""}`}
          >
            <polyline points="6 9 12 15 18 9" />
          </svg>
        </button>

        <AnimatePresence>
          {isOpen && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.25 }}
              className="overflow-hidden mb-3"
            >
              <div className="bg-[var(--bg-void)] border border-[rgba(255,215,0,0.1)] rounded-lg p-3">
                {[
                  { label: "🥇 1st Place", value: first, color: "#ffd700" },
                  { label: "🥈 2nd Place", value: second, color: "#c0c0c0" },
                  { label: "🥉 3rd Place", value: third, color: "#cd7f32" },
                  ...(others > 0 ? [{ label: "🎖 Others", value: others, color: "#8899aa" }] : []),
                ].map(({ label, value, color }) => (
                  <div key={label} className="prize-row">
                    <span style={{ color }} className="font-ui font-600 text-xs uppercase tracking-wide">{label}</span>
                    <span className="font-display text-xs" style={{ color }}>₹{value}</span>
                  </div>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {alreadyJoined ? (
          <div className="rounded-lg border border-[rgba(0,255,136,0.2)] bg-[rgba(0,255,136,0.04)] p-3 text-center">
            <p className="text-xs font-ui font-600 uppercase tracking-wider text-[var(--accent-green)] mb-1">✓ Registered</p>
            <p className="font-display text-base text-[var(--accent-cyan)]">Slot #{slot}</p>
          </div>
        ) : (
          <button
            onClick={() => { if (!joinDisabled) onJoin(t); }}
            disabled={joinDisabled}
            className={`w-full py-3 rounded-lg font-ui font-700 text-sm uppercase tracking-wider transition-all duration-200 ${joinDisabled
                ? "bg-[var(--bg-surface)] text-[var(--text-muted)] cursor-not-allowed"
                : "btn-fire text-white"
              }`}
          >
            {joinLabel}
          </button>
        )}

      </div>
    </motion.div>
  );
}

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
          const data = d.data() as Omit<Tournament, "id">;
          list.push({ ...data, id: d.id });
          if (user) {
            try {
              const pSnap = await getDoc(doc(db, "tournaments", d.id, "participants", user.uid));
              if (pSnap.exists()) {
                joined[d.id] = true;
                slots[d.id] = pSnap.data().slotNumber || pSnap.data().slot || 0;
              }
            } catch { }
          }
        }
        setTournaments(list);
        setJoinedMap(joined);
        setSlotMap(slots);
      } catch { }
      finally { setLoading(false); }
    };
    fetchTournaments();
  }, [user]);

  const todayMidnight = (() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d.getTime();
  })();

  const visible = tournaments.filter((t) => {
    if (!t.matchDate) return true;
    const d = new Date(t.matchDate);
    d.setHours(0, 0, 0, 0);
    return d.getTime() >= todayMidnight;
  });

  const filtered = visible.filter((t) => {
    const q = (t.name || t.id || "").toLowerCase().includes(searchQuery.toLowerCase());
    const s = statusFilter === "all" || getMatchStatus(t) === statusFilter;
    const tp = typeFilter === "all" || (t.type || "").toLowerCase() === typeFilter;
    return q && s && tp;
  });

  const counts = {
    all: visible.length,
    upcoming: visible.filter((t) => getMatchStatus(t) === "upcoming").length,
    started: visible.filter((t) => getMatchStatus(t) === "started").length,
    completed: visible.filter((t) => getMatchStatus(t) === "completed").length,
  };

  const openGameIdModal = (t: Tournament) => {
    if (!user) { alert("Please login first"); window.location.href = "/login"; return; }
    setSelectedTournament(t);
    const type = t.type?.toLowerCase() || "solo";
    setGameIds(type === "duo" ? ["", ""] : type === "squad" ? ["", "", "", ""] : [""]);
    setShowGameIdModal(true);
  };

  const closeModal = () => {
    setShowGameIdModal(false);
    setSelectedTournament(null);
    setGameIds([""]);
  };

  const submitAndJoin = async () => {
    if (!selectedTournament || !user) return;
    for (let i = 0; i < gameIds.length; i++) {
      if (!gameIds[i]?.trim()) { alert(`Please enter Game ID ${i + 1}`); return; }
    }
    if (joiningId) return;
    if (getMatchStatus(selectedTournament) !== "upcoming") {
      alert("This match has already started.");
      closeModal();
      return;
    }
    setJoiningId(selectedTournament.id);
    const tRef = doc(db, "tournaments", selectedTournament.id);
    const pRef = doc(db, "tournaments", selectedTournament.id, "participants", user.uid);
    try {
      let assignedSlot = 0;
      await runTransaction(db, async (tx) => {
        const tSnap = await tx.get(tRef);
        if (!tSnap.exists()) throw new Error("Tournament not found");
        const data = tSnap.data();
        if (data.prizesDistributed || data.status === "completed") throw new Error("Tournament already completed");
        if (Date.now() >= new Date(`${data.matchDate}T${data.matchTime}:00`).getTime()) throw new Error("Match started. Cannot join.");
        if (data.joinedPlayers >= data.maxPlayers) throw new Error("Tournament is full");
        const pSnap = await tx.get(pRef);
        if (pSnap.exists()) throw new Error("Already joined");
        assignedSlot = data.joinedPlayers + 1;
        tx.set(pRef, {
          uid: user.uid,
          userName: user.displayName || "Player",
          userEmail: user.email,
          slotNumber: assignedSlot,
          gameIds,
          joinedAt: serverTimestamp(),
        });
        tx.update(tRef, { joinedPlayers: assignedSlot });
      });
      setJoinedMap((p) => ({ ...p, [selectedTournament.id]: true }));
      setSlotMap((p) => ({ ...p, [selectedTournament.id]: assignedSlot }));
      setTournaments((p) =>
        p.map((t) =>
          t.id === selectedTournament.id
            ? { ...t, joinedPlayers: (t.joinedPlayers || 0) + 1 }
            : t
        )
      );
      closeModal();
      alert(`✅ Joined! Your Slot: #${assignedSlot}`);
    } catch (err: any) {
      alert(err.message || "Join failed");
    } finally {
      setJoiningId(null);
    }
  };

  if (loading) {
    return (
      <>
        <BattleHubHero />
        <div className="min-h-screen relative z-10 p-4 sm:p-6">
          <div className="max-w-7xl mx-auto">
            <div className="skeleton h-10 w-64 mb-2" />
            <div className="skeleton h-5 w-48 mb-8" />
            <div className="grid gap-4 sm:gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <div key={i} className="skeleton h-80" />
              ))}
            </div>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <BattleHubHero />

      <div id="tournaments" className="min-h-screen relative z-10 p-4 sm:p-6 pb-16">
        <div className="max-w-7xl mx-auto">

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-8 pt-2"
          >
            <div className="flex items-baseline gap-3 mb-1">
              <h1 className="font-display text-3xl sm:text-4xl font-900 text-[var(--text-primary)] tracking-tight">
                TOURNAMENTS
              </h1>
              <span className="font-ui font-700 text-xs uppercase tracking-widest text-[var(--accent-fire)] glow-fire">
                {counts.started > 0 ? `${counts.started} Live` : `${counts.upcoming} Upcoming`}
              </span>
            </div>
            <p className="text-[var(--text-secondary)] font-body text-sm">
              No Risk No Victory — Enter the arena.
            </p>
            <div className="mt-4 h-px w-full bg-gradient-to-r from-[var(--accent-fire)] via-[var(--accent-cyan)] to-transparent opacity-30" />
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.08 }}
            className="mb-5"
          >
            <div className="relative">
              <svg
                className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--text-muted)]"
                width="14" height="14" viewBox="0 0 24 24"
                fill="none" stroke="currentColor" strokeWidth="2"
              >
                <circle cx="11" cy="11" r="8" />
                <line x1="21" y1="21" x2="16.65" y2="16.65" />
              </svg>
              <input
                type="text"
                placeholder="Search tournaments..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="battle-input w-full pl-10 pr-4 py-3 rounded-lg text-sm font-body"
              />
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.12 }}
            className="mb-7 space-y-3"
          >
            <div className="flex flex-wrap gap-2">
              {([
                { key: "all", label: `All · ${counts.all}` },
                { key: "upcoming", label: `Upcoming · ${counts.upcoming}` },
                { key: "started", label: `Live · ${counts.started}` },
                { key: "completed", label: `Ended · ${counts.completed}` },
              ] as const).map(({ key, label }) => (
                <button
                  key={key}
                  onClick={() => setStatusFilter(key)}
                  className={`filter-pill ${statusFilter === key ? `active-${key}` : ""}`}
                >
                  {label}
                </button>
              ))}
            </div>
            <div className="flex flex-wrap gap-2">
              {([
                { key: "all", label: "All Modes" },
                { key: "solo", label: "◈ Solo" },
                { key: "duo", label: "◈◈ Duo" },
                { key: "squad", label: "⬡ Squad" },
              ] as const).map(({ key, label }) => (
                <button
                  key={key}
                  onClick={() => setTypeFilter(key)}
                  className={`filter-pill ${typeFilter === key ? "active-type" : ""}`}
                >
                  {label}
                </button>
              ))}
            </div>
          </motion.div>

          <div className="flex items-center justify-between mb-5">
            <p className="text-xs font-ui font-600 uppercase tracking-widest text-[var(--text-muted)]">
              {filtered.length} Battle{filtered.length !== 1 ? "s" : ""} Found
            </p>
            {counts.started > 0 && (
              <div className="flex items-center gap-1.5">
                <span className="pulse-dot" />
                <span className="text-xs font-ui font-600 uppercase tracking-wider text-[var(--accent-fire)]">
                  {counts.started} Live Now
                </span>
              </div>
            )}
          </div>

          {filtered.length === 0 ? (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="battle-card p-16 text-center"
            >
              <div className="font-display text-4xl mb-4 opacity-20">⬡</div>
              <p className="font-ui font-700 text-base uppercase tracking-wider text-[var(--text-secondary)]">
                No Battles Found
              </p>
              <p className="text-xs text-[var(--text-muted)] mt-2 font-body">
                Adjust your filters or check back soon
              </p>
            </motion.div>
          ) : (
            <motion.div
              layout
              className="grid gap-4 sm:gap-5 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3"
            >
              <AnimatePresence mode="popLayout">
                {filtered.map((t) => (
                  <TournamentCard
                    key={t.id}
                    t={t}
                    alreadyJoined={joinedMap[t.id] || false}
                    slot={slotMap[t.id] || 0}
                    joiningId={joiningId}
                    onJoin={openGameIdModal}
                    openPrizeId={openPrizeId}
                    setOpenPrizeId={setOpenPrizeId}
                  />
                ))}
              </AnimatePresence>
            </motion.div>
          )}

        </div>

        <AnimatePresence>
          {showGameIdModal && selectedTournament && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 modal-overlay z-50 flex items-center justify-center p-4"
              onClick={closeModal}
            >
              <motion.div
                initial={{ scale: 0.92, opacity: 0, y: 16 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                exit={{ scale: 0.92, opacity: 0, y: 16 }}
                transition={{ type: "spring", stiffness: 300, damping: 25 }}
                onClick={(e) => e.stopPropagation()}
                className="battle-card w-full max-w-md overflow-hidden"
              >
                <div className="h-1 w-full bg-gradient-to-r from-[var(--accent-fire)] via-[var(--accent-cyan)] to-transparent" />
                <div className="p-6 space-y-5">
                  <div>
                    <h2 className="font-display text-lg text-[var(--text-primary)] mb-1">Enter Game IDs</h2>
                    <p className="text-xs font-body text-[var(--text-muted)]">Required to register for the tournament</p>
                  </div>
                  <div className="bg-[var(--bg-deep)] border border-[var(--border-subtle)] rounded-lg p-3">
                    <p className="font-ui font-700 text-sm text-[var(--text-primary)]">
                      {selectedTournament.name ?? selectedTournament.id}
                    </p>
                    <div className="flex items-center gap-3 mt-1">
                      <span className="text-xs font-ui text-[var(--accent-cyan)] uppercase tracking-wider">
                        {selectedTournament.type?.toUpperCase()}
                      </span>
                      <span className="text-xs text-[var(--text-muted)]">·</span>
                      <span className="text-xs font-ui text-[var(--text-secondary)]">
                        Entry ₹{selectedTournament.entryFee}
                      </span>
                    </div>
                  </div>
                  <div className="space-y-3">
                    {gameIds.map((id, index) => (
                      <div key={index}>
                        <label className="block text-xs font-ui font-600 uppercase tracking-wider text-[var(--text-secondary)] mb-1.5">
                          {index === 0 ? "Your Game ID" : `Player ${index + 1} Game ID`}
                          <span className="text-[var(--accent-fire)] ml-1">*</span>
                        </label>
                        <input
                          type="text"
                          value={id}
                          onChange={(e) => {
                            const ids = [...gameIds];
                            ids[index] = e.target.value.trim();
                            setGameIds(ids);
                          }}
                          placeholder={`Game ID ${index + 1}`}
                          className="battle-input w-full px-4 py-2.5 rounded-lg text-sm font-body"
                        />
                      </div>
                    ))}
                  </div>
                  <div className="flex gap-3">
                    <button
                      onClick={closeModal}
                      className="flex-1 py-3 rounded-lg font-ui font-700 text-sm uppercase tracking-wider btn-cyan border border-[var(--border-subtle)]"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={submitAndJoin}
                      disabled={joiningId !== null}
                      className="flex-1 py-3 rounded-lg font-ui font-700 text-sm uppercase tracking-wider btn-fire text-white disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {joiningId ? "Joining..." : "Confirm →"}
                    </button>
                  </div>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

      </div>
    </>
  );
}
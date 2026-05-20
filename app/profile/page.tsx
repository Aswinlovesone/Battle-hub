"use client";

import { useEffect, useState } from "react";
import {
    onAuthStateChanged,
    signOut,
    updateProfile,
} from "firebase/auth";
import {
    doc,
    getDoc,
    setDoc,
    addDoc,
    collection,
    serverTimestamp,
} from "firebase/firestore";
import { auth, db } from "../firebase";
import { motion } from "framer-motion";
import Link from "next/link";

/* 🔐 ADMIN EMAIL */
const ADMIN_EMAIL = "battlehubsofficial@gmail.com";

/* ---------------- TYPES ---------------- */

type Role = "player" | "influencer" | "admin";

type InfluencerWallet = {
    totalEarnings: number;
    available: number;
    withdrawn: number;
};

type PlayerWallet = {
    balance: number;
};

/* ---------------- COMPONENT ---------------- */

export default function ProfilePage() {
    const [user, setUser] = useState<any>(null);
    const [role, setRole] = useState<Role>("player");
    const [loading, setLoading] = useState(true);

    /* ✏️ PROFILE EDIT */
    const [name, setName] = useState("");
    const [photo, setPhoto] = useState("");

    /* 💰 WALLETS */
    const [playerWallet, setPlayerWallet] = useState<PlayerWallet | null>(null);
    const [influencerWallet, setInfluencerWallet] =
        useState<InfluencerWallet | null>(null);

    const [addAmount, setAddAmount] = useState(0);
    const [withdrawAmount, setWithdrawAmount] = useState(0);

    /* ---------------- AUTH + ROLE ---------------- */

    useEffect(() => {
        const unsub = onAuthStateChanged(auth, async (u) => {
            if (!u) {
                window.location.href = "/login";
                return;
            }

            setUser(u);
            setName(u.displayName || "");
            setPhoto(u.photoURL || "");

            /* 👑 ADMIN */
            if (u.email === ADMIN_EMAIL) {
                setRole("admin");
                setLoading(false);
                return;
            }

            /* 🎥 INFLUENCER CHECK */
            const influencerSnap = await getDoc(
                doc(db, "influencers", u.email!)
            );

            if (influencerSnap.exists()) {
                setRole("influencer");

                const walletRef = doc(db, "influencerWallets", u.uid);
                const walletSnap = await getDoc(walletRef);

                setInfluencerWallet(
                    walletSnap.exists()
                        ? (walletSnap.data() as InfluencerWallet)
                        : { totalEarnings: 0, available: 0, withdrawn: 0 }
                );

                setLoading(false);
                return;
            }

            /* 🎮 PLAYER */
            setRole("player");

            const walletRef = doc(db, "playerWallets", u.uid);
            const walletSnap = await getDoc(walletRef);

            if (!walletSnap.exists()) {
                await setDoc(walletRef, {
                    balance: 0,
                    createdAt: serverTimestamp(),
                });
                setPlayerWallet({ balance: 0 });
            } else {
                setPlayerWallet(walletSnap.data() as PlayerWallet);
            }

            setLoading(false);
        });

        return () => unsub();
    }, []);

    /* ---------------- SAVE PROFILE ---------------- */

    const saveProfile = async () => {
        if (!user || !name.trim()) {
            alert("Name cannot be empty");
            return;
        }

        try {
            await updateProfile(user, {
                displayName: name,
                photoURL: photo,
            });

            await setDoc(
                doc(db, "users", user.uid),
                {
                    uid: user.uid,
                    name,
                    email: user.email,
                    photo,
                },
                { merge: true }
            );

            alert("Profile updated ✅");
        } catch (e) {
            console.error(e);
            alert("Profile update failed ❌");
        }
    };

    /* ---------------- PLAYER WALLET ---------------- */

    const requestAddMoney = async () => {
        if (addAmount <= 0) return alert("Enter valid amount");

        try {
            // ✅ SECURED: Create pending request (NO instant credit!)
            await addDoc(collection(db, "walletTransactions"), {
                uid: user.uid,
                role: "player",
                type: "add",
                direction: "credit",
                amount: addAmount,
                status: "pending", // ✅ ADMIN APPROVAL REQUIRED
                reference: "Add money request",
                requestedAt: serverTimestamp(),
            });

            alert("✅ Request sent to admin! Balance will update after approval.");
            setAddAmount(0);
        } catch (err) {
            console.error(err);
            alert("❌ Request failed");
        }
    };

    const requestWithdrawMoney = async () => {
        if (withdrawAmount <= 0)
            return alert("Enter valid amount");
        if (withdrawAmount > playerWallet!.balance)
            return alert("Insufficient balance");

        try {
            await addDoc(collection(db, "walletTransactions"), {
                uid: user.uid,
                role: "player",
                type: "withdraw",
                direction: "debit",
                amount: withdrawAmount,
                status: "pending", // ❗ admin approval needed
                reference: "Withdraw request",
                balanceAfter: playerWallet!.balance,
                createdAt: serverTimestamp(),
            });

            alert("Withdraw request sent to admin ⏳");
            setWithdrawAmount(0);
        } catch (err) {
            console.error(err);
            alert("❌ Request failed");
        }
    };

    /* ---------------- LOGOUT ---------------- */

    const handleLogout = async () => {
        if (!confirm("Logout?")) return;
        await signOut(auth);
        window.location.href = "/";
    };

    if (loading) {
        return (
            <div className="p-6 text-white text-center">
                Loading profile…
            </div>
        );
    }

    /* ---------------- UI ---------------- */

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="p-6 max-w-3xl mx-auto text-white space-y-8"
        >
            {/* 👤 PROFILE */}
            <section className="bg-[#0b0f1a] border border-white/10 rounded-xl p-5 space-y-4">
                <h1 className="text-xl font-bold">👤 Profile</h1>

                <div className="flex items-center gap-4">
                    <img
                        src={photo || "/avatar.png"}
                        alt="Profile"
                        className="w-20 h-20 rounded-full border border-white/20"
                    />
                    <input
                        value={photo}
                        onChange={(e) => setPhoto(e.target.value)}
                        placeholder="Avatar image URL"
                        className="flex-1 bg-black border border-white/10 rounded px-3 py-2"
                    />
                </div>

                <input
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Display name"
                    className="w-full bg-black border border-white/10 rounded px-3 py-2"
                />

                <button
                    onClick={saveProfile}
                    className="bg-blue-600 hover:bg-blue-500 px-4 py-2 rounded"
                >
                    Save Profile
                </button>
            </section>

            {/* 🎮 PLAYER WALLET */}
            {role === "player" && playerWallet && (
                <section className="bg-[#0b0f1a] border border-white/10 rounded-xl p-5 space-y-3">
                    <h2 className="font-semibold">💰 Player Wallet</h2>

                    <p className="text-2xl font-bold text-green-400">
                        ₹{playerWallet.balance}
                    </p>

                    <input
                        type="number"
                        placeholder="Add amount"
                        value={addAmount}
                        onChange={(e) => setAddAmount(Number(e.target.value))}
                        className="w-full bg-black border border-white/10 rounded px-3 py-2"
                    />
                    <button
                        onClick={requestAddMoney}
                        className="w-full bg-blue-600 hover:bg-blue-500 py-2 rounded"
                    >
                        Add Moneygit add .
                    </button>

                    <input
                        type="number"
                        placeholder="Withdraw amount"
                        value={withdrawAmount}
                        onChange={(e) =>
                            setWithdrawAmount(Number(e.target.value))
                        }
                        className="w-full bg-black border border-white/10 rounded px-3 py-2"
                    />
                    <button
                        onClick={requestWithdrawMoney}
                        className="w-full bg-red-600 hover:bg-red-500 py-2 rounded"
                    >
                        Request Withdraw
                    </button>
                </section>
            )}

            {/* 🎥 INFLUENCER WALLET */}
            {role === "influencer" && influencerWallet && (
                <section className="bg-[#0b0f1a] border border-white/10 rounded-xl p-5 space-y-4">
                    <h2 className="font-semibold">💰 Influencer Wallet</h2>

                    <div className="grid grid-cols-3 gap-4">
                        <WalletCard title="Total" value={`₹${influencerWallet.totalEarnings}`} />
                        <WalletCard title="Available" value={`₹${influencerWallet.available}`} />
                        <WalletCard title="Withdrawn" value={`₹${influencerWallet.withdrawn}`} />
                    </div>

                    {/* ✅ NEW: INFLUENCER DASHBOARD LINK */}
                    <Link
                        href="/influencer/dashboard"
                        className="block w-full bg-gradient-to-r from-purple-600 to-pink-600
                        hover:from-purple-500 hover:to-pink-500
                        text-white text-center font-semibold
                        py-3 rounded-xl
                        transition-all duration-200
                        shadow-lg hover:shadow-purple-500/50
                        active:scale-[0.98]"
                    >
                        🎥 Go to Influencer Dashboard →
                    </Link>
                </section>
            )}

            {/* 👑 ADMIN */}
            {role === "admin" && (
                <Link
                    href="/admin/dashboard"
                    className="block bg-yellow-500 hover:bg-yellow-400 
                    text-black text-center font-semibold
                    py-3 rounded-xl
                    transition-all duration-200"
                >
                    👑 Go to Admin Dashboard →
                </Link>
            )}

            <button
                onClick={handleLogout}
                className="w-full bg-red-600 hover:bg-red-500 py-3 rounded-xl font-semibold"
            >
                Logout
            </button>
        </motion.div>
    );
}

/* ---------------- SMALL CARD ---------------- */

function WalletCard({ title, value }: { title: string; value: string }) {
    return (
        <div className="bg-black/40 border border-white/10 rounded-xl p-3">
            <p className="text-xs text-gray-400">{title}</p>
            <p className="text-lg font-bold text-green-400">{value}</p>
        </div>
    );
}
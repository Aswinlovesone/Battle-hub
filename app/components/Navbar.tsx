"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { onAuthStateChanged, User } from "firebase/auth";
import { doc, onSnapshot, getDoc } from "firebase/firestore";
import { auth, db } from "../firebase";

/* 🔐 ADMIN EMAIL */
const ADMIN_EMAIL = "battlehubsofficial@gmail.com";

export default function Navbar() {
    const pathname = usePathname();
    const [user, setUser] = useState<User | null>(null);
    const [loading, setLoading] = useState(true);
    const [walletBalance, setWalletBalance] = useState<number>(0);
    const [isInfluencer, setIsInfluencer] = useState(false);
    const [isAdmin, setIsAdmin] = useState(false);

    /* 🔐 AUTH LISTENER */
    useEffect(() => {
        const unsub = onAuthStateChanged(auth, async (currentUser) => {
            setUser(currentUser);

            if (currentUser && currentUser.email) {
                try {
                    // ✅ Check if user is super admin
                    const isSuperAdmin = currentUser.email === ADMIN_EMAIL;

                    // ✅ Check if user is in admins collection
                    const adminRef = doc(db, "admins", currentUser.email);
                    const adminSnap = await getDoc(adminRef);
                    const isInAdminList = adminSnap.exists();

                    // User is admin if either super admin OR in admins collection
                    setIsAdmin(isSuperAdmin || isInAdminList);

                    // ✅ Check if user is influencer (only if not admin)
                    if (!isSuperAdmin && !isInAdminList) {
                        const influencerRef = doc(db, "influencers", currentUser.email);
                        const influencerSnap = await getDoc(influencerRef);
                        setIsInfluencer(influencerSnap.exists());
                    } else {
                        setIsInfluencer(false);
                    }
                } catch (err) {
                    console.error("Error checking user roles:", err);
                    setIsInfluencer(false);
                    setIsAdmin(false);
                }
            } else {
                setIsInfluencer(false);
                setIsAdmin(false);
            }

            setLoading(false);
        });
        return () => unsub();
    }, []);

    /* 💰 WALLET LISTENER (Real-time) - Only for Players and Influencers */
    useEffect(() => {
        if (!user || isAdmin) {
            // Don't fetch wallet for admin or logged out users
            setWalletBalance(0);
            return;
        }

        // Real-time wallet balance listener
        const walletRef = doc(db, "playerWallets", user.uid);
        const unsubWallet = onSnapshot(
            walletRef,
            (snapshot) => {
                if (snapshot.exists()) {
                    const data = snapshot.data();
                    setWalletBalance(data.balance || 0);
                } else {
                    setWalletBalance(0);
                }
            },
            (error) => {
                console.error("Wallet fetch error:", error);
                setWalletBalance(0);
            }
        );

        return () => unsubWallet();
    }, [user, isAdmin]);

    /* ✨ ACTIVE GLOW CLASS */
    const navClass = (path: string) =>
        pathname === path
            ? `
              text-blue-400 font-semibold
              drop-shadow-[0_0_10px_rgba(59,130,246,0.9)]
              transition-all duration-300
            `
            : `
              text-gray-300 hover:text-white
              transition-all duration-200
            `;

    return (
        <nav
            className="sticky top-0 z-50 flex items-center justify-between
            px-4 sm:px-6 py-4
            border-b border-gray-800
            bg-black/80 backdrop-blur-md"
        >
            {/* LOGO */}
            <Link
                href="/"
                className="text-xl font-bold text-blue-500
                drop-shadow-[0_0_12px_rgba(59,130,246,0.6)]"
            >
                🏆 Battle Hub
            </Link>

            {/* LINKS */}
            <div className="flex items-center gap-4 sm:gap-6">

                {/* HOME - Show for everyone */}
                <Link href="/" className={navClass("/")}>
                    Home
                </Link>

                {/* MY TOURNAMENTS - Show for all logged in users */}
                {!loading && user && (
                    <Link
                        href="/my-tournaments"
                        className={navClass("/my-tournaments")}
                    >
                        My Tournaments
                    </Link>
                )}

                {/* WALLET BALANCE - Only for Players and Influencers (Not Admins) */}
                {!loading && user && !isAdmin && (
                    <Link
                        href="/profile"
                        className="flex items-center gap-1.5
                        bg-gradient-to-r from-green-600/20 to-emerald-600/20
                        border border-green-500/30
                        hover:border-green-500/60
                        px-3 py-1.5 rounded-lg
                        transition-all duration-200
                        hover:scale-105"
                    >
                        <span className="text-green-400 text-lg">💰</span>
                        <span className="text-green-400 font-semibold text-sm">
                            ₹{walletBalance.toLocaleString()}
                        </span>
                    </Link>
                )}

                {/* PROFILE - Show for all logged in users */}
                {!loading && user && (
                    <Link
                        href="/profile"
                        className={navClass("/profile")}
                    >
                        Profile
                    </Link>
                )}

                {/* INFLUENCER DASHBOARD - Only for Influencers */}
                {!loading && user && isInfluencer && (
                    <Link
                        href="/influencer/dashboard"
                        className={navClass("/influencer/dashboard")}
                    >
                        Influencer
                    </Link>
                )}

                {/* ADMIN DASHBOARD - Only for Admins */}
                {!loading && user && isAdmin && (
                    <Link
                        href="/admin/dashboard"
                        className={navClass("/admin/dashboard")}
                    >
                        Admin
                    </Link>
                )}

                {/* LOGIN - Only when not logged in */}
                {!loading && !user && (
                    <Link
                        href="/login"
                        className="bg-blue-500 hover:bg-blue-600
                        text-black font-semibold px-4 py-2 rounded-lg
                        drop-shadow-[0_0_10px_rgba(59,130,246,0.6)]"
                    >
                        Login
                    </Link>
                )}
            </div>
        </nav>
    );
}
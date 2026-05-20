"use client";

import { useEffect, useState, useRef } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { onAuthStateChanged, User } from "firebase/auth";
import { doc, onSnapshot, getDoc } from "firebase/firestore";
import { auth, db } from "../firebase";

const ADMIN_EMAIL = "battlehubsofficial@gmail.com";

export default function Navbar() {
    const pathname = usePathname();
    const [user, setUser] = useState<User | null>(null);
    const [loading, setLoading] = useState(true);
    const [walletBalance, setWalletBalance] = useState<number>(0);
    const [isInfluencer, setIsInfluencer] = useState(false);
    const [isAdmin, setIsAdmin] = useState(false);
    const [mobileOpen, setMobileOpen] = useState(false);
    const [scrolled, setScrolled] = useState(false);
    const mobileMenuRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleScroll = () => setScrolled(window.scrollY > 20);
        window.addEventListener("scroll", handleScroll, { passive: true });
        return () => window.removeEventListener("scroll", handleScroll);
    }, []);

    useEffect(() => {
        const unsub = onAuthStateChanged(auth, async (currentUser) => {
            setUser(currentUser);
            if (currentUser?.email) {
                try {
                    const isSuperAdmin = currentUser.email === ADMIN_EMAIL;
                    const adminSnap = await getDoc(doc(db, "admins", currentUser.email));
                    const isInAdminList = adminSnap.exists();
                    setIsAdmin(isSuperAdmin || isInAdminList);
                    if (!isSuperAdmin && !isInAdminList) {
                        const influencerSnap = await getDoc(doc(db, "influencers", currentUser.email));
                        setIsInfluencer(influencerSnap.exists());
                    } else {
                        setIsInfluencer(false);
                    }
                } catch (err) {
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

    useEffect(() => {
        if (!user || isAdmin) { setWalletBalance(0); return; }
        const walletRef = doc(db, "playerWallets", user.uid);
        const unsub = onSnapshot(walletRef, (snap) => {
            setWalletBalance(snap.exists() ? snap.data().balance || 0 : 0);
        }, () => setWalletBalance(0));
        return () => unsub();
    }, [user, isAdmin]);

    const isActive = (path: string) => pathname === path;

    const NavLink = ({ href, label }: { href: string; label: string }) => (
        <Link href={href} onClick={() => setMobileOpen(false)}
            className={`relative font-ui font-semibold text-sm uppercase tracking-wider transition-all duration-200 group ${isActive(href)
                    ? "text-[var(--accent-cyan)]"
                    : "text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                }`}
        >
            {label}
            <span className={`absolute -bottom-1 left-0 h-px bg-[var(--accent-cyan)] transition-all duration-300 ${isActive(href) ? "w-full" : "w-0 group-hover:w-full"
                }`} />
            {isActive(href) && (
                <span className="absolute -bottom-1 left-0 w-full h-px bg-[var(--accent-cyan)] blur-sm opacity-70" />
            )}
        </Link>
    );

    return (
        <>
            <nav className={`sticky top-0 z-50 transition-all duration-300 ${scrolled
                    ? "bg-[rgba(2,4,7,0.95)] border-b border-[var(--border-subtle)] shadow-[0_4px_30px_rgba(0,0,0,0.5)]"
                    : "bg-[rgba(2,4,7,0.7)] border-b border-transparent"
                } backdrop-blur-xl`}>
                <div className="max-w-7xl mx-auto px-4 sm:px-6">
                    <div className="flex items-center justify-between h-16">

                        {/* LOGO */}
                        <Link href="/" className="flex items-center gap-2.5 group">
                            <div className="relative">
                                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[var(--accent-fire)] to-[#ff8c00] flex items-center justify-center shadow-[0_0_15px_var(--accent-fire-glow)]">
                                    <svg width="16" height="16" viewBox="0 0 24 24" fill="white">
                                        <path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z" />
                                    </svg>
                                </div>
                                <div className="absolute inset-0 rounded-lg bg-[var(--accent-fire)] blur-md opacity-30 group-hover:opacity-50 transition-opacity" />
                            </div>
                            <div className="flex flex-col leading-none">
                                <span className="font-display text-sm font-700 text-[var(--text-primary)] tracking-widest uppercase">
                                    Battle
                                </span>
                                <span className="font-display text-[10px] font-400 text-[var(--accent-cyan)] tracking-[0.2em] uppercase">
                                    Hub
                                </span>
                            </div>
                        </Link>

                        {/* DESKTOP NAV */}
                        <div className="hidden md:flex items-center gap-7">
                            <NavLink href="/" label="Home" />
                            {!loading && user && <NavLink href="/my-tournaments" label="My Battles" />}
                            {!loading && user && isInfluencer && <NavLink href="/influencer/dashboard" label="Influencer" />}
                            {!loading && user && isAdmin && <NavLink href="/admin/dashboard" label="Admin" />}
                        </div>

                        {/* RIGHT SECTION */}
                        <div className="hidden md:flex items-center gap-3">
                            {/* WALLET */}
                            {!loading && user && !isAdmin && (
                                <Link href="/profile"
                                    className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-[rgba(0,255,136,0.2)] bg-[rgba(0,255,136,0.05)] hover:bg-[rgba(0,255,136,0.1)] hover:border-[rgba(0,255,136,0.4)] transition-all duration-200 group"
                                >
                                    <span className="text-xs font-ui font-600 uppercase tracking-wider text-[var(--accent-green)] opacity-60 group-hover:opacity-100">₹</span>
                                    <span className="text-sm font-ui font-700 text-[var(--accent-green)]">
                                        {walletBalance.toLocaleString()}
                                    </span>
                                </Link>
                            )}

                            {/* PROFILE */}
                            {!loading && user && (
                                <Link href="/profile"
                                    className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[var(--bg-card)] border border-[var(--border-subtle)] hover:border-[var(--border-active)] transition-all duration-200 group"
                                >
                                    <div className="w-6 h-6 rounded-full bg-gradient-to-br from-[var(--accent-cyan)] to-[#0066ff] flex items-center justify-center text-[10px] font-bold text-[var(--bg-void)]">
                                        {user.displayName?.[0]?.toUpperCase() || user.email?.[0]?.toUpperCase() || "P"}
                                    </div>
                                    <span className="text-xs font-ui font-600 text-[var(--text-secondary)] group-hover:text-[var(--text-primary)] uppercase tracking-wide transition-colors">
                                        {user.displayName?.split(" ")[0] || "Profile"}
                                    </span>
                                </Link>
                            )}

                            {/* LOGIN */}
                            {!loading && !user && (
                                <Link href="/login"
                                    className="btn-fire px-5 py-2 rounded-lg text-sm font-ui font-700 uppercase tracking-wider text-white"
                                >
                                    Login
                                </Link>
                            )}
                        </div>

                        {/* MOBILE HAMBURGER */}
                        <button
                            className="md:hidden flex flex-col gap-1.5 p-2 rounded-lg hover:bg-[var(--bg-card)] transition-colors"
                            onClick={() => setMobileOpen(!mobileOpen)}
                            aria-label="Toggle menu"
                        >
                            <span className={`block w-5 h-0.5 bg-[var(--text-primary)] transition-all duration-300 ${mobileOpen ? "rotate-45 translate-y-2" : ""}`} />
                            <span className={`block w-5 h-0.5 bg-[var(--text-primary)] transition-all duration-300 ${mobileOpen ? "opacity-0" : ""}`} />
                            <span className={`block w-5 h-0.5 bg-[var(--text-primary)] transition-all duration-300 ${mobileOpen ? "-rotate-45 -translate-y-2" : ""}`} />
                        </button>
                    </div>
                </div>

                {/* MOBILE MENU */}
                <div className={`md:hidden overflow-hidden transition-all duration-300 ${mobileOpen ? "max-h-96" : "max-h-0"}`}>
                    <div className="px-4 pb-4 pt-2 border-t border-[var(--border-subtle)] space-y-1 bg-[rgba(2,4,7,0.98)]">
                        {[
                            { href: "/", label: "Home", show: true },
                            { href: "/my-tournaments", label: "My Battles", show: !loading && !!user },
                            { href: "/profile", label: "Profile", show: !loading && !!user },
                            { href: "/influencer/dashboard", label: "Influencer", show: !loading && !!user && isInfluencer },
                            { href: "/admin/dashboard", label: "Admin", show: !loading && !!user && isAdmin },
                        ].filter(item => item.show).map(({ href, label }) => (
                            <Link key={href} href={href} onClick={() => setMobileOpen(false)}
                                className={`block px-4 py-3 rounded-lg font-ui font-600 text-sm uppercase tracking-wider transition-all ${isActive(href)
                                        ? "bg-[rgba(0,212,255,0.08)] text-[var(--accent-cyan)] border-l-2 border-[var(--accent-cyan)]"
                                        : "text-[var(--text-secondary)] hover:bg-[var(--bg-card)] hover:text-[var(--text-primary)]"
                                    }`}
                            >
                                {label}
                            </Link>
                        ))}

                        {!loading && user && !isAdmin && (
                            <div className="flex items-center gap-2 px-4 py-3 rounded-lg bg-[rgba(0,255,136,0.05)] border border-[rgba(0,255,136,0.15)]">
                                <span className="text-xs font-ui text-[var(--accent-green)] uppercase tracking-wider">Wallet</span>
                                <span className="text-sm font-ui font-700 text-[var(--accent-green)] ml-auto">₹{walletBalance.toLocaleString()}</span>
                            </div>
                        )}

                        {!loading && !user && (
                            <Link href="/login" onClick={() => setMobileOpen(false)}
                                className="block text-center btn-fire px-4 py-3 rounded-lg font-ui font-700 text-sm uppercase tracking-wider text-white"
                            >
                                Login to Battle
                            </Link>
                        )}
                    </div>
                </div>
            </nav>
        </>
    );
}
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
    collection,
    getDocs,
    doc,
    setDoc,
    deleteDoc,
    serverTimestamp,
} from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";
import { auth, db } from "../../firebase";
import { motion } from "framer-motion";

/* 🔐 SUPER ADMIN EMAIL */
const SUPER_ADMIN_EMAIL = "battlehubsofficial@gmail.com";

/* ---------------- TYPES ---------------- */

type Admin = {
    email: string;
    role: string;
    permissions: {
        approveWallets: boolean;
        distributePrizes: boolean;
        manageTournaments: boolean;
        manageInfluencers: boolean;
    };
    addedBy: string;
    createdAt: any;
};

/* ---------------- COMPONENT ---------------- */

export default function ManageAdminsPage() {
    const router = useRouter();
    const [user, setUser] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [admins, setAdmins] = useState<Admin[]>([]);

    const [newAdminEmail, setNewAdminEmail] = useState("");
    const [adding, setAdding] = useState(false);

    /* 🔐 AUTH CHECK - SUPER ADMIN ONLY */
    useEffect(() => {
        const unsub = onAuthStateChanged(auth, (currentUser) => {
            if (!currentUser) {
                alert("Please login first");
                router.push("/login");
                return;
            }

            // Only super admin can access this page
            if (currentUser.email !== SUPER_ADMIN_EMAIL) {
                alert("Access denied: Super Admin only");
                router.push("/admin/dashboard");
                return;
            }

            setUser(currentUser);
            fetchAdmins();
        });

        return () => unsub();
    }, [router]);

    /* 📥 FETCH ADMINS */
    const fetchAdmins = async () => {
        try {
            const adminsSnap = await getDocs(collection(db, "admins"));
            const list: Admin[] = [];

            adminsSnap.forEach((d) => {
                list.push({
                    email: d.id,
                    ...d.data()
                } as Admin);
            });

            setAdmins(list);
            setLoading(false);
        } catch (err) {
            console.error("Error fetching admins:", err);
            setLoading(false);
        }
    };

    /* ➕ ADD SECONDARY ADMIN */
    const addSecondaryAdmin = async () => {
        if (!newAdminEmail || !newAdminEmail.trim()) {
            alert("Please enter an email");
            return;
        }

        // Validate email format
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(newAdminEmail)) {
            alert("Please enter a valid email");
            return;
        }

        // Check if already exists
        if (admins.some(admin => admin.email === newAdminEmail)) {
            alert("This email is already a secondary admin");
            return;
        }

        // Cannot add super admin
        if (newAdminEmail === SUPER_ADMIN_EMAIL) {
            alert("Cannot add super admin as secondary admin");
            return;
        }

        setAdding(true);

        try {
            // Create admin document (email as document ID)
            await setDoc(doc(db, "admins", newAdminEmail), {
                email: newAdminEmail,
                role: "secondary",
                permissions: {
                    approveWallets: true,
                    distributePrizes: true,
                    manageTournaments: false,
                    manageInfluencers: false
                },
                addedBy: user.email,
                createdAt: serverTimestamp()
            });

            alert(`✅ ${newAdminEmail} added as secondary admin!`);
            setNewAdminEmail("");
            fetchAdmins();
        } catch (err) {
            console.error("Error adding admin:", err);
            alert("❌ Failed to add admin");
        } finally {
            setAdding(false);
        }
    };

    /* ❌ REMOVE SECONDARY ADMIN */
    const removeSecondaryAdmin = async (email: string) => {
        if (!confirm(`Remove ${email} as secondary admin?`)) return;

        try {
            await deleteDoc(doc(db, "admins", email));
            alert(`✅ ${email} removed as admin`);
            fetchAdmins();
        } catch (err) {
            console.error("Error removing admin:", err);
            alert("❌ Failed to remove admin");
        }
    };

    if (loading) {
        return (
            <div className="p-6 text-white text-center">
                Loading admin management...
            </div>
        );
    }

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="p-6 max-w-4xl mx-auto text-white space-y-8"
        >
            {/* HEADER */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold">👨‍💼 Manage Secondary Admins</h1>
                    <p className="text-gray-400 text-sm mt-1">
                        Add or remove admins who can approve payments and distribute prizes
                    </p>
                </div>
                <button
                    onClick={() => router.push("/admin/dashboard")}
                    className="bg-gray-700 hover:bg-gray-600 px-4 py-2 rounded"
                >
                    ← Back
                </button>
            </div>

            {/* ADD ADMIN SECTION */}
            <section className="bg-[#0b0f1a] border border-white/10 rounded-xl p-6 space-y-4">
                <h2 className="font-semibold text-lg">➕ Add New Secondary Admin</h2>

                <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-4">
                    <p className="text-sm text-blue-400 mb-2">
                        <strong>Secondary Admin Permissions:</strong>
                    </p>
                    <ul className="text-xs text-gray-300 space-y-1">
                        <li>✅ Approve wallet add money & withdraw requests</li>
                        <li>✅ Distribute prizes to tournament winners</li>
                        <li>✅ View all participants and Game IDs</li>
                        <li>❌ Cannot create or delete tournaments</li>
                        <li>❌ Cannot manage influencers</li>
                        <li>❌ Cannot add or remove other admins</li>
                    </ul>
                </div>

                <div className="flex gap-3">
                    <input
                        type="email"
                        value={newAdminEmail}
                        onChange={(e) => setNewAdminEmail(e.target.value)}
                        placeholder="admin@example.com"
                        className="flex-1 bg-black border border-white/20 rounded-lg px-4 py-2.5"
                        onKeyPress={(e) => e.key === "Enter" && addSecondaryAdmin()}
                    />
                    <button
                        onClick={addSecondaryAdmin}
                        disabled={adding}
                        className="bg-blue-600 hover:bg-blue-500 
                        disabled:bg-gray-600 disabled:cursor-not-allowed
                        px-6 py-2.5 rounded-lg font-semibold whitespace-nowrap"
                    >
                        {adding ? "Adding..." : "Add Admin"}
                    </button>
                </div>
            </section>

            {/* CURRENT ADMINS LIST */}
            <section className="space-y-4">
                <div className="flex items-center justify-between">
                    <h2 className="font-semibold text-lg">
                        📋 Current Secondary Admins ({admins.length})
                    </h2>
                </div>

                {admins.length === 0 ? (
                    <div className="bg-[#0b0f1a] border border-white/10 rounded-xl p-8 text-center">
                        <p className="text-gray-400">No secondary admins added yet</p>
                        <p className="text-sm text-gray-500 mt-2">
                            Add your first admin above to help manage payments
                        </p>
                    </div>
                ) : (
                    <div className="space-y-3">
                        {admins.map((admin) => (
                            <div
                                key={admin.email}
                                className="bg-[#0b0f1a] border border-white/10 rounded-xl p-4
                                hover:border-blue-500/40 transition-all"
                            >
                                <div className="flex items-start justify-between">
                                    <div className="flex-1">
                                        <div className="flex items-center gap-3 mb-2">
                                            <span className="bg-blue-500/20 text-blue-400 
                                            text-xs font-semibold px-3 py-1 rounded-full">
                                                👨‍💼 SECONDARY ADMIN
                                            </span>
                                        </div>

                                        <h3 className="font-semibold text-lg mb-1">
                                            {admin.email}
                                        </h3>

                                        <p className="text-sm text-gray-400">
                                            Added by: {admin.addedBy}
                                        </p>

                                        {/* PERMISSIONS */}
                                        <div className="mt-3 flex flex-wrap gap-2">
                                            {admin.permissions.approveWallets && (
                                                <span className="text-xs bg-green-600/20 text-green-400 px-2 py-1 rounded">
                                                    ✅ Approve Wallets
                                                </span>
                                            )}
                                            {admin.permissions.distributePrizes && (
                                                <span className="text-xs bg-green-600/20 text-green-400 px-2 py-1 rounded">
                                                    ✅ Distribute Prizes
                                                </span>
                                            )}
                                        </div>
                                    </div>

                                    <button
                                        onClick={() => removeSecondaryAdmin(admin.email)}
                                        className="bg-red-600/20 text-red-400 
                                        hover:bg-red-600/30 px-4 py-2 rounded"
                                    >
                                        Remove
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </section>

            {/* INFO SECTION */}
            <section className="bg-yellow-500/10 border border-yellow-500/30 rounded-xl p-4">
                <p className="text-sm text-yellow-400">
                    <strong>💡 Note:</strong> When a secondary admin logs in for the first time,
                    they will automatically get admin access. They can approve wallet requests
                    and distribute prizes, but cannot manage tournaments or influencers.
                </p>
            </section>
        </motion.div>
    );
}
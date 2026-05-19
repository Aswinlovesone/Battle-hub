"use client";

import { useState } from "react";
import {
    signInWithPopup,
    GoogleAuthProvider,
    signInWithEmailAndPassword,
    createUserWithEmailAndPassword,
} from "firebase/auth";
import { doc, getDoc, setDoc, serverTimestamp } from "firebase/firestore";
import { auth, db } from "../firebase";

export default function LoginPage() {
    const [mode, setMode] = useState<"login" | "signup">("login");
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [loading, setLoading] = useState(false);

    /* ---------------- GOOGLE LOGIN ---------------- */
    const loginWithGoogle = async () => {
        try {
            setLoading(true);
            const result = await signInWithPopup(
                auth,
                new GoogleAuthProvider()
            );
            const user = result.user;

            const userRef = doc(db, "users", user.uid);
            const userSnap = await getDoc(userRef);

            if (!userSnap.exists()) {
                await setDoc(userRef, {
                    uid: user.uid,
                    name: user.displayName,
                    email: user.email,
                    photo: user.photoURL,
                    provider: "google",
                    role: "player",
                    createdAt: serverTimestamp(),
                });
            }

            window.location.href = "/";
        } catch (err: any) {
            alert(err.message);
        } finally {
            setLoading(false);
        }
    };

    /* ---------------- EMAIL LOGIN ---------------- */
    const loginWithEmail = async () => {
        try {
            setLoading(true);
            await signInWithEmailAndPassword(auth, email, password);
            window.location.href = "/";
        } catch (err: any) {
            alert(err.message);
        } finally {
            setLoading(false);
        }
    };

    /* ---------------- EMAIL SIGNUP ---------------- */
    const signupWithEmail = async () => {
        try {
            setLoading(true);
            const res = await createUserWithEmailAndPassword(
                auth,
                email,
                password
            );

            const user = res.user;

            await setDoc(doc(db, "users", user.uid), {
                uid: user.uid,
                email: user.email,
                provider: "email",
                role: "player",
                createdAt: serverTimestamp(),
            });

            window.location.href = "/";
        } catch (err: any) {
            alert(err.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-black flex items-center justify-center text-white">
            <div className="bg-[#0b0f1a] border border-white/10 rounded-xl p-8 w-full max-w-sm space-y-5">

                {/* TITLE */}
                <h1 className="text-2xl font-bold text-blue-500 text-center">
                    🏆 Battle Hub
                </h1>

                <p className="text-center text-gray-400 text-sm">
                    {mode === "login"
                        ? "Login to your account"
                        : "Create a new account"}
                </p>

                {/* EMAIL */}
                <input
                    type="email"
                    placeholder="Email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full bg-black border border-white/10 rounded px-3 py-2 text-sm"
                />

                <input
                    type="password"
                    placeholder="Password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full bg-black border border-white/10 rounded px-3 py-2 text-sm"
                />

                {/* ACTION BUTTON */}
                {mode === "login" ? (
                    <button
                        onClick={loginWithEmail}
                        disabled={loading}
                        className="w-full bg-blue-600 hover:bg-blue-500 py-2 rounded font-semibold"
                    >
                        Login
                    </button>
                ) : (
                    <button
                        onClick={signupWithEmail}
                        disabled={loading}
                        className="w-full bg-green-600 hover:bg-green-500 py-2 rounded font-semibold"
                    >
                        Sign Up
                    </button>
                )}

                {/* GOOGLE */}
                <button
                    onClick={loginWithGoogle}
                    disabled={loading}
                    className="w-full border border-white/20 py-2 rounded"
                >
                    Continue with Google
                </button>

                {/* TOGGLE */}
                <p className="text-center text-xs text-gray-400">
                    {mode === "login" ? (
                        <>
                            Don’t have an account?{" "}
                            <span
                                onClick={() => setMode("signup")}
                                className="text-blue-400 cursor-pointer"
                            >
                                Sign up
                            </span>
                        </>
                    ) : (
                        <>
                            Already have an account?{" "}
                            <span
                                onClick={() => setMode("login")}
                                className="text-blue-400 cursor-pointer"
                            >
                                Login
                            </span>
                        </>
                    )}
                </p>
            </div>
        </div>
    );
}

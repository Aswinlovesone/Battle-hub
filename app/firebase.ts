// Firebase main imports
import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import {
    initializeFirestore,
    persistentLocalCache,
    persistentMultipleTabManager,
} from "firebase/firestore";
import { getAnalytics, isSupported } from "firebase/analytics";

// Your Firebase config (SAFE – already used)
const firebaseConfig = {
    apiKey: "AIzaSyDM8uPhQGtH0DUxWVbdJcsJIAiahIwA3bQ",
    authDomain: "battle-hub-dedc2.firebaseapp.com",
    projectId: "battle-hub-dedc2",
    storageBucket: "battle-hub-dedc2.firebasestorage.app",
    messagingSenderId: "170259427528",
    appId: "1:170259427528:web:03b487bb1a80411ba875fd",
    measurementId: "G-XSKDL050KR",
};

// 🔥 Initialize Firebase App
const app = initializeApp(firebaseConfig);

// 🔐 AUTH
export const auth = getAuth(app);

// 📦 FIRESTORE (🔥 FIXED FOR NEXT.JS + TURBOPACK + OFFLINE BUG)
export const db = initializeFirestore(app, {
    experimentalForceLongPolling: true,
    localCache: persistentLocalCache({
        tabManager: persistentMultipleTabManager(),
    }),
});

// 📊 ANALYTICS (Browser only – SAFE)
if (typeof window !== "undefined") {
    isSupported().then((yes) => {
        if (yes) getAnalytics(app);
    });
}

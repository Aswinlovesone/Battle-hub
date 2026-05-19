import {
    doc,
    runTransaction,
    serverTimestamp,
    increment,
} from "firebase/firestore";
import { db } from "../firebase";

/**
 * 🎯 Join tournament & auto assign slot
 * @returns slotNumber (number)
 */
export const joinTournament = async (
    tournamentId: string,
    user: any
): Promise<number> => {

    if (!user?.uid) {
        throw new Error("Not logged in");
    }

    const tournamentRef = doc(db, "tournaments", tournamentId);
    const participantRef = doc(
        db,
        "tournaments",
        tournamentId,
        "participants",
        user.uid
    );

    let assignedSlot = 0;

    await runTransaction(db, async (transaction) => {

        // 1️⃣ Tournament check
        const tournamentSnap = await transaction.get(tournamentRef);

        if (!tournamentSnap.exists()) {
            throw new Error("Tournament not found");
        }

        const data = tournamentSnap.data();

        if (data.status !== "open") {
            throw new Error("Tournament closed");
        }

        if (data.joinedPlayers >= data.maxPlayers) {
            throw new Error("Tournament full");
        }

        // 2️⃣ Already joined check (🔥 IMPORTANT)
        const participantSnap = await transaction.get(participantRef);
        if (participantSnap.exists()) {
            // Already joined → return existing slot
            assignedSlot = participantSnap.data().slot;
            return;
        }

        // 3️⃣ Assign new slot
        assignedSlot = data.joinedPlayers + 1;

        // 4️⃣ Save participant
        transaction.set(participantRef, {
            uid: user.uid,
            name: user.displayName || "Player",
            slot: assignedSlot,
            joinedAt: serverTimestamp(),
        });

        // 5️⃣ Increment joinedPlayers safely
        transaction.update(tournamentRef, {
            joinedPlayers: increment(1),
        });
    });

    // ✅ UI-ku slot number return
    return assignedSlot;
};

const functions = require("firebase-functions");
const admin = require("firebase-admin");

admin.initializeApp();

exports.matchReminder = functions.pubsub
    .schedule("every 1 minutes")
    .onRun(async () => {

        const now = new Date();
        const tenMinutesLater = new Date(now.getTime() + 10 * 60000);
        const today = now.toISOString().split("T")[0];

        const snapshot = await admin.firestore()
            .collection("tournaments")
            .where("matchDate", "==", today)
            .get();

        for (const docSnap of snapshot.docs) {
            const data = docSnap.data();
            if (!data.matchTime) continue;

            const matchDateTime = new Date(
                `${data.matchDate}T${data.matchTime}:00`
            );

            // ⏰ Check 10 minutes window
            if (Math.abs(matchDateTime - tenMinutesLater) > 60000) continue;

            const sentTokens = new Set();

            /* 1️⃣ NOTIFY PARTICIPANTS */
            const participantsSnap = await docSnap.ref
                .collection("participants")
                .get();

            for (const p of participantsSnap.docs) {
                const userDoc = await admin.firestore()
                    .collection("users")
                    .doc(p.id)
                    .get();

                const token = userDoc.data()?.fcmToken;
                if (token && !sentTokens.has(token)) {
                    sentTokens.add(token);

                    await admin.messaging().send({
                        token,
                        notification: {
                            title: "Battle Hub ⏰",
                            body: `${data.name} starts in 10 minutes!`,
                        },
                    });
                }
            }

            /* 2️⃣ NOTIFY INFLUENCER (CREATOR) */
            if (data.createdBy) {
                const influencerDoc = await admin.firestore()
                    .collection("users")
                    .doc(data.createdBy)
                    .get();

                const token = influencerDoc.data()?.fcmToken;
                if (token && !sentTokens.has(token)) {
                    await admin.messaging().send({
                        token,
                        notification: {
                            title: "Battle Hub ⏰",
                            body: `Your tournament "${data.name}" starts in 10 minutes!`,
                        },
                    });
                }
            }
        }

        return null;
    });

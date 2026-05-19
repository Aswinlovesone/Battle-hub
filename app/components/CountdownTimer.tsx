"use client";

import { useEffect, useState } from "react";

type Props = {
    matchDate: string;
    matchTime: string;
};

export default function CountdownTimer({ matchDate, matchTime }: Props) {
    const [timeLeft, setTimeLeft] = useState("");

    useEffect(() => {
        const interval = setInterval(() => {
            const target = new Date(`${matchDate}T${matchTime}:00`).getTime();
            const now = new Date().getTime();
            const diff = target - now;

            if (diff <= 0) {
                setTimeLeft("🔥 Match Started");
                clearInterval(interval);
                return;
            }

            const hours = Math.floor(diff / (1000 * 60 * 60));
            const minutes = Math.floor((diff / (1000 * 60)) % 60);
            const seconds = Math.floor((diff / 1000) % 60);

            setTimeLeft(`${hours}h ${minutes}m ${seconds}s`);
        }, 1000);

        return () => clearInterval(interval);
    }, [matchDate, matchTime]);

    return (
        <p className="text-xs font-semibold text-orange-400">
            ⏳ {timeLeft}
        </p>
    );
}

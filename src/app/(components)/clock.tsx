"use client";

import { useState, useEffect } from "react";
import { Clock as ClockIcon } from "lucide-react";

export function Clock() {
  const [currentTime, setCurrentTime] = useState(new Date());
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  // Format time for UTC+7 (Bangkok, Hanoi, Jakarta timezone)
  const formatTime = (date: Date) => {
    return date.toLocaleString("vi-VN", {
      timeZone: "Asia/Ho_Chi_Minh",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  };

  // Don't render time until component is mounted on client
  if (!mounted) {
    return (
      <div className="flex items-center space-x-2 text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-800 rounded-lg px-3 py-2">
        <ClockIcon className="w-4 h-4" />
        <div className="flex flex-row items-center text-lg">
          <div className="font-mono text-lg opacity-75 px-2">--:--:--</div>
          <div className="font-mono font-semibold px-2">--/--/----</div>
        </div>
      </div>
    );
  }

  const formattedTime = formatTime(currentTime);
  const [datePart, timePart] = formattedTime.split(" ");

  return (
    <div className="flex items-center space-x-2 text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-800 rounded-lg px-3 py-2">
      <ClockIcon className="w-4 h-4" />
      <div className="flex flex-row items-center text-lg">
        <div className="font-mono text-lg opacity-75 px-2">{datePart}</div>
        <div className="font-mono font-semibold px-2">{timePart}</div>
      </div>
    </div>
  );
}

"use client";

import { useEffect, useState } from "react";

export function useDelayedMessage(
  active: boolean,
  messages: string[],
  intervalMs = 2200
): string {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    if (!active) {
      setIndex(0);
      return;
    }
    const id = setInterval(() => {
      setIndex((i) => (i + 1) % messages.length);
    }, intervalMs);
    return () => clearInterval(id);
  }, [active, messages.length, intervalMs]);

  return messages[index] ?? messages[0];
}

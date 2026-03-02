"use client";

import { useState, useEffect } from "react";

interface QaVoteButtonProps {
  answerId: string;
  initialCount: number;
}

const VOTED_KEY = "qa_voted_answers";

function getVotedSet(): Set<string> {
  try {
    const raw = localStorage.getItem(VOTED_KEY);
    return raw ? new Set(JSON.parse(raw) as string[]) : new Set();
  } catch {
    return new Set();
  }
}

function getOrCreateVisitorKey(): string {
  const key = "qa_visitor_key";
  try {
    let vk = localStorage.getItem(key);
    if (!vk) {
      vk = crypto.randomUUID();
      localStorage.setItem(key, vk);
    }
    return vk;
  } catch {
    return "anon";
  }
}

export function QaVoteButton({ answerId, initialCount }: QaVoteButtonProps) {
  const [count, setCount] = useState(initialCount);
  const [voted, setVoted] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setVoted(getVotedSet().has(answerId));
  }, [answerId]);

  const handleVote = async () => {
    if (voted || loading) return;
    setLoading(true);
    try {
      const visitorKey = getOrCreateVisitorKey();
      const res = await fetch("/api/marketplace/qa/votes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ answerId, visitorKey }),
      });
      if (res.ok) {
        setCount((c) => c + 1);
        setVoted(true);
        // 记录到 localStorage
        const set = getVotedSet();
        set.add(answerId);
        localStorage.setItem(VOTED_KEY, JSON.stringify([...set]));
      } else if (res.status === 409) {
        setVoted(true);
      }
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      onClick={handleVote}
      disabled={voted || loading}
      title={voted ? "已投票" : "标记为有帮助"}
      className={`flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg transition-all ${
        voted
          ? "bg-amber-900/40 text-amber-400 border border-amber-600/40 cursor-default"
          : "bg-slate-700 text-slate-400 border border-slate-600 hover:border-amber-500/50 hover:text-amber-400 hover:bg-slate-600"
      } ${loading ? "opacity-60" : ""}`}
    >
      <span>{voted ? "👍" : "👍"}</span>
      <span>{voted ? "有帮助" : "有帮助"}</span>
      <span className="font-semibold">{count}</span>
    </button>
  );
}

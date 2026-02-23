"use client";

import { useEffect, useState } from "react";

export type MarketplaceViewer = {
  authenticated: boolean;
  user: null | {
    id: string;
    role: "CLIENT" | "ATTORNEY" | "ADMIN";
    clientProfileId: string | null;
    attorneyProfileId: string | null;
  };
};

export function useMarketplaceAuth() {
  const [viewer, setViewer] = useState<MarketplaceViewer>({
    authenticated: false,
    user: null,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let canceled = false;
    setLoading(true);
    fetch("/api/marketplace/me")
      .then(async (r) => {
        const data = await r.json();
        if (!r.ok) throw new Error(data.error || "Failed to load auth");
        return data;
      })
      .then((data) => {
        if (canceled) return;
        setViewer({
          authenticated: Boolean(data.authenticated),
          user: data.user ?? null,
        });
      })
      .catch((e: unknown) => {
        if (canceled) return;
        setError(e instanceof Error ? e.message : "Failed to load auth");
      })
      .finally(() => {
        if (!canceled) setLoading(false);
      });

    return () => {
      canceled = true;
    };
  }, []);

  return { viewer, loading, error };
}


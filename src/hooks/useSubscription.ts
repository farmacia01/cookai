import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import type { RealtimeChannel } from "@supabase/supabase-js";

export interface Subscription {
  id: string;
  status: string;
  credits: number;
  product_id: string | null;
  product_name: string | null;
  billing_cycle_months: number | null;
  auto_renew: boolean;
  current_period_start?: string | null;
  current_period_end?: string | null;
  created_at: string;
}

export function useSubscription() {
  const { user } = useAuth();
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchSubscription = useCallback(async () => {
    if (!user) {
      setSubscription(null);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("subscriptions")
        .select("*")
        .eq("user_id", user.id)
        .eq("status", "active")
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) throw error;
      setSubscription(data);
    } catch (err) {
      setError(err instanceof Error ? err : new Error("Failed to fetch subscription"));
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchSubscription();

    if (!user) return;

    const channel = supabase
      .channel(`subscription:${user.id}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "subscriptions",
          filter: `user_id=eq.${user.id}`,
        },
        () => {
          fetchSubscription();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel as RealtimeChannel);
    };
  }, [user, fetchSubscription]);

  const isActive = subscription?.status === "active";
  const hasCredits = (subscription?.credits || 0) > 0;

  return {
    subscription,
    loading,
    error,
    isActive,
    hasCredits,
    refetch: fetchSubscription,
  };
}

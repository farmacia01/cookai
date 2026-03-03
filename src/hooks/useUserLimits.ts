import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useSubscription } from "./useSubscription";

// Plan limits
const FREE_LIMITS = {
  recipesPerMonth: 3,
  maxSavedRecipes: 10,
  allowedModes: ["faxina"],
  canGenerateImages: false,
  canSetGoals: false,
};

const MONTHLY_LIMITS = {
  recipesPerMonth: 200,
  maxSavedRecipes: Infinity,
  allowedModes: ["faxina", "monstro", "seca"],
  canGenerateImages: true,
  canSetGoals: true,
};

const PRO_LIMITS = {
  recipesPerMonth: Infinity,
  maxSavedRecipes: Infinity,
  allowedModes: ["faxina", "monstro", "seca"],
  canGenerateImages: true,
  canSetGoals: true,
};

export interface UsageLimits {
  recipesPerMonth: number;
  maxSavedRecipes: number;
  allowedModes: string[];
  canGenerateImages: boolean;
  canSetGoals: boolean;
}

export interface UsageData {
  recipesGenerated: number;
  recipesSaved: number;
}

function getCurrentMonthYear(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

export function useUserLimits() {
  const { user } = useAuth();
  const { isActive, subscription } = useSubscription();
  const [usage, setUsage] = useState<UsageData>({ recipesGenerated: 0, recipesSaved: 0 });
  const [loading, setLoading] = useState(true);

  // Determine limits based on subscription type
  const getLimits = (): UsageLimits => {
    if (!isActive) return FREE_LIMITS;

    // Check if it's a monthly plan (billing_cycle_months === 1)
    const isMonthlyPlan = subscription?.billing_cycle_months === 1;

    if (isMonthlyPlan) {
      return MONTHLY_LIMITS;
    }

    // Annual and other plans get unlimited
    return PRO_LIMITS;
  };

  const limits: UsageLimits = getLimits();

  const fetchUsage = useCallback(async () => {
    if (!user) {
      setLoading(false);
      return;
    }

    try {
      const monthYear = getCurrentMonthYear();

      // Fetch usage for current month
      const { data: usageData } = await supabase
        .from("user_usage")
        .select("recipes_generated")
        .eq("user_id", user.id)
        .eq("month_year", monthYear)
        .maybeSingle();

      // Count total saved recipes
      const { count: savedCount } = await supabase
        .from("recipes")
        .select("*", { count: "exact", head: true })
        .eq("user_id", user.id);

      setUsage({
        recipesGenerated: usageData?.recipes_generated || 0,
        recipesSaved: savedCount || 0,
      });
    } catch (error) {
      console.error("Error fetching usage:", error);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchUsage();
  }, [fetchUsage, subscription]);

  const canGenerateRecipe = () => {
    if (!isActive) {
      return usage.recipesGenerated < limits.recipesPerMonth;
    }

    // For active subscriptions, check the limit based on plan type
    // Monthly plans have a limit, annual plans are unlimited
    if (limits.recipesPerMonth === Infinity) {
      return true;
    }

    return usage.recipesGenerated < limits.recipesPerMonth;
  };

  const canSaveRecipe = () => {
    if (limits.maxSavedRecipes === Infinity) {
      return true;
    }
    return usage.recipesSaved < limits.maxSavedRecipes;
  };

  const canUseMode = (mode: string) => {
    if (isActive) return true;
    return limits.allowedModes.includes(mode.toLowerCase());
  };

  const incrementRecipeGenerated = async () => {
    if (!user) return;

    const monthYear = getCurrentMonthYear();

    try {
      // Atomic increment via RPC — eliminates race condition
      const { data: newCount, error } = await supabase
        .rpc('increment_recipe_usage', {
          p_user_id: user.id,
          p_month_year: monthYear,
        });

      if (error) {
        console.error("Error incrementing usage via RPC:", error);
        return;
      }

      setUsage((prev) => ({
        ...prev,
        recipesGenerated: newCount ?? prev.recipesGenerated + 1,
      }));
    } catch (error) {
      console.error("Error incrementing usage:", error);
    }
  };

  const getRemainingRecipes = () => {
    if (limits.recipesPerMonth === Infinity) {
      return Infinity;
    }
    return Math.max(0, limits.recipesPerMonth - usage.recipesGenerated);
  };

  const getRemainingSaves = () => {
    if (limits.maxSavedRecipes === Infinity) {
      return Infinity;
    }
    return Math.max(0, limits.maxSavedRecipes - usage.recipesSaved);
  };

  return {
    limits,
    usage,
    loading,
    isPro: isActive,
    canGenerateRecipe,
    canSaveRecipe,
    canUseMode,
    incrementRecipeGenerated,
    getRemainingRecipes,
    getRemainingSaves,
    refetch: fetchUsage,
  };
}

import { useQuery } from "@tanstack/react-query";
import {
  Users,
  ChefHat,
  DollarSign,
  CreditCard,
  Activity,
  UserCheck,
  UserX,
  Clock,
  Sparkles,
  TrendingUp,
  BarChart3,
  AlertCircle,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { Loader2 } from "lucide-react";

const DashboardOverview = () => {
  const { data: stats, isLoading, error } = useQuery({
    queryKey: ["admin-stats"],
    queryFn: async () => {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);
      const weekAgo = new Date(today);
      weekAgo.setDate(weekAgo.getDate() - 7);
      const monthAgo = new Date(today);
      monthAgo.setDate(monthAgo.getDate() - 30);
      const currentMonthYear = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}`;

      // ─── Parallel batch 1: counts ────────────────────────────────
      const [
        { count: totalUsers, error: e1 },
        { count: newUsersThisMonth, error: e2 },
        { count: recipesToday, error: e3 },
        { count: recipesThisWeek, error: e4 },
        { count: recipesThisMonth, error: e5 },
        { count: totalRecipes, error: e6 },
      ] = await Promise.all([
        supabase.from("profiles").select("*", { count: "exact", head: true }),
        supabase.from("profiles").select("*", { count: "exact", head: true }).gte("created_at", monthAgo.toISOString()),
        supabase.from("generation_logs").select("*", { count: "exact", head: true }).gte("created_at", today.toISOString()).lt("created_at", tomorrow.toISOString()),
        supabase.from("generation_logs").select("*", { count: "exact", head: true }).gte("created_at", weekAgo.toISOString()),
        supabase.from("generation_logs").select("*", { count: "exact", head: true }).gte("created_at", monthAgo.toISOString()),
        supabase.from("recipes").select("*", { count: "exact", head: true }),
      ]);

      const dataErrors = [e1, e2, e3, e4, e5, e6].filter(Boolean);
      if (dataErrors.length) console.error("[DashboardOverview] Count errors:", dataErrors);

      // ─── Parallel batch 2: data queries ─────────────────────────
      const [
        { data: logsToday },
        { data: logsThisMonth },
        { data: profiles },
        { data: allSubscriptions },
        { data: logsByMode },
        { data: recentLogs },
        { data: topLogsData },
      ] = await Promise.all([
        supabase.from("generation_logs").select("tokens_used").gte("created_at", today.toISOString()).lt("created_at", tomorrow.toISOString()),
        supabase.from("generation_logs").select("tokens_used").gte("created_at", monthAgo.toISOString()),
        supabase.from("profiles").select("last_recipe_generated_at, has_active_plan, plan_name").not("last_recipe_generated_at", "is", null),
        supabase.from("subscriptions").select("product_id, product_name, status").eq("status", "active"),
        supabase.from("generation_logs").select("mode").gte("created_at", monthAgo.toISOString()),
        supabase.from("generation_logs").select("created_at, status, mode, tokens_used").order("created_at", { ascending: false }).limit(10),
        // Top users by generations this month – get user_id + count from generation_logs
        supabase.from("generation_logs").select("user_id").gte("created_at", monthAgo.toISOString()).not("user_id", "is", null),
      ]);

      // ─── Cost calculations ───────────────────────────────────────
      const totalTokensToday = logsToday?.reduce((s, l) => s + (l.tokens_used || 0), 0) || 0;
      const totalTokensMonth = logsThisMonth?.reduce((s, l) => s + (l.tokens_used || 0), 0) || 0;
      const estimatedCostToday = ((totalTokensToday / 1000) * 0.001).toFixed(4);
      const estimatedCostMonth = ((totalTokensMonth / 1000) * 0.001).toFixed(2);

      // ─── Active / Inactive users ─────────────────────────────────
      const now = new Date().getTime();
      const activeUsers = profiles?.filter(p => {
        const diff = Math.floor((now - new Date(p.last_recipe_generated_at!).getTime()) / 86400000);
        return diff <= 7;
      }).length || 0;
      const inactiveUsers = profiles?.filter(p => {
        const diff = Math.floor((now - new Date(p.last_recipe_generated_at!).getTime()) / 86400000);
        return diff > 30;
      }).length || 0;

      // ─── Subscriptions breakdown ─────────────────────────────────
      const activeSubscriptions = allSubscriptions?.length || 0;

      // Group by plan name/product_id (normalize to lower)
      const planCounts: Record<string, number> = {};
      (allSubscriptions || []).forEach(s => {
        const key = s.product_name || s.product_id || "Outro";
        planCounts[key] = (planCounts[key] || 0) + 1;
      });

      // ─── Mode distribution ───────────────────────────────────────
      const modeCounts = (logsByMode || []).reduce((acc, log) => {
        const mode = log.mode || "unknown";
        acc[mode] = (acc[mode] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      // ─── Top users (from generation_logs this month) ─────────────
      const userCounts: Record<string, number> = {};
      (topLogsData || []).forEach(l => {
        if (l.user_id) userCounts[l.user_id] = (userCounts[l.user_id] || 0) + 1;
      });
      const topUserIds = Object.entries(userCounts)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 5)
        .map(([id]) => id);

      let topUsersData: Array<{ name: string; count: number }> = [];
      if (topUserIds.length > 0) {
        const { data: topProfiles } = await supabase
          .from("profiles")
          .select("user_id, full_name")
          .in("user_id", topUserIds);

        topUsersData = topUserIds.map(id => ({
          name: topProfiles?.find(p => p.user_id === id)?.full_name || "Usuário",
          count: userCounts[id],
        }));
      }

      return {
        totalUsers: totalUsers || 0,
        newUsersThisMonth: newUsersThisMonth || 0,
        activeUsers,
        inactiveUsers,
        recipesToday: recipesToday || 0,
        recipesThisWeek: recipesThisWeek || 0,
        recipesThisMonth: recipesThisMonth || 0,
        totalRecipes: totalRecipes || 0,
        estimatedCostToday,
        estimatedCostMonth,
        activeSubscriptions,
        planCounts,
        modeCounts,
        recentLogs: recentLogs || [],
        topUsers: topUsersData,
      };
    },
    retry: 1,
  });

  const getModeLabel = (mode: string) => {
    const modes: Record<string, string> = {
      faxina: "Economia",
      monstro: "Ganho de Massa",
      seca: "Emagrecimento",
    };
    return modes[mode] || mode;
  };

  const relativeTime = (iso: string) => {
    const diff = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
    if (diff < 60) return `há ${diff}s`;
    if (diff < 3600) return `há ${Math.floor(diff / 60)}min`;
    if (diff < 86400) return `há ${Math.floor(diff / 3600)}h`;
    return new Date(iso).toLocaleDateString("pt-BR");
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center py-20 gap-3 text-destructive">
        <AlertCircle className="w-6 h-6" />
        <p className="font-medium">Erro ao carregar dados do dashboard. Verifique as permissões de admin.</p>
      </div>
    );
  }

  const mainCards = [
    {
      title: "Total de Usuários",
      value: stats?.totalUsers ?? 0,
      subtitle: `+${stats?.newUsersThisMonth ?? 0} este mês`,
      icon: Users,
      color: "text-blue-500",
      bgColor: "bg-blue-500/10",
      trend: (stats?.newUsersThisMonth ?? 0) > 0,
    },
    {
      title: "Receitas Hoje",
      value: stats?.recipesToday ?? 0,
      subtitle: `${stats?.recipesThisWeek ?? 0} esta semana`,
      icon: ChefHat,
      color: "text-primary",
      bgColor: "bg-primary/10",
      trend: (stats?.recipesThisWeek ?? 0) > 0,
    },
    {
      title: "Custo Estimado (Hoje)",
      value: `$${stats?.estimatedCostToday ?? "0.0000"}`,
      subtitle: `$${stats?.estimatedCostMonth ?? "0.00"} este mês`,
      icon: DollarSign,
      color: "text-amber-500",
      bgColor: "bg-amber-500/10",
    },
    {
      title: "Assinaturas Ativas",
      value: stats?.activeSubscriptions ?? 0,
      subtitle: `${Object.keys(stats?.planCounts ?? {}).length} tipos de plano`,
      icon: CreditCard,
      color: "text-green-500",
      bgColor: "bg-green-500/10",
      trend: (stats?.activeSubscriptions ?? 0) > 0,
    },
  ];

  const activityCards = [
    {
      title: "Usuários Ativos",
      value: stats?.activeUsers ?? 0,
      subtitle: "Nos últimos 7 dias",
      icon: UserCheck,
      color: "text-green-600",
      bgColor: "bg-green-500/10",
    },
    {
      title: "Usuários Inativos",
      value: stats?.inactiveUsers ?? 0,
      subtitle: "Sem geração há +30 dias",
      icon: UserX,
      color: "text-red-500",
      bgColor: "bg-red-500/10",
    },
    {
      title: "Receitas Este Mês",
      value: stats?.recipesThisMonth ?? 0,
      subtitle: "Gerações no mês atual",
      icon: Activity,
      color: "text-purple-500",
      bgColor: "bg-purple-500/10",
    },
    {
      title: "Total de Receitas",
      value: stats?.totalRecipes ?? 0,
      subtitle: "Todas as receitas salvas",
      icon: TrendingUp,
      color: "text-indigo-500",
      bgColor: "bg-indigo-500/10",
    },
  ];

  const totalModeCount = Object.values(stats?.modeCounts ?? {}).reduce((a, b) => a + b, 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold">Dashboard</h1>
          <p className="text-muted-foreground text-sm mt-0.5">Visão geral do sistema em tempo real</p>
        </div>
        <Badge variant="outline" className="gap-1 hidden sm:flex">
          <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse inline-block" />
          Ao vivo
        </Badge>
      </div>

      {/* Main Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
        {mainCards.map((card) => (
          <Card key={card.title} className="relative overflow-hidden">
            <CardHeader className="flex flex-row items-center justify-between pb-2 pt-4 px-4">
              <CardTitle className="text-xs font-medium text-muted-foreground leading-tight">
                {card.title}
              </CardTitle>
              <div className={`p-1.5 rounded-lg ${card.bgColor} shrink-0`}>
                <card.icon className={`w-4 h-4 ${card.color}`} />
              </div>
            </CardHeader>
            <CardContent className="px-4 pb-4">
              <div className="text-2xl md:text-3xl font-bold mb-0.5">{card.value}</div>
              <p className="text-xs text-muted-foreground flex items-center gap-1">
                {card.trend && <span className="text-green-500">↑</span>}
                {card.subtitle}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Activity Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
        {activityCards.map((card) => (
          <Card key={card.title}>
            <CardHeader className="flex flex-row items-center justify-between pb-2 pt-4 px-4">
              <CardTitle className="text-xs font-medium text-muted-foreground leading-tight">
                {card.title}
              </CardTitle>
              <div className={`p-1.5 rounded-lg ${card.bgColor} shrink-0`}>
                <card.icon className={`w-4 h-4 ${card.color}`} />
              </div>
            </CardHeader>
            <CardContent className="px-4 pb-4">
              <div className="text-2xl font-bold mb-0.5">{card.value}</div>
              <p className="text-xs text-muted-foreground">{card.subtitle}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6">
        {/* Plan Distribution */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <CreditCard className="w-4 h-4" />
              Distribuição de Planos
            </CardTitle>
            <CardDescription>Assinaturas ativas por tipo de plano</CardDescription>
          </CardHeader>
          <CardContent>
            {Object.keys(stats?.planCounts ?? {}).length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-6">Nenhuma assinatura ativa</p>
            ) : (
              <div className="space-y-3">
                {Object.entries(stats?.planCounts ?? {})
                  .sort(([, a], [, b]) => b - a)
                  .map(([plan, count]) => {
                    const pct = stats?.activeSubscriptions
                      ? Math.round((count / stats.activeSubscriptions) * 100)
                      : 0;
                    return (
                      <div key={plan} className="space-y-1">
                        <div className="flex items-center justify-between text-sm">
                          <span className="font-medium truncate max-w-[60%]">{plan}</span>
                          <div className="flex items-center gap-2">
                            <span className="font-bold">{count}</span>
                            <Badge variant="outline" className="text-xs">{pct}%</Badge>
                          </div>
                        </div>
                        <div className="w-full h-1.5 bg-muted rounded-full overflow-hidden">
                          <div
                            className="h-full bg-primary rounded-full transition-all"
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                <div className="pt-2 border-t flex justify-between items-center text-sm">
                  <span className="text-muted-foreground">Total ativo</span>
                  <span className="font-bold text-lg">{stats?.activeSubscriptions ?? 0}</span>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Recipes by Mode */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <BarChart3 className="w-4 h-4" />
              Receitas por Modo
            </CardTitle>
            <CardDescription>Últimos 30 dias</CardDescription>
          </CardHeader>
          <CardContent>
            {Object.entries(stats?.modeCounts ?? {}).length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-6">
                Nenhuma receita gerada nos últimos 30 dias
              </p>
            ) : (
              <div className="space-y-3">
                {Object.entries(stats?.modeCounts ?? {})
                  .sort(([, a], [, b]) => b - a)
                  .map(([mode, count]) => {
                    const pct = totalModeCount > 0 ? Math.round((count / totalModeCount) * 100) : 0;
                    return (
                      <div key={mode} className="space-y-1">
                        <div className="flex items-center justify-between text-sm">
                          <div className="flex items-center gap-2">
                            <Sparkles className="w-3.5 h-3.5 text-muted-foreground" />
                            <span className="font-medium">{getModeLabel(mode)}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="font-bold">{count}</span>
                            <Badge variant="secondary" className="text-xs">{pct}%</Badge>
                          </div>
                        </div>
                        <div className="w-full h-1.5 bg-muted rounded-full overflow-hidden">
                          <div
                            className="h-full bg-purple-500 rounded-full transition-all"
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6">
        {/* Top Users */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <TrendingUp className="w-4 h-4" />
              Top Usuários (Este Mês)
            </CardTitle>
            <CardDescription>Quem mais gerou receitas no mês atual</CardDescription>
          </CardHeader>
          <CardContent>
            {(stats?.topUsers ?? []).length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-6">Nenhum dado disponível</p>
            ) : (
              <div className="space-y-3">
                {stats!.topUsers.map((user, i) => (
                  <div key={i} className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div
                        className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${i === 0
                            ? "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400"
                            : i === 1
                              ? "bg-gray-200 text-gray-700 dark:bg-gray-700 dark:text-gray-300"
                              : i === 2
                                ? "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400"
                                : "bg-muted text-muted-foreground"
                          }`}
                      >
                        {i + 1}
                      </div>
                      <span className="text-sm font-medium">{user.name}</span>
                    </div>
                    <Badge variant="outline">{user.count} receitas</Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Recent Activity */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Clock className="w-4 h-4" />
              Atividade Recente
            </CardTitle>
            <CardDescription>Últimas gerações de receitas</CardDescription>
          </CardHeader>
          <CardContent>
            {(stats?.recentLogs ?? []).length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-6">Nenhuma atividade recente</p>
            ) : (
              <div className="space-y-2.5">
                {stats!.recentLogs.map((log, i) => (
                  <div key={i} className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2">
                      <div
                        className={`w-2 h-2 rounded-full shrink-0 ${log.status === "success" ? "bg-green-500" : "bg-red-500"
                          }`}
                      />
                      <span className="text-muted-foreground text-xs">{relativeTime(log.created_at)}</span>
                      {log.mode && (
                        <Badge variant="outline" className="text-xs py-0 h-5">
                          {getModeLabel(log.mode)}
                        </Badge>
                      )}
                    </div>
                    <span className="text-xs text-muted-foreground tabular-nums">
                      {(log.tokens_used ?? 0).toLocaleString()} tok
                    </span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default DashboardOverview;

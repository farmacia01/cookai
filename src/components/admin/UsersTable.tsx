import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Ban, ChevronLeft, ChevronRight, Settings, UserPlus, Filter, X } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { UserSubscriptionDialog } from "./UserSubscriptionDialog";

const ITEMS_PER_PAGE = 10;

interface UserWithSubscription {
  id: string;
  user_id: string;
  full_name: string | null;
  created_at: string;
  email?: string;
  subscription_status?: string;
  subscription_product_name?: string | null;
  subscription_product_id?: string | null;
  subscription_billing_cycle?: number | null;
  subscription_credits?: number | null;
  subscription_period_end?: string | null;
  last_recipe_generated_at?: string | null;
}

type PlanFilter = "all" | "free" | "active" | "monthly" | "quarterly" | "annual" | "active_recent" | "inactive_recent" | "inactive_old" | "never";

const UsersTable = () => {
  const [page, setPage] = useState(0);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [selectedUserName, setSelectedUserName] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [planFilter, setPlanFilter] = useState<PlanFilter>("all");
  const { toast } = useToast();

  const { data, isLoading } = useQuery({
    queryKey: ["admin-users", planFilter],
    queryFn: async () => {
      // Get all profiles (we'll filter and paginate client-side)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: profiles, error, count } = await (supabase as any)
        .from("profiles")
        .select("*, last_recipe_generated_at", { count: "exact" })
        .order("created_at", { ascending: false })
        .then((res: any) => res.error ? { data: [], error: null, count: 0 } : res);

      if (error) throw error;

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const userIds = (profiles as any[])?.map((p: any) => p.user_id) || [];
      const { data: subscriptions } = await supabase
        .from("subscriptions")
        .select("user_id, status, product_id, product_name, billing_cycle_months, credits, current_period_end")
        .in("user_id", userIds.length > 0 ? userIds : [])
        .order("created_at", { ascending: false })
        .then(res => res.error ? { data: [] } : res);

      // Merge data - get the most recent subscription for each user
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      let usersWithSubs: UserWithSubscription[] = ((profiles as any[]) || []).map((profile: any) => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const userSubs = subscriptions?.filter((s: any) => s.user_id === profile.user_id) || [];
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const activeSub = userSubs.find((s: any) => s.status === "active") || userSubs[0];

        return {
          ...profile,
          subscription_status: activeSub?.status || "free",
          subscription_product_name: activeSub?.product_name || null,
          subscription_product_id: activeSub?.product_id || null,
          subscription_billing_cycle: activeSub?.billing_cycle_months || null,
          subscription_credits: activeSub?.credits || null,
          subscription_period_end: activeSub?.current_period_end || null,
        };
      });

      // Apply plan filter
      if (planFilter !== "all") {
        usersWithSubs = usersWithSubs.filter(user => {
          switch (planFilter) {
            case "free":
              return user.subscription_status === "free" || !user.subscription_status;
            case "active":
              return user.subscription_status === "active";
            case "monthly":
              return user.subscription_status === "active" && user.subscription_billing_cycle === 1;
            case "quarterly":
              return user.subscription_status === "active" && user.subscription_billing_cycle === 3;
            case "annual":
              return user.subscription_status === "active" && user.subscription_billing_cycle === 12;
            case "active_recent":
              if (!user.last_recipe_generated_at) return false;
              const daysSinceLastRecipe = Math.floor(
                (new Date().getTime() - new Date(user.last_recipe_generated_at).getTime()) /
                (1000 * 60 * 60 * 24)
              );
              return daysSinceLastRecipe <= 7;
            case "inactive_recent":
              if (!user.last_recipe_generated_at) return false;
              const daysSinceRecipe = Math.floor(
                (new Date().getTime() - new Date(user.last_recipe_generated_at).getTime()) /
                (1000 * 60 * 60 * 24)
              );
              return daysSinceRecipe > 7 && daysSinceRecipe <= 30;
            case "inactive_old":
              if (!user.last_recipe_generated_at) return false;
              const daysOld = Math.floor(
                (new Date().getTime() - new Date(user.last_recipe_generated_at).getTime()) /
                (1000 * 60 * 60 * 24)
              );
              return daysOld > 30;
            case "never":
              return !user.last_recipe_generated_at;
            default:
              return true;
          }
        });
      }

      return {
        allUsers: usersWithSubs,
        totalCount: usersWithSubs.length,
      };
    },
  });

  const handleManageSubscription = (userId: string, userName: string | null) => {
    setSelectedUserId(userId);
    setSelectedUserName(userName);
    setDialogOpen(true);
  };

  const handleBan = (userId: string) => {
    // Visual only - would implement actual ban logic here
    toast({
      title: "Ação de banimento",
      description: `Usuário ${userId} seria banido. (Funcionalidade visual)`,
    });
  };

  const handleFilterChange = (value: PlanFilter) => {
    setPlanFilter(value);
    setPage(0); // Reset to first page when filter changes
  };

  const clearFilter = () => {
    setPlanFilter("all");
    setPage(0);
  };

  const filteredCount = data?.totalCount || 0;
  const totalPages = Math.ceil(filteredCount / ITEMS_PER_PAGE);

  // Paginate filtered results
  const paginatedUsers = (data?.allUsers || []).slice(
    page * ITEMS_PER_PAGE,
    (page + 1) * ITEMS_PER_PAGE
  );

  return (
    <div className="w-full">
      <div className="mb-4 sm:mb-6 md:mb-8">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-4">
          <div>
            <h1 className="text-xl sm:text-2xl md:text-3xl font-bold">Usuários</h1>
            <p className="text-sm sm:text-base text-muted-foreground mt-1">
              {planFilter === "all"
                ? `${data?.totalCount || 0} usuários cadastrados`
                : `${filteredCount} usuário${filteredCount !== 1 ? 's' : ''} ${planFilter === "free" ? "sem plano"
                  : planFilter === "active" ? "com plano ativo"
                    : planFilter === "monthly" ? "com plano mensal"
                      : planFilter === "quarterly" ? "com plano trimestral"
                        : planFilter === "annual" ? "com plano anual"
                          : planFilter === "active_recent" ? "ativos recentemente (últimos 7 dias)"
                            : planFilter === "inactive_recent" ? "inativos recentemente (7-30 dias)"
                              : planFilter === "inactive_old" ? "muito inativos (30+ dias)"
                                : "que nunca geraram receitas"
                }`
              }
            </p>
          </div>
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4 text-muted-foreground hidden sm:block" />
              <Select value={planFilter} onValueChange={(value: PlanFilter) => handleFilterChange(value)}>
                <SelectTrigger className="w-full sm:w-[180px] md:w-[200px]">
                  <SelectValue placeholder="Filtrar por plano" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os planos</SelectItem>
                  <SelectItem value="free">Sem plano (Free)</SelectItem>
                  <SelectItem value="active">Todos os ativos</SelectItem>
                  <SelectItem value="monthly">Mensal</SelectItem>
                  <SelectItem value="quarterly">Trimestral</SelectItem>
                  <SelectItem value="annual">Anual</SelectItem>
                  <SelectItem value="active_recent">Ativos (últimos 7 dias)</SelectItem>
                  <SelectItem value="inactive_recent">Inativos (7-30 dias)</SelectItem>
                  <SelectItem value="inactive_old">Muito inativos (30+ dias)</SelectItem>
                  <SelectItem value="never">Nunca geraram</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {planFilter !== "all" && (
              <Button
                variant="ghost"
                size="icon"
                onClick={clearFilter}
                className="h-10 w-10"
                title="Limpar filtro"
              >
                <X className="w-4 h-4" />
              </Button>
            )}
          </div>
        </div>
      </div>

      <div className="bg-card rounded-lg border border-border overflow-hidden">
        {/* Mobile: scroll horizontal, Desktop: tabela normal */}
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="min-w-[120px]">Nome</TableHead>
                <TableHead className="min-w-[100px] hidden sm:table-cell">ID do Usuário</TableHead>
                <TableHead className="min-w-[120px]">Plano</TableHead>
                <TableHead className="min-w-[140px] hidden lg:table-cell">Última Receita</TableHead>
                <TableHead className="min-w-[120px] hidden md:table-cell">Data de Cadastro</TableHead>
                <TableHead className="text-right min-w-[200px]">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-sm">
                    Carregando...
                  </TableCell>
                </TableRow>
              ) : paginatedUsers.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-sm text-muted-foreground">
                    {planFilter !== "all"
                      ? `Nenhum usuário encontrado com o filtro selecionado`
                      : "Nenhum usuário encontrado"
                    }
                  </TableCell>
                </TableRow>
              ) : (
                paginatedUsers.map((user) => (
                  <TableRow key={user.id}>
                    <TableCell className="font-medium">
                      {user.full_name || "Sem nome"}
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm hidden sm:table-cell">
                      {user.user_id.slice(0, 8)}...
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col gap-1">
                        <Badge
                          variant={
                            user.subscription_status === "active"
                              ? "default"
                              : "secondary"
                          }
                        >
                          {user.subscription_status === "active"
                            ? user.subscription_product_name || "Pro"
                            : "Free"}
                        </Badge>
                        {user.subscription_status === "active" && user.subscription_billing_cycle && (
                          <span className="text-xs text-muted-foreground">
                            {user.subscription_billing_cycle === 1 && "Mensal"}
                            {user.subscription_billing_cycle === 3 && "Trimestral"}
                            {user.subscription_billing_cycle === 12 && "Anual"}
                          </span>
                        )}
                        {user.subscription_status === "active" && user.subscription_period_end && (
                          <span className="text-xs text-muted-foreground">
                            Até {new Date(user.subscription_period_end).toLocaleDateString("pt-BR")}
                          </span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-sm hidden lg:table-cell">
                      {user.last_recipe_generated_at ? (
                        <div className="flex flex-col gap-1">
                          <span className="text-muted-foreground">
                            {new Date(user.last_recipe_generated_at).toLocaleDateString("pt-BR")}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            {(() => {
                              const daysAgo = Math.floor(
                                (new Date().getTime() - new Date(user.last_recipe_generated_at).getTime()) /
                                (1000 * 60 * 60 * 24)
                              );
                              if (daysAgo === 0) return "Hoje";
                              if (daysAgo === 1) return "Ontem";
                              if (daysAgo < 7) return `${daysAgo} dias atrás`;
                              if (daysAgo < 30) return `${Math.floor(daysAgo / 7)} semana${Math.floor(daysAgo / 7) > 1 ? 's' : ''} atrás`;
                              return `${Math.floor(daysAgo / 30)} mês${Math.floor(daysAgo / 30) > 1 ? 'es' : ''} atrás`;
                            })()}
                          </span>
                        </div>
                      ) : (
                        <Badge variant="outline" className="text-xs">
                          Nunca gerou
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm hidden md:table-cell">
                      {new Date(user.created_at).toLocaleDateString("pt-BR")}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex flex-col sm:flex-row items-end sm:items-center justify-end gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          className="w-full sm:w-auto"
                          onClick={() => handleManageSubscription(user.user_id, user.full_name)}
                        >
                          {user.subscription_status === "active" ? (
                            <>
                              <Settings className="w-4 h-4 sm:mr-1" />
                              <span className="hidden sm:inline">Gerenciar</span>
                              <span className="sm:hidden">Gerenciar</span>
                            </>
                          ) : (
                            <>
                              <UserPlus className="w-4 h-4 sm:mr-1" />
                              <span className="hidden sm:inline">Adicionar Plano</span>
                              <span className="sm:hidden">Adicionar</span>
                            </>
                          )}
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="w-full sm:w-auto text-destructive hover:text-destructive hover:bg-destructive/10"
                          onClick={() => handleBan(user.user_id)}
                        >
                          <Ban className="w-4 h-4 sm:mr-1" />
                          Banir
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-3 sm:px-4 py-3 border-t border-border">
            <p className="text-xs sm:text-sm text-muted-foreground">
              Página {page + 1} de {totalPages}
              {planFilter !== "all" && ` (${filteredCount} resultado${filteredCount !== 1 ? 's' : ''})`}
            </p>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage((p) => Math.max(0, p - 1))}
                disabled={page === 0}
              >
                <ChevronLeft className="w-4 h-4" />
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
                disabled={page >= totalPages - 1}
              >
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Subscription Management Dialog */}
      {selectedUserId && (
        <UserSubscriptionDialog
          userId={selectedUserId}
          userName={selectedUserName}
          open={dialogOpen}
          onOpenChange={(open) => {
            setDialogOpen(open);
            if (!open) {
              setSelectedUserId(null);
              setSelectedUserName(null);
            }
          }}
        />
      )}
    </div>
  );
};

export default UsersTable;
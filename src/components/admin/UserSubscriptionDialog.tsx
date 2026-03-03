import { useState, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Loader2, Trash2 } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface Subscription {
  id: string;
  user_id: string;
  product_id: string | null;
  product_name: string | null;
  status: string;
  billing_cycle_months: number | null;
  credits: number | null;
  current_period_start: string | null;
  current_period_end: string | null;
  auto_renew: boolean | null;
}

interface UserSubscriptionDialogProps {
  userId: string;
  userName: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const PLAN_OPTIONS = [
  { id: "monthly", name: "Mensal", billingCycleMonths: 1 },
  { id: "quarterly", name: "Trimestral", billingCycleMonths: 3 },
  { id: "annual", name: "Anual", billingCycleMonths: 12 },
];

function calculateCredits(billingCycleMonths: number): number {
  return billingCycleMonths * 30;
}

export function UserSubscriptionDialog({
  userId,
  userName,
  open,
  onOpenChange,
}: UserSubscriptionDialogProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // Form state
  const [productId, setProductId] = useState<string>("monthly");
  const [status, setStatus] = useState<string>("active");
  const [periodStart, setPeriodStart] = useState<string>("");
  const [periodEnd, setPeriodEnd] = useState<string>("");

  // Fetch current subscription
  const { data: subscription, isLoading } = useQuery({
    queryKey: ["admin-subscription", userId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("subscriptions")
        .select("*")
        .eq("user_id", userId)
        .eq("status", "active")
        .order("created_at", { ascending: false })
        .maybeSingle();

      if (error && error.code !== "PGRST116") throw error;
      return data as Subscription | null;
    },
    enabled: open && !!userId,
  });

  const selectedPlan = PLAN_OPTIONS.find((p) => p.id === productId) || PLAN_OPTIONS[0];
  const billingCycleMonths = selectedPlan.billingCycleMonths;

  // Função para calcular data de término
  const calculateEndDate = (startDateString: string, months: number): string => {
    if (!startDateString) return "";
    const start = new Date(startDateString);
    const end = new Date(start);
    end.setMonth(end.getMonth() + months);
    return end.toISOString().split("T")[0];
  };

  // Initialize form when subscription loads
  useEffect(() => {
    if (subscription) {
      setProductId(subscription.product_id || "monthly");
      setStatus(subscription.status);
      const startDate = subscription.current_period_start
        ? new Date(subscription.current_period_start).toISOString().split("T")[0]
        : new Date().toISOString().split("T")[0];
      setPeriodStart(startDate);

      // Se não tem data de término ou se precisa recalcular baseado no plano atual
      const planMonths = PLAN_OPTIONS.find(p => p.id === subscription.product_id)?.billingCycleMonths || 1;
      if (subscription.current_period_end) {
        setPeriodEnd(new Date(subscription.current_period_end).toISOString().split("T")[0]);
      } else {
        setPeriodEnd(calculateEndDate(startDate, planMonths));
      }
    } else {
      // New subscription defaults - usa data de hoje
      setProductId("monthly");
      setStatus("active");
      const today = new Date().toISOString().split("T")[0];
      setPeriodStart(today);
      const selectedPlanMonths = PLAN_OPTIONS.find(p => p.id === "monthly")?.billingCycleMonths || 1;
      setPeriodEnd(calculateEndDate(today, selectedPlanMonths));
    }
  }, [subscription]);

  // Atualiza data de término automaticamente quando plano muda (só para novas assinaturas)
  useEffect(() => {
    // Só recalcula se for nova assinatura (sem subscription) e tiver data de início
    if (periodStart && !subscription) {
      const calculatedEnd = calculateEndDate(periodStart, billingCycleMonths);
      setPeriodEnd(calculatedEnd);
    }
  }, [productId, billingCycleMonths, periodStart, subscription]);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const startDate = periodStart ? new Date(periodStart) : new Date();
      const endDate = periodEnd
        ? new Date(periodEnd)
        : (() => {
          const date = new Date(startDate);
          date.setMonth(date.getMonth() + billingCycleMonths);
          return date;
        })();

      const productName = selectedPlan.name;
      const credits = calculateCredits(billingCycleMonths);

      if (subscription) {
        // Update existing subscription
        const { error } = await supabase.rpc("upsert_subscription", {
          p_user_id: userId,
          p_cakto_order_id: `admin-${Date.now()}`,
          p_cakto_offer_id: null,
          p_product_id: productId,
          p_product_name: productName,
          p_status: status,
          p_credits: credits,
          p_billing_cycle_months: billingCycleMonths,
          p_auto_renew: true,
          p_current_period_start: startDate.toISOString(),
          p_current_period_end: endDate.toISOString(),
        });

        if (error) throw error;

        toast({
          title: "Assinatura atualizada",
          description: `Plano do usuário ${userName || userId} atualizado com sucesso.`,
        });
      } else {
        // Create new subscription
        const { error } = await supabase.rpc("upsert_subscription", {
          p_user_id: userId,
          p_cakto_order_id: `admin-${Date.now()}`,
          p_cakto_offer_id: null,
          p_product_id: productId,
          p_product_name: productName,
          p_status: status,
          p_credits: credits,
          p_billing_cycle_months: billingCycleMonths,
          p_auto_renew: true,
          p_current_period_start: startDate.toISOString(),
          p_current_period_end: endDate.toISOString(),
        });

        if (error) throw error;

        toast({
          title: "Assinatura criada",
          description: `Plano ${productName} adicionado para ${userName || userId}.`,
        });
      }

      // Invalidate queries to refresh data
      queryClient.invalidateQueries({ queryKey: ["admin-users"] });
      queryClient.invalidateQueries({ queryKey: ["admin-subscription", userId] });
      onOpenChange(false);
    } catch (error) {
      console.error("Error saving subscription:", error);
      toast({
        title: "Erro",
        description:
          error instanceof Error
            ? error.message
            : "Falha ao salvar assinatura. Verifique as políticas RLS.",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!subscription) return;

    setIsDeleting(true);
    try {
      // Deactivate subscription instead of deleting
      const { error } = await supabase.rpc("upsert_subscription", {
        p_user_id: userId,
        p_cakto_order_id: `admin-${Date.now()}`,
        p_status: "inactive",
        p_credits: 0,
        p_auto_renew: false,
      });

      if (error) throw error;

      toast({
        title: "Assinatura removida",
        description: `Plano do usuário ${userName || userId} foi removido.`,
      });

      queryClient.invalidateQueries({ queryKey: ["admin-users"] });
      queryClient.invalidateQueries({ queryKey: ["admin-subscription", userId] });
      setShowDeleteDialog(false);
      onOpenChange(false);
    } catch (error) {
      console.error("Error deleting subscription:", error);
      toast({
        title: "Erro",
        description:
          error instanceof Error
            ? error.message
            : "Falha ao remover assinatura. Verifique as políticas RLS.",
        variant: "destructive",
      });
    } finally {
      setIsDeleting(false);
    }
  };


  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto w-[95vw] sm:w-full">
          <DialogHeader>
            <DialogTitle>
              {subscription ? "Editar Assinatura" : "Adicionar Assinatura"}
            </DialogTitle>
            <DialogDescription>
              {subscription
                ? `Gerenciar plano de ${userName || userId}`
                : `Criar nova assinatura para ${userName || userId}`}
            </DialogDescription>
          </DialogHeader>

          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin" />
            </div>
          ) : (
            <div className="space-y-4 py-4">
              {/* Current Status */}
              {subscription && (
                <div className="p-4 bg-muted rounded-lg">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium">Status Atual</p>
                      <div className="flex items-center gap-2 mt-1">
                        <Badge variant={subscription.status === "active" ? "default" : "secondary"}>
                          {subscription.status === "active" ? "Ativo" : "Inativo"}
                        </Badge>
                        {subscription.product_name && (
                          <span className="text-sm text-muted-foreground">
                            {subscription.product_name}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Plan Selection */}
              <div className="space-y-2">
                <Label htmlFor="plan">Plano</Label>
                <Select
                  value={productId}
                  onValueChange={(value) => {
                    setProductId(value);
                    // Recalcula data de término quando mudar o plano (só para novas assinaturas)
                    if (periodStart && !subscription) {
                      const newPlan = PLAN_OPTIONS.find(p => p.id === value);
                      if (newPlan) {
                        const calculatedEnd = calculateEndDate(periodStart, newPlan.billingCycleMonths);
                        setPeriodEnd(calculatedEnd);
                      }
                    }
                  }}
                >
                  <SelectTrigger id="plan">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {PLAN_OPTIONS.map((plan) => (
                      <SelectItem key={plan.id} value={plan.id}>
                        {plan.name} ({plan.billingCycleMonths} mês
                        {plan.billingCycleMonths > 1 ? "es" : ""})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  {selectedPlan.name} - {billingCycleMonths} mês
                  {billingCycleMonths > 1 ? "es" : ""} - {calculateCredits(billingCycleMonths)}{" "}
                  créditos
                </p>
              </div>

              {/* Status */}
              <div className="space-y-2">
                <Label htmlFor="status">Status</Label>
                <Select value={status} onValueChange={setStatus}>
                  <SelectTrigger id="status">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">Ativo</SelectItem>
                    <SelectItem value="inactive">Inativo</SelectItem>
                    <SelectItem value="cancelled">Cancelado</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Period Dates */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="periodStart">Data de Início</Label>
                  <Input
                    id="periodStart"
                    type="date"
                    value={periodStart}
                    onChange={(e) => {
                      setPeriodStart(e.target.value);
                      // Recalcula data de término automaticamente
                      if (e.target.value) {
                        const calculatedEnd = calculateEndDate(e.target.value, billingCycleMonths);
                        setPeriodEnd(calculatedEnd);
                      }
                    }}
                  />
                  <p className="text-xs text-muted-foreground">
                    Padrão: data de hoje
                  </p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="periodEnd">
                    Data de Término
                    {!subscription && (
                      <span className="text-xs text-muted-foreground ml-2 font-normal">
                        (calculada automaticamente)
                      </span>
                    )}
                  </Label>
                  <Input
                    id="periodEnd"
                    type="date"
                    value={periodEnd}
                    onChange={(e) => setPeriodEnd(e.target.value)}
                    readOnly={!subscription}
                    className={!subscription ? "bg-muted cursor-not-allowed" : ""}
                  />
                  {!subscription && (
                    <p className="text-xs text-muted-foreground">
                      Calculada automaticamente: data de início + {billingCycleMonths} mês
                      {billingCycleMonths > 1 ? "es" : ""}
                    </p>
                  )}
                </div>
              </div>

              {/* Info Summary */}
              <div className="p-4 bg-primary/5 rounded-lg border border-primary/20">
                <p className="text-sm font-medium mb-2">Resumo</p>
                <ul className="text-xs space-y-1 text-muted-foreground">
                  <li>• Plano: {selectedPlan.name}</li>
                  <li>• Ciclo de cobrança: {billingCycleMonths} mês(es)</li>
                  <li>• Créditos: {calculateCredits(billingCycleMonths)}</li>
                  <li>• Status: {status === "active" ? "Ativo" : status === "inactive" ? "Inativo" : "Cancelado"}</li>
                  {periodStart && (
                    <li>
                      • Período: {new Date(periodStart).toLocaleDateString("pt-BR")} até{" "}
                      {periodEnd ? new Date(periodEnd).toLocaleDateString("pt-BR") : "N/A"}
                    </li>
                  )}
                </ul>
              </div>
            </div>
          )}

          <DialogFooter className="flex flex-col sm:flex-row justify-between gap-2">
            <div className="w-full sm:w-auto">
              {subscription && (
                <Button
                  variant="destructive"
                  onClick={() => setShowDeleteDialog(true)}
                  disabled={isSaving || isDeleting}
                  className="w-full sm:w-auto"
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  Remover Plano
                </Button>
              )}
            </div>
            <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
              <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isSaving || isDeleting} className="w-full sm:w-auto">
                Cancelar
              </Button>
              <Button onClick={handleSave} disabled={isSaving || isDeleting} className="w-full sm:w-auto">
                {isSaving ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Salvando...
                  </>
                ) : subscription ? (
                  "Atualizar"
                ) : (
                  "Criar Assinatura"
                )}
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remover Assinatura?</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja remover o plano de {userName || userId}? Esta ação
              desativará a assinatura e o usuário perderá acesso aos recursos premium.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} disabled={isDeleting}>
              {isDeleting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Removendo...
                </>
              ) : (
                "Remover"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}


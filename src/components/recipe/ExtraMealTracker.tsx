import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Loader2, UtensilsCrossed, AlertTriangle, Check } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface MacroEstimate {
  meal_name: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  notes: string;
}

interface ExtraMealTrackerProps {
  userGoals: {
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
  };
  onMealLogged: (macros: MacroEstimate) => void;
}

const ExtraMealTracker = ({ userGoals, onMealLogged }: ExtraMealTrackerProps) => {
  const { t, i18n } = useTranslation();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [mealDescription, setMealDescription] = useState("");
  const [isEstimating, setIsEstimating] = useState(false);
  const [estimatedMacros, setEstimatedMacros] = useState<MacroEstimate | null>(null);

  const handleEstimateMacros = async () => {
    if (!mealDescription.trim()) return;

    setIsEstimating(true);
    setEstimatedMacros(null);

    try {
      const { data, error } = await supabase.functions.invoke('estimate-meal-macros', {
        body: { 
          mealDescription,
          language: i18n.language
        }
      });

      if (error) throw error;
      if (data.error) throw new Error(data.error);

      setEstimatedMacros(data);
    } catch (error) {
      console.error('Error estimating macros:', error);
      toast({
        title: t('extraMeal.errorTitle'),
        description: t('extraMeal.errorDesc'),
        variant: "destructive",
      });
    } finally {
      setIsEstimating(false);
    }
  };

  const handleConfirmMeal = () => {
    if (estimatedMacros) {
      onMealLogged(estimatedMacros);
      toast({
        title: t('extraMeal.loggedTitle'),
        description: t('extraMeal.loggedDesc'),
      });
      setOpen(false);
      setMealDescription("");
      setEstimatedMacros(null);
    }
  };

  const getRemainingMacros = () => {
    if (!estimatedMacros) return null;
    return {
      calories: Math.max(0, userGoals.calories - estimatedMacros.calories),
      protein: Math.max(0, userGoals.protein - estimatedMacros.protein),
      carbs: Math.max(0, userGoals.carbs - estimatedMacros.carbs),
      fat: Math.max(0, userGoals.fat - estimatedMacros.fat),
    };
  };

  const remaining = getRemainingMacros();

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="gap-2" disabled>
          <UtensilsCrossed className="w-4 h-4" />
          {t('extraMeal.button')}
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UtensilsCrossed className="w-5 h-5" />
            {t('extraMeal.title')}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div>
            <label className="text-sm font-medium mb-2 block">
              {t('extraMeal.descriptionLabel')}
            </label>
            <Input
              placeholder={t('extraMeal.placeholder')}
              value={mealDescription}
              onChange={(e) => setMealDescription(e.target.value)}
              disabled={isEstimating}
            />
            <p className="text-xs text-muted-foreground mt-1">
              {t('extraMeal.hint')}
            </p>
          </div>

          <Button 
            onClick={handleEstimateMacros} 
            disabled={!mealDescription.trim() || isEstimating}
            className="w-full"
          >
            {isEstimating ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
                {t('extraMeal.estimating')}
              </>
            ) : (
              t('extraMeal.estimate')
            )}
          </Button>

          {estimatedMacros && (
            <Card className="border-warning/30 bg-warning/5">
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-warning" />
                  {estimatedMacros.meal_name}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div className="bg-background/50 p-2 rounded">
                    <span className="text-muted-foreground">{t('extraMeal.consumed')}</span>
                    <div className="font-semibold">{estimatedMacros.calories} kcal</div>
                  </div>
                  <div className="bg-background/50 p-2 rounded">
                    <span className="text-muted-foreground">{t('profile.protein')}</span>
                    <div className="font-semibold">{estimatedMacros.protein}g</div>
                  </div>
                  <div className="bg-background/50 p-2 rounded">
                    <span className="text-muted-foreground">{t('profile.carbs')}</span>
                    <div className="font-semibold">{estimatedMacros.carbs}g</div>
                  </div>
                  <div className="bg-background/50 p-2 rounded">
                    <span className="text-muted-foreground">{t('profile.fat')}</span>
                    <div className="font-semibold">{estimatedMacros.fat}g</div>
                  </div>
                </div>

                {remaining && (
                  <div className="pt-2 border-t border-border">
                    <p className="text-xs text-muted-foreground mb-2">{t('extraMeal.remaining')}</p>
                    <div className="flex flex-wrap gap-2 text-xs">
                      <span className="px-2 py-1 bg-primary/10 rounded">{remaining.calories} kcal</span>
                      <span className="px-2 py-1 bg-primary/10 rounded">{remaining.protein}g P</span>
                      <span className="px-2 py-1 bg-primary/10 rounded">{remaining.carbs}g C</span>
                      <span className="px-2 py-1 bg-primary/10 rounded">{remaining.fat}g G</span>
                    </div>
                  </div>
                )}

                {estimatedMacros.notes && (
                  <p className="text-xs text-muted-foreground italic">
                    {estimatedMacros.notes}
                  </p>
                )}

                <Button onClick={handleConfirmMeal} className="w-full gap-2">
                  <Check className="w-4 h-4" />
                  {t('extraMeal.confirm')}
                </Button>
              </CardContent>
            </Card>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ExtraMealTracker;

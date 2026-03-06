import { Helmet } from "react-helmet";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import MobileBottomNav from "@/components/layout/MobileBottomNav";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Slider } from "@/components/ui/slider";
import { Checkbox } from "@/components/ui/checkbox";
import { User, Target, Save, Loader2, ShieldAlert, Sparkles, TrendingUp, CheckCircle2, Crown, RefreshCw, Calendar, CreditCard, AlertCircle, Gift, ChevronRight } from "lucide-react";
import NotificationSettings from "@/components/NotificationSettings";
import { useAuth } from "@/contexts/AuthContext";
import { useSubscription } from "@/hooks/useSubscription";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useTranslation } from "react-i18next";
import { Badge } from "@/components/ui/badge";

interface ProfileData {
  full_name: string | null;
  avatar_url: string | null;
  daily_calories_goal: number;
  daily_protein_goal: number;
  daily_carbs_goal: number;
  daily_fat_goal: number;
  dietary_restrictions: string[];
}

const Profile = () => {
  const { t } = useTranslation();
  const { user, loading: authLoading } = useAuth();
  const { subscription, isActive, loading: subscriptionLoading, refetch } = useSubscription();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [refreshing, setRefreshing] = useState(false);

  const DIETARY_OPTIONS = [
    { id: "vegano", label: t('profile.dietary.vegan') },
    { id: "vegetariano", label: t('profile.dietary.vegetarian') },
    { id: "sem_gluten", label: t('profile.dietary.glutenFree') },
    { id: "sem_lactose", label: t('profile.dietary.lactoseFree') },
    { id: "alergia_amendoim", label: t('profile.dietary.peanutAllergy') },
    { id: "alergia_frutos_mar", label: t('profile.dietary.seafoodAllergy') },
  ];

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [profile, setProfile] = useState<ProfileData>({
    full_name: "",
    avatar_url: null,
    daily_calories_goal: 1000,
    daily_protein_goal: 50,
    daily_carbs_goal: 50,
    daily_fat_goal: 20,
    dietary_restrictions: [],
  });

  useEffect(() => {
    if (!authLoading && !user) {
      navigate("/auth");
    }
  }, [user, authLoading, navigate]);

  useEffect(() => {
    if (user) {
      fetchProfile();
    }
  }, [user]);

  const fetchProfile = async () => {
    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("user_id", user?.id)
        .maybeSingle();

      if (error) throw error;

      if (data) {
        setProfile({
          full_name: data.full_name,
          avatar_url: data.avatar_url,
          daily_calories_goal: data.daily_calories_goal ?? 1000,
          daily_protein_goal: data.daily_protein_goal ?? 50,
          daily_carbs_goal: data.daily_carbs_goal ?? 50,
          daily_fat_goal: data.daily_fat_goal ?? 20,
          dietary_restrictions: (data.dietary_restrictions as string[]) || [],
        });
      }
    } catch (error) {
      console.error("Error fetching profile:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!user) return;

    setSaving(true);
    try {
      const { error } = await supabase
        .from("profiles")
        .update({
          full_name: profile.full_name,
          daily_calories_goal: profile.daily_calories_goal,
          daily_protein_goal: profile.daily_protein_goal,
          daily_carbs_goal: profile.daily_carbs_goal,
          daily_fat_goal: profile.daily_fat_goal,
          dietary_restrictions: profile.dietary_restrictions,
        })
        .eq("user_id", user.id);

      if (error) throw error;

      toast({
        title: t('profile.profileUpdated'),
        description: t('profile.profileUpdatedDesc'),
      });
    } catch (error) {
      console.error("Error saving profile:", error);
      toast({
        title: t('profile.saveError'),
        description: t('profile.saveErrorDesc'),
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleDietaryRestrictionChange = (restrictionId: string, checked: boolean) => {
    setProfile(prev => ({
      ...prev,
      dietary_restrictions: checked
        ? [...prev.dietary_restrictions, restrictionId]
        : prev.dietary_restrictions.filter(r => r !== restrictionId)
    }));
  };

  const handleRefreshSubscription = async () => {
    setRefreshing(true);
    try {
      await refetch();
      toast({
        title: t('subscription.refreshed'),
        description: t('subscription.refreshedDesc'),
      });
    } catch (error) {
      console.error("Error refreshing subscription:", error);
      toast({
        title: t('subscription.refreshError'),
        description: t('subscription.refreshErrorDesc'),
        variant: "destructive",
      });
    } finally {
      setRefreshing(false);
    }
  };

  const formatDate = (dateString: string | null | undefined) => {
    if (!dateString) return "N/A";
    return new Date(dateString).toLocaleDateString("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  };

  const getPlanName = (productName: string | null) => {
    if (!productName) return "Plano";
    const planMap: Record<string, string> = {
      "Mensal": t('subscription.planNames.Mensal'),
      "Trimestral": t('subscription.planNames.Trimestral'),
      "Anual": t('subscription.planNames.Anual'),
    };
    return planMap[productName] || productName;
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  const getInitials = (name: string | null) => {
    if (!name) return "U";
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <>
      <Helmet>
        <title>{t('profile.title')} | Cook</title>
        <meta name="description" content={t('profile.nutritionalGoalsDesc')} />
      </Helmet>

      <div className="min-h-screen bg-background flex flex-col">
        <div className="hidden md:block"><Header /></div>

        <main className="flex-1 container mx-auto px-4 py-4 pt-4 md:py-12 md:pt-28 pb-24 md:pb-8">
          <div className="max-w-3xl mx-auto space-y-6 md:space-y-8">
            {/* Profile Header */}
            <div className="text-center space-y-4 md:space-y-6 animate-fade-up">
              <div className="relative inline-block">
                <Avatar className="w-24 h-24 md:w-32 md:h-32 mx-auto border-4 border-primary/30 shadow-lg ring-4 ring-primary/10">
                  <AvatarImage src={profile.avatar_url || undefined} />
                  <AvatarFallback className="text-2xl md:text-3xl bg-gradient-to-br from-primary/20 to-primary/10 text-primary font-bold">
                    {getInitials(profile.full_name)}
                  </AvatarFallback>
                </Avatar>
                <div className="absolute -bottom-2 -right-2 w-8 h-8 md:w-10 md:h-10 bg-primary rounded-full flex items-center justify-center border-4 border-background shadow-lg">
                  <Sparkles className="w-4 h-4 md:w-5 md:h-5 text-primary-foreground" />
                </div>
              </div>
              <div className="space-y-2">
                <h1 className="text-3xl md:text-4xl font-bold bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text text-transparent">
                  {profile.full_name || t('profile.user')}
                </h1>
                <p className="text-sm md:text-base text-muted-foreground break-all flex items-center justify-center gap-2">
                  <User className="w-4 h-4" />
                  {user?.email}
                </p>
              </div>
            </div>

            {/* Referral Program Card */}
            <div
              className="relative overflow-hidden rounded-2xl border border-primary/20 bg-gradient-to-r from-primary/10 via-primary/5 to-transparent p-4 sm:p-5 cursor-pointer hover:shadow-lg transition-all group animate-fade-up"
              onClick={() => navigate('/afiliado')}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-primary/20 flex items-center justify-center group-hover:scale-110 transition-transform">
                    <Gift className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-sm sm:text-base">Programa de Indicação</h3>
                    <p className="text-xs text-muted-foreground">Indique amigos e ganhe recompensas</p>
                  </div>
                </div>
                <ChevronRight className="w-5 h-5 text-muted-foreground group-hover:translate-x-1 transition-transform" />
              </div>
            </div>

            {/* Subscription Status */}
            <Card className="border-primary/20 shadow-lg hover:shadow-xl transition-shadow">
              <CardHeader className="bg-gradient-to-r from-primary/5 to-transparent border-b border-border/50">
                <CardTitle className="flex items-center gap-2 text-lg">
                  <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                    <Crown className="w-5 h-5 text-primary" />
                  </div>
                  {t('subscription.title')}
                </CardTitle>
                <CardDescription className="mt-2">
                  {t('subscription.description')}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4 pt-6">
                {subscriptionLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="w-6 h-6 animate-spin text-primary" />
                  </div>
                ) : isActive && subscription ? (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <Badge variant="default" className="text-sm px-3 py-1">
                          <Crown className="w-3 h-3 mr-1" />
                          {getPlanName(subscription.product_name)}
                        </Badge>
                        <Badge variant="outline" className="text-sm">
                          {subscription.status === "active" ? t('subscription.active') : subscription.status}
                        </Badge>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleRefreshSubscription}
                        disabled={refreshing}
                      >
                        {refreshing ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <RefreshCw className="w-4 h-4" />
                        )}
                      </Button>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                      <div className="space-y-1 p-3 rounded-lg bg-muted/50">
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <CreditCard className="w-4 h-4" />
                          <span>{t('subscription.credits')}</span>
                        </div>
                        <p className="text-2xl font-bold text-primary">
                          {subscription.credits || 0}
                        </p>
                      </div>

                      <div className="space-y-1 p-3 rounded-lg bg-muted/50">
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Calendar className="w-4 h-4" />
                          <span>{t('subscription.validUntil')}</span>
                        </div>
                        <p className="text-lg font-semibold">
                          {subscription.current_period_end
                            ? formatDate(subscription.current_period_end)
                            : t('subscription.indefinite')}
                        </p>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-6 space-y-4">
                    <div className="flex flex-col items-center gap-3">
                      <AlertCircle className="w-12 h-12 text-muted-foreground" />
                      <div>
                        <p className="font-semibold text-lg">{t('subscription.noPlan')}</p>
                        <p className="text-sm text-muted-foreground mt-1">
                          {t('subscription.freePlan')}
                        </p>
                      </div>
                    </div>
                    <div className="flex gap-2 justify-center">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleRefreshSubscription}
                        disabled={refreshing}
                      >
                        {refreshing ? (
                          <>
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                            {t('subscription.refreshing')}
                          </>
                        ) : (
                          <>
                            <RefreshCw className="w-4 h-4 mr-2" />
                            {t('subscription.refresh')}
                          </>
                        )}
                      </Button>
                      <Button
                        onClick={() => navigate("/precos")}
                        size="sm"
                      >
                        {t('subscription.viewPlans')}
                      </Button>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Personal Info */}
            <Card className="border-primary/20 shadow-lg hover:shadow-xl transition-shadow">
              <CardHeader className="bg-gradient-to-r from-primary/5 to-transparent border-b border-border/50">
                <CardTitle className="flex items-center gap-2 text-lg">
                  <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                    <User className="w-5 h-5 text-primary" />
                  </div>
                  {t('profile.personalInfo')}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-5 pt-6">
                <div className="space-y-2">
                  <Label htmlFor="name" className="text-sm font-semibold">
                    {t('profile.fullName')}
                  </Label>
                  <Input
                    id="name"
                    value={profile.full_name || ""}
                    onChange={(e) => setProfile({ ...profile, full_name: e.target.value })}
                    placeholder={t('profile.fullNamePlaceholder')}
                    className="h-11"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-sm font-semibold">{t('profile.email')}</Label>
                  <Input
                    value={user?.email || ""}
                    disabled
                    className="bg-muted/50 cursor-not-allowed h-11"
                  />
                </div>
              </CardContent>
            </Card>

            {/* Dietary Restrictions */}
            <Card className="border-primary/20 shadow-lg hover:shadow-xl transition-shadow">
              <CardHeader className="bg-gradient-to-r from-primary/5 to-transparent border-b border-border/50">
                <CardTitle className="flex items-center gap-2 text-lg">
                  <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                    <ShieldAlert className="w-5 h-5 text-primary" />
                  </div>
                  {t('profile.dietaryRestrictions')}
                </CardTitle>
                <CardDescription className="mt-2">
                  {t('profile.dietaryRestrictionsDesc')}
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-6">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {DIETARY_OPTIONS.map((option) => {
                    const isChecked = profile.dietary_restrictions.includes(option.id);
                    return (
                      <div
                        key={option.id}
                        className={`flex items-center space-x-3 p-3 rounded-lg border transition-all cursor-pointer ${isChecked
                          ? 'bg-primary/5 border-primary/30 shadow-sm'
                          : 'bg-background border-border hover:border-primary/20'
                          }`}
                        onClick={() => handleDietaryRestrictionChange(option.id, !isChecked)}
                      >
                        <Checkbox
                          id={option.id}
                          checked={isChecked}
                          onCheckedChange={(checked) =>
                            handleDietaryRestrictionChange(option.id, checked as boolean)
                          }
                        />
                        <Label
                          htmlFor={option.id}
                          className="text-sm font-medium cursor-pointer flex-1"
                        >
                          {option.label}
                        </Label>
                        {isChecked && (
                          <CheckCircle2 className="w-4 h-4 text-primary" />
                        )}
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>

            {/* Notification Settings */}
            <NotificationSettings />

            {/* Nutritional Goals */}
            <Card className="border-primary/20 shadow-lg hover:shadow-xl transition-shadow">
              <CardHeader className="bg-gradient-to-r from-primary/5 to-transparent border-b border-border/50">
                <CardTitle className="flex items-center gap-2 text-lg">
                  <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                    <Target className="w-5 h-5 text-primary" />
                  </div>
                  {t('profile.nutritionalGoals')}
                </CardTitle>
                <CardDescription className="mt-2 flex items-center gap-2">
                  <TrendingUp className="w-4 h-4" />
                  {t('profile.nutritionalGoalsDesc')}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-8 pt-6">
                {/* Calories */}
                <div className="space-y-4 p-4 rounded-xl bg-gradient-to-br from-primary/5 to-transparent border border-primary/10">
                  <div className="flex justify-between items-center">
                    <Label className="text-base font-semibold flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-primary"></span>
                      {t('profile.calories')}
                    </Label>
                    <span className="text-3xl font-bold bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent">
                      {profile.daily_calories_goal.toLocaleString()} kcal
                    </span>
                  </div>
                  <Slider
                    value={[profile.daily_calories_goal]}
                    onValueChange={([value]) => setProfile({ ...profile, daily_calories_goal: value })}
                    min={1000}
                    max={5000}
                    step={50}
                    className="w-full"
                  />
                  <div className="flex justify-between text-xs text-muted-foreground font-medium">
                    <span>1.000 kcal</span>
                    <span>5.000 kcal</span>
                  </div>
                </div>

                {/* Protein */}
                <div className="space-y-4 p-4 rounded-xl bg-gradient-to-br from-mode-monstro/10 to-transparent border border-mode-monstro/20">
                  <div className="flex justify-between items-center">
                    <Label className="text-base font-semibold flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-mode-monstro"></span>
                      {t('profile.protein')}
                    </Label>
                    <span className="text-3xl font-bold text-mode-monstro">
                      {profile.daily_protein_goal}g
                    </span>
                  </div>
                  <Slider
                    value={[profile.daily_protein_goal]}
                    onValueChange={([value]) => setProfile({ ...profile, daily_protein_goal: value })}
                    min={50}
                    max={400}
                    step={5}
                    className="w-full"
                  />
                  <div className="flex justify-between text-xs text-muted-foreground font-medium">
                    <span>50g</span>
                    <span>400g</span>
                  </div>
                </div>

                {/* Carbs */}
                <div className="space-y-4 p-4 rounded-xl bg-gradient-to-br from-mode-faxina/10 to-transparent border border-mode-faxina/20">
                  <div className="flex justify-between items-center">
                    <Label className="text-base font-semibold flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-mode-faxina"></span>
                      {t('profile.carbs')}
                    </Label>
                    <span className="text-3xl font-bold text-mode-faxina">
                      {profile.daily_carbs_goal}g
                    </span>
                  </div>
                  <Slider
                    value={[profile.daily_carbs_goal]}
                    onValueChange={([value]) => setProfile({ ...profile, daily_carbs_goal: value })}
                    min={50}
                    max={500}
                    step={10}
                    className="w-full"
                  />
                  <div className="flex justify-between text-xs text-muted-foreground font-medium">
                    <span>50g</span>
                    <span>500g</span>
                  </div>
                </div>

                {/* Fat */}
                <div className="space-y-4 p-4 rounded-xl bg-gradient-to-br from-mode-seca/10 to-transparent border border-mode-seca/20">
                  <div className="flex justify-between items-center">
                    <Label className="text-base font-semibold flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-mode-seca"></span>
                      {t('profile.fat')}
                    </Label>
                    <span className="text-3xl font-bold text-mode-seca">
                      {profile.daily_fat_goal}g
                    </span>
                  </div>
                  <Slider
                    value={[profile.daily_fat_goal]}
                    onValueChange={([value]) => setProfile({ ...profile, daily_fat_goal: value })}
                    min={20}
                    max={200}
                    step={5}
                    className="w-full"
                  />
                  <div className="flex justify-between text-xs text-muted-foreground font-medium">
                    <span>20g</span>
                    <span>200g</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Save Button */}
            <div className="pt-4">
              <Button
                onClick={handleSave}
                className="w-full h-12 text-base font-semibold shadow-lg hover:shadow-xl transition-all"
                size="lg"
                disabled={saving}
              >
                {saving ? (
                  <>
                    <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                    {t('profile.saving')}
                  </>
                ) : (
                  <>
                    <Save className="w-5 h-5 mr-2" />
                    {t('profile.saveChanges')}
                  </>
                )}
              </Button>
            </div>
          </div>
        </main>

        <div className="hidden md:block"><Footer /></div>
        <MobileBottomNav />
      </div>
    </>
  );
};

export default Profile;

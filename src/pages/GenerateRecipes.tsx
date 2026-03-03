import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import MobileBottomNav from "@/components/layout/MobileBottomNav";
import ImageUpload from "@/components/recipe/ImageUpload";
import ModeSelector, { RecipeMode } from "@/components/recipe/ModeSelector";
import MealCategorySelector, { MealCategory } from "@/components/recipe/MealCategorySelector";
import RecipeCard from "@/components/recipe/RecipeCard";
import HealthDisclaimer from "@/components/recipe/HealthDisclaimer";
import ShoppingList from "@/components/recipe/ShoppingList";
import ExtraMealTracker from "@/components/recipe/ExtraMealTracker";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Sparkles, Loader2, ChefHat, LogIn, Crown, AlertCircle, UtensilsCrossed, Leaf, ImageOff } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useRecipes } from "@/hooks/useRecipes";
import { useUserLimits } from "@/hooks/useUserLimits";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

const GenerateRecipes = () => {
  const { t, i18n } = useTranslation();
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [selectedMode, setSelectedMode] = useState<RecipeMode>("faxina");
  const [selectedMealCategory, setSelectedMealCategory] = useState<MealCategory>("lunch");
  const [savingRecipeId, setSavingRecipeId] = useState<string | null>(null);
  const [usePantryBasics, setUsePantryBasics] = useState(true);
  const [economyMode, setEconomyMode] = useState(false);
  const [dietaryRestrictions, setDietaryRestrictions] = useState<string[]>([]);
  const [invalidImageError, setInvalidImageError] = useState<string | null>(null);
  const [userName, setUserName] = useState<string | null>(null);
  const [userGoals, setUserGoals] = useState({
    calories: 2000,
    protein: 150,
    carbs: 250,
    fat: 65
  });

  const { user, loading: authLoading } = useAuth();
  const { isAnalyzing, generatedRecipes, ingredientsFound, generateRecipes, saveRecipe } = useRecipes();
  const {
    limits,
    usage,
    isPro,
    canGenerateRecipe,
    canSaveRecipe,
    canUseMode,
    incrementRecipeGenerated,
    getRemainingRecipes,
    getRemainingSaves,
    loading: limitsLoading
  } = useUserLimits();
  const { toast } = useToast();

  // Fetch user's dietary restrictions and goals
  useEffect(() => {
    const fetchUserProfile = async () => {
      if (!user) return;

      const { data } = await supabase
        .from("profiles")
        .select("dietary_restrictions, daily_calories_goal, daily_protein_goal, daily_carbs_goal, daily_fat_goal, full_name")
        .eq("user_id", user.id)
        .maybeSingle();

      if (data) {
        if (data.dietary_restrictions) {
          setDietaryRestrictions(data.dietary_restrictions as string[]);
        }
        setUserGoals({
          calories: data.daily_calories_goal || 2000,
          protein: data.daily_protein_goal || 150,
          carbs: data.daily_carbs_goal || 250,
          fat: data.daily_fat_goal || 65
        });
        // Set user display name: full_name > email prefix
        const name = data.full_name || user.email?.split('@')[0] || null;
        setUserName(name);
      }
    };

    fetchUserProfile();
  }, [user]);

  const handleImageSelect = (base64: string) => {
    setSelectedImage(base64);
    setInvalidImageError(null);
  };

  const handleClearImage = () => {
    setSelectedImage(null);
    setInvalidImageError(null);
  };

  const handleGenerateRecipes = async () => {
    if (!selectedImage) return;

    setInvalidImageError(null);

    // Check if user can generate
    if (user && !canGenerateRecipe()) {
      toast({
        title: t('generate.limitReachedTitle'),
        description: t('generate.limitReachedDesc'),
        variant: "destructive",
      });
      return;
    }

    // Check if mode is allowed
    if (user && !canUseMode(selectedMode)) {
      toast({
        title: t('generate.modeNotAvailable'),
        description: t('generate.modeNotAvailableDesc'),
        variant: "destructive",
      });
      return;
    }

    try {
      const result = await generateRecipes(
        selectedImage,
        selectedMode,
        dietaryRestrictions,
        usePantryBasics,
        i18n.language,
        selectedMealCategory,
        economyMode,
        userGoals // nutritionalGoals
      );

      // Increment usage after successful generation
      if (user && result && result.length > 0) {
        await incrementRecipeGenerated();
      }
    } catch (error: any) {
      // Handle invalid image error
      if (error?.message?.includes('invalid_image') || error?.error === 'invalid_image') {
        setInvalidImageError(t('generate.invalidImageDesc'));
        toast({
          title: t('generate.invalidImageError'),
          description: t('generate.invalidImageDesc'),
          variant: "destructive",
        });
      }
    }
  };

  const handleSaveRecipe = async (recipe: typeof generatedRecipes[0]) => {
    if (!canSaveRecipe()) {
      toast({
        title: t('generate.savedLimitTitle'),
        description: t('generate.savedLimitDesc', { limit: limits.maxSavedRecipes }),
        variant: "destructive",
      });
      return;
    }

    setSavingRecipeId(recipe.id);
    await saveRecipe(recipe);
    setSavingRecipeId(null);
  };

  const handleMealLogged = async (macros: { meal_name: string; calories: number; protein: number; carbs: number; fat: number; notes: string }) => {
    if (!user) return;

    try {
      // Salva a refeição externa como uma receita no banco
      const { error } = await supabase.from('recipes').insert({
        user_id: user.id,
        title: macros.meal_name,
        description: macros.notes || `Refeição registrada: ${macros.meal_name}`,
        prep_time: '',
        servings: 1,
        calories: macros.calories,
        protein: macros.protein,
        carbs: macros.carbs,
        fat: macros.fat,
        ingredients: [],
        instructions: [],
        mode: 'faxina', // Usa modo padrão para refeições externas
      });

      if (error) throw error;

      // Não precisa incrementar o contador de receitas geradas, pois é uma refeição externa
      // O dashboard já vai somar os macros automaticamente ao buscar todas as receitas
    } catch (error) {
      console.error('Error logging meal:', error);
      toast({
        title: t('extraMeal.errorTitle'),
        description: 'Não foi possível registrar a refeição.',
        variant: 'destructive',
      });
    }
  };

  const disabledModes = isPro ? [] : ["monstro", "seca"];
  const remainingRecipes = getRemainingRecipes();
  // Show progress for any plan with a finite limit (free or monthly)
  const hasFiniteLimit = limits.recipesPerMonth !== Infinity;
  const progressPercent = hasFiniteLimit ? (usage.recipesGenerated / limits.recipesPerMonth) * 100 : 0;

  // Greeting based on time of day
  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Bom dia' : hour < 18 ? 'Boa tarde' : 'Boa noite';
  const greetingEmoji = hour < 12 ? '🌅' : hour < 18 ? '☀️' : '🌙';
  const displayName = userName || (user?.email?.split('@')[0]) || null;
  const initials = displayName ? displayName.slice(0, 2).toUpperCase() : '?';

  return (
    <div className="min-h-screen bg-background">
      <div className="hidden md:block"><Header /></div>

      <main className="pt-0 md:pt-28 pb-24 md:pb-16">
        <div className="container mx-auto px-4">

          {/* ── Mobile greeting header ── */}
          <div className="md:hidden pt-5 pb-4 animate-fade-up">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[#555] text-sm font-medium">
                  {greeting}{displayName ? `, ${displayName.split(' ')[0]}` : ''}! {greetingEmoji}
                </p>
                <h1 className="text-2xl font-black text-white leading-tight mt-0.5">
                  Gerar Receita
                </h1>
              </div>
              {user ? (
                <div className="w-11 h-11 rounded-2xl bg-[#A3E635] flex items-center justify-center flex-shrink-0 shadow-lime-sm">
                  <span className="text-sm font-black text-black">{initials}</span>
                </div>
              ) : (
                <Link to="/auth">
                  <div className="w-11 h-11 rounded-2xl bg-[#1a1a1a] border border-[#2a2a2a] flex items-center justify-center flex-shrink-0">
                    <ChefHat className="w-5 h-5 text-[#444]" />
                  </div>
                </Link>
              )}
            </div>
          </div>
          {/* Page Header - desktop only */}
          <div className="text-center max-w-2xl mx-auto mb-6 md:mb-8 lg:mb-12 animate-fade-up hidden md:block">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[#A3E635]/10 text-[#A3E635] mb-4 border border-[#A3E635]/20">
              <ChefHat className="w-4 h-4" />
              <span className="text-sm font-bold uppercase tracking-wide">{t('generate.badge')}</span>
            </div>
            <h1 className="text-2xl md:text-4xl font-black text-white mb-4">
              {t('generate.title')}
            </h1>
            <p className="text-base md:text-lg text-[#555]">
              {t('generate.subtitle')}
            </p>
          </div>

          {/* Usage Limit Banner */}
          {user && hasFiniteLimit && !limitsLoading && (
            <div className="max-w-2xl mx-auto mb-6 card-dark p-4 border border-[#A3E635]/20 animate-fade-up">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <AlertCircle className="w-4 h-4 text-[#A3E635]" />
                    <span className="font-bold text-sm text-white">
                      {isPro ? t('generate.monthlyPlan') : t('generate.freePlan')}
                    </span>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="flex-1 h-1.5 rounded-full bg-[#1e1e1e] overflow-hidden">
                      <div className="h-full rounded-full bg-[#A3E635]" style={{ width: `${progressPercent}%`, transition: "width 0.8s ease" }} />
                    </div>
                    <span className="text-xs text-[#555] whitespace-nowrap">
                      {remainingRecipes === 0 ? (
                        <span className="text-red-400 font-bold">{t('generate.limitReached')}</span>
                      ) : (
                        t('generate.remaining', { remaining: remainingRecipes, total: limits.recipesPerMonth })
                      )}
                    </span>
                  </div>
                </div>
                {!isPro && (
                  <Link to="/precos">
                    <Button size="sm" className="gap-1 bg-[#A3E635] text-black hover:bg-[#bef264] font-bold text-xs rounded-xl">
                      <Crown className="w-3.5 h-3.5" />
                      {t('generate.upgradePro')}
                    </Button>
                  </Link>
                )}
              </div>
            </div>
          )}

          <div className="grid md:grid-cols-2 lg:grid-cols-12 gap-5 md:gap-8 mb-12">
            {/* Upload Section */}
            <div className="md:col-span-1 lg:col-span-7 animate-fade-up">
              {/* Login prompt */}
              {!authLoading && !user && (
                <div className="mb-4 p-4 card-dark border border-[#1e1e1e]">
                  <div className="flex items-center justify-between gap-4">
                    <p className="text-sm text-[#555]">{t('generate.loginPrompt')}</p>
                    <Link to="/auth">
                      <Button size="sm" className="gap-1.5 bg-[#A3E635] text-black hover:bg-[#bef264] font-bold rounded-xl">
                        <LogIn className="w-3.5 h-3.5" />
                        {t('nav.login')}
                      </Button>
                    </Link>
                  </div>
                </div>
              )}

              <ImageUpload
                onImageSelect={handleImageSelect}
                selectedImage={selectedImage}
                onClear={handleClearImage}
              />

              {invalidImageError && (
                <div className="mt-3 p-3 rounded-2xl bg-red-500/10 border border-red-500/20 flex items-center gap-2">
                  <ImageOff className="h-4 w-4 text-red-400 flex-shrink-0" />
                  <p className="text-sm text-red-400">{invalidImageError}</p>
                </div>
              )}
            </div>

            {/* Mode Selection & Generate */}
            <div className="md:col-span-1 lg:col-span-5 space-y-4 animate-fade-up" style={{ animationDelay: '0.1s' }}>
              <div className="card-dark p-4 md:p-5 lg:sticky lg:top-24">
                <div className="space-y-6">
                  <ModeSelector
                    selectedMode={selectedMode}
                    onModeSelect={setSelectedMode}
                    disabledModes={disabledModes}
                    isPro={isPro}
                  />

                  {/* Meal Category Selection */}
                  <div className="pt-4 border-t border-border">
                    <MealCategorySelector
                      selected={selectedMealCategory}
                      onSelect={setSelectedMealCategory}
                    />
                  </div>

                  {/* Pantry Basics Toggle */}
                  <div className="pt-4 border-t border-[#1e1e1e]">
                    <div className="flex items-center justify-between gap-4">
                      <div className="flex items-center gap-2">
                        <UtensilsCrossed className="w-4 h-4 text-[#555]" />
                        <Label htmlFor="pantry-basics" className="text-sm cursor-pointer text-white font-medium">
                          {t('generate.pantryBasics')}
                        </Label>
                      </div>
                      <Switch
                        id="pantry-basics"
                        checked={usePantryBasics}
                        onCheckedChange={setUsePantryBasics}
                      />
                    </div>
                    <p className="text-xs text-[#444] mt-2 ml-6">
                      {t('generate.pantryBasicsHint')}
                    </p>
                  </div>

                  {/* Economy Mode Toggle */}
                  <div className="pt-4 border-t border-[#1e1e1e]">
                    <div className="flex items-center justify-between gap-4">
                      <div className="flex items-center gap-2">
                        <Leaf className="w-4 h-4 text-[#A3E635]" />
                        <Label htmlFor="economy-mode" className="text-sm cursor-pointer text-white font-medium">
                          {t('generate.economyMode')}
                        </Label>
                      </div>
                      <Switch
                        id="economy-mode"
                        checked={economyMode}
                        onCheckedChange={setEconomyMode}
                      />
                    </div>
                    <p className="text-xs text-[#444] mt-2 ml-6">
                      {t('generate.economyModeHint')}
                    </p>
                  </div>

                  <div className="pt-5 border-t border-[#1e1e1e]">
                    {!user ? (
                      <Link to="/auth" className="block">
                        <button className="w-full flex items-center justify-center gap-2 bg-[#A3E635] hover:bg-[#bef264] text-black font-black text-base py-3.5 rounded-2xl transition-all duration-200 hover:shadow-lime-sm hover:scale-[1.01]">
                          <LogIn className="w-5 h-5" />
                          {t('generate.loginToGenerate')}
                        </button>
                      </Link>
                    ) : (
                      <button
                        className={`w-full flex items-center justify-center gap-2.5 font-black text-base py-3.5 rounded-2xl transition-all duration-200 ${!selectedImage || isAnalyzing || !canGenerateRecipe()
                          ? 'bg-[#1e1e1e] text-[#444] cursor-not-allowed'
                          : 'bg-[#A3E635] hover:bg-[#bef264] text-black hover:shadow-lime-sm hover:scale-[1.01]'
                          }`}
                        disabled={!selectedImage || isAnalyzing || !canGenerateRecipe()}
                        onClick={handleGenerateRecipes}
                      >
                        {isAnalyzing ? (
                          <>
                            <Loader2 className="w-5 h-5 animate-spin" />
                            {t('generate.analyzing')}
                          </>
                        ) : !canGenerateRecipe() ? (
                          <>
                            <Crown className="w-5 h-5" />
                            {t('generate.limitReached')}
                          </>
                        ) : (
                          <>
                            <Sparkles className="w-5 h-5" />
                            {t('generate.generateWithAI')}
                          </>
                        )}
                      </button>
                    )}

                    {user && !selectedImage && (
                      <p className="text-xs text-[#444] text-center mt-3">{t('generate.uploadHint')}</p>
                    )}
                    {user && !canGenerateRecipe() && (
                      <p className="text-xs text-center mt-3">
                        <Link to="/precos" className="text-[#A3E635] hover:underline font-medium">
                          {t('generate.unlimitedRecipes')}
                        </Link>
                      </p>
                    )}
                  </div>

                  {/* Action Buttons */}
                  {user && (
                    <div className="pt-4 border-t border-[#1e1e1e] flex flex-wrap gap-2">
                      <ShoppingList recipes={generatedRecipes} />
                      <ExtraMealTracker
                        userGoals={userGoals}
                        onMealLogged={handleMealLogged}
                      />
                    </div>
                  )}
                </div>
              </div>

              {/* Tips Card */}
              <div className="card-dark p-5">
                <h4 className="font-bold text-white text-sm uppercase tracking-wide mb-3">{t('generate.tips')}</h4>
                <ul className="space-y-2 text-sm text-[#555]">
                  <li className="flex items-start gap-2"><span className="text-[#A3E635] flex-shrink-0">•</span> {t('generate.tip1')}</li>
                  <li className="flex items-start gap-2"><span className="text-[#A3E635] flex-shrink-0">•</span> {t('generate.tip2')}</li>
                  <li className="flex items-start gap-2"><span className="text-[#A3E635] flex-shrink-0">•</span> {t('generate.tip3')}</li>
                </ul>
              </div>

              {/* Saved Recipes Limit */}
              {user && !isPro && (
                <div className="card-dark p-4 text-sm">
                  <div className="flex items-center justify-between">
                    <span className="text-[#555]">{t('generate.savedRecipes')}</span>
                    <span className={`font-bold text-sm px-2.5 py-1 rounded-full ${getRemainingSaves() === 0 ? 'bg-red-500/15 text-red-400' : 'bg-[#A3E635]/12 text-[#A3E635]'
                      }`}>{usage.recipesSaved} / {limits.maxSavedRecipes}</span>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Ingredients Found */}
          {ingredientsFound.length > 0 && (
            <div className="mb-8 animate-fade-up">
              <h3 className="text-base font-black text-white uppercase tracking-wide mb-3">
                {t('generate.ingredientsFound')}
              </h3>
              <div className="flex flex-wrap gap-2">
                {ingredientsFound.map((ingredient, index) => (
                  <span
                    key={index}
                    className="px-3 py-1.5 bg-[#A3E635]/12 text-[#A3E635] rounded-full text-sm font-bold border border-[#A3E635]/25"
                  >
                    {ingredient}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Results Section */}
          {generatedRecipes.length > 0 && (
            <div className="animate-fade-up">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="text-xl md:text-2xl font-bold text-foreground">
                    {t('generate.recipesFound')}
                  </h2>
                  <p className="text-sm md:text-base text-muted-foreground">
                    {t('generate.recipesFoundDesc', { count: generatedRecipes.length })}
                  </p>
                </div>
                <ShoppingList recipes={generatedRecipes} />
              </div>

              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                {generatedRecipes.map((recipe, index) => (
                  <div key={recipe.id} style={{ animationDelay: `${index * 0.1}s` }}>
                    <RecipeCard
                      recipe={recipe}
                      onSave={() => handleSaveRecipe(recipe)}
                      isSaving={savingRecipeId === recipe.id}
                      showSaveButton={!!user && canSaveRecipe()}
                    />
                  </div>
                ))}
              </div>

              {user && !canSaveRecipe() && (
                <div className="mt-6 text-center">
                  <p className="text-muted-foreground mb-2">
                    {t('generate.savedLimitReached', { limit: limits.maxSavedRecipes })}
                  </p>
                  <Link to="/precos">
                    <Button variant="outline" size="sm">
                      <Crown className="w-4 h-4 mr-2" />
                      {t('generate.upgradeToSaveMore')}
                    </Button>
                  </Link>
                </div>
              )}

              {/* Health Disclaimer */}
              <HealthDisclaimer />
            </div>
          )}
        </div>
      </main>

      <div className="hidden md:block"><Footer /></div>
      <MobileBottomNav />
    </div>
  );
};

export default GenerateRecipes;

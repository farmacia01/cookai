import { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Helmet } from "react-helmet";
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import MobileBottomNav from '@/components/layout/MobileBottomNav';
import RecipeCard from '@/components/recipe/RecipeCard';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAuth } from '@/contexts/AuthContext';
import { useRecipes, Recipe } from '@/hooks/useRecipes';
import { supabase } from '@/integrations/supabase/client';
import { ChefHat, Loader2, Plus, Search, Star, Heart } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useTranslation } from 'react-i18next';

const MyRecipes = () => {
  const { t } = useTranslation();
  const { user, loading: authLoading } = useAuth();
  const { fetchSavedRecipes } = useRecipes();
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState('all');
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => { if (!authLoading && !user) navigate('/auth'); }, [user, authLoading, navigate]);
  useEffect(() => { const loadRecipes = async () => { if (user) { const savedRecipes = await fetchSavedRecipes(); setRecipes(savedRecipes); setIsLoading(false); } }; loadRecipes(); }, [user]);

  const handleFavoriteToggle = async (recipeId: string, isFavorite: boolean) => {
    try {
      const { error } = await supabase.from('recipes').update({ is_favorite: isFavorite }).eq('id', recipeId);
      if (error) throw error;
      setRecipes(prev => prev.map(r => r.id === recipeId ? { ...r, is_favorite: isFavorite } : r));
      toast({ title: isFavorite ? t('myRecipes.addedToFavorites') : t('myRecipes.removedFromFavorites'), description: isFavorite ? t('myRecipes.filterFavoritesHint') : "" });
    } catch (error) { console.error('Error updating favorite:', error); toast({ title: t('myRecipes.error'), description: t('myRecipes.favoriteError'), variant: "destructive" }); }
  };

  const handleRate = async (recipeId: string, rating: number) => {
    try {
      const { error } = await supabase.from('recipes').update({ rating }).eq('id', recipeId);
      if (error) throw error;
      setRecipes(prev => prev.map(r => r.id === recipeId ? { ...r, rating } : r));
      toast({ title: t('myRecipes.ratingSaved'), description: rating > 1 ? t('myRecipes.ratingDescPlural', { count: rating }) : t('myRecipes.ratingDesc', { count: rating }) });
    } catch (error) { console.error('Error updating rating:', error); toast({ title: t('myRecipes.error'), description: t('myRecipes.ratingError'), variant: "destructive" }); }
  };

  const filteredRecipes = recipes.filter(recipe => {
    const matchesSearch = recipe.title.toLowerCase().includes(searchTerm.toLowerCase()) || recipe.description?.toLowerCase().includes(searchTerm.toLowerCase());
    if (activeTab === 'favorites') return matchesSearch && recipe.is_favorite;
    if (activeTab === 'rated') return matchesSearch && recipe.rating;
    return matchesSearch;
  });

  if (authLoading || isLoading) return <div className="min-h-screen bg-background flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;

  const favoriteCount = recipes.filter(r => r.is_favorite).length;
  const ratedCount = recipes.filter(r => r.rating).length;

  return (
    <>
      <Helmet><title>{t('myRecipes.badge')} | Cook</title><meta name="description" content={t('myRecipes.subtitle')} /></Helmet>
      <div className="min-h-screen bg-background">
        <div className="hidden md:block"><Header /></div>
        <main className="pt-4 md:pt-28 pb-24 md:pb-16">
          <div className="container mx-auto px-4">
            <div className="text-center max-w-2xl mx-auto mb-8 animate-fade-up">
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 text-primary mb-4"><ChefHat className="w-4 h-4" /><span className="text-sm font-medium">{t('myRecipes.badge')}</span></div>
              <h1 className="text-3xl md:text-4xl font-bold text-foreground mb-4">{t('myRecipes.title')}</h1>
              <p className="text-lg text-muted-foreground">{t('myRecipes.subtitle')}</p>
            </div>
            {recipes.length > 0 && (
              <div className="max-w-xl mx-auto mb-8 space-y-4">
                <div className="relative"><Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" /><Input placeholder={t('myRecipes.searchPlaceholder')} value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="pl-10" /></div>
                <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                  <TabsList className="grid w-full grid-cols-3">
                    <TabsTrigger value="all" className="gap-2"><ChefHat className="w-4 h-4" />{t('myRecipes.all')} ({recipes.length})</TabsTrigger>
                    <TabsTrigger value="favorites" className="gap-2"><Heart className="w-4 h-4" />{t('myRecipes.favorites')} ({favoriteCount})</TabsTrigger>
                    <TabsTrigger value="rated" className="gap-2"><Star className="w-4 h-4" />{t('myRecipes.rated')} ({ratedCount})</TabsTrigger>
                  </TabsList>
                </Tabs>
              </div>
            )}
            {recipes.length === 0 ? (
              <div className="text-center py-16 animate-fade-up">
                <div className="w-20 h-20 mx-auto mb-6 rounded-2xl bg-secondary flex items-center justify-center"><span className="text-4xl">📋</span></div>
                <h3 className="text-xl font-semibold text-foreground mb-2">{t('myRecipes.noRecipes')}</h3>
                <p className="text-muted-foreground mb-6 max-w-md mx-auto">{t('myRecipes.noRecipesDesc')}</p>
                <Link to="/gerar-receitas"><Button variant="hero" size="lg"><Plus className="w-5 h-5" />{t('myRecipes.generateRecipes')}</Button></Link>
              </div>
            ) : filteredRecipes.length === 0 ? (
              <div className="text-center py-16 animate-fade-up">
                <div className="w-20 h-20 mx-auto mb-6 rounded-2xl bg-secondary flex items-center justify-center"><Search className="w-8 h-8 text-muted-foreground" /></div>
                <h3 className="text-xl font-semibold text-foreground mb-2">{t('myRecipes.noResults')}</h3>
                <p className="text-muted-foreground mb-6 max-w-md mx-auto">{t('myRecipes.noResultsDesc')}</p>
                <Button variant="outline" onClick={() => { setSearchTerm(''); setActiveTab('all'); }}>{t('myRecipes.clearFilters')}</Button>
              </div>
            ) : (
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredRecipes.map((recipe, index) => (<div key={recipe.id} className="animate-fade-up" style={{ animationDelay: `${index * 0.1}s` }}><RecipeCard recipe={recipe} showSaveButton={false} showFavoriteAndRating={true} onFavoriteToggle={handleFavoriteToggle} onRate={handleRate} /></div>))}
              </div>
            )}
          </div>
        </main>
        <div className="hidden md:block"><Footer /></div>
        <MobileBottomNav />
      </div>
    </>
  );
};

export default MyRecipes;

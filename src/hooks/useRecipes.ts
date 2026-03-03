import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { RecipeMode } from '@/components/recipe/ModeSelector';
import { MealCategory } from '@/components/recipe/MealCategorySelector';

export interface Recipe {
  id: string;
  title: string;
  description: string;
  prep_time: string;
  servings: number;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  ingredients: string[];
  instructions: string[];
  mode: string;
  is_favorite?: boolean;
  rating?: number | null;
}

export interface GeneratedRecipesResponse {
  ingredients_found: string[];
  recipes: Omit<Recipe, 'id' | 'mode'>[];
}

export const useRecipes = () => {
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [generatedRecipes, setGeneratedRecipes] = useState<Recipe[]>([]);
  const [ingredientsFound, setIngredientsFound] = useState<string[]>([]);
  const { user } = useAuth();
  const { toast } = useToast();

  const generateRecipes = async (
    imageBase64: string, 
    mode: RecipeMode,
    dietaryRestrictions: string[] = [],
    usePantryBasics: boolean = true,
    language: string = 'pt',
    mealCategory: MealCategory = 'lunch',
    economyMode: boolean = false,
    nutritionalGoals?: { calories: number; protein: number; carbs: number; fat: number }
  ) => {
    setIsAnalyzing(true);
    setGeneratedRecipes([]);
    setIngredientsFound([]);

    try {
      const { data, error } = await supabase.functions.invoke('generate-recipes', {
        body: { 
          imageBase64, 
          mode,
          dietaryRestrictions,
          usePantryBasics,
          language,
          mealCategory,
          economyMode,
          nutritionalGoals
        }
      });

      if (error) {
        throw new Error(error.message);
      }

      if (data.error) {
        throw new Error(data.error);
      }

      const response = data as GeneratedRecipesResponse;
      
      setIngredientsFound(response.ingredients_found || []);
      
      const recipes: Recipe[] = response.recipes.map((recipe, index) => ({
        ...recipe,
        id: `generated-${index}-${Date.now()}`,
        mode,
        prep_time: recipe.prep_time,
      }));

      setGeneratedRecipes(recipes);

      toast({
        title: 'Receitas geradas!',
        description: `Encontramos ${recipes.length} receitas deliciosas para você.`,
      });

      return recipes;
    } catch (error: any) {
      console.error('Error generating recipes:', error);
      
      // Extract error message from different possible error formats
      let errorMessage = 'Tente novamente mais tarde.';
      
      if (error?.message) {
        errorMessage = error.message;
      } else if (error?.error) {
        errorMessage = error.error;
      } else if (typeof error === 'string') {
        errorMessage = error;
      }
      
      // Provide user-friendly error messages
      if (errorMessage.includes('não está respondendo') || errorMessage.includes('n8n')) {
        errorMessage = 'O serviço de geração de receitas está temporariamente indisponível. Tente novamente em alguns instantes.';
      } else if (errorMessage.includes('conectar') || errorMessage.includes('connect')) {
        errorMessage = 'Não foi possível conectar ao serviço. Verifique sua conexão e tente novamente.';
      } else if (errorMessage.includes('processar') || errorMessage.includes('parse')) {
        errorMessage = 'Erro ao processar a resposta. Tente novamente ou entre em contato com o suporte.';
      }
      
      toast({
        title: 'Erro ao gerar receitas',
        description: errorMessage,
        variant: 'destructive',
      });
      return [];
    } finally {
      setIsAnalyzing(false);
    }
  };

  const saveRecipe = async (recipe: Recipe) => {
    if (!user) {
      toast({
        title: 'Faça login',
        description: 'Você precisa estar logado para salvar receitas.',
        variant: 'destructive',
      });
      return false;
    }

    try {
      const { error } = await supabase.from('recipes').insert({
        user_id: user.id,
        title: recipe.title,
        description: recipe.description,
        prep_time: recipe.prep_time,
        servings: recipe.servings,
        calories: recipe.calories,
        protein: recipe.protein,
        carbs: recipe.carbs,
        fat: recipe.fat,
        ingredients: recipe.ingredients,
        instructions: recipe.instructions,
        mode: recipe.mode,
      });

      if (error) throw error;

      toast({
        title: 'Receita salva!',
        description: 'A receita foi adicionada ao seu histórico.',
      });
      
      return true;
    } catch (error) {
      console.error('Error saving recipe:', error);
      toast({
        title: 'Erro ao salvar',
        description: 'Não foi possível salvar a receita.',
        variant: 'destructive',
      });
      return false;
    }
  };

  const fetchSavedRecipes = async () => {
    if (!user) return [];

    try {
      const { data, error } = await supabase
        .from('recipes')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;

      return data.map(recipe => ({
        ...recipe,
        prep_time: recipe.prep_time || '',
        ingredients: (recipe.ingredients as string[]) || [],
        instructions: (recipe.instructions as string[]) || [],
      })) as Recipe[];
    } catch (error) {
      console.error('Error fetching recipes:', error);
      return [];
    }
  };

  return {
    isAnalyzing,
    generatedRecipes,
    ingredientsFound,
    generateRecipes,
    saveRecipe,
    fetchSavedRecipes,
  };
};
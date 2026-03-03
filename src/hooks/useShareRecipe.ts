import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface Recipe {
  title: string;
  description: string;
  calories: number;
  protein: number;
  carbs: number;
  prep_time: string;
  servings: number;
}

export const useShareRecipe = () => {
  const [isGeneratingImage, setIsGeneratingImage] = useState(false);
  const [generatedImage, setGeneratedImage] = useState<string | null>(null);

  const generateRecipeImage = async (recipe: Recipe): Promise<string | null> => {
    setIsGeneratingImage(true);
    
    try {
      const { data, error } = await supabase.functions.invoke('generate-recipe-image', {
        body: { recipe }
      });

      if (error) throw error;
      
      const imageUrl = data?.image;
      setGeneratedImage(imageUrl);
      return imageUrl;
    } catch (error) {
      console.error('Error generating image:', error);
      toast.error('Erro ao gerar imagem da receita');
      return null;
    } finally {
      setIsGeneratingImage(false);
    }
  };

  const shareToWhatsApp = (recipe: Recipe) => {
    const text = `🍽️ *${recipe.title}*\n\n${recipe.description}\n\n📊 *Informações Nutricionais:*\n🔥 ${recipe.calories} kcal\n💪 ${recipe.protein}g proteína\n🌾 ${recipe.carbs}g carboidratos\n\n⏱️ ${recipe.prep_time} | 👥 ${recipe.servings} porções\n\nGerado por FitRecipes AI 🤖`;
    const url = `https://wa.me/?text=${encodeURIComponent(text)}`;
    window.open(url, '_blank');
  };

  const shareToTwitter = (recipe: Recipe) => {
    const text = `🍽️ ${recipe.title}\n\n🔥 ${recipe.calories} kcal | 💪 ${recipe.protein}g proteína\n\nGerado por FitRecipes AI 🤖`;
    const url = `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}`;
    window.open(url, '_blank');
  };

  const shareToFacebook = () => {
    const url = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(window.location.href)}`;
    window.open(url, '_blank');
  };

  const copyToClipboard = async (recipe: Recipe) => {
    const text = `🍽️ ${recipe.title}\n\n${recipe.description}\n\n📊 Informações Nutricionais:\n🔥 ${recipe.calories} kcal\n💪 ${recipe.protein}g proteína\n🌾 ${recipe.carbs}g carboidratos\n\n⏱️ ${recipe.prep_time} | 👥 ${recipe.servings} porções`;
    
    try {
      await navigator.clipboard.writeText(text);
      toast.success('Receita copiada!');
    } catch (error) {
      toast.error('Erro ao copiar');
    }
  };

  const downloadImage = async (recipe: Recipe) => {
    let imageUrl = generatedImage;
    
    if (!imageUrl) {
      imageUrl = await generateRecipeImage(recipe);
    }
    
    if (imageUrl) {
      const link = document.createElement('a');
      link.href = imageUrl;
      link.download = `${recipe.title.replace(/\s+/g, '-').toLowerCase()}.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      toast.success('Imagem baixada!');
    }
  };

  return {
    isGeneratingImage,
    generatedImage,
    generateRecipeImage,
    shareToWhatsApp,
    shareToTwitter,
    shareToFacebook,
    copyToClipboard,
    downloadImage
  };
};

import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Clock, Users, Flame, Beef, Wheat, Heart, ChevronDown, ChevronUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import ShareMenu from './ShareMenu';
import FavoriteButton from './FavoriteButton';
import RecipeRating from './RecipeRating';

interface RecipeCardProps {
  recipe: {
    id: string;
    title: string;
    description: string;
    prep_time: string;
    servings: number;
    calories: number;
    protein: number;
    carbs: number;
    fat?: number;
    ingredients: string[];
    instructions?: string[];
    is_favorite?: boolean;
    rating?: number | null;
  };
  onSave?: () => void;
  isSaving?: boolean;
  showSaveButton?: boolean;
  onFavoriteToggle?: (id: string, isFavorite: boolean) => void;
  onRate?: (id: string, rating: number) => void;
  showFavoriteAndRating?: boolean;
}

const RecipeCard = ({ 
  recipe, 
  onSave, 
  isSaving, 
  showSaveButton = true,
  onFavoriteToggle,
  onRate,
  showFavoriteAndRating = false,
}: RecipeCardProps) => {
  const { t } = useTranslation();
  const [isExpanded, setIsExpanded] = useState(false);
  const [localFavorite, setLocalFavorite] = useState(recipe.is_favorite || false);
  const [localRating, setLocalRating] = useState(recipe.rating || null);

  const handleFavoriteToggle = () => {
    const newValue = !localFavorite;
    setLocalFavorite(newValue);
    onFavoriteToggle?.(recipe.id, newValue);
  };

  const handleRate = (rating: number) => {
    setLocalRating(rating);
    onRate?.(recipe.id, rating);
  };

  return (
    <div className="bg-card rounded-2xl border border-border overflow-hidden hover:shadow-lg transition-all duration-300 animate-fade-up">
      {/* Image Placeholder */}
      <div className="aspect-video bg-secondary relative overflow-hidden">
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="text-center p-4">
            <span className="text-4xl mb-2 block">🍽️</span>
            <p className="text-sm text-muted-foreground">{recipe.title}</p>
          </div>
        </div>
        <div className="absolute bottom-0 left-0 right-0 h-16 bg-gradient-to-t from-card to-transparent" />
        
        {/* Favorite Button Overlay */}
        {showFavoriteAndRating && (
          <div className="absolute top-3 right-3">
            <FavoriteButton 
              isFavorite={localFavorite} 
              onToggle={handleFavoriteToggle}
              size="md"
            />
          </div>
        )}
      </div>

      {/* Content */}
      <div className="p-5">
        <div className="flex items-start justify-between gap-2 mb-2">
          <h3 className="text-lg font-bold text-foreground line-clamp-1 flex-1">
            {recipe.title}
          </h3>
        </div>
        
        {/* Rating */}
        {showFavoriteAndRating && (
          <div className="mb-3">
            <RecipeRating 
              rating={localRating} 
              onRate={handleRate}
              size="sm"
            />
          </div>
        )}
        
        <p className="text-sm text-muted-foreground mb-4 line-clamp-2">
          {recipe.description}
        </p>

        {/* Meta info */}
        <div className="flex items-center gap-4 mb-4 text-sm text-muted-foreground">
          <div className="flex items-center gap-1">
            <Clock className="w-4 h-4" />
            <span>{recipe.prep_time}</span>
          </div>
          <div className="flex items-center gap-1">
            <Users className="w-4 h-4" />
            <span>{recipe.servings} {t('recipeCard.servings')}</span>
          </div>
        </div>

        {/* Macros */}
        <div className="grid grid-cols-3 gap-2 mb-4">
          <div className="bg-mode-seca/10 rounded-lg p-2 text-center">
            <Flame className="w-4 h-4 mx-auto text-mode-seca mb-1" />
            <p className="text-xs text-muted-foreground">{t('recipeCard.calories')}</p>
            <p className="text-sm font-semibold text-foreground">{recipe.calories}</p>
          </div>
          <div className="bg-mode-monstro/10 rounded-lg p-2 text-center">
            <Beef className="w-4 h-4 mx-auto text-mode-monstro mb-1" />
            <p className="text-xs text-muted-foreground">{t('recipeCard.protein')}</p>
            <p className="text-sm font-semibold text-foreground">{recipe.protein}g</p>
          </div>
          <div className="bg-mode-faxina/10 rounded-lg p-2 text-center">
            <Wheat className="w-4 h-4 mx-auto text-mode-faxina mb-1" />
            <p className="text-xs text-muted-foreground">{t('recipeCard.carbs')}</p>
            <p className="text-sm font-semibold text-foreground">{recipe.carbs}g</p>
          </div>
        </div>

        {/* Ingredients preview */}
        <div className="mb-4">
          <p className="text-xs text-muted-foreground mb-2">{t('recipeCard.ingredients')}</p>
          <div className="flex flex-wrap gap-1">
            {recipe.ingredients.slice(0, isExpanded ? undefined : 4).map((ingredient, index) => (
              <span 
                key={index}
                className="px-2 py-1 bg-secondary rounded-full text-xs text-secondary-foreground"
              >
                {ingredient}
              </span>
            ))}
            {!isExpanded && recipe.ingredients.length > 4 && (
              <span className="px-2 py-1 bg-secondary rounded-full text-xs text-muted-foreground">
                {t('recipeCard.more', { count: recipe.ingredients.length - 4 })}
              </span>
            )}
          </div>
        </div>

        {/* Expandable instructions */}
        {recipe.instructions && recipe.instructions.length > 0 && (
          <div className={cn("mb-4 overflow-hidden transition-all duration-300", isExpanded ? "max-h-96" : "max-h-0")}>
            <p className="text-xs text-muted-foreground mb-2">{t('recipeCard.instructions')}</p>
            <ol className="list-decimal list-inside space-y-1 text-sm text-foreground">
              {recipe.instructions.map((step, index) => (
                <li key={index} className="leading-relaxed">{step}</li>
              ))}
            </ol>
          </div>
        )}

        {/* Actions */}
        <div className="flex flex-col gap-2">
          <div className="flex gap-2">
            <Button 
              variant="outline" 
              className="flex-1"
              onClick={() => setIsExpanded(!isExpanded)}
            >
              {isExpanded ? (
                <>
                  <ChevronUp className="w-4 h-4" />
                  {t('recipeCard.lessDetails')}
                </>
              ) : (
                <>
                  <ChevronDown className="w-4 h-4" />
                  {t('recipeCard.viewRecipe')}
                </>
              )}
            </Button>
            {showSaveButton && onSave && (
              <Button 
                variant="default" 
                onClick={onSave}
                disabled={isSaving}
              >
                <Heart className="w-4 h-4" />
                {t('recipeCard.save')}
              </Button>
            )}
          </div>
          <ShareMenu recipe={recipe} />
        </div>
      </div>
    </div>
  );
};

export default RecipeCard;

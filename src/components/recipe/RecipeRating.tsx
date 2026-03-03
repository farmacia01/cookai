import { Star } from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";

interface RecipeRatingProps {
  rating: number | null;
  onRate: (rating: number) => void;
  readonly?: boolean;
  size?: "sm" | "md" | "lg";
}

const RecipeRating = ({ rating, onRate, readonly = false, size = "md" }: RecipeRatingProps) => {
  const [hoverRating, setHoverRating] = useState(0);

  const sizeClasses = {
    sm: "w-4 h-4",
    md: "w-5 h-5",
    lg: "w-6 h-6",
  };

  const handleClick = (value: number) => {
    if (!readonly) {
      onRate(value);
    }
  };

  return (
    <div className="flex items-center gap-1">
      {[1, 2, 3, 4, 5].map((value) => {
        const isFilled = value <= (hoverRating || rating || 0);
        
        return (
          <button
            key={value}
            type="button"
            disabled={readonly}
            onClick={() => handleClick(value)}
            onMouseEnter={() => !readonly && setHoverRating(value)}
            onMouseLeave={() => !readonly && setHoverRating(0)}
            className={cn(
              "transition-all duration-150",
              readonly ? "cursor-default" : "cursor-pointer hover:scale-110"
            )}
          >
            <Star
              className={cn(
                sizeClasses[size],
                "transition-colors",
                isFilled 
                  ? "fill-warning text-warning" 
                  : "text-muted-foreground/30"
              )}
            />
          </button>
        );
      })}
    </div>
  );
};

export default RecipeRating;

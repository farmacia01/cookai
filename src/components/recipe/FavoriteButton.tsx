import { Heart } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface FavoriteButtonProps {
  isFavorite: boolean;
  onToggle: () => void;
  size?: "sm" | "md" | "lg";
  variant?: "icon" | "button";
}

const FavoriteButton = ({ 
  isFavorite, 
  onToggle, 
  size = "md", 
  variant = "icon" 
}: FavoriteButtonProps) => {
  const sizeClasses = {
    sm: "w-4 h-4",
    md: "w-5 h-5",
    lg: "w-6 h-6",
  };

  const buttonSizeClasses = {
    sm: "h-8 w-8",
    md: "h-9 w-9",
    lg: "h-10 w-10",
  };

  if (variant === "button") {
    return (
      <Button
        variant={isFavorite ? "default" : "outline"}
        size="sm"
        onClick={onToggle}
        className={cn(
          "gap-2 transition-all",
          isFavorite && "bg-destructive hover:bg-destructive/90"
        )}
      >
        <Heart
          className={cn(
            sizeClasses[size],
            "transition-all",
            isFavorite && "fill-current"
          )}
        />
        {isFavorite ? "Favoritada" : "Favoritar"}
      </Button>
    );
  }

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={onToggle}
      className={cn(
        buttonSizeClasses[size],
        "rounded-full transition-all hover:scale-110",
        isFavorite 
          ? "text-destructive hover:text-destructive" 
          : "text-muted-foreground hover:text-destructive"
      )}
    >
      <Heart
        className={cn(
          sizeClasses[size],
          "transition-all",
          isFavorite && "fill-current"
        )}
      />
    </Button>
  );
};

export default FavoriteButton;

import { useTranslation } from "react-i18next";
import { Card, CardContent } from "@/components/ui/card";
import { Coffee, Sun, Moon, Cookie } from "lucide-react";
import { cn } from "@/lib/utils";

export type MealCategory = "breakfast" | "lunch" | "dinner" | "snack";

interface MealCategorySelectorProps {
  selected: MealCategory;
  onSelect: (category: MealCategory) => void;
}

const MealCategorySelector = ({ selected, onSelect }: MealCategorySelectorProps) => {
  const { t } = useTranslation();

  const categories: { id: MealCategory; icon: typeof Coffee }[] = [
    { id: "breakfast", icon: Coffee },
    { id: "lunch", icon: Sun },
    { id: "dinner", icon: Moon },
    { id: "snack", icon: Cookie },
  ];

  return (
    <div className="space-y-3">
      <h3 className="text-lg font-semibold text-foreground">
        {t("mealCategory.title")}
      </h3>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {categories.map((category) => {
          const Icon = category.icon;
          const isSelected = selected === category.id;

          return (
            <Card
              key={category.id}
              className={cn(
                "cursor-pointer transition-all duration-200 hover:scale-[1.02]",
                isSelected
                  ? "ring-2 ring-primary bg-primary/5 border-primary"
                  : "hover:border-primary/50"
              )}
              onClick={() => onSelect(category.id)}
            >
              <CardContent className="p-4 flex flex-col items-center gap-2 text-center">
                <div
                  className={cn(
                    "p-2 rounded-full",
                    isSelected
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted text-muted-foreground"
                  )}
                >
                  <Icon className="w-5 h-5" />
                </div>
                <span
                  className={cn(
                    "font-medium text-sm",
                    isSelected ? "text-primary" : "text-foreground"
                  )}
                >
                  {t(`mealCategory.${category.id}`)}
                </span>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
};

export default MealCategorySelector;

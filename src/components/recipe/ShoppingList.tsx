import { useState, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { ShoppingCart, Copy, Check, Apple, Beef, Package } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Recipe } from "@/hooks/useRecipes";

interface ShoppingListProps {
  recipes: Recipe[];
}

interface CategorizedIngredient {
  name: string;
  checked: boolean;
}

interface CategorizedList {
  hortifruti: CategorizedIngredient[];
  acougue: CategorizedIngredient[];
  mercearia: CategorizedIngredient[];
}

const HORTIFRUTI_KEYWORDS = [
  'tomate', 'alface', 'cebola', 'alho', 'cenoura', 'batata', 'banana', 'maçã', 'laranja',
  'limão', 'abacate', 'brócolis', 'espinafre', 'couve', 'pepino', 'pimentão', 'abobrinha',
  'berinjela', 'repolho', 'morango', 'uva', 'manga', 'abacaxi', 'melancia', 'melão',
  'tomato', 'lettuce', 'onion', 'garlic', 'carrot', 'potato', 'banana', 'apple', 'orange',
  'lemon', 'avocado', 'broccoli', 'spinach', 'kale', 'cucumber', 'bell pepper', 'zucchini',
  'eggplant', 'cabbage', 'strawberry', 'grape', 'mango', 'pineapple', 'watermelon', 'melon',
  'frutas', 'verduras', 'legumes', 'folhas', 'ervas', 'herbs', 'vegetables', 'fruits'
];

const ACOUGUE_KEYWORDS = [
  'frango', 'carne', 'boi', 'porco', 'peixe', 'camarão', 'atum', 'salmão', 'tilápia',
  'linguiça', 'bacon', 'presunto', 'peito', 'coxa', 'sobrecoxa', 'filé', 'alcatra',
  'chicken', 'beef', 'pork', 'fish', 'shrimp', 'tuna', 'salmon', 'tilapia',
  'sausage', 'ham', 'breast', 'thigh', 'fillet', 'steak', 'meat', 'pollo', 'carne',
  'pescado', 'atún', 'salmón', 'cerdo', 'poultry', 'seafood'
];

const categorizeIngredient = (ingredient: string): 'hortifruti' | 'acougue' | 'mercearia' => {
  const lower = ingredient.toLowerCase();
  
  if (HORTIFRUTI_KEYWORDS.some(kw => lower.includes(kw))) {
    return 'hortifruti';
  }
  
  if (ACOUGUE_KEYWORDS.some(kw => lower.includes(kw))) {
    return 'acougue';
  }
  
  return 'mercearia';
};

const ShoppingList = ({ recipes }: ShoppingListProps) => {
  const { t } = useTranslation();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [checkedItems, setCheckedItems] = useState<Set<string>>(new Set());
  const [copied, setCopied] = useState(false);

  const categorizedList = useMemo(() => {
    const allIngredients = recipes.flatMap(r => r.ingredients);
    const uniqueIngredients = [...new Set(allIngredients)];
    
    const result: CategorizedList = {
      hortifruti: [],
      acougue: [],
      mercearia: []
    };

    uniqueIngredients.forEach(ingredient => {
      const category = categorizeIngredient(ingredient);
      result[category].push({
        name: ingredient,
        checked: checkedItems.has(ingredient)
      });
    });

    return result;
  }, [recipes, checkedItems]);

  const toggleItem = (item: string) => {
    setCheckedItems(prev => {
      const newSet = new Set(prev);
      if (newSet.has(item)) {
        newSet.delete(item);
      } else {
        newSet.add(item);
      }
      return newSet;
    });
  };

  const copyToClipboard = () => {
    const lines: string[] = [];
    
    if (categorizedList.hortifruti.length > 0) {
      lines.push(`🥬 ${t('shoppingList.hortifruti')}:`);
      categorizedList.hortifruti.forEach(i => {
        lines.push(`  ${checkedItems.has(i.name) ? '✓' : '○'} ${i.name}`);
      });
      lines.push('');
    }
    
    if (categorizedList.acougue.length > 0) {
      lines.push(`🥩 ${t('shoppingList.acougue')}:`);
      categorizedList.acougue.forEach(i => {
        lines.push(`  ${checkedItems.has(i.name) ? '✓' : '○'} ${i.name}`);
      });
      lines.push('');
    }
    
    if (categorizedList.mercearia.length > 0) {
      lines.push(`📦 ${t('shoppingList.mercearia')}:`);
      categorizedList.mercearia.forEach(i => {
        lines.push(`  ${checkedItems.has(i.name) ? '✓' : '○'} ${i.name}`);
      });
    }

    navigator.clipboard.writeText(lines.join('\n'));
    setCopied(true);
    toast({
      title: t('shoppingList.copied'),
      description: t('shoppingList.copiedDesc'),
    });
    setTimeout(() => setCopied(false), 2000);
  };

  const totalItems = categorizedList.hortifruti.length + 
                     categorizedList.acougue.length + 
                     categorizedList.mercearia.length;

  const CategorySection = ({ 
    title, 
    icon: Icon, 
    items, 
    iconColor 
  }: { 
    title: string; 
    icon: typeof Apple; 
    items: CategorizedIngredient[]; 
    iconColor: string;
  }) => {
    if (items.length === 0) return null;
    
    return (
      <div className="space-y-2">
        <h4 className="font-medium flex items-center gap-2">
          <Icon className={`w-4 h-4 ${iconColor}`} />
          {title}
        </h4>
        <div className="space-y-1 pl-6">
          {items.map((item) => (
            <div key={item.name} className="flex items-center gap-2">
              <Checkbox
                checked={checkedItems.has(item.name)}
                onCheckedChange={() => toggleItem(item.name)}
              />
              <span className={checkedItems.has(item.name) ? 'line-through text-muted-foreground' : ''}>
                {item.name}
              </span>
            </div>
          ))}
        </div>
      </div>
    );
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="gap-2" disabled={recipes.length === 0}>
          <ShoppingCart className="w-4 h-4" />
          {t('shoppingList.button')}
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ShoppingCart className="w-5 h-5" />
            {t('shoppingList.title')}
          </DialogTitle>
        </DialogHeader>

        <div className="py-4">
          <p className="text-sm text-muted-foreground mb-4">
            {t('shoppingList.description', { count: recipes.length, items: totalItems })}
          </p>

          <Card>
            <CardContent className="pt-4 space-y-4">
              <CategorySection
                title={t('shoppingList.hortifruti')}
                icon={Apple}
                items={categorizedList.hortifruti}
                iconColor="text-green-500"
              />
              
              <CategorySection
                title={t('shoppingList.acougue')}
                icon={Beef}
                items={categorizedList.acougue}
                iconColor="text-red-500"
              />
              
              <CategorySection
                title={t('shoppingList.mercearia')}
                icon={Package}
                items={categorizedList.mercearia}
                iconColor="text-amber-500"
              />

              {totalItems === 0 && (
                <p className="text-center text-muted-foreground py-4">
                  {t('shoppingList.empty')}
                </p>
              )}
            </CardContent>
          </Card>

          <div className="flex gap-2 mt-4">
            <Button onClick={copyToClipboard} variant="outline" className="flex-1 gap-2">
              {copied ? (
                <>
                  <Check className="w-4 h-4" />
                  {t('shoppingList.copied')}
                </>
              ) : (
                <>
                  <Copy className="w-4 h-4" />
                  {t('shoppingList.copy')}
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ShoppingList;

import { Share2, MessageCircle, Facebook, Copy } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useShareRecipe } from '@/hooks/useShareRecipe';

interface Recipe {
  title: string;
  description: string;
  calories: number;
  protein: number;
  carbs: number;
  prep_time: string;
  servings: number;
}

interface ShareMenuProps {
  recipe: Recipe;
}

const ShareMenu = ({ recipe }: ShareMenuProps) => {
  const {
    shareToWhatsApp,
    shareToFacebook,
    copyToClipboard
  } = useShareRecipe();

  return (
    <div className="flex items-center gap-2">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="sm">
            <Share2 className="w-4 h-4 mr-1" />
            Compartilhar
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-48">
          <DropdownMenuItem onClick={() => shareToWhatsApp(recipe)}>
            <MessageCircle className="w-4 h-4 mr-2 text-green-500" />
            WhatsApp
          </DropdownMenuItem>
          <DropdownMenuItem onClick={shareToFacebook}>
            <Facebook className="w-4 h-4 mr-2 text-blue-600" />
            Facebook
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={() => copyToClipboard(recipe)}>
            <Copy className="w-4 h-4 mr-2" />
            Copiar texto
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
};

export default ShareMenu;

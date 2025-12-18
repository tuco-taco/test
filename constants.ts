
import { DietaryInfo, MenuConfig, ImageTheme } from './types';

export const DIETARY_DATA: DietaryInfo[] = [
  { tag: 'V', label: 'VEGETARIAN', color: 'bg-[#8dc63f]' },
  { tag: 'VG', label: 'VEGAN', color: 'bg-[#00a651]' },
  { tag: 'GF', label: 'GLUTEN FREE', color: 'bg-[#f8e12d]' },
  { tag: 'S', label: 'SEAFOOD WATCH', color: 'bg-[#00aeef]' },
];

export const IMAGE_THEMES: { value: ImageTheme; label: string; icon: string; description: string }[] = [
  { value: 'modern', label: 'Modern Studio', icon: 'fa-camera-retro', description: 'Clean, professional studio lighting with minimalist backgrounds.' },
  { value: 'scrivani', label: 'Editorial (Scrivani)', icon: 'fa-pen-nib', description: 'Moody, high-contrast, rustic editorial style inspired by Andrew Scrivani.' },
  { value: 'pub', label: 'Traditional Pub', icon: 'fa-beer-mug-empty', description: 'Dark wood textures, warm amber lighting, and cozy tavern vibes.' },
  { value: 'cafe', label: 'Bright Cafe', icon: 'fa-mug-saucer', description: 'Airy, natural light, marble tables, and a relaxed morning feel.' },
  { value: 'bistro', label: 'Classic Bistro', icon: 'fa-utensils', description: 'Elegant plating, checkered linens, and sophisticated atmosphere.' },
  { value: 'nautical', label: 'Nautical / Coastal', icon: 'fa-anchor', description: 'Weathered wood, blue accents, and seaside freshness.' },
  { value: 'farm', label: 'Farm Fresh', icon: 'fa-wheat-awn', description: 'Rustic burlap, raw ingredients, and "straight from the field" honesty.' },
  { value: 'foodie', label: 'Hardcore Foodie', icon: 'fa-bowl-food', description: 'Extreme close-ups, high contrast, and focus on rich textures.' },
  { value: 'influencer', label: 'Influencer Style', icon: 'fa-mobile-screen-button', description: 'Vibrant colors, trendy props, and perfect social media bokeh.' },
];

export const DEFAULT_MENU: MenuConfig = {
  title: 'CITY DELI',
  subtitle: 'Freshly prepared daily with the finest local ingredients. Served with your choice of side.',
  accentColor: '#00aeef',
  secondaryColor: '#8dc63f',
  backgroundColor: '#ffffff',
  fontFamily: 'sans',
  imageTheme: 'scrivani',
  items: [
    {
      id: '1',
      name: 'CHICKEN CAESAR WRAP',
      description: 'Flour Tortilla | Sliced Chicken Breast | Romaine Lettuce | Parmesan Cheese | Caesar Salad Dressing',
      price: '$9.75',
      dietary: []
    },
    {
      id: '2',
      name: 'THE GARDEN VIBE',
      description: 'Spinach Tortilla | Hummus | Roasted Peppers | Cucumber | Tomato | Red Onion | Feta | Sunflower Seeds',
      price: '$8.50',
      dietary: ['V', 'GF']
    },
    {
      id: '3',
      name: 'ITALIAN STALLION',
      description: 'Hoagie Roll | Genoa Salami | Ham | Provolone | Banana Peppers | Lettuce | Italian Vinaigrette',
      price: '$11.25',
      dietary: []
    },
    {
      id: '4',
      name: 'TURKEY CLUBHOUSE',
      description: 'Triple Decker Sourdough | Roasted Turkey | Bacon | Swiss | Tomato | Garlic Aioli',
      price: '$10.50',
      dietary: []
    }
  ],
  featuredImage: 'https://images.unsplash.com/photo-1521390188846-e2a3a97453a0?q=80&w=1000&auto=format&fit=crop',
  featuredItemName: 'Chicken Caesar Wrap'
};

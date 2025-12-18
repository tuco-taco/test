
import { DietaryInfo, MenuConfig, ThemeDef } from './types';

export const DIETARY_DATA: DietaryInfo[] = [
  { tag: 'V', label: 'VEGETARIAN', color: 'bg-[#8dc63f]' },
  { tag: 'VG', label: 'VEGAN', color: 'bg-[#00a651]' },
  { tag: 'GF', label: 'GLUTEN FREE', color: 'bg-[#f8e12d]' },
  { tag: 'S', label: 'SEAFOOD WATCH', color: 'bg-[#00aeef]' },
];

export const DEFAULT_THEMES: ThemeDef[] = [
  { id: 'modern', label: 'Modern Studio', icon: 'fa-camera-retro', prompt: 'professional food photography, studio lighting, clean minimalist background, sharp focus, 8k resolution.' },
  { id: 'scrivani', label: 'Editorial (Scrivani)', icon: 'fa-pen-nib', prompt: 'editorial food photography in the style of Andrew Scrivani. Moody, high-contrast lighting with deep shadows (chiaroscuro effect). Rustic, dark matte backgrounds. Natural textures like wood or stone. Authentic, slightly messy-yet-perfect food styling. Rich, saturated earthy tones and high editorial quality.' },
  { id: 'pub', label: 'Traditional Pub', icon: 'fa-beer-mug-empty', prompt: 'warm dim lighting, dark oak wood table background, cozy tavern atmosphere, rustic plating, amber glow.' },
  { id: 'cafe', label: 'Bright Cafe', icon: 'fa-mug-saucer', prompt: 'bright and airy, natural daylight, white marble tabletop, blurry cafe background with coffee cups, fresh morning vibe.' },
  { id: 'bistro', label: 'Classic Bistro', icon: 'fa-utensils', prompt: 'classic french bistro style, checkered tablecloth, elegant porcelain plating, sophisticated lighting, gourmet presentation.' },
  { id: 'nautical', label: 'Nautical / Coastal', icon: 'fa-anchor', prompt: 'coastal kitchen vibe, weathered blue-washed wood, sea salt textures, rope accents, bright seaside light.' },
  { id: 'farm', label: 'Farm Fresh', icon: 'fa-wheat-awn', prompt: 'rustic farm-to-table aesthetic, burlap textures, raw ingredients like herbs and vegetables scattered nearby, natural sun-drenched lighting.' },
  { id: 'foodie', label: 'Hardcore Foodie', icon: 'fa-bowl-food', prompt: 'extreme close-up macro photography, high contrast, focus on steam and glistening textures, artistic minimalist plating.' },
  { id: 'influencer', label: 'Influencer Style', icon: 'fa-mobile-screen-button', prompt: 'vibrant saturated colors, trendy lifestyle props, shallow depth of field with beautiful bokeh, overhead or 45-degree \'instagrammable\' angle.' },
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

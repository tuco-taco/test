
export interface MenuItem {
  id: string;
  name: string;
  description: string;
  price: string;
  dietary?: DietaryTag[];
  imageUrl?: string;
  isSoldOut?: boolean;
}

export type DietaryTag = 'V' | 'VG' | 'GF' | 'S';

export interface ThemeDef {
  id: string;
  label: string;
  icon: string;
  prompt: string;
  isCustom?: boolean;
}

export interface MenuConfig {
  title: string;
  subtitle: string;
  logoUrl?: string;
  accentColor: string;
  secondaryColor: string;
  backgroundColor: string;
  fontFamily: 'sans' | 'serif';
  imageTheme: string;
  items: MenuItem[];
  featuredImage: string;
  featuredItemName: string;
}

export type MenuCategory = 'Breakfast' | 'Brunch' | 'Lunch' | 'Happy Hour' | 'Dinner' | 'Senior Citizen' | 'Specials';

export interface SavedMenu {
  id: string;
  name: string;
  timestamp: number;
  config: MenuConfig;
  categories: MenuCategory[];
}

export interface DietaryInfo {
  tag: DietaryTag;
  label: string;
  color: string;
}

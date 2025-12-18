
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

export type ImageTheme = 'modern' | 'pub' | 'cafe' | 'bistro' | 'nautical' | 'farm' | 'foodie' | 'influencer' | 'scrivani';

export interface MenuConfig {
  title: string;
  subtitle: string;
  logoUrl?: string;
  accentColor: string;
  secondaryColor: string;
  backgroundColor: string;
  fontFamily: 'sans' | 'serif';
  imageTheme: ImageTheme;
  items: MenuItem[];
  featuredImage: string;
  featuredItemName: string;
}

export interface DietaryInfo {
  tag: DietaryTag;
  label: string;
  color: string;
}

export interface Ingredient {
  id: string;
  name: string;
  amount: number;
  unit: string;
  notes?: string;
}

export interface RecipeStep {
  stepNumber: number;
  instruction: string;
  durationMinutes?: number;
}

export interface Recipe {
  id: string;
  title: string;
  description: string;
  category: string;
  prepTimeMinutes: number;
  cookTimeMinutes: number;
  servings: number;
  difficulty: 'Könnyű' | 'Közepes' | 'Haladó';
  tags: string[];
  ingredients: Ingredient[];
  steps: RecipeStep[];
  notes?: string;
  imageUrl?: string;
  isFavorite?: boolean;
  createdAt: string;
  source?: string;
  chef?: string;
  videoUrl?: string;
  likes?: string[];
  dislikes?: string[];
}

export interface ShoppingItem {
  id: string;
  name: string;
  amount?: number | string;
  unit?: string;
  category: 'Zöldség & Gyümölcs' | 'Hús & Hal' | 'Tejtermék' | 'Kamra & Fűszerek' | 'Pékáru' | 'Egyéb';
  checked: boolean;
  recipeTitle?: string;
  addedBy?: string;
}

export interface FamilyMember {
  id: string;
  name: string;
  role: 'admin' | 'user';
  avatarColor?: string;
}

export interface PiServerConfig {
  serverUrl: string;
  apiType: 'flask' | 'fastapi' | 'express' | 'sqlite_json';
  authHeader?: string;
  isConnected: boolean;
  lastSync?: string;
}

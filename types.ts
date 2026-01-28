
export interface Ingredient {
  id: number;
  name: string;
  percentage: number;
  costPerKg?: number;
  inventoryId?: string;
  weight?: number; 
}

export interface GroundingChunk {
  web?: {
    uri: string;
    title: string;
  };
}

export interface GroundingMetadata {
  groundingChunks?: GroundingChunk[];
}

export interface GeminiGroundedResponse {
  text: string;
  metadata?: GroundingMetadata;
}

export interface RecipeSnapshot {
  numberOfLoaves: number;
  weightPerLoaf: number;
  flours: Ingredient[]; 
  ingredients: Ingredient[];
  date: string;
  version: number;
  // Added base properties for backward compatibility and specialized tracking
  baseFlourName?: string;
  baseFlourInventoryId?: string;
  baseFlourCostPerKg?: number;
}

export interface SavedRecipe extends RecipeSnapshot {
  id: string;
  name: string;
  history: RecipeSnapshot[];
}

export interface PlannerItem {
  uniqueId: string;
  recipe: SavedRecipe;
  count: number;
}

export type UnitOfMeasure = 'g' | 'kg' | 'lb' | 'oz';

export interface InventoryItem {
  id: string;
  name: string;
  quantity: number; 
  costPerKg?: number; 
  lastUpdated: string;
  packageWeight?: number;
  packageUnit?: UnitOfMeasure;
  itemsPerPackage?: number;
  costPerPackage?: number;
}
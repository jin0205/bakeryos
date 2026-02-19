
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
  numberOfLoaves: number; // This acts as the "Batch Multiplier"
  weightPerLoaf: number; // Historical/Display weight
  targetLoafWeight: number; // The new independent target weight
  flours: Ingredient[]; 
  ingredients: Ingredient[];
  date: string;
  version: number;
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

export type UnitOfMeasure = 'g' | 'kg' | 'lb' | 'oz' | 'ml';

export interface InventoryItem {
  id: string;
  name: string;
  quantity: number; // In grams
  costPerKg?: number; 
  lastUpdated: string;
  packageWeight?: number;
  packageUnit?: UnitOfMeasure;
  itemsPerPackage?: number;
  costPerPackage?: number;
}

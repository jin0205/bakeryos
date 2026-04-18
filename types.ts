
export interface Ingredient {
  id: number;
  name: string;
  percentage: number;
  costPerKg?: number;
  inventoryId?: string;
  weight?: number; 
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

export type WorkOrderStatus = 'draft' | 'scheduled' | 'in-production' | 'complete';

export interface WorkOrderLineItem {
  recipeId: string;
  recipeName: string;
  recipeVersion: number;
  count: number;
  weightPerUnit: number;
  ingredientRequirements: Record<string, number>;
}

export interface WorkOrder {
  id: string;
  woNumber: number;
  status: WorkOrderStatus;
  createdAt: string;
  scheduledDate: string | null;
  startedAt: string | null;
  completedAt: string | null;
  lineItems: WorkOrderLineItem[];
  totalDoughKg: number;
  estimatedCost: number;
  inventoryDeducted: boolean;
  notes: string;
}

export type StorageKey =
  | 'bakeryos_recipes'
  | 'bakeryos_inventory'
  | 'bakeryos_planner_items'
  | 'bakeryos_work_orders';

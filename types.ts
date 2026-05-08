
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

// Square integration types use snake_case to match Square API field names directly.
export type SquareLocationId = 'food1' | 'food2' | 'bread';

export interface DistributionEntry {
  id: string;
  date: string;               // ISO date, e.g. "2026-04-22"
  location: SquareLocationId;
  item_name: string;
  quantity_distributed: number;
  notes?: string;
}

export interface SquareCredential {
  location_id: SquareLocationId;
  access_token: string;
  square_location_id: string; // Square's internal location ID
}

export interface SquareCredentialUpdate extends SquareCredential {
  clear?: boolean;
}

export interface SquareCredentialStatus {
  location_id: SquareLocationId;
  square_location_id: string;
  configured: boolean;
}

export interface SquareItemMapping {
  square_item_name: string;
  bread_item_name: string;
  units_per_sale: number;     // how many bread units per Square sale transaction
  location_id: SquareLocationId;
}

export interface SquareSaleEntry {
  location_id: SquareLocationId;
  date: string;               // YYYY-MM-DD
  square_item_name: string;
  quantity_sold: number;
}

export interface SquareSalesCache {
  last_synced_at: string;     // ISO datetime
  sales: SquareSaleEntry[];
  sync_errors: { location_id: SquareLocationId; error: string }[];
}

export type StorageKey =
  | 'bakeryos_recipes'
  | 'bakeryos_inventory'
  | 'bakeryos_planner_items'
  | 'bakeryos_work_orders'
  | 'bakeryos_distributions'
  | 'bakeryos_square_item_map'
  | 'bakeryos_square_sales_cache';

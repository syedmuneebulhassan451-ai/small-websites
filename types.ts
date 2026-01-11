
export type UserRole = 'admin' | 'user';
export type SubscriptionLevel = 'free' | 'pro';

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  subscription: SubscriptionLevel;
  lastActive?: number;
}

export interface Product {
  id: string;
  owner_id: string; // Ownership field
  name: string;
  category: string;
  costPrice: number;
  sellingPrice: number;
  stockQuantity: number;
  minStockLevel: number;
}

export interface Sale {
  id: string;
  owner_id: string; // Ownership field
  productId: string;
  productName: string;
  quantity: number;
  unitPrice: number;
  unitCost: number;
  totalPrice: number;
  totalProfit: number;
  timestamp: number;
}

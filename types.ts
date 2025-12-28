
export enum UserRole {
  ADMIN = 'admin',
  USER = 'user'
}

export enum LocationType {
  WAREHOUSE = 'Warehouse',
  JOBSITE = 'Jobsite',
  OFFICE = 'Office',
  OTHER = 'Other'
}

export enum Status {
  ACTIVE = 'active',
  INACTIVE = 'inactive'
}

export interface UserProfile {
  id: string; // matches auth uid
  full_name: string;
  email: string;
  role: UserRole;
  assigned_location?: string; // Location ID
  phone?: string;
  status: Status;
  created_at: any; // Firestore Timestamp
}

export interface Location {
  id: string;
  name: string;
  address: string;
  type: LocationType;
  status: Status;
}

export interface Category {
  id: string;
  name: string;
  subcategories: string[];
  sort_order?: number;
}

export interface UOM {
  id: string;
  name: string;
  abbreviation: string;
}

export interface UOMConversion {
  id: string;
  from_uom: string; // UOM ID
  to_uom: string;   // UOM ID
  multiplier: number;
}

export interface Variant {
  variant_id: string; // usually a UUID or short code
  sku: string;
  size?: string;
  color?: string;
  type?: string;
  brand?: string;
  average_cost: number;
  reorder_level: number;
  serial_required: boolean;
  attributes?: { key: string; value: string }[];
  applicable_uoms?: string[]; // array of UOM IDs
}

export interface Item {
  id: string;
  name: string;
  category: string; // Category ID or Name
  subcategory?: string;
  description?: string;
  base_uom: string; // UOM ID
  has_variants: boolean;
  variants: Variant[];
  status: Status;
}

export interface InventoryRecord {
  id: string;
  location_id: string;
  item_id: string;
  variant_id: string;
  quantity: number; // Stored in Base UOM
}

export interface SerialNumber {
  id: string;
  serial_number: string;
  item_id: string;
  variant_id: string;
  location_id: string;
  status: 'available' | 'used' | 'released';
}
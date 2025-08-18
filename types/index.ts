// ======================
// 1. Accounts
// ======================
export type Account = {
  id: number;
  name: string;
  email: string;
  start_date: string; // ISO timestamp
  end_date: string;   // ISO timestamp
  active: boolean;
  created_at: string;
  updated_at: string;
};

// ======================
// 2. Users
// ======================
export type User = {
  id: number;
  account_id: number;
  username: string;
  password: string;
  role: "admin" | "waiter" | "kitchen";
  created_at: string;
  updated_at: string;
};

// ======================
// 3. System Settings
// ======================
export type SystemSetting = {
  id: number;
  account_id: number;
  logo_url: string;
  language: "ar" | "fr";
  currency: "USD" | "EUR" | "MAD" | "TND" | "DZD";
  tax: number;
  created_at: string;
  updated_at: string;
};

// ======================
// 4. Restaurant Tables
// ======================
export type RestaurantTable = {
  id: number;
  account_id: number;
  table_number: number;
  qr_code: string;
  created_at: string;
  updated_at: string;
};

// ======================
// 5. Categories
// ======================
export type Category = {
  id: number;
  account_id: number;
  name: string;
  image_url: string;
  created_at: string;
  updated_at: string;
};

// ======================
// 6. Products
// ======================
export type Product = {
  id: number;
  category_id: number;
  account_id: number;
  name: string;
  description: string;
  price: number;
  image_url: string;
  available: boolean;
  created_at: string;
  updated_at: string;
};

// ======================
// 7. Orders
// ======================
export type Order = {
  id: number;
  account_id: number;
  table_id: number;
  waiter_id?: number; // يمكن أن يكون فارغ قبل التعيين
  status: "pending" | "approved" | "ready" | "served";
  total: number;
  created_at: string;
  updated_at: string;
};

// ======================
// 8. Order Items
// ======================
export type OrderItem = {
  id: number;
  order_id: number;
  product_id: number;
  quantity: number;
  price: number;
  created_at: string;
  updated_at: string;
};

// ======================
// 9. Notifications (اختياري)
// ======================
export type Notification = {
  id: number;
  account_id: number;
  user_id: number;
  message: string;
  read: boolean;
  created_at: string;
  updated_at: string;
};

export interface Product {
  id: number;
  name: string;
  description: string;
  price: number;
  category: string;
  image_url: string;
  offer: boolean;
  stock: number;
}

export interface CartItem {
  product: Product;
  quantity: number;
}

export type Branch = {
  id: string;
  name: string;
};

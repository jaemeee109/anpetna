export type CartItemDTO = {
  cartItemId: number;
  itemId: number;
  name: string;
  price: number;
  quantity: number;
  imageUrl?: string;
};

export type CartDTO = {
  memberId: string;
  items: CartItemDTO[];
  totalPrice: number;
  totalQuantity: number;
};

export type AddCartReq = { itemId: number; quantity: number };
export type AddCartRes = { cart: CartDTO };

export type UpdateCartReq = { cartItemId: number; quantity: number };
export type UpdateCartRes = { cart: CartDTO };

export type OrderItemDTO = {
  itemId: number;
  price: number;
  quantity: number;
  name?: string;
  imageUrl?: string;
};

export type OrdersDTO = {
  ordersId: number;
  memberId: string;
  cardId?: string;
  totalPrice: number;
  itemQuantity: number;
  createdAt?: string;
  status?: "CREATED" | "PAID" | "CANCELLED" | "SHIPPED" | "DELIVERED";
  items?: OrderItemDTO[];
};

export type CreateOrderReq = {
  memberId: string;
  items: { itemId: number; quantity: number; price?: number }[];
  address?: {
    zipcode?: string;
    address1?: string;
    address2?: string;
  };
  payment?: { cardId?: string; method?: string };
};
export type CreateOrderRes = { orders: OrdersDTO };

export type OrdersDetailRes = { orders: OrdersDTO };
export type OrdersListRes = { list: OrdersDTO[]; total?: number };

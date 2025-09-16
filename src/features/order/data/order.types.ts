// src/features/order/data/order.types.ts
export type AddressDTO = {
  zipcode: string;
  street: string;
  detail: string;
  receiver: string;
  phone: string; 
};

export type CreateOrderItem = { itemId: number; quantity: number };

export type CreateOrderBody = {
  memberId: string;
  cardId: string;
  useSavedAddress: boolean;
  shippingAddress: AddressDTO;
  items: CreateOrderItem[];
  shippingFee?: number;
};

export type CreateOrderRes = { ordersId: number };

export type OrdersSummary = {
  ordersId: number;
  memberId: string;
  totalAmount: number;
  cardId?: string;
  itemImageUrl?: string;
  itemImageName?: string;
  status?: string;
  [k: string]: any;
};

export type OrdersListRes = {
  content: OrdersSummary[];
  totalElements: number;
  totalPages: number;
  pageNumber?: number; // 백에서 number/pageNumber 혼재 가능성 대응
  number?: number;
  pageSize?: number;
  size?: number;
};

export type OrderItemView = {
  itemId: number;
  name: string;
  price: number;
  quantity: number;
  imageUrl?: string;
};

export type OrdersDetail = {
  ordersId: number;
  memberId: string;
  cardId: string;
  itemsSubtotal: number;
  shippingFee: number;
  totalAmount: number;
  thumbnailUrl?: string;
  status: string;
  shippingAddress: AddressDTO;
  ordersItems: OrderItemView[];
};

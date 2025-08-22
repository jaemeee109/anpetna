export type ItemDTO = {
  itemId: number;
  name: string;
  price: number;
  stock: number;
  imageUrl?: string;
  description?: string;
  createDate?: string;
  latestDate?: string;
};

export type ItemListReq = { page?: number; size?: number; q?: string };
export type ItemListRes = { items: ItemDTO[]; total?: number };

export type CreateItemReq = Omit<ItemDTO, "itemId"|"createDate"|"latestDate">;
export type CreateItemRes = { item: ItemDTO };

export type UpdateItemReq = Partial<Omit<ItemDTO, "createDate"|"latestDate">> & { itemId: number };
export type UpdateItemRes = { item: ItemDTO };

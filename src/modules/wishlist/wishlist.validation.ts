import { string, object } from "zod";

export const wishlistItemParamSchema = object({
  productId: string().cuid("Invalid product ID"),
});

import { z } from "zod";

export const wishlistItemParamSchema = z.object({
  productId: z.string().cuid("Invalid product ID"),
});

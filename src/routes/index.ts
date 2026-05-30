import { Router } from "express";
import userRouter from "../modules/user/user.routes";
import addressRouter from "../modules/address/address.routes";
import brandRouter from "../modules/brand/brand.routes";
import categoryRouter from "../modules/category/category.routes";
import productRouter from "../modules/product/product.routes";
import orderRouter from "../modules/order/order.routes";
import reviewRouter from "../modules/review/review.routes";
import wishlistRouter from "../modules/wishlist/wishlist.routes";

const router = Router();

router.use("/users", userRouter);
router.use("/addresses", addressRouter);
router.use("/brands", brandRouter);
router.use("/categories", categoryRouter);
router.use("/products", productRouter);
router.use("/orders", orderRouter);
router.use("/reviews", reviewRouter);
router.use("/wishlist", wishlistRouter);

export default router;

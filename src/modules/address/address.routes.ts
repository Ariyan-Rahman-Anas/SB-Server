import { Router } from "express";
import { requireAuth } from "../../middleware/requireAuth";
import { validate } from "../../middleware/validate";
import {
  addressIdParamSchema,
  createAddressSchema,
  updateAddressSchema,
} from "./address.validation";
import * as addressController from "./address.controller";

const router = Router();

// All address routes require authentication
router.use(requireAuth);

router
  .route("/")
  .get(addressController.getMyAddresses)
  .post(validate({ body: createAddressSchema }), addressController.createAddress);

router
  .route("/:id")
  .patch(
    validate({ params: addressIdParamSchema, body: updateAddressSchema }),
    addressController.updateAddress
  )
  .delete(
    validate({ params: addressIdParamSchema }),
    addressController.deleteAddress
  );

router.patch(
  "/:id/set-primary",
  validate({ params: addressIdParamSchema }),
  addressController.setPrimaryAddress
);

export default router;

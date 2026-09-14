import { Router } from "express";
import { asyncHandler } from "../../middleware/asyncHandler";
import {
  listPurchaseInvoicesHandler,
  createPurchaseInvoiceHandler,
  getPurchaseInvoiceHandler,
  cancelPurchaseInvoiceHandler,
} from "./purchaseInvoice.controller";

export const purchaseInvoiceRouter = Router({ mergeParams: true });

purchaseInvoiceRouter.get("/", asyncHandler(listPurchaseInvoicesHandler));
purchaseInvoiceRouter.post("/", asyncHandler(createPurchaseInvoiceHandler));
purchaseInvoiceRouter.get("/:id", asyncHandler(getPurchaseInvoiceHandler));
purchaseInvoiceRouter.post("/:id/cancel", asyncHandler(cancelPurchaseInvoiceHandler));

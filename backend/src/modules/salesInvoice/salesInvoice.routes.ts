import { Router } from "express";
import { asyncHandler } from "../../middleware/asyncHandler";
import {
  listSalesInvoicesHandler,
  createSalesInvoiceHandler,
  getSalesInvoiceHandler,
  cancelSalesInvoiceHandler,
} from "./salesInvoice.controller";

export const salesInvoiceRouter = Router({ mergeParams: true });

salesInvoiceRouter.get("/", asyncHandler(listSalesInvoicesHandler));
salesInvoiceRouter.post("/", asyncHandler(createSalesInvoiceHandler));
salesInvoiceRouter.get("/:id", asyncHandler(getSalesInvoiceHandler));
salesInvoiceRouter.post("/:id/cancel", asyncHandler(cancelSalesInvoiceHandler));

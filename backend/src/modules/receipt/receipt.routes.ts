import { Router } from "express";
import { asyncHandler } from "../../middleware/asyncHandler";
import { listReceiptsHandler, createReceiptHandler } from "./receipt.controller";

export const receiptRouter = Router({ mergeParams: true });

receiptRouter.get("/", asyncHandler(listReceiptsHandler));
receiptRouter.post("/", asyncHandler(createReceiptHandler));

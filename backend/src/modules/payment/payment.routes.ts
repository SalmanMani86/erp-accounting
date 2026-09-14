import { Router } from "express";
import { asyncHandler } from "../../middleware/asyncHandler";
import { listPaymentsHandler, createPaymentHandler } from "./payment.controller";

export const paymentRouter = Router({ mergeParams: true });

paymentRouter.get("/", asyncHandler(listPaymentsHandler));
paymentRouter.post("/", asyncHandler(createPaymentHandler));

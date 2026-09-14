import { Router } from "express";
import { asyncHandler } from "../../middleware/asyncHandler";
import { listSuppliers, createSupplier, getSupplier } from "./supplier.controller";

export const supplierRouter = Router({ mergeParams: true });

supplierRouter.get("/", asyncHandler(listSuppliers));
supplierRouter.post("/", asyncHandler(createSupplier));
supplierRouter.get("/:id", asyncHandler(getSupplier));

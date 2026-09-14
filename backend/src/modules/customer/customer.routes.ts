import { Router } from "express";
import { asyncHandler } from "../../middleware/asyncHandler";
import { listCustomers, createCustomer, getCustomer } from "./customer.controller";

export const customerRouter = Router({ mergeParams: true });

customerRouter.get("/", asyncHandler(listCustomers));
customerRouter.post("/", asyncHandler(createCustomer));
customerRouter.get("/:id", asyncHandler(getCustomer));

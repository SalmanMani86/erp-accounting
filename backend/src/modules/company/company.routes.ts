import { Router } from "express";
import { asyncHandler } from "../../middleware/asyncHandler";
import { listCompanies, getCompany, createCompany } from "./company.controller";

export const companyRouter = Router();

companyRouter.get("/", asyncHandler(listCompanies));
companyRouter.get("/:companyId", asyncHandler(getCompany));
companyRouter.post("/", asyncHandler(createCompany));

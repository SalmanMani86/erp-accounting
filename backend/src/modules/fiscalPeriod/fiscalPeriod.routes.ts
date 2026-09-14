import { Router } from "express";
import { asyncHandler } from "../../middleware/asyncHandler";
import { listFiscalPeriodsHandler, createFiscalPeriodHandler, closeFiscalPeriodHandler } from "./fiscalPeriod.controller";

export const fiscalPeriodRouter = Router({ mergeParams: true });

fiscalPeriodRouter.get("/", asyncHandler(listFiscalPeriodsHandler));
fiscalPeriodRouter.post("/", asyncHandler(createFiscalPeriodHandler));
fiscalPeriodRouter.post("/:id/close", asyncHandler(closeFiscalPeriodHandler));

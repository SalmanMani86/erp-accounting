import { Router } from "express";
import { asyncHandler } from "../../middleware/asyncHandler";
import { listAuditLogs } from "./auditLog.controller";

export const auditLogRouter = Router({ mergeParams: true });

auditLogRouter.get("/", asyncHandler(listAuditLogs));

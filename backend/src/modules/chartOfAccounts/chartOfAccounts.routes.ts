import { Router } from "express";
import { asyncHandler } from "../../middleware/asyncHandler";
import { listAccounts, createAccount } from "./chartOfAccounts.controller";

export const chartOfAccountsRouter = Router({ mergeParams: true });

chartOfAccountsRouter.get("/", asyncHandler(listAccounts));
chartOfAccountsRouter.post("/", asyncHandler(createAccount));

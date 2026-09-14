import { Router } from "express";
import { asyncHandler } from "../../middleware/asyncHandler";
import {
  listJournalEntriesHandler,
  createManualJournalEntryHandler,
  getJournalEntryHandler,
} from "./journalEntry.controller";

export const journalEntryRouter = Router({ mergeParams: true });

journalEntryRouter.get("/", asyncHandler(listJournalEntriesHandler));
journalEntryRouter.post("/", asyncHandler(createManualJournalEntryHandler));
journalEntryRouter.get("/:id", asyncHandler(getJournalEntryHandler));

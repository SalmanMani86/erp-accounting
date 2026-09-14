import { Request, Response } from "express";
import { z } from "zod";
import { createManualJournalEntry, listJournalEntries, getJournalEntry } from "./journalEntry.service";

const CreateManualJournalSchema = z.object({
  entryDate: z.string().datetime().or(z.string().date()),
  description: z.string().optional(),
  lines: z
    .array(
      z.object({
        accountCode: z.string().min(1),
        debit: z.union([z.string(), z.number()]).optional(),
        credit: z.union([z.string(), z.number()]).optional(),
      })
    )
    .min(2),
});

export async function listJournalEntriesHandler(req: Request, res: Response): Promise<void> {
  const entries = await listJournalEntries(req.companyId);
  res.json(entries);
}

export async function createManualJournalEntryHandler(req: Request, res: Response): Promise<void> {
  const input = CreateManualJournalSchema.parse(req.body);
  const entry = await createManualJournalEntry(req.companyId, input);
  res.status(201).json(entry);
}

export async function getJournalEntryHandler(req: Request, res: Response): Promise<void> {
  const entry = await getJournalEntry(req.companyId, req.params.id);
  res.json(entry);
}

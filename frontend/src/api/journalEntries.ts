import { api } from "./client";
import type { JournalEntry } from "../types";

export interface CreateManualJournalInput {
  entryDate: string;
  description?: string;
  lines: { accountCode: string; debit?: number; credit?: number }[];
}

export const journalEntriesApi = {
  list: (companyId: string) => api.get<JournalEntry[]>(`/companies/${companyId}/journal-entries`),
  get: (companyId: string, id: string) => api.get<JournalEntry>(`/companies/${companyId}/journal-entries/${id}`),
  create: (companyId: string, input: CreateManualJournalInput) =>
    api.post<JournalEntry>(`/companies/${companyId}/journal-entries`, input),
};

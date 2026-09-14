import { api } from "./client";
import type { AuditLogEntry } from "../types";

export const auditLogApi = {
  list: (companyId: string) => api.get<AuditLogEntry[]>(`/companies/${companyId}/audit-logs`),
};

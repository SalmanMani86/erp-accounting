import { createContext } from "react";
import type { Company } from "../types";

export interface CompanyContextValue {
  companies: Company[];
  currentCompany: Company | null;
  isLoading: boolean;
  error: string | null;
  selectCompany: (companyId: string) => void;
  refreshCompanies: () => Promise<void>;
}

export const CompanyContext = createContext<CompanyContextValue | undefined>(undefined);

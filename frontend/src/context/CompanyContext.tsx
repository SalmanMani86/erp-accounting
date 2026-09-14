import { useEffect, useState, type ReactNode } from "react";
import type { Company } from "../types";
import { companiesApi } from "../api/companies";
import { CompanyContext } from "./companyContextValue";

const STORAGE_KEY = "erp.currentCompanyId";

export function CompanyProvider({ children }: { children: ReactNode }) {
  const [companies, setCompanies] = useState<Company[]>([]);
  const [currentCompanyId, setCurrentCompanyId] = useState<string | null>(() =>
    localStorage.getItem(STORAGE_KEY)
  );
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function refreshCompanies() {
    setIsLoading(true);
    setError(null);
    try {
      const list = await companiesApi.list();
      setCompanies(list);
      setCurrentCompanyId((prev) => {
        if (prev && list.some((c) => c.id === prev)) return prev;
        return list[0]?.id ?? null;
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load companies");
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    refreshCompanies();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (currentCompanyId) localStorage.setItem(STORAGE_KEY, currentCompanyId);
  }, [currentCompanyId]);

  const currentCompany = companies.find((c) => c.id === currentCompanyId) ?? null;

  return (
    <CompanyContext.Provider
      value={{
        companies,
        currentCompany,
        isLoading,
        error,
        selectCompany: setCurrentCompanyId,
        refreshCompanies,
      }}
    >
      {children}
    </CompanyContext.Provider>
  );
}

import { useCallback, useEffect, useState } from "react";

export function useApi<T>(fetcher: () => Promise<T>, deps: unknown[]) {
  const [data, setData] = useState<T | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(() => {
    setIsLoading(true);
    setError(null);
    fetcher()
      .then((result) => setData(result))
      .catch((err) => setError(err instanceof Error ? err.message : "Something went wrong"))
      .finally(() => setIsLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  useEffect(() => {
    reload();
  }, [reload]);

  return { data, isLoading, error, reload };
}

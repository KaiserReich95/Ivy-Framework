import { useState, useEffect, useCallback } from 'react';

/**
 * Configuration for recent queries storage
 */
interface UseRecentQueriesOptions {
  /**
   * Storage key for localStorage
   * @default 'datatable-recent-queries'
   */
  storageKey?: string;
  /**
   * Maximum number of recent queries to store
   * @default 10
   */
  maxQueries?: number;
}

/**
 * Custom hook for managing recent filter queries in localStorage
 *
 * Features:
 * - Persists recent queries to localStorage
 * - Prevents duplicate queries
 * - Maintains most recent queries at the top
 * - Configurable maximum number of queries
 *
 * @param options Configuration options
 * @returns Recent queries and management functions
 *
 * @example
 * ```tsx
 * const { recentQueries, addQuery, clearQueries } = useRecentQueries();
 *
 * // Add a new query
 * addQuery('[status] = "open"');
 *
 * // Clear all queries
 * clearQueries();
 * ```
 */
export function useRecentQueries(options: UseRecentQueriesOptions = {}) {
  const { storageKey = 'datatable-recent-queries', maxQueries = 10 } = options;

  // Initialize state from localStorage
  const [recentQueries, setRecentQueries] = useState<string[]>(() => {
    try {
      const stored = localStorage.getItem(storageKey);
      if (stored) {
        const parsed = JSON.parse(stored);
        return Array.isArray(parsed) ? parsed : [];
      }
    } catch (error) {
      console.error('Failed to load recent queries from localStorage:', error);
    }
    return [];
  });

  // Sync state to localStorage whenever it changes
  useEffect(() => {
    try {
      localStorage.setItem(storageKey, JSON.stringify(recentQueries));
    } catch (error) {
      console.error('Failed to save recent queries to localStorage:', error);
    }
  }, [recentQueries, storageKey]);

  /**
   * Add a new query to recent queries
   * - Removes duplicates
   * - Places new query at the top
   * - Limits to maxQueries
   */
  const addQuery = useCallback(
    (query: string) => {
      // Normalize the query (trim whitespace)
      const normalizedQuery = query.trim();

      // Ignore empty queries
      if (!normalizedQuery) {
        return;
      }

      setRecentQueries(prev => {
        // Remove the query if it already exists (to avoid duplicates)
        const filtered = prev.filter(q => q !== normalizedQuery);

        // Add new query at the beginning
        const updated = [normalizedQuery, ...filtered];

        // Limit to maxQueries
        return updated.slice(0, maxQueries);
      });
    },
    [maxQueries]
  );

  /**
   * Remove a specific query from recent queries
   */
  const removeQuery = useCallback((query: string) => {
    setRecentQueries(prev => prev.filter(q => q !== query));
  }, []);

  /**
   * Clear all recent queries
   */
  const clearQueries = useCallback(() => {
    setRecentQueries([]);
  }, []);

  return {
    recentQueries,
    addQuery,
    removeQuery,
    clearQueries,
  };
}

import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { useTable } from './DataTableContext';
import { tableStyles } from './styles/style';
import {
  QueryEditor,
  QueryEditorChangeEvent,
  parseQuery,
} from 'filter-query-editor';
import { Filter } from '@/services/grpcTableService';
import { parseInvalidQuery } from './utils/tableDataFetcher';
import { useRecentQueries } from './hooks/useRecentQueries';

export const DataTableOptions: React.FC<{
  hasOptions: { allowFiltering: boolean; allowLlmFiltering: boolean };
}> = ({ hasOptions }) => {
  const [query, setQuery] = useState<string>('');
  const [pendingFilter, setPendingFilter] = useState<Filter | null>(null);
  const [isParsing, setIsParsing] = useState(false);

  // New state variables for QueryEditor component
  const [isCollapsed, setIsCollapsed] = useState<boolean>(true);
  const [statusState, setStatusState] = useState<
    'waiting' | 'ai' | 'query' | 'error'
  >('waiting');
  const [allowLLMFiltering, setAllowLLMFiltering] = useState<boolean>(true);
  //const [errors, setErrors] = useState<string[]>([]);

  const { columns, setActiveFilter, connection, handleFilterParsingError } =
    useTable();

  const { allowFiltering } = hasOptions;

  // Recent queries hook for localStorage persistence
  const { recentQueries, addQuery: addRecentQuery } = useRecentQueries({
    storageKey: 'datatable-recent-queries',
    maxQueries: 10,
  });

  // Filter columns to only include filterable ones (defaults to true if not specified)
  // Map DataColumn to ColumnDef format expected by QueryEditor
  const queryEditorColumns = useMemo(
    () =>
      columns
        .filter(col => col.filterable ?? true)
        .map(col => ({
          name: col.name,
          type: col.type.toLowerCase(),
          width: typeof col.width === 'number' ? col.width : 150,
        })),
    [columns]
  );

  /**
   * Handle query editor text changes - update state and statusState
   */
  const handleQueryChange = useCallback(
    (event: QueryEditorChangeEvent) => {
      setQuery(event.text);
      setErrors(event.errors || []);

      // Update status based on validity
      if (event.text.length === 0) {
        setStatusState('waiting');
        setPendingFilter(null);
        setActiveFilter(null);
      } else if (event.isValid && event.filters) {
        setStatusState('query');
        setPendingFilter({ group: event.filters });
      } else if (!event.isValid) {
        // Show error state if LLM filtering is disabled, otherwise show AI state
        if (!allowLLMFiltering) {
          setStatusState('error');
        } else {
          setStatusState('ai');
        }
        setPendingFilter(null);
      }
    },
    [setActiveFilter, allowLLMFiltering]
  );

  /**
   * Handle invalid query by calling parseInvalidQuery service
   */
  const handleInvalidQuery = useCallback(async () => {
    if (isParsing) {
      return;
    }

    setIsParsing(true);
    try {
      // Call parseFilter endpoint with the invalid query string
      const result = await parseInvalidQuery(
        query,
        connection,
        handleFilterParsingError
      );

      if (result.filterExpression) {
        // Handle both possible response field names
        const correctedQuery = result.filterExpression;

        // Parse the corrected query string back to AST using parseQuery
        const parsedResult = parseQuery(correctedQuery, queryEditorColumns);

        // Check if parsing was successful
        const isValid =
          parsedResult &&
          parsedResult.filters &&
          (!parsedResult.errors || parsedResult.errors.length === 0);

        if (isValid) {
          // Create filter from parsed result
          const newFilter = { group: parsedResult.filters };

          // Update UI with corrected query
          setQuery(correctedQuery);
          setPendingFilter(newFilter);
          setStatusState('query');

          // Apply the filter immediately
          setActiveFilter(newFilter);

          // Save corrected query to recent queries
          addRecentQuery(correctedQuery);
        }
      }
    } catch (error) {
      // Error is already handled by handleFilterParsingError in parseInvalidQuery
      // Just log it here for debugging
      console.debug('Filter parsing failed:', error);
    } finally {
      setIsParsing(false);
    }
  }, [
    query,
    isParsing,
    connection,
    queryEditorColumns,
    setActiveFilter,
    handleFilterParsingError,
    addRecentQuery,
  ]);

  /**
   * Handle Apply button click in QueryEditor
   */
  const handleApply = useCallback(async () => {
    // Case 1: Empty query - clear filter
    if (query.trim() === '') {
      setActiveFilter(null);
      setIsCollapsed(true);
      return;
    }

    // Case 2: Valid query with pending filter - apply it
    if (statusState === 'query' && pendingFilter) {
      setActiveFilter(pendingFilter);
      addRecentQuery(query); // Save to recent queries
      setIsCollapsed(true);
      return;
    }

    // Case 3: Invalid query in AI mode - try to parse it
    if (statusState === 'ai' && allowLLMFiltering) {
      await handleInvalidQuery();
      setIsCollapsed(true);
      return;
    }
  }, [
    query,
    statusState,
    pendingFilter,
    allowLLMFiltering,
    setActiveFilter,
    handleInvalidQuery,
    setIsCollapsed,
    addRecentQuery,
  ]);

  /**
   * Reactive status updates when AI filtering toggle changes
   */
  useEffect(() => {
    if (query.length === 0) {
      setStatusState('waiting');
    } else {
      const result = parseQuery(query, queryEditorColumns);
      const isValid =
        result.filters && (!result.errors || result.errors.length === 0);

      if (isValid) {
        // Query is valid
        setStatusState('query');
      } else {
        // Query is invalid
        if (!allowLLMFiltering) {
          setStatusState('error');
        } else {
          setStatusState('ai');
        }
      }
    }
  }, [allowLLMFiltering, query, queryEditorColumns]);

  // Early return after all hooks
  if (columns.length === 0) {
    return null;
  }

  const queryEditorContent = (
    <div className="w-full query-editor-wrapper">
      <QueryEditor
        isCollapsed={isCollapsed}
        onToggle={setIsCollapsed}
        queries={recentQueries}
        onQuerySelect={setQuery}
        statusState={statusState}
        isLoading={isParsing}
        onApply={handleApply}
        allowLLMFiltering={allowLLMFiltering}
        onLLMFilteringChange={setAllowLLMFiltering}
        aiToggleLabel="AI Filtering"
        value={query}
        columns={queryEditorColumns}
        onChange={handleQueryChange}
        placeholder='e.g., [Name] = "John" AND [Age] > 18'
        height={48}
        buttonText="Filters"
        showButtonText={false}
      />
      <style>{tableStyles.queryEditor.css}</style>
    </div>
  );

  return (
    <div style={tableStyles.tableOptions.container}>
      <div className={tableStyles.tableOptions.inner}>
        {allowFiltering && queryEditorContent}
      </div>
    </div>
  );
};

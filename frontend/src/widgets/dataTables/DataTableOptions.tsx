import React, { useState, useMemo, useCallback, useRef } from 'react';
import { useTable } from './DataTableContext';
import { tableStyles } from './styles/style';
import { QueryEditor, QueryEditorChangeEvent } from 'filter-query-editor';
import { Filter } from '@/services/grpcTableService';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuCheckboxItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button/button';
import { ChevronDown } from 'lucide-react';

// Define layout constants
const QUERY_EDITOR_MIN_WIDTH = 400; // Minimum width for query editor
const COLUMN_BUTTON_WIDTH = 120; // Approximate width of columns button
const LAYOUT_GAP = 8; // Gap between elements
const BREAKPOINT = QUERY_EDITOR_MIN_WIDTH + COLUMN_BUTTON_WIDTH + LAYOUT_GAP;

export const DataTableOptions: React.FC<{
  hasOptions: { allowFiltering: boolean };
}> = ({ hasOptions }) => {
  const [query, setQuery] = useState<string>('');
  const [pendingFilter, setPendingFilter] = useState<Filter | null>(null);
  const [containerWidth, setContainerWidth] = useState<number>(
    window.innerWidth
  );
  const resizeObserverRef = useRef<ResizeObserver | null>(null);

  const { columns, setActiveFilter, toggleColumnVisibility } = useTable();

  const { allowFiltering } = hasOptions;

  // Callback ref to handle container element
  const containerRef = useCallback((node: HTMLDivElement | null) => {
    // Clean up previous observer
    if (resizeObserverRef.current) {
      resizeObserverRef.current.disconnect();
      resizeObserverRef.current = null;
    }

    if (node) {
      // Set initial width
      setContainerWidth(node.offsetWidth);

      // Create new observer
      resizeObserverRef.current = new ResizeObserver(entries => {
        for (const entry of entries) {
          const width = entry.contentRect.width;
          setContainerWidth(width);
        }
      });

      resizeObserverRef.current.observe(node);
    }
  }, []);

  if (columns.length === 0) {
    return null;
  }

  // Determine if we should stack the layout based on container width
  // Stack when: filtering is enabled AND container is narrower than breakpoint
  const shouldStack =
    allowFiltering && containerWidth > 0 && containerWidth < BREAKPOINT;

  const handleQueryChange = (event: QueryEditorChangeEvent) => {
    setQuery(event.text);

    if (event.text.trim() === '') {
      setPendingFilter(null);
      setActiveFilter(null);
    } else if (event.isValid && event.filters) {
      setPendingFilter({ group: event.filters });
    } else {
      setPendingFilter(null);
    }
  };

  const handleKeyDown = (event: React.KeyboardEvent) => {
    if (
      event.key === 'Enter' &&
      (event.metaKey || event.ctrlKey || !event.shiftKey)
    ) {
      event.preventDefault();
      if (pendingFilter) {
        setActiveFilter(pendingFilter);
      } else {
        setActiveFilter(null);
      }
    }
  };

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

  const queryEditorContent = (
    <div
      className={`query-editor-wrapper ${shouldStack ? 'w-full' : 'flex-1'}`}
      style={{
        minWidth: shouldStack ? '100%' : `${QUERY_EDITOR_MIN_WIDTH}px`,
      }}
      onKeyDown={handleKeyDown}
    >
      <QueryEditor
        value={query}
        columns={queryEditorColumns}
        onChange={handleQueryChange}
        placeholder='e.g., [Name] = "John" AND [Age] > 18'
        height={40}
        className="font-mono rounded-lg border shadow-sm [&:focus-within]:ring-1 [&:focus-within]:ring-ring"
      />
      <style>{tableStyles.queryEditor.css}</style>
    </div>
  );

  // Handle column visibility toggle
  const handleColumnToggle = useCallback(
    (columnName: string) => {
      toggleColumnVisibility(columnName);
    },
    [toggleColumnVisibility]
  );

  const columnsDropdown = (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm">
          <ChevronDown />
          Columns
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-[200px]">
        <DropdownMenuLabel>Toggle columns</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {columns.map(column => (
          <DropdownMenuCheckboxItem
            key={column.name}
            checked={!column.hidden}
            onCheckedChange={() => handleColumnToggle(column.name)}
          >
            {column.header || column.name}
          </DropdownMenuCheckboxItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );

  return (
    <div style={tableStyles.tableOptions.container} ref={containerRef}>
      <div className={tableStyles.tableOptions.inner}>
        {allowFiltering ? (
          <div
            className={`flex gap-2 w-full ${
              shouldStack
                ? 'flex-col items-stretch'
                : 'flex-row items-center justify-between'
            }`}
          >
            {queryEditorContent}
            <div className={shouldStack ? 'self-start' : 'flex-shrink-0'}>
              {columnsDropdown}
            </div>
          </div>
        ) : (
          <div className="flex justify-end w-full">{columnsDropdown}</div>
        )}
      </div>
    </div>
  );
};

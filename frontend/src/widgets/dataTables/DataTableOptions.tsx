import React, { useState, useMemo, useCallback } from 'react';
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

export const DataTableOptions: React.FC<{
  hasOptions: { allowFiltering: boolean };
}> = ({ hasOptions }) => {
  const [query, setQuery] = useState<string>('');
  const [pendingFilter, setPendingFilter] = useState<Filter | null>(null);

  const { columns, setActiveFilter, toggleColumnVisibility } = useTable();

  const { allowFiltering } = hasOptions;

  if (columns.length === 0) {
    return null;
  }

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
      className="min-w-[400px] query-editor-wrapper"
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
    <div style={tableStyles.tableOptions.container}>
      <div className={tableStyles.tableOptions.inner}>
        <div className="flex items-center justify-between gap-2 w-full">
          {allowFiltering && queryEditorContent}
          {columnsDropdown}
        </div>
      </div>
    </div>
  );
};

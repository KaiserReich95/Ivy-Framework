import React, {
  useState,
  useMemo,
  useCallback,
  useRef,
  useEffect,
} from 'react';
import { useTable } from './DataTableContext';
import { tableStyles } from './styles/style';
import { QueryEditor, QueryEditorChangeEvent } from 'filter-query-editor';
import { Filter } from '@/services/grpcTableService';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuItem,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button/button';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import {
  Columns3Cog,
  Bookmark,
  Trash2,
  Filter as FilterIcon,
  Search,
  GripVertical,
} from 'lucide-react';

const BREAKPOINT = 600; // Breakpoint for stacking layout

// Local storage key for saved filters
const SAVED_FILTERS_STORAGE_KEY = 'dataTableSavedFilters';

interface SavedFilter {
  id: string;
  query: string;
  timestamp: number;
}

// Sortable column item component for drag-and-drop
interface SortableColumnItemProps {
  column: { name: string; header?: string; hidden?: boolean };
  onToggle: (name: string) => void;
}

const SortableColumnItem: React.FC<SortableColumnItemProps> = ({
  column,
  onToggle,
}) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: column.name });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="flex items-center gap-2 px-2 py-1.5 hover:bg-accent rounded-sm cursor-move"
      {...attributes}
    >
      <div {...listeners} className="cursor-grab active:cursor-grabbing">
        <GripVertical className="h-4 w-4 text-muted-foreground" />
      </div>
      <label className="flex items-center gap-2 flex-1 cursor-pointer">
        <input
          type="checkbox"
          checked={!column.hidden}
          onChange={() => onToggle(column.name)}
          className="cursor-pointer"
        />
        <span className="select-none">{column.header || column.name}</span>
      </label>
    </div>
  );
};

export const DataTableOptions: React.FC<{
  hasOptions: { allowFiltering: boolean };
}> = ({ hasOptions }) => {
  const [query, setQuery] = useState<string>('');
  const [pendingFilter, setPendingFilter] = useState<Filter | null>(null);
  const [containerWidth, setContainerWidth] = useState<number>(
    window.innerWidth
  );
  const [savedFilters, setSavedFilters] = useState<SavedFilter[]>([]);
  const [shouldApplyFilter, setShouldApplyFilter] = useState(false);
  const [isQueryEditorOpen, setIsQueryEditorOpen] = useState(false);
  const resizeObserverRef = useRef<ResizeObserver | null>(null);

  const {
    columns,
    setActiveFilter,
    toggleColumnVisibility,
    handleColumnReorder,
    columnOrder,
  } = useTable();

  // Load saved filters from local storage on mount
  useEffect(() => {
    const loadSavedFilters = () => {
      try {
        const stored = localStorage.getItem(SAVED_FILTERS_STORAGE_KEY);
        if (stored) {
          setSavedFilters(JSON.parse(stored));
        }
      } catch (error) {
        console.error('Failed to load saved filters:', error);
      }
    };
    loadSavedFilters();
  }, []);

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
  // Stack when container is narrower than breakpoint
  const shouldStack = containerWidth > 0 && containerWidth < BREAKPOINT;

  const handleQueryChange = (event: QueryEditorChangeEvent) => {
    setQuery(event.text);

    if (event.text.trim() === '') {
      setPendingFilter(null);
      setActiveFilter(null);
    } else if (event.isValid && event.filters) {
      const newFilter = { group: event.filters };
      setPendingFilter(newFilter);

      // Auto-apply if shouldApplyFilter flag is set
      if (shouldApplyFilter) {
        setActiveFilter(newFilter);
        setShouldApplyFilter(false);
      }
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

  // Save current filter
  const handleSaveFilter = useCallback(() => {
    if (!query.trim()) return;

    // Check if this query already exists
    const exists = savedFilters.some(f => f.query === query.trim());
    if (exists) return;

    const newFilter: SavedFilter = {
      id: Date.now().toString(),
      query: query.trim(),
      timestamp: Date.now(),
    };

    const updatedFilters = [...savedFilters, newFilter];
    setSavedFilters(updatedFilters);

    try {
      localStorage.setItem(
        SAVED_FILTERS_STORAGE_KEY,
        JSON.stringify(updatedFilters)
      );
    } catch (error) {
      console.error('Failed to save filter:', error);
    }
  }, [query, savedFilters]);

  // Load a saved filter
  const handleLoadFilter = useCallback((filter: SavedFilter) => {
    // Set flag to auto-apply the filter once QueryEditor parses it
    setShouldApplyFilter(true);
    setQuery(filter.query);
  }, []);

  // Delete a saved filter
  const handleDeleteFilter = useCallback(
    (filterId: string) => {
      const updatedFilters = savedFilters.filter(f => f.id !== filterId);
      setSavedFilters(updatedFilters);

      try {
        localStorage.setItem(
          SAVED_FILTERS_STORAGE_KEY,
          JSON.stringify(updatedFilters)
        );
      } catch (error) {
        console.error('Failed to delete filter:', error);
      }
    },
    [savedFilters]
  );

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

  const savedFiltersDropdown = (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className="px-2"
          title="Saved Filters"
        >
          <FilterIcon className="text-gray-500" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-[300px]">
        <DropdownMenuLabel>Filters</DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          className="flex items-center gap-2"
          disabled={!query.trim()}
          onSelect={handleSaveFilter}
        >
          <Bookmark className="h-4 w-4" />
          <span>Save current filter</span>
        </DropdownMenuItem>
        {savedFilters.length > 0 && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuLabel className="text-xs text-muted-foreground">
              Saved Filters
            </DropdownMenuLabel>
            {savedFilters.map(filter => (
              <DropdownMenuItem
                key={filter.id}
                className="flex items-center justify-between gap-2"
                onSelect={() => handleLoadFilter(filter)}
              >
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-mono truncate">
                    {filter.query}
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 w-6 p-0 hover:bg-destructive hover:text-destructive-foreground"
                  onClick={e => {
                    e.stopPropagation();
                    handleDeleteFilter(filter.id);
                  }}
                >
                  <Trash2 className="h-3 w-3" />
                </Button>
              </DropdownMenuItem>
            ))}
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );

  const queryEditorContent = (
    <div
      className={`flex gap-1 items-center query-editor-wrapper transition-all duration-300 ease-in-out ${
        isQueryEditorOpen
          ? `opacity-100 ${shouldStack ? 'w-full' : 'min-w-[400px]'}`
          : 'opacity-0 w-0 overflow-hidden'
      }`}
      onKeyDown={handleKeyDown}
    >
      <div className="flex-1">
        <QueryEditor
          value={query}
          columns={queryEditorColumns}
          onChange={handleQueryChange}
          placeholder='e.g., [Name] = "John" AND [Age] > 18'
          height={34}
          className="font-mono rounded-lg border shadow-sm [&:focus-within]:ring-1 [&:focus-within]:ring-ring"
        />
      </div>
    </div>
  );

  // Handle column visibility toggle
  const handleColumnToggle = useCallback(
    (columnName: string) => {
      toggleColumnVisibility(columnName);
    },
    [toggleColumnVisibility]
  );

  // Get ordered columns based on columnOrder
  const orderedColumns = useMemo(() => {
    if (columnOrder.length === 0) return columns;
    return columnOrder.map(index => columns[index]).filter(Boolean);
  }, [columns, columnOrder]);

  // Setup drag-and-drop sensors
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // Handle drag end event
  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event;

      if (over && active.id !== over.id) {
        const oldIndex = orderedColumns.findIndex(
          col => col.name === active.id
        );
        const newIndex = orderedColumns.findIndex(col => col.name === over.id);

        if (oldIndex !== -1 && newIndex !== -1) {
          // Call the reorder handler from context
          handleColumnReorder(oldIndex, newIndex);
        }
      }
    },
    [orderedColumns, handleColumnReorder]
  );

  const columnsDropdown = (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className="px-2"
          title="Toggle Columns & Reorder"
        >
          <Columns3Cog className="text-gray-500" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-[250px] p-2">
        <DropdownMenuLabel>Toggle & Reorder Columns</DropdownMenuLabel>
        <p className="text-xs text-muted-foreground px-2 pb-2">
          Drag to reorder columns
        </p>
        <DropdownMenuSeparator />
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
        >
          <SortableContext
            items={orderedColumns.map(col => col.name)}
            strategy={verticalListSortingStrategy}
          >
            <div className="py-1">
              {orderedColumns.map(column => (
                <SortableColumnItem
                  key={column.name}
                  column={column}
                  onToggle={handleColumnToggle}
                />
              ))}
            </div>
          </SortableContext>
        </DndContext>
      </DropdownMenuContent>
    </DropdownMenu>
  );

  return (
    <>
      <style>{tableStyles.queryEditor.css}</style>
      <div style={tableStyles.tableOptions.container} ref={containerRef}>
        <div
          className={
            shouldStack
              ? tableStyles.tableOptions.innerStacked
              : tableStyles.tableOptions.inner
          }
        >
          {shouldStack ? (
            // Stacked layout for narrow containers
            <>
              <div
                className={`flex w-full gap-2 transition-all duration-300 ease-in-out ${
                  isQueryEditorOpen ? 'mb-2' : ''
                }`}
              >
                {queryEditorContent}
                {isQueryEditorOpen && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="px-2 transition-opacity duration-300"
                    onClick={() => setIsQueryEditorOpen(false)}
                    title="Close Query Editor"
                  >
                    Close
                  </Button>
                )}
              </div>
              <div className={tableStyles.tableOptions.buttonsWrapperStacked}>
                {!isQueryEditorOpen && allowFiltering && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="px-2 transition-all duration-300 hover:bg-accent"
                    onClick={() => setIsQueryEditorOpen(true)}
                    title="Search & Filter"
                  >
                    <Search className="text-gray-500" />
                  </Button>
                )}
                {allowFiltering && savedFiltersDropdown}
                {columnsDropdown}
              </div>
            </>
          ) : (
            // Horizontal layout for wide containers
            <div className="flex w-full items-center justify-end">
              <div className="flex gap-2 items-center">
                {queryEditorContent}
                {!isQueryEditorOpen && allowFiltering && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="px-2 transition-all duration-300"
                    onClick={() => setIsQueryEditorOpen(true)}
                    title="Search & Filter"
                  >
                    <Search className="text-gray-500" />
                  </Button>
                )}
                {isQueryEditorOpen && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="px-2 transition-opacity duration-300"
                    onClick={() => setIsQueryEditorOpen(false)}
                    title="Close Query Editor"
                  >
                    Close
                  </Button>
                )}
              </div>
              {allowFiltering && savedFiltersDropdown}
              {columnsDropdown}
            </div>
          )}
        </div>
      </div>
    </>
  );
};

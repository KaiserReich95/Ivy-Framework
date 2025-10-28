import '@glideapps/glide-data-grid/dist/index.css';
import './styles/checkbox.css';
import React from 'react';
import { TableProvider, useTable } from './DataTableContext';
import { Loading } from '@/components/Loading';
import { DataTableEditor } from './DataTableEditor';
import { DataTableOptions } from './DataTableOptions';
import { tableStyles } from './styles/style';
import { TableProps } from './types/types';
import { getWidth, getHeight } from '@/lib/styles';
import { ErrorWidget } from '@/widgets/primitives/ErrorWidget';

interface TableLayoutProps {
  children?: React.ReactNode;
}

const TableLayout: React.FC<TableLayoutProps> = ({ children }) => {
  const { columns, filterParsingError } = useTable();
  const showTableEditor = columns.length > 0;

  return (
    <>
      {filterParsingError && (
        <div
          style={{
            position: 'fixed',
            top: '20px',
            left: '50%',
            transform: 'translateX(-50%)',
            zIndex: 1000,
            maxWidth: '600px',
            width: '90%',
            padding: '12px',
            backgroundColor: 'var(--destructive-background, #fee)',
            border: '1px solid var(--destructive, #dc2626)',
            borderRadius: '6px',
            boxShadow:
              '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
          }}
        >
          <ErrorWidget
            title={filterParsingError.title}
            message={filterParsingError.message}
            stackTrace={filterParsingError.stackTrace}
          />
        </div>
      )}
      <div style={tableStyles.table.container}>
        {showTableEditor ? children : <Loading />}
      </div>
    </>
  );
};

export const DataTable: React.FC<TableProps> = ({
  columns,
  connection,
  config = {},
  editable = false,
  width,
  height,
}) => {
  // Apply default configuration values
  const finalConfig = {
    filterType: config.filterType,
    freezeColumns: config.freezeColumns ?? null,
    allowLlmFiltering: config.allowLlmFiltering ?? true,
    allowSorting: config.allowSorting ?? true,
    allowFiltering: config.allowFiltering ?? true,
    allowColumnReordering: config.allowColumnReordering ?? true,
    allowColumnResizing: config.allowColumnResizing ?? true,
    allowCopySelection: config.allowCopySelection ?? true,
    selectionMode: config.selectionMode,
    showIndexColumn: config.showIndexColumn ?? false,
    showGroups: config.showGroups ?? false,
  };

  // Create styles object with width and height if provided
  const containerStyle: React.CSSProperties = {
    ...getWidth(width),
    ...getHeight(height),
  };

  return (
    <div style={containerStyle}>
      <TableProvider
        columns={columns}
        connection={connection}
        config={finalConfig}
        editable={editable}
      >
        <TableLayout>
          <>
            <DataTableOptions
              hasOptions={{
                allowFiltering: finalConfig.allowFiltering,
                allowLlmFiltering: finalConfig.allowLlmFiltering,
              }}
            />

            <DataTableEditor hasOptions={finalConfig.allowFiltering} />
          </>
        </TableLayout>
      </TableProvider>
    </div>
  );
};

export default DataTable;

import React from 'react';

interface TableColumn<T> {
  key: keyof T | string;
  header: string;
  render?: (value: unknown, row: T) => React.ReactNode;
  className?: string;
}

interface TableProps<T> {
  columns: TableColumn<T>[];
  data: T[];
  actions?: (row: T) => React.ReactNode;
  className?: string;
}

export function Table<T extends { id?: string | number }>({
  columns,
  data,
  actions,
  className,
}: TableProps<T>) {
  return (
    <div className={`overflow-x-auto ${className || ''}`}>
      <table className="min-w-full bg-white border border-gray-200 rounded-lg">
        <thead>
          <tr>
            {columns.map((col) => (
              <th
                key={col.key as string}
                className={`px-4 py-2 text-left text-xs font-semibold text-gray-700 border-b border-gray-200 ${col.className || ''}`}
              >
                {col.header}
              </th>
            ))}
            {actions && <th className="px-4 py-2 text-xs font-semibold text-gray-700 border-b border-gray-200">Actions</th>}
          </tr>
        </thead>
        <tbody>
          {data.length === 0 ? (
            <tr>
              <td colSpan={columns.length + (actions ? 1 : 0)} className="px-4 py-6 text-center text-gray-400">
                No data available
              </td>
            </tr>
          ) : (
            data.map((row, i) => (
              <tr key={row.id ?? i} className="hover:bg-gray-200">
                {columns.map((col) => (
                  <td key={col.key as string} className={`px-4 py-2 border-b border-gray-100 ${col.className || ''}`}>
                    {col.render ? col.render((row as Record<string, unknown>)[col.key], row) : (row as Record<string, unknown>)[col.key]}
                  </td>
                ))}
                {actions && (
                  <td className="px-4 py-2 border-b border-gray-100">
                    {actions(row)}
                  </td>
                )}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
} 
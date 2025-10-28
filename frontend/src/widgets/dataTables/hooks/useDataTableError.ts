import { useState, useCallback } from 'react';
import { logger } from '@/lib/logger';

/**
 * Structured error information for display
 */
export interface DataTableErrorInfo {
  title: string;
  message: string;
  stackTrace?: string;
}

/**
 * Error types for different DataTable operations
 */
export enum DataTableErrorType {
  QUERY = 'query',
  FILTER_PARSING = 'filter_parsing',
}

/**
 * State for all DataTable errors
 */
interface DataTableErrorState {
  queryError: DataTableErrorInfo | null;
  filterParsingError: DataTableErrorInfo | null;
}

/**
 * Custom hook for centralized DataTable error handling
 *
 * Provides:
 * - Structured error state management
 * - gRPC error parsing utilities
 * - Error handler functions for different operation types
 *
 * @returns Error state and handler functions
 */
export function useDataTableError() {
  const [errors, setErrors] = useState<DataTableErrorState>({
    queryError: null,
    filterParsingError: null,
  });

  /**
   * Parse a gRPC error response to extract structured error information
   *
   * Attempts to extract:
   * - Status code and message from gRPC-Web error format
   * - Stack trace if available
   * - Falls back to generic error message if parsing fails
   */
  const parseGrpcError = useCallback((error: unknown): DataTableErrorInfo => {
    // Handle Error objects
    if (error instanceof Error) {
      const errorMessage = error.message;

      // Try to parse gRPC error format: "gRPC Error: {status} {statusText} - {details}"
      const grpcErrorMatch = errorMessage.match(
        /gRPC Error: (\d+) ([^-]+) - (.+)/
      );

      if (grpcErrorMatch) {
        const [, statusCode, statusText, details] = grpcErrorMatch;

        return {
          title: `gRPC Error ${statusCode}: ${statusText.trim()}`,
          message: details.trim(),
          stackTrace: error.stack,
        };
      }

      // Check for other common error patterns
      if (errorMessage.includes('Failed to fetch')) {
        return {
          title: 'Network Error',
          message:
            'Unable to connect to the data service. Please check your connection and try again.',
          stackTrace: error.stack,
        };
      }

      if (errorMessage.includes('timeout')) {
        return {
          title: 'Timeout Error',
          message: 'The request took too long to complete. Please try again.',
          stackTrace: error.stack,
        };
      }

      // Generic error with stack trace
      return {
        title: error.name || 'Error',
        message: errorMessage,
        stackTrace: error.stack,
      };
    }

    // Handle string errors
    if (typeof error === 'string') {
      return {
        title: 'Error',
        message: error,
      };
    }

    // Handle unknown error types
    return {
      title: 'Unknown Error',
      message: 'An unexpected error occurred. Please try again.',
    };
  }, []);

  /**
   * Handle errors from data query operations
   */
  const handleQueryError = useCallback(
    (error: unknown) => {
      const errorInfo = parseGrpcError(error);
      logger.error('DataTable query error:', errorInfo);

      setErrors(prev => ({
        ...prev,
        queryError: errorInfo,
      }));
    },
    [parseGrpcError]
  );

  /**
   * Handle errors from filter parsing operations
   */
  const handleFilterParsingError = useCallback(
    (error: unknown) => {
      const errorInfo = parseGrpcError(error);
      logger.error('DataTable filter parsing error:', errorInfo);

      setErrors(prev => ({
        ...prev,
        filterParsingError: errorInfo,
      }));
    },
    [parseGrpcError]
  );

  /**
   * Clear a specific error type
   */
  const clearError = useCallback((errorType: DataTableErrorType) => {
    setErrors(prev => {
      const newErrors = { ...prev };

      if (errorType === DataTableErrorType.QUERY) {
        newErrors.queryError = null;
      } else if (errorType === DataTableErrorType.FILTER_PARSING) {
        newErrors.filterParsingError = null;
      }

      return newErrors;
    });
  }, []);

  /**
   * Clear all errors
   */
  const clearAllErrors = useCallback(() => {
    setErrors({
      queryError: null,
      filterParsingError: null,
    });
  }, []);

  return {
    // Error state
    queryError: errors.queryError,
    filterParsingError: errors.filterParsingError,
    hasError: errors.queryError !== null || errors.filterParsingError !== null,

    // Error handlers
    handleQueryError,
    handleFilterParsingError,

    // Clear functions
    clearError,
    clearAllErrors,

    // Utility
    parseGrpcError,
  };
}

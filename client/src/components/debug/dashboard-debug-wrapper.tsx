import React, { useEffect, useState } from 'react';
import { ErrorBoundary } from 'react-error-boundary';
import { createComponentLogger, safeObjectInspect } from '@/utils/debug-logger';

const logger = createComponentLogger('DashboardDebugWrapper');

interface ErrorFallbackProps {
  error: Error;
  resetErrorBoundary: () => void;
}

function ErrorFallback({ error, resetErrorBoundary }: ErrorFallbackProps) {
  const [showDetails, setShowDetails] = useState(false);
  const [stackLines, setStackLines] = useState<string[]>([]);

  useEffect(() => {
    if (error.stack) {
      const lines = error.stack.split('\n');
      setStackLines(lines);
    }
  }, [error]);

  return (
    <div className="rounded-md border border-destructive/50 bg-destructive/10 p-6 text-destructive shadow-sm m-4">
      <div className="flex flex-col space-y-2">
        <div className="text-lg font-semibold">An error occurred</div>
        <div className="text-sm">{error.message}</div>
        
        <div className="pt-4">
          <button
            onClick={resetErrorBoundary}
            className="bg-primary text-primary-foreground rounded-md px-4 py-2 text-sm font-medium shadow-sm hover:bg-primary/90 mr-2"
          >
            Try again
          </button>
          
          <button
            onClick={() => setShowDetails(!showDetails)}
            className="bg-secondary text-secondary-foreground rounded-md px-4 py-2 text-sm font-medium shadow-sm hover:bg-secondary/90"
          >
            {showDetails ? 'Hide' : 'Show'} details
          </button>
        </div>
        
        {showDetails && (
          <div className="mt-4 max-h-96 overflow-auto p-4 border border-border rounded-md bg-card font-mono text-xs">
            <div className="text-destructive">Stack Trace:</div>
            {stackLines.map((line, i) => (
              <div key={i} className="py-1">
                {line}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

interface DashboardDebugWrapperProps {
  children: React.ReactNode;
  dashboardData: any;
  rawData?: any;
}

/**
 * A wrapper component that provides error boundary and debugging
 * capabilities for Dashboard components.
 */
export function DashboardDebugWrapper({ 
  children, 
  dashboardData,
  rawData 
}: DashboardDebugWrapperProps) {
  useEffect(() => {
    // Log the data structure of dashboardData
    if (dashboardData) {
      logger.log('Dashboard data structure:', 
        Object.keys(dashboardData).length > 0 
          ? Object.keys(dashboardData) 
          : 'Empty object'
      );
      
      // Check for salesTeam specifically
      if (dashboardData.salesTeam) {
        logger.log('salesTeam is present and is', Array.isArray(dashboardData.salesTeam) 
          ? `an array with ${dashboardData.salesTeam.length} items` 
          : typeof dashboardData.salesTeam
        );
        
        // If it's an array with items, log the keys of the first item
        if (Array.isArray(dashboardData.salesTeam) && dashboardData.salesTeam.length > 0) {
          logger.log('First salesTeam item keys:', Object.keys(dashboardData.salesTeam[0]));
        }
      } else {
        logger.warn('salesTeam is missing from dashboardData');
      }
      
      // Check for other common properties that may be used with .map()
      const arrayProperties = ['salesTeam', 'activities', 'deals', 'contacts', 'meetings'];
      arrayProperties.forEach(prop => {
        if (dashboardData[prop]) {
          logger.log(`${prop} is present and is`, Array.isArray(dashboardData[prop]) 
            ? `an array with ${dashboardData[prop].length} items` 
            : typeof dashboardData[prop]
          );
        } else {
          logger.warn(`${prop} is missing from dashboardData`);
        }
      });
    } else {
      logger.warn('dashboardData is null or undefined');
    }
    
    // If raw data is provided, inspect that too
    if (rawData) {
      logger.log('Raw API response data available');
    }
  }, [dashboardData, rawData]);
  
  return (
    <ErrorBoundary 
      FallbackComponent={ErrorFallback}
      onError={(error, info) => {
        logger.error('Dashboard error boundary caught error:', error);
        logger.error('Component stack:', info.componentStack);
      }}
    >
      {children}
      
      {/* Debug Output Panel (only in development) */}
      {process.env.NODE_ENV === 'development' && (
        <div className="fixed bottom-0 right-0 z-50 max-w-md opacity-80 hover:opacity-100 transition-opacity">
          <div className="p-2 bg-black text-white rounded-tl-md text-xs">
            <div className="flex justify-between items-center mb-1">
              <span className="font-bold">Dashboard Debug</span>
              <button 
                className="text-xs bg-gray-700 hover:bg-gray-600 rounded px-2"
                onClick={() => console.clear()}
              >
                Clear console
              </button>
            </div>
            
            <div className="text-xs">
              {dashboardData ? (
                <span className="text-green-400">Data loaded ({Object.keys(dashboardData).length} keys)</span>
              ) : (
                <span className="text-red-400">No data available</span>
              )}
            </div>
          </div>
        </div>
      )}
    </ErrorBoundary>
  );
}
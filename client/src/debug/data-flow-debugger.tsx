import React, { useEffect } from 'react';
import { useAttributionStats } from "@/hooks/use-dashboard-data";

/**
 * DataFlowDebugger - A component that monitors data flow from API to React components
 * This helps identify where data breaks happen in the application
 */
export const DataFlowDebugger: React.FC = () => {
  const { data, isLoading, error, isError } = useAttributionStats();

  useEffect(() => {
    console.log('==== ATTRIBUTION STATS DATA FLOW DEBUG ====');
    console.log('Is Loading:', isLoading);
    console.log('Is Error:', isError);
    console.log('Error:', error);
    console.log('Data:', data);
    console.log('Data Structure:', data ? Object.keys(data) : 'N/A');
    if (data?.stats) {
      console.log('Stats Structure:', Object.keys(data.stats));
      console.log('Attribution Accuracy:', data.attributionAccuracy);
      console.log('Total Contacts:', data.stats.totalContacts);
      console.log('Multi-Source Contacts:', data.stats.multiSourceContacts);
      console.log('Multi-Source Rate:', data.stats.multiSourceRate);
      console.log('Deal Attribution Rate:', data.stats.dealAttributionRate);
      console.log('Field Coverage:', data.stats.fieldCoverage);
    }
    console.log('========================================');
  }, [data, isLoading, error, isError]);

  return null; // No UI needed for this debugging component
};

export default DataFlowDebugger;
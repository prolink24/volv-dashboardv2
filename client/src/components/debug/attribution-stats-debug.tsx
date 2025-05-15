import React, { useEffect } from 'react';
import { createComponentLogger } from '@/utils/debug-logger';

const logger = createComponentLogger('AttributionStatsDebug');

interface AttributionStatsDebugProps {
  isLoading: boolean;
  isError: boolean;
  error: any;
  data: any;
}

/**
 * A specialized debug component for the AttributionStats component
 * that helps diagnose rendering and data flow issues
 */
export function AttributionStatsDebug({
  isLoading,
  isError,
  error,
  data
}: AttributionStatsDebugProps) {
  useEffect(() => {
    console.log('==== ATTRIBUTION STATS DATA FLOW DEBUG ====');
    console.log('Is Loading:', isLoading);
    console.log('Is Error:', isError);
    console.log('Error:', error);
    console.log('Data:', data);
    console.log('Data Structure:', data ? Object.keys(data) : 'N/A');
    console.log('========================================');
    
    if (isError) {
      logger.error('Attribution stats API error:', error);
    }
    
    if (!isLoading && data) {
      // Verify expected properties
      const expectedProperties = [
        'totalContacts',
        'contactsWithMeetings',
        'contactsWithDeals',
        'totalTouchpoints',
        'channelBreakdown',
        'conversionRate',
        'mostEffectiveChannel',
        'averageTouchpointsPerContact'
      ];
      
      const missingProperties = expectedProperties.filter(prop => !(prop in data));
      
      if (missingProperties.length > 0) {
        logger.warn('Missing expected properties in attribution stats data:', missingProperties);
      }
      
      // Check specific fields that might be used with array methods
      if (data.channelBreakdown) {
        logger.log('Channel breakdown:', data.channelBreakdown);
      } else {
        logger.warn('channelBreakdown is missing');
      }
    }
  }, [isLoading, isError, error, data]);

  // This component doesn't render anything visually
  return null;
}
import AttributionJourney from "@/components/analytics/attribution-journey";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { useLocation } from "wouter";

const AttributionJourneyPage = () => {
  const [_, navigate] = useLocation();
  
  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex items-center gap-2 mb-6">
        <Button 
          variant="outline" 
          size="sm" 
          className="flex items-center gap-1"
          onClick={() => navigate('/analytics')}
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Analytics
        </Button>
        <h1 className="text-2xl font-bold">Contact Attribution Journey Explorer</h1>
      </div>
      
      <div className="mb-4">
        <p className="text-muted-foreground">
          This tool provides a detailed visualization of each contact's journey through your sales pipeline, 
          showing all touchpoints across Close CRM, Calendly, and Typeform. Analyze the path from first 
          interaction to closed deal with complete cross-platform attribution.
        </p>
      </div>
      
      <AttributionJourney />
    </div>
  );
};

export default AttributionJourneyPage;
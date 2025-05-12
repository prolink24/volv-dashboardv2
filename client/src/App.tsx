import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { DashboardProvider } from "@/providers/dashboard-provider";

import Sidebar from "@/components/layout/sidebar";
import Header from "@/components/layout/header";

import Dashboard from "@/pages/dashboard";
import Contacts from "@/pages/contacts";
import Meetings from "@/pages/meetings";
import Forms from "@/pages/forms";
import Analytics from "@/pages/analytics";
import Settings from "@/pages/settings";
import NotFound from "@/pages/not-found";
import AttributionJourney from "@/pages/attribution-journey";

function Router() {
  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar />
      <div className="flex flex-col flex-1 overflow-hidden">
        <Header />
        <Switch>
          <Route path="/" component={Dashboard} />
          <Route path="/contacts" component={Contacts} />
          <Route path="/meetings" component={Meetings} />
          <Route path="/forms" component={Forms} />
          <Route path="/analytics" component={Analytics} />
          <Route path="/settings" component={Settings} />
          <Route path="/attribution-journey" component={AttributionJourney} />
          <Route path="/attribution-journey/:id" component={AttributionJourney} />
          <Route component={NotFound} />
        </Switch>
      </div>
    </div>
  );
}

// The App component now includes the necessary DashboardProvider
function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <DashboardProvider>
          <Toaster />
          <Router />
        </DashboardProvider>
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;

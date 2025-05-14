import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { DashboardProvider } from "@/providers/dashboard-provider";

import Sidebar from "@/components/layout/sidebar";
import Header from "@/components/layout/header";
import DataFlowDebugger from "@/debug/data-flow-debugger";

import Dashboard from "@/pages/dashboard";
import Contacts from "@/pages/contacts";
import Meetings from "@/pages/meetings";
import Forms from "@/pages/forms";
import Analytics from "@/pages/analytics";
import Settings from "@/pages/settings";
import NotFound from "@/pages/not-found";
import AttributionJourney from "@/pages/attribution-journey";
import KpiConfigurationPage from "@/pages/settings/kpi-configuration";
import KpiConfigurator from "@/pages/settings/KpiConfigurator";

// Specialized dashboard views
import SalesDashboard from "@/pages/dashboard/sales";
import SetterDashboard from "@/pages/dashboard/setter";
import MarketingDashboard from "@/pages/dashboard/marketing";
import AdminDashboard from "@/pages/dashboard/admin";
import ComplianceDashboard from "@/pages/dashboard/compliance";

function Router() {
  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar />
      <div className="flex flex-col flex-1 overflow-hidden">
        <Header />
        <Switch>
          <Route path="/" component={Dashboard} />
          <Route path="/dashboard/sales" component={SalesDashboard} />
          <Route path="/dashboard/setter" component={SetterDashboard} />
          <Route path="/dashboard/marketing" component={MarketingDashboard} />
          <Route path="/dashboard/admin" component={AdminDashboard} />
          <Route path="/dashboard/compliance" component={ComplianceDashboard} />
          <Route path="/contacts" component={Contacts} />
          <Route path="/meetings" component={Meetings} />
          <Route path="/forms" component={Forms} />
          <Route path="/analytics" component={Analytics} />
          <Route path="/settings" component={Settings} />
          <Route path="/settings/kpi-configuration" component={KpiConfigurationPage} />
          <Route path="/settings/kpi-configurator" component={KpiConfigurator} />
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
          <DataFlowDebugger />
          <Router />
        </DashboardProvider>
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;

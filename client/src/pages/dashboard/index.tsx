import { ImprovedDashboard } from "@/components/dashboard/improved-dashboard";
import { DashboardProvider } from "@/providers/dashboard-provider";
import { DateProvider } from "@/providers/date-context";

const Dashboard = () => {
  return (
    <DateProvider>
      <DashboardProvider>
        <ImprovedDashboard />
      </DashboardProvider>
    </DateProvider>
  );
};

export default Dashboard;
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface DashboardTabsProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
}

const DashboardTabs = ({ activeTab, setActiveTab }: DashboardTabsProps) => {
  return (
    <div className="bg-card rounded-lg shadow-sm border border-border mb-6">
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="border-b border-border w-full rounded-none justify-start">
          <TabsTrigger value="team-performance" className="rounded-none data-[state=active]:border-b-2 data-[state=active]:border-primary">
            Team Performance
          </TabsTrigger>
          <TabsTrigger value="missing-admins" className="rounded-none data-[state=active]:border-b-2 data-[state=active]:border-primary">
            Missing Admins
          </TabsTrigger>
          <TabsTrigger value="lead-attribution" className="rounded-none data-[state=active]:border-b-2 data-[state=active]:border-primary">
            Lead Attribution
          </TabsTrigger>
          <TabsTrigger value="call-performance" className="rounded-none data-[state=active]:border-b-2 data-[state=active]:border-primary">
            Call Performance
          </TabsTrigger>
        </TabsList>
      </Tabs>
    </div>
  );
};

export default DashboardTabs;

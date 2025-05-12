import { useState } from "react";
import { useToast } from "@/hooks/use-toast";

import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const Settings = () => {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("general");
  
  // Mock API integration settings states
  const [closeApiKey, setCloseApiKey] = useState("••••••••••••••••••••••••••••••");
  const [calendlyApiKey, setCalendlyApiKey] = useState("••••••••••••••••••••••••••••••");
  const [typeformApiKey, setTypeformApiKey] = useState("••••••••••••••••••••••••••••••");
  
  // Mock sync settings states
  const [autoSync, setAutoSync] = useState(true);
  const [syncInterval, setSyncInterval] = useState("hourly");
  const [syncHistory, setSyncHistory] = useState([
    { id: 1, source: "All Sources", status: "success", date: "2025-04-02T12:30:00", count: 285 },
    { id: 2, source: "Calendly", status: "success", date: "2025-04-02T11:15:00", count: 44 },
    { id: 3, source: "Typeform", status: "success", date: "2025-04-01T16:45:00", count: 53 },
    { id: 4, source: "Close CRM", status: "failed", date: "2025-04-01T14:20:00", count: 0 },
    { id: 5, source: "All Sources", status: "success", date: "2025-03-31T10:00:00", count: 278 },
  ]);
  
  // Mock other settings
  const [defaultDateRange, setDefaultDateRange] = useState("30-days");
  const [defaultView, setDefaultView] = useState("team-performance");
  const [darkMode, setDarkMode] = useState(false);
  
  const handleSaveAPIKeys = () => {
    toast({
      title: "API Keys Updated",
      description: "Your integration API keys have been saved.",
    });
  };
  
  const handleSaveSyncSettings = () => {
    toast({
      title: "Sync Settings Updated",
      description: `Auto-sync ${autoSync ? 'enabled' : 'disabled'} with ${syncInterval} interval.`,
    });
  };
  
  const handleSavePreferences = () => {
    toast({
      title: "Preferences Saved",
      description: "Your dashboard preferences have been updated.",
    });
  };
  
  const triggerManualSync = () => {
    toast({
      title: "Sync Started",
      description: "Manual sync has been initiated for all sources.",
    });
    
    // This would trigger the API call to sync all data
    fetch("/api/sync/all", {
      method: "POST",
      credentials: "include",
    })
      .then((res) => res.json())
      .then((data) => {
        toast({
          title: "Sync Complete",
          description: `Successfully synced ${data.count || 'all'} records.`,
        });
        
        // Add to sync history
        setSyncHistory([
          {
            id: syncHistory.length + 1,
            source: "All Sources",
            status: "success",
            date: new Date().toISOString(),
            count: data.count || 285,
          },
          ...syncHistory,
        ]);
      })
      .catch((error) => {
        toast({
          title: "Sync Failed",
          description: error.message || "Failed to sync data",
          variant: "destructive",
        });
        
        // Add to sync history
        setSyncHistory([
          {
            id: syncHistory.length + 1,
            source: "All Sources",
            status: "failed",
            date: new Date().toISOString(),
            count: 0,
          },
          ...syncHistory,
        ]);
      });
  };
  
  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return new Intl.DateTimeFormat('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(date);
  };
  
  return (
    <main className="flex-1 overflow-y-auto p-4 md:p-6 bg-background">
      <div className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight">Settings</h1>
        <p className="text-muted-foreground">
          Configure your integration and dashboard settings
        </p>
      </div>
      
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-4 mb-6">
          <TabsTrigger value="general">General</TabsTrigger>
          <TabsTrigger value="integrations">Integrations</TabsTrigger>
          <TabsTrigger value="sync">Data Sync</TabsTrigger>
          <TabsTrigger value="users">Users</TabsTrigger>
        </TabsList>
        
        <TabsContent value="general" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Dashboard Preferences</CardTitle>
              <CardDescription>
                Configure your dashboard display preferences
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="defaultDateRange">Default Date Range</Label>
                  <Select value={defaultDateRange} onValueChange={setDefaultDateRange}>
                    <SelectTrigger id="defaultDateRange">
                      <SelectValue placeholder="Select date range" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="7-days">Last 7 Days</SelectItem>
                      <SelectItem value="30-days">Last 30 Days</SelectItem>
                      <SelectItem value="90-days">Last 90 Days</SelectItem>
                      <SelectItem value="current-month">Current Month</SelectItem>
                      <SelectItem value="current-quarter">Current Quarter</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="defaultView">Default Dashboard View</Label>
                  <Select value={defaultView} onValueChange={setDefaultView}>
                    <SelectTrigger id="defaultView">
                      <SelectValue placeholder="Select default view" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="team-performance">Team Performance</SelectItem>
                      <SelectItem value="missing-admins">Missing Admins</SelectItem>
                      <SelectItem value="lead-attribution">Lead Attribution</SelectItem>
                      <SelectItem value="call-performance">Call Performance</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              
              <div className="flex items-center space-x-2">
                <Switch id="darkMode" checked={darkMode} onCheckedChange={setDarkMode} />
                <Label htmlFor="darkMode">Enable Dark Mode by Default</Label>
              </div>
            </CardContent>
            <CardFooter>
              <Button onClick={handleSavePreferences}>Save Preferences</Button>
            </CardFooter>
          </Card>
        </TabsContent>
        
        <TabsContent value="integrations" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Close CRM Integration</CardTitle>
              <CardDescription>
                Connect your Close CRM account to sync leads, opportunities and activities
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="closeApiKey">Close API Key</Label>
                <Input
                  id="closeApiKey"
                  value={closeApiKey}
                  onChange={(e) => setCloseApiKey(e.target.value)}
                  type="password"
                />
              </div>
              
              <div className="flex items-center space-x-2">
                <Switch id="closeEnabled" defaultChecked />
                <Label htmlFor="closeEnabled">Enable Close CRM Integration</Label>
              </div>
            </CardContent>
            <CardFooter className="flex justify-between">
              <Button variant="outline" onClick={() => setCloseApiKey("")}>
                Clear API Key
              </Button>
              <Button onClick={handleSaveAPIKeys}>Save</Button>
            </CardFooter>
          </Card>
          
          <Card>
            <CardHeader>
              <CardTitle>Calendly Integration</CardTitle>
              <CardDescription>
                Connect your Calendly account to sync meetings and appointments
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="calendlyApiKey">Calendly API Key</Label>
                <Input
                  id="calendlyApiKey"
                  value={calendlyApiKey}
                  onChange={(e) => setCalendlyApiKey(e.target.value)}
                  type="password"
                />
              </div>
              
              <div className="flex items-center space-x-2">
                <Switch id="calendlyEnabled" defaultChecked />
                <Label htmlFor="calendlyEnabled">Enable Calendly Integration</Label>
              </div>
            </CardContent>
            <CardFooter className="flex justify-between">
              <Button variant="outline" onClick={() => setCalendlyApiKey("")}>
                Clear API Key
              </Button>
              <Button onClick={handleSaveAPIKeys}>Save</Button>
            </CardFooter>
          </Card>
          
          <Card>
            <CardHeader>
              <CardTitle>Typeform Integration</CardTitle>
              <CardDescription>
                Connect your Typeform account to sync form submissions
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="typeformApiKey">Typeform API Key</Label>
                <Input
                  id="typeformApiKey"
                  value={typeformApiKey}
                  onChange={(e) => setTypeformApiKey(e.target.value)}
                  type="password"
                />
              </div>
              
              <div className="flex items-center space-x-2">
                <Switch id="typeformEnabled" defaultChecked />
                <Label htmlFor="typeformEnabled">Enable Typeform Integration</Label>
              </div>
            </CardContent>
            <CardFooter className="flex justify-between">
              <Button variant="outline" onClick={() => setTypeformApiKey("")}>
                Clear API Key
              </Button>
              <Button onClick={handleSaveAPIKeys}>Save</Button>
            </CardFooter>
          </Card>
        </TabsContent>
        
        <TabsContent value="sync" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Data Synchronization</CardTitle>
              <CardDescription>
                Configure how and when your data is synchronized
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center space-x-2">
                <Switch id="autoSync" checked={autoSync} onCheckedChange={setAutoSync} />
                <Label htmlFor="autoSync">Enable Automatic Sync</Label>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="syncInterval">Sync Interval</Label>
                <Select
                  value={syncInterval}
                  onValueChange={setSyncInterval}
                  disabled={!autoSync}
                >
                  <SelectTrigger id="syncInterval">
                    <SelectValue placeholder="Select sync interval" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="15min">Every 15 minutes</SelectItem>
                    <SelectItem value="30min">Every 30 minutes</SelectItem>
                    <SelectItem value="hourly">Hourly</SelectItem>
                    <SelectItem value="daily">Daily</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <Separator className="my-4" />
              
              <div className="space-y-2">
                <Label>Manual Sync</Label>
                <div className="flex flex-col sm:flex-row gap-2">
                  <Button onClick={triggerManualSync}>Sync All Data Now</Button>
                  <Button variant="outline" onClick={() => {
                    fetch("/api/sync/close", {
                      method: "POST",
                      credentials: "include",
                    }).then(() => toast({ title: "Close CRM sync initiated" }));
                  }}>
                    Sync Close Only
                  </Button>
                  <Button variant="outline" onClick={() => {
                    fetch("/api/sync/calendly", {
                      method: "POST",
                      credentials: "include",
                    }).then(() => toast({ title: "Calendly sync initiated" }));
                  }}>
                    Sync Calendly Only
                  </Button>
                  <Button variant="outline" onClick={() => {
                    fetch("/api/sync/typeform", {
                      method: "POST",
                      credentials: "include",
                    }).then(() => toast({ title: "Typeform sync initiated" }));
                  }}>
                    Sync Typeform Only
                  </Button>
                </div>
              </div>
            </CardContent>
            <CardFooter>
              <Button onClick={handleSaveSyncSettings}>Save Sync Settings</Button>
            </CardFooter>
          </Card>
          
          <Card>
            <CardHeader>
              <CardTitle>Sync History</CardTitle>
              <CardDescription>
                Recent data synchronization activities
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {syncHistory.map((item) => (
                  <div
                    key={item.id}
                    className="flex justify-between items-center py-2 border-b last:border-0"
                  >
                    <div>
                      <div className="font-medium">{item.source}</div>
                      <div className="text-sm text-muted-foreground">
                        {formatDate(item.date)}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <div
                        className={`px-2 py-1 text-xs rounded-full ${
                          item.status === "success"
                            ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                            : "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"
                        }`}
                      >
                        {item.status === "success" ? "Success" : "Failed"}
                      </div>
                      {item.status === "success" && (
                        <div className="text-sm font-medium">{item.count} records</div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="users" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>User Management</CardTitle>
              <CardDescription>
                Manage user access and permissions
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-center py-8 text-muted-foreground">
                User management functionality would be implemented here
              </p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </main>
  );
};

export default Settings;

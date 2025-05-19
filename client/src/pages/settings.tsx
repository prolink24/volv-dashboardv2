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
  const [typeformSyncInterval, setTypeformSyncInterval] = useState("hourly");
  const [closeSyncInterval, setCloseSyncInterval] = useState("hourly");
  const [calendlySyncInterval, setCalendlySyncInterval] = useState("hourly");
  const [syncHistory, setSyncHistory] = useState([
    { 
      id: 1, 
      source: "All Sources", 
      status: "success", 
      date: "2025-05-19T10:30:00", 
      startTime: "2025-05-19T10:29:15",
      endTime: "2025-05-19T10:30:45",
      duration: "1m 30s",
      count: 285,
      newRecords: 42, 
      updatedRecords: 243,
      details: {
        close: { new: 18, updated: 112, failed: 0 },
        calendly: { new: 14, updated: 86, failed: 0 },
        typeform: { new: 10, updated: 45, failed: 0 }
      }
    },
    { 
      id: 2, 
      source: "Typeform", 
      status: "success", 
      date: "2025-05-18T15:30:00",
      startTime: "2025-05-18T15:29:40",
      endTime: "2025-05-18T15:30:20", 
      duration: "40s",
      count: 67, 
      newRecords: 18, 
      updatedRecords: 49,
      details: {
        contacts: { new: 7, linked: 11 },
        forms: { new: 18, updated: 49, failed: 0 }
      }
    },
    { 
      id: 3, 
      source: "Calendly", 
      status: "success", 
      date: "2025-05-18T12:15:00",
      startTime: "2025-05-18T12:14:22",
      endTime: "2025-05-18T12:15:38", 
      duration: "1m 16s",
      count: 44, 
      newRecords: 12, 
      updatedRecords: 32,
      details: {
        meetings: { new: 12, updated: 32, failed: 0 },
        contacts: { new: 3, linked: 9 }
      }
    },
    { 
      id: 4, 
      source: "Close CRM", 
      status: "failed", 
      date: "2025-05-18T09:20:00",
      startTime: "2025-05-18T09:19:45",
      endTime: "2025-05-18T09:20:12", 
      duration: "27s",
      count: 0,
      error: "API rate limit exceeded",
      details: {
        contacts: { attempted: 156, synced: 0 },
        deals: { attempted: 82, synced: 0 },
        activities: { attempted: 93, synced: 0 }
      }
    },
    { 
      id: 5, 
      source: "All Sources", 
      status: "success", 
      date: "2025-05-17T10:00:00",
      startTime: "2025-05-17T09:59:30",
      endTime: "2025-05-17T10:01:38", 
      duration: "2m 8s",
      count: 278, 
      newRecords: 35, 
      updatedRecords: 243,
      details: {
        close: { new: 15, updated: 128, failed: 0 },
        calendly: { new: 8, updated: 67, failed: 0 },
        typeform: { new: 12, updated: 48, failed: 0 }
      }
    },
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
    // In a real implementation, this would save settings to the server
    // via an API call to persist the sync intervals for each platform
    
    const platformIntervals = [
      `Close CRM: ${closeSyncInterval}`,
      `Calendly: ${calendlySyncInterval}`,
      `Typeform: ${typeformSyncInterval}`
    ].join(', ');
    
    toast({
      title: "Sync Settings Updated",
      description: `Auto-sync ${autoSync ? 'enabled' : 'disabled'}. Global: ${syncInterval}. Platform intervals set.`,
    });
    
    console.log('Saved sync intervals:', {
      global: syncInterval,
      closeCRM: closeSyncInterval,
      calendly: calendlySyncInterval,
      typeform: typeformSyncInterval
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
                <Label htmlFor="syncInterval">Global Sync Interval</Label>
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
              <p className="text-sm text-muted-foreground mb-2">Platform-Specific Sync Settings</p>
              
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="closeSyncInterval">Close CRM Sync</Label>
                    <Select
                      value={closeSyncInterval}
                      onValueChange={setCloseSyncInterval}
                      disabled={!autoSync}
                    >
                      <SelectTrigger id="closeSyncInterval">
                        <SelectValue placeholder="Select interval" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="15min">Every 15 minutes</SelectItem>
                        <SelectItem value="30min">Every 30 minutes</SelectItem>
                        <SelectItem value="hourly">Hourly</SelectItem>
                        <SelectItem value="2hours">Every 2 hours</SelectItem>
                        <SelectItem value="6hours">Every 6 hours</SelectItem>
                        <SelectItem value="12hours">Every 12 hours</SelectItem>
                        <SelectItem value="daily">Daily</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="calendlySyncInterval">Calendly Sync</Label>
                    <Select
                      value={calendlySyncInterval}
                      onValueChange={setCalendlySyncInterval}
                      disabled={!autoSync}
                    >
                      <SelectTrigger id="calendlySyncInterval">
                        <SelectValue placeholder="Select interval" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="15min">Every 15 minutes</SelectItem>
                        <SelectItem value="30min">Every 30 minutes</SelectItem>
                        <SelectItem value="hourly">Hourly</SelectItem>
                        <SelectItem value="2hours">Every 2 hours</SelectItem>
                        <SelectItem value="6hours">Every 6 hours</SelectItem>
                        <SelectItem value="12hours">Every 12 hours</SelectItem>
                        <SelectItem value="daily">Daily</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="typeformSyncInterval">Typeform Sync</Label>
                    <Select
                      value={typeformSyncInterval}
                      onValueChange={setTypeformSyncInterval}
                      disabled={!autoSync}
                    >
                      <SelectTrigger id="typeformSyncInterval">
                        <SelectValue placeholder="Select interval" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="15min">Every 15 minutes</SelectItem>
                        <SelectItem value="30min">Every 30 minutes</SelectItem>
                        <SelectItem value="hourly">Hourly</SelectItem>
                        <SelectItem value="2hours">Every 2 hours</SelectItem>
                        <SelectItem value="6hours">Every 6 hours</SelectItem>
                        <SelectItem value="12hours">Every 12 hours</SelectItem>
                        <SelectItem value="daily">Daily</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
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
              <div className="space-y-6">
                {syncHistory.map((item) => (
                  <div
                    key={item.id}
                    className="bg-slate-50 dark:bg-slate-900/50 rounded-lg p-4 border"
                  >
                    {/* Header */}
                    <div className="flex justify-between items-start mb-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="font-medium text-lg">{item.source}</h3>
                          <div
                            className={`px-2 py-1 text-xs rounded-full ${
                              item.status === "success"
                                ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                                : "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"
                            }`}
                          >
                            {item.status === "success" ? "Success" : "Failed"}
                          </div>
                        </div>
                        <div className="text-sm text-muted-foreground">
                          {formatDate(item.date)}
                        </div>
                      </div>
                      
                      {item.status === "success" ? (
                        <div className="text-sm font-semibold flex flex-col items-end">
                          <span className="text-lg">{item.count} records</span>
                          <span className="text-xs text-muted-foreground">
                            <span className="text-green-600 dark:text-green-400">+{item.newRecords} new</span> • <span className="text-blue-600 dark:text-blue-400">{item.updatedRecords} updated</span>
                          </span>
                        </div>
                      ) : (
                        <div className="text-sm text-red-600 dark:text-red-400 font-medium">
                          {item.error || "Sync failed"}
                        </div>
                      )}
                    </div>
                    
                    {/* Timeline */}
                    <div className="flex items-center gap-2 text-xs text-slate-600 dark:text-slate-400 mb-3">
                      <span>Started: {formatDate(item.startTime)}</span>
                      <span>•</span>
                      <span>Duration: {item.duration}</span>
                    </div>
                    
                    {/* Detailed breakdown */}
                    {item.details && (
                      <div className="mt-2 pt-2 border-t">
                        <h4 className="text-sm font-semibold mb-2">Details</h4>
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                          {item.source === "All Sources" && (
                            <>
                              <div className="p-2 bg-white dark:bg-slate-800 rounded border">
                                <h5 className="text-xs font-medium mb-1">Close CRM</h5>
                                <div className="text-xs">
                                  <div className="flex justify-between">
                                    <span>New:</span>
                                    <span className="font-medium">{item.details.close?.new || 0}</span>
                                  </div>
                                  <div className="flex justify-between">
                                    <span>Updated:</span>
                                    <span className="font-medium">{item.details.close?.updated || 0}</span>
                                  </div>
                                  {item.details.close?.failed > 0 && (
                                    <div className="flex justify-between text-red-600 dark:text-red-400">
                                      <span>Failed:</span>
                                      <span className="font-medium">{item.details.close.failed}</span>
                                    </div>
                                  )}
                                </div>
                              </div>
                              
                              <div className="p-2 bg-white dark:bg-slate-800 rounded border">
                                <h5 className="text-xs font-medium mb-1">Calendly</h5>
                                <div className="text-xs">
                                  <div className="flex justify-between">
                                    <span>New:</span>
                                    <span className="font-medium">{item.details.calendly?.new || 0}</span>
                                  </div>
                                  <div className="flex justify-between">
                                    <span>Updated:</span>
                                    <span className="font-medium">{item.details.calendly?.updated || 0}</span>
                                  </div>
                                  {item.details.calendly?.failed > 0 && (
                                    <div className="flex justify-between text-red-600 dark:text-red-400">
                                      <span>Failed:</span>
                                      <span className="font-medium">{item.details.calendly.failed}</span>
                                    </div>
                                  )}
                                </div>
                              </div>
                              
                              <div className="p-2 bg-white dark:bg-slate-800 rounded border">
                                <h5 className="text-xs font-medium mb-1">Typeform</h5>
                                <div className="text-xs">
                                  <div className="flex justify-between">
                                    <span>New:</span>
                                    <span className="font-medium">{item.details.typeform?.new || 0}</span>
                                  </div>
                                  <div className="flex justify-between">
                                    <span>Updated:</span>
                                    <span className="font-medium">{item.details.typeform?.updated || 0}</span>
                                  </div>
                                  {item.details.typeform?.failed > 0 && (
                                    <div className="flex justify-between text-red-600 dark:text-red-400">
                                      <span>Failed:</span>
                                      <span className="font-medium">{item.details.typeform.failed}</span>
                                    </div>
                                  )}
                                </div>
                              </div>
                            </>
                          )}
                          
                          {item.source === "Typeform" && (
                            <>
                              <div className="p-2 bg-white dark:bg-slate-800 rounded border">
                                <h5 className="text-xs font-medium mb-1">Form Submissions</h5>
                                <div className="text-xs">
                                  <div className="flex justify-between">
                                    <span>New:</span>
                                    <span className="font-medium">{item.details.forms?.new || 0}</span>
                                  </div>
                                  <div className="flex justify-between">
                                    <span>Updated:</span>
                                    <span className="font-medium">{item.details.forms?.updated || 0}</span>
                                  </div>
                                </div>
                              </div>
                              
                              <div className="p-2 bg-white dark:bg-slate-800 rounded border">
                                <h5 className="text-xs font-medium mb-1">Contacts</h5>
                                <div className="text-xs">
                                  <div className="flex justify-between">
                                    <span>New:</span>
                                    <span className="font-medium">{item.details.contacts?.new || 0}</span>
                                  </div>
                                  <div className="flex justify-between">
                                    <span>Linked:</span>
                                    <span className="font-medium">{item.details.contacts?.linked || 0}</span>
                                  </div>
                                </div>
                              </div>
                            </>
                          )}
                          
                          {item.source === "Calendly" && (
                            <>
                              <div className="p-2 bg-white dark:bg-slate-800 rounded border">
                                <h5 className="text-xs font-medium mb-1">Meetings</h5>
                                <div className="text-xs">
                                  <div className="flex justify-between">
                                    <span>New:</span>
                                    <span className="font-medium">{item.details.meetings?.new || 0}</span>
                                  </div>
                                  <div className="flex justify-between">
                                    <span>Updated:</span>
                                    <span className="font-medium">{item.details.meetings?.updated || 0}</span>
                                  </div>
                                </div>
                              </div>
                              
                              <div className="p-2 bg-white dark:bg-slate-800 rounded border">
                                <h5 className="text-xs font-medium mb-1">Contacts</h5>
                                <div className="text-xs">
                                  <div className="flex justify-between">
                                    <span>New:</span>
                                    <span className="font-medium">{item.details.contacts?.new || 0}</span>
                                  </div>
                                  <div className="flex justify-between">
                                    <span>Linked:</span>
                                    <span className="font-medium">{item.details.contacts?.linked || 0}</span>
                                  </div>
                                </div>
                              </div>
                            </>
                          )}
                          
                          {item.source === "Close CRM" && item.status === "failed" && (
                            <>
                              <div className="p-2 bg-white dark:bg-slate-800 rounded border">
                                <h5 className="text-xs font-medium mb-1">Contacts</h5>
                                <div className="text-xs">
                                  <div className="flex justify-between">
                                    <span>Attempted:</span>
                                    <span className="font-medium">{item.details.contacts?.attempted || 0}</span>
                                  </div>
                                  <div className="flex justify-between">
                                    <span>Synced:</span>
                                    <span className="font-medium">{item.details.contacts?.synced || 0}</span>
                                  </div>
                                </div>
                              </div>
                              
                              <div className="p-2 bg-white dark:bg-slate-800 rounded border">
                                <h5 className="text-xs font-medium mb-1">Deals</h5>
                                <div className="text-xs">
                                  <div className="flex justify-between">
                                    <span>Attempted:</span>
                                    <span className="font-medium">{item.details.deals?.attempted || 0}</span>
                                  </div>
                                  <div className="flex justify-between">
                                    <span>Synced:</span>
                                    <span className="font-medium">{item.details.deals?.synced || 0}</span>
                                  </div>
                                </div>
                              </div>
                              
                              <div className="p-2 bg-white dark:bg-slate-800 rounded border">
                                <h5 className="text-xs font-medium mb-1">Activities</h5>
                                <div className="text-xs">
                                  <div className="flex justify-between">
                                    <span>Attempted:</span>
                                    <span className="font-medium">{item.details.activities?.attempted || 0}</span>
                                  </div>
                                  <div className="flex justify-between">
                                    <span>Synced:</span>
                                    <span className="font-medium">{item.details.activities?.synced || 0}</span>
                                  </div>
                                </div>
                              </div>
                            </>
                          )}
                        </div>
                      </div>
                    )}
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

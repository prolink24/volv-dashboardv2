import { useDashboard } from "@/providers/dashboard-provider";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";

const DashboardFilters = () => {
  const { dateFilter, setDateFilter, userFilter, setUserFilter } = useDashboard();
  
  const dateOptions = [
    "2025-03 | March",
    "2025-02 | February",
    "2025-01 | January",
    "2024-12 | December",
    "2024-11 | November",
  ];
  
  const userOptions = [
    "All Users",
    "Josh Sweetnam",
    "Mazin Gazar",
    "Bryann Cabral",
    "Bogdan Micov",
    "Harlan Ryder",
  ];
  
  return (
    <div className="flex items-center gap-2">
      <Select value={dateFilter} onValueChange={setDateFilter}>
        <SelectTrigger className="w-[180px]">
          <SelectValue placeholder="Select month" />
        </SelectTrigger>
        <SelectContent>
          {dateOptions.map((date) => (
            <SelectItem key={date} value={date}>
              {date.split('|')[1].trim()}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      
      <Select value={userFilter} onValueChange={setUserFilter}>
        <SelectTrigger className="w-[180px]">
          <SelectValue placeholder="Select user" />
        </SelectTrigger>
        <SelectContent>
          {userOptions.map((user) => (
            <SelectItem key={user} value={user}>
              {user}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
};

export default DashboardFilters;

import { Card, CardContent } from "@/components/ui/card";
import {
  Bar,
  BarChart as RechartsBarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

interface BarChartProps {
  title: string;
  data: {
    name: string;
    value: number;
    color?: string;
  }[];
  formatValue?: (value: number) => string;
  formatYAxis?: (value: number) => string;
  className?: string;
}

const BarChart = ({
  title,
  data,
  formatValue = (value) => `${value}`,
  formatYAxis = (value) => `${value}`,
  className,
}: BarChartProps) => {
  return (
    <Card className={className}>
      <CardContent className="p-4">
        <h3 className="text-base font-medium mb-4">{title}</h3>
        <div className="h-52">
          <ResponsiveContainer width="100%" height="100%">
            <RechartsBarChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 20 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis 
                dataKey="name" 
                axisLine={false}
                tickLine={false}
                tickMargin={8}
                fontSize={12}
              />
              <YAxis 
                axisLine={false}
                tickLine={false}
                tickFormatter={formatYAxis}
                fontSize={12}
              />
              <Tooltip
                formatter={formatValue}
                contentStyle={{
                  backgroundColor: "var(--background)",
                  border: "1px solid var(--border)",
                  borderRadius: "var(--radius)",
                  fontSize: "12px",
                }}
              />
              {data.map((entry, index) => (
                <Bar
                  key={`bar-${index}`}
                  dataKey="value"
                  fill={entry.color || "var(--primary)"}
                  radius={[4, 4, 0, 0]}
                  name={entry.name}
                  data={[entry]}
                />
              ))}
            </RechartsBarChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
};

export default BarChart;

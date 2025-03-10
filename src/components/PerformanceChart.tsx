import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

interface PerformanceData {
  timestamp: string;
  gpt4: number;
  claude: number;
  gemini: number;
  palm: number;
  llama: number;
  mistral: number;
}

interface PerformanceChartProps {
  data: PerformanceData[];
}

export function PerformanceChart({ data }: PerformanceChartProps) {
  return (
    <div className="w-full h-[400px] mt-6">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="timestamp" />
          <YAxis />
          <Tooltip />
          <Legend />
          <Line type="monotone" dataKey="gpt4" stroke="#0EA5E9" strokeWidth={2} />
          <Line type="monotone" dataKey="claude" stroke="#0D9488" strokeWidth={2} />
          <Line type="monotone" dataKey="gemini" stroke="#6366F1" strokeWidth={2} />
          <Line type="monotone" dataKey="palm" stroke="#EC4899" strokeWidth={2} />
          <Line type="monotone" dataKey="llama" stroke="#F59E0B" strokeWidth={2} />
          <Line type="monotone" dataKey="mistral" stroke="#8B5CF6" strokeWidth={2} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface ComparisonCardProps {
  model: string;
  responseTime: number;
  tokensPerSecond: number;
  qualityScore: number;
}

export function ComparisonCard({ model, responseTime, tokensPerSecond, qualityScore }: ComparisonCardProps) {
  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>{model}</span>
          <Badge variant="outline" className="ml-2">
            {qualityScore.toFixed(1)}/10
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div>
            <p className="text-sm font-medium">Response Time</p>
            <p className="text-2xl font-bold">{responseTime.toFixed(2)}ms</p>
          </div>
          <div>
            <p className="text-sm font-medium">Tokens/Second</p>
            <p className="text-2xl font-bold">{tokensPerSecond}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { useToast } from "@/components/ui/use-toast";
import { format } from "date-fns";
import type { ProviderConfigs, BaseModelConfig } from "@/lib/types/model-config";
import { OllamaService } from "@/lib/services/ollama-service";

interface ModelMetrics {
  modelId: string;
  modelName: string;
  timestamp: number; // Unix timestamp in milliseconds
  responseTime: number;
  tokensPerSecond: number;
  totalTokens: number;
  promptTokens: number;
  completionTokens: number;
  processingTime: number;
}

interface ModelPerformance {
  [modelId: string]: ModelMetrics[];
}

interface ChartData {
  timestamp: number;
  [key: string]: number | string;
}

const ComparisonDashboard = () => {
  const { toast } = useToast();
  const [prompt, setPrompt] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [selectedModels, setSelectedModels] = useState<string[]>([]);
  const [performance, setPerformance] = useState<ModelPerformance>({});
  const [startTime, setStartTime] = useState<number | null>(null);
  
  const [configs, setConfigs] = useState<ProviderConfigs>(() => {
    try {
      const saved = localStorage.getItem("model-settings");
      return saved ? JSON.parse(saved) : { openai: [], ollama: [] };
    } catch (error) {
      console.error("Error loading configs:", error);
      return { openai: [], ollama: [] };
    }
  });

  const enabledModels = [
    ...configs.openai.filter(m => m.enabled),
    ...configs.ollama.filter(m => m.enabled)
  ];

  const formatTimestamp = (timestamp: number) => {
    return format(new Date(timestamp), 'HH:mm:ss');
  };

  const prepareChartData = (metricKey: string): ChartData[] => {
    if (!startTime) return [];

    // Get all timestamps across all models
    const allTimestamps = new Set<number>();
    Object.values(performance).forEach(metrics => {
      metrics.forEach(m => allTimestamps.add(m.timestamp));
    });

    // Sort timestamps
    const sortedTimestamps = Array.from(allTimestamps).sort((a, b) => a - b);

    // Create chart data points
    return sortedTimestamps.map(timestamp => {
      const dataPoint: ChartData = { timestamp };
      selectedModels.forEach(modelId => {
        const modelMetrics = performance[modelId]?.find(m => m.timestamp === timestamp);
        if (modelMetrics) {
          dataPoint[modelMetrics.modelName] = modelMetrics[metricKey as keyof ModelMetrics] as number;
        }
      });
      return dataPoint;
    });
  };

  const handleCompare = async () => {
    if (!prompt.trim()) {
      toast({
        title: "Error",
        description: "Please enter a prompt to compare",
        variant: "destructive",
      });
      return;
    }

    if (selectedModels.length === 0) {
      toast({
        title: "Error",
        description: "Please select at least one model to compare",
        variant: "destructive",
      });
      return;
    }

    setIsProcessing(true);
    setStartTime(Date.now());
    const initialTimestamp = Date.now();

    try {
      // Process each selected model in parallel
      const promises = selectedModels.map(async (modelId) => {
        const model = enabledModels.find(m => m.id === modelId);
        if (!model) return null;

        try {
          if (model.provider === 'ollama') {
            const service = new OllamaService(model);
            const metrics = await service.generateCompletion(prompt);
            
            const result: ModelMetrics = {
              modelId,
              modelName: model.name,
              timestamp: Date.now(),
              responseTime: metrics.responseTime,
              tokensPerSecond: metrics.tokensPerSecond,
              totalTokens: metrics.totalTokens,
              promptTokens: metrics.promptTokens || 0,
              completionTokens: metrics.completionTokens || 0,
              processingTime: metrics.processingTime,
            };

            return result;
          }
          return null;
        } catch (error) {
          console.error(`Error processing model ${model.name}:`, error);
          toast({
            title: `Error with ${model.name}`,
            description: error.message,
            variant: "destructive",
          });
          return null;
        }
      });

      const results = (await Promise.all(promises)).filter(Boolean) as ModelMetrics[];
      
      if (results.length === 0) {
        throw new Error("No successful model responses");
      }

      // Update performance history
      setPerformance(prev => {
        const newPerformance = { ...prev };
        results.forEach(result => {
          newPerformance[result.modelId] = [
            ...(newPerformance[result.modelId] || []).slice(-9),
            result
          ];
        });
        return newPerformance;
      });

    } catch (error) {
      console.error("Comparison error:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to process comparison",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  if (enabledModels.length === 0) {
    return (
      <div className="container py-8">
        <Card>
          <CardContent className="pt-6">
            <div className="text-center text-muted-foreground">
              <p>No models configured for comparison.</p>
              <p className="mt-2">Please enable models in the settings page to start comparing.</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container py-8 space-y-8">
      <div className="space-y-1">
        <h2 className="text-3xl font-bold tracking-tight">Model Comparison</h2>
        <p className="text-muted-foreground">
          Compare performance metrics across different models
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Test Prompt</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Textarea
            placeholder="Enter your test prompt here..."
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            className="min-h-[100px]"
          />
          
          <div className="space-y-4">
            <h4 className="font-medium">Select Models to Compare</h4>
            <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3">
              {enabledModels.map((model) => (
                <label
                  key={model.id}
                  className="flex items-center space-x-2 p-4 border rounded-lg"
                >
                  <Checkbox
                    checked={selectedModels.includes(model.id)}
                    onCheckedChange={(checked) => {
                      setSelectedModels(prev =>
                        checked
                          ? [...prev, model.id]
                          : prev.filter(id => id !== model.id)
                      );
                    }}
                  />
                  <span>{model.name}</span>
                </label>
              ))}
            </div>
          </div>

          <Button 
            onClick={handleCompare}
            disabled={isProcessing}
            className="w-full"
          >
            {isProcessing ? "Processing..." : "Compare Models"}
          </Button>
        </CardContent>
      </Card>

      {Object.keys(performance).length > 0 && (
        <Tabs defaultValue="response-time">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="response-time">Response Time</TabsTrigger>
            <TabsTrigger value="throughput">Throughput</TabsTrigger>
            <TabsTrigger value="tokens">Token Usage</TabsTrigger>
            <TabsTrigger value="processing">Processing Time</TabsTrigger>
          </TabsList>

          <TabsContent value="response-time" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Response Time (ms)</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-[400px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={prepareChartData('responseTime')}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis 
                        dataKey="timestamp" 
                        tickFormatter={formatTimestamp}
                        type="number"
                        domain={['dataMin', 'dataMax']}
                      />
                      <YAxis />
                      <Tooltip 
                        labelFormatter={formatTimestamp}
                        formatter={(value: number) => [`${value.toFixed(2)} ms`]}
                      />
                      <Legend />
                      {selectedModels.map((modelId, index) => {
                        const model = enabledModels.find(m => m.id === modelId);
                        return model ? (
                          <Line
                            key={modelId}
                            type="monotone"
                            dataKey={model.name}
                            stroke={`hsl(${index * 60}, 70%, 50%)`}
                            strokeWidth={2}
                            dot={{ r: 4 }}
                          />
                        ) : null;
                      })}
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="throughput" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Tokens Per Second</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-[400px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={prepareChartData('tokensPerSecond')}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis 
                        dataKey="timestamp" 
                        tickFormatter={formatTimestamp}
                        type="number"
                        domain={['dataMin', 'dataMax']}
                      />
                      <YAxis />
                      <Tooltip 
                        labelFormatter={formatTimestamp}
                        formatter={(value: number) => [`${value.toFixed(2)} tokens/s`]}
                      />
                      <Legend />
                      {selectedModels.map((modelId, index) => {
                        const model = enabledModels.find(m => m.id === modelId);
                        return model ? (
                          <Line
                            key={modelId}
                            type="monotone"
                            dataKey={model.name}
                            stroke={`hsl(${index * 60}, 70%, 50%)`}
                            strokeWidth={2}
                            dot={{ r: 4 }}
                          />
                        ) : null;
                      })}
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="tokens" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Token Usage</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-[400px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={prepareChartData('totalTokens')}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis 
                        dataKey="timestamp" 
                        tickFormatter={formatTimestamp}
                        type="number"
                        domain={['dataMin', 'dataMax']}
                      />
                      <YAxis />
                      <Tooltip 
                        labelFormatter={formatTimestamp}
                        formatter={(value: number) => [`${value} tokens`]}
                      />
                      <Legend />
                      {selectedModels.map((modelId, index) => {
                        const model = enabledModels.find(m => m.id === modelId);
                        return model ? (
                          <Line
                            key={modelId}
                            type="monotone"
                            dataKey={model.name}
                            stroke={`hsl(${index * 60}, 70%, 50%)`}
                            strokeWidth={2}
                            dot={{ r: 4 }}
                          />
                        ) : null;
                      })}
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="processing" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Processing Time (seconds)</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-[400px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={prepareChartData('processingTime')}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis 
                        dataKey="timestamp" 
                        tickFormatter={formatTimestamp}
                        type="number"
                        domain={['dataMin', 'dataMax']}
                      />
                      <YAxis />
                      <Tooltip 
                        labelFormatter={formatTimestamp}
                        formatter={(value: number) => [`${value.toFixed(2)} s`]}
                      />
                      <Legend />
                      {selectedModels.map((modelId, index) => {
                        const model = enabledModels.find(m => m.id === modelId);
                        return model ? (
                          <Line
                            key={modelId}
                            type="monotone"
                            dataKey={model.name}
                            stroke={`hsl(${index * 60}, 70%, 50%)`}
                            strokeWidth={2}
                            dot={{ r: 4 }}
                          />
                        ) : null;
                      })}
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
};

export { ComparisonDashboard }; 
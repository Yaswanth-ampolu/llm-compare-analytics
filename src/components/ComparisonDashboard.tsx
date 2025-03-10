import { useState } from "react";
import { ComparisonCard } from "./ComparisonCard";
import { PerformanceChart } from "./PerformanceChart";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/components/ui/use-toast";
import { ModelSettings } from "./ModelSettings";
import { ModelService, type ModelResponse, type ModelSettings as ModelSettingsType } from "@/lib/model-service";

export function ComparisonDashboard() {
  const [prompt, setPrompt] = useState("");
  const [isComparing, setIsComparing] = useState(false);
  const [settings, setSettings] = useState<ModelSettingsType>({
    openai: {},
    anthropic: {},
    google: {},
    ollama: {},
    huggingface: {},
  });
  const [results, setResults] = useState<ModelResponse[]>([]);
  const { toast } = useToast();

  const mockPerformanceData = [
    {
      timestamp: "00:00",
      gpt4: 100,
      claude: 95,
      gemini: 90,
      palm: 88,
      llama: 85,
      mistral: 92,
    },
    {
      timestamp: "00:01",
      gpt4: 98,
      claude: 97,
      gemini: 92,
      palm: 89,
      llama: 86,
      mistral: 93,
    },
  ];

  const handleCompare = async () => {
    if (!prompt.trim()) {
      toast({
        title: "Error",
        description: "Please enter a prompt to compare",
        variant: "destructive",
      });
      return;
    }

    // Check if any model is configured
    const hasConfiguredModel = Object.values(settings).some(
      (config) => config.apiKey || config.baseUrl
    );

    if (!hasConfiguredModel) {
      toast({
        title: "Error",
        description: "Please configure at least one model in settings",
        variant: "destructive",
      });
      return;
    }

    setIsComparing(true);
    try {
      const modelService = new ModelService(settings);
      const responses = await modelService.compareModels(prompt);
      setResults(responses);

      // Show errors if any
      const errors = responses.filter((r) => r.error);
      if (errors.length > 0) {
        errors.forEach((error) => {
          toast({
            title: `${error.provider} Error`,
            description: error.error,
            variant: "destructive",
          });
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "An error occurred while comparing models",
        variant: "destructive",
      });
    } finally {
      setIsComparing(false);
    }
  };

  return (
    <div className="container mx-auto py-8 space-y-8 bg-background">
      <div className="flex justify-between items-center">
        <div className="space-y-4">
          <h1 className="text-4xl font-bold text-foreground">LLM Performance Comparison</h1>
          <p className="text-muted-foreground">
            Compare different language models in real-time
          </p>
        </div>
        <ModelSettings value={settings} onChange={setSettings} />
      </div>

      <div className="grid gap-6">
        <Textarea
          placeholder="Enter your prompt here..."
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          className="min-h-[100px] bg-card text-card-foreground"
        />
        <Button
          onClick={handleCompare}
          disabled={isComparing}
          className="w-full md:w-auto bg-primary text-primary-foreground hover:bg-primary/90"
        >
          {isComparing ? "Comparing..." : "Compare Models"}
        </Button>
      </div>

      <div className="grid md:grid-cols-3 lg:grid-cols-4 gap-6">
        {results.map((result) => (
          <ComparisonCard
            key={result.provider}
            model={result.model}
            responseTime={result.responseTime}
            tokensPerSecond={result.tokensPerSecond}
            qualityScore={0} // We would need a way to calculate this
          />
        ))}
      </div>

      <PerformanceChart data={mockPerformanceData} />
    </div>
  );
}
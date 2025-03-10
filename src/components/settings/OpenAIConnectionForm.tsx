import { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Switch } from "@/components/ui/switch";
import { APIEndpointConfig } from "@/lib/types/model-config";
import { OpenAIService } from "@/lib/services/openai-service";
import { useToast } from "@/components/ui/use-toast";

interface OpenAIConnectionFormProps {
  connection?: APIEndpointConfig;
  onSubmit: (config: APIEndpointConfig) => void;
  onCancel: () => void;
}

export function OpenAIConnectionForm({
  connection,
  onSubmit,
  onCancel,
}: OpenAIConnectionFormProps) {
  const { toast } = useToast();
  const [name, setName] = useState(connection?.name || "");
  const [apiKey, setApiKey] = useState(connection?.apiKey || "");
  const [baseUrl, setBaseUrl] = useState(connection?.baseUrl || "");
  const [modelName, setModelName] = useState(connection?.modelName || "");
  const [organization, setOrganization] = useState(connection?.organization || "");
  const [projectId, setProjectId] = useState(connection?.projectId || "");
  const [isProjectKey, setIsProjectKey] = useState(connection?.isProjectKey ?? true);
  const [availableModels, setAvailableModels] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isTestingConnection, setIsTestingConnection] = useState(false);

  useEffect(() => {
    if (apiKey) {
      loadModels();
    }
  }, [apiKey, baseUrl, organization, projectId]);

  const loadModels = async () => {
    try {
      setIsLoading(true);
      const service = new OpenAIService({
        id: connection?.id || "temp",
        name: "temp",
        enabled: true,
        apiKey,
        baseUrl: baseUrl || undefined,
        organization: organization || undefined,
        projectId: projectId || undefined,
        isProjectKey,
      });
      const models = await service.listModels();
      setAvailableModels(models);
    } catch (error) {
      console.error("Failed to load models:", error);
      toast({
        title: "Error Loading Models",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const testConnection = async () => {
    try {
      setIsTestingConnection(true);
      const service = new OpenAIService({
        id: connection?.id || "temp",
        name: "temp",
        enabled: true,
        apiKey,
        baseUrl: baseUrl || undefined,
        organization: organization || undefined,
        projectId: projectId || undefined,
        isProjectKey,
      });

      const response = await service.testConnection();
      toast({
        title: "Connection Successful",
        description: `Successfully connected to OpenAI API. Rate limits: ${response.rateLimit?.requests_limit || 'N/A'} requests/min`,
      });
    } catch (error) {
      toast({
        title: "Connection Failed",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsTestingConnection(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({
      id: connection?.id || crypto.randomUUID(),
      name,
      enabled: connection?.enabled ?? true,
      apiKey,
      baseUrl: baseUrl || undefined,
      modelName,
      organization: organization || undefined,
      projectId: projectId || undefined,
      isProjectKey,
      temperature: connection?.temperature,
      maxTokens: connection?.maxTokens,
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="name">Connection Name</Label>
          <Input
            id="name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="My OpenAI Connection"
            required
          />
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label htmlFor="apiKey">API Key</Label>
            <div className="flex items-center space-x-2">
              <Label htmlFor="isProjectKey" className="text-sm">Project Key</Label>
              <Switch
                id="isProjectKey"
                checked={isProjectKey}
                onCheckedChange={setIsProjectKey}
              />
            </div>
          </div>
          <Input
            id="apiKey"
            type="password"
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
            placeholder={isProjectKey ? "pk-..." : "sk-..."}
            required
          />
          <p className="text-sm text-muted-foreground">
            {isProjectKey
              ? "Project API keys provide scoped access to a single project (recommended)"
              : "User API keys provide access to all organizations and projects"}
          </p>
        </div>

        <Accordion type="single" collapsible defaultValue="advanced">
          <AccordionItem value="advanced">
            <AccordionTrigger>Advanced Settings</AccordionTrigger>
            <AccordionContent>
              <div className="space-y-4 pt-4">
                <div className="space-y-2">
                  <Label htmlFor="baseUrl">Base URL (Optional)</Label>
                  <Input
                    id="baseUrl"
                    value={baseUrl}
                    onChange={(e) => setBaseUrl(e.target.value)}
                    placeholder="https://api.openai.com/v1"
                  />
                  <p className="text-sm text-muted-foreground">
                    Override the default OpenAI API URL for Azure or self-hosted endpoints
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="organization">Organization ID (Optional)</Label>
                  <Input
                    id="organization"
                    value={organization}
                    onChange={(e) => setOrganization(e.target.value)}
                    placeholder="org-..."
                  />
                  <p className="text-sm text-muted-foreground">
                    Specify which organization to use for API requests
                  </p>
                </div>

                {!isProjectKey && (
                  <div className="space-y-2">
                    <Label htmlFor="projectId">Project ID (Optional)</Label>
                    <Input
                      id="projectId"
                      value={projectId}
                      onChange={(e) => setProjectId(e.target.value)}
                      placeholder="prj-..."
                    />
                    <p className="text-sm text-muted-foreground">
                      Required when using user API keys with multiple projects
                    </p>
                  </div>
                )}
              </div>
            </AccordionContent>
          </AccordionItem>
        </Accordion>

        <div className="space-y-2">
          <Label htmlFor="model">Model</Label>
          <Select value={modelName} onValueChange={setModelName} required>
            <SelectTrigger id="model">
              <SelectValue placeholder="Select a model" />
            </SelectTrigger>
            <SelectContent>
              {isLoading ? (
                <SelectItem value="loading" disabled>
                  Loading models...
                </SelectItem>
              ) : (
                availableModels.map((model) => (
                  <SelectItem key={model} value={model}>
                    {model}
                  </SelectItem>
                ))
              )}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="flex justify-end space-x-2 mt-4">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit">
          {connection ? "Update" : "Add"} Connection
        </Button>
      </div>
    </form>
  );
} 
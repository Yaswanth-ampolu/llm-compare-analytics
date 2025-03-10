import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import { ConnectionList } from "@/components/settings/ConnectionList";
import { OpenAIConnectionForm } from "@/components/settings/OpenAIConnectionForm";
import { OllamaConnectionForm } from "@/components/settings/OllamaConnectionForm";
import type {
  ProviderConfigs,
  APIEndpointConfig,
  OllamaEndpointConfig,
} from "@/lib/types/model-config";

const defaultConfigs: ProviderConfigs = {
  openai: [],
  anthropic: [],
  google: [],
  ollama: [],
  huggingface: [],
  gguf: [],
};

const Settings = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [configs, setConfigs] = useState<ProviderConfigs>(() => {
    try {
      const saved = localStorage.getItem("model-settings");
      if (!saved) return defaultConfigs;
      
      const parsed = JSON.parse(saved);
      // Ensure all provider arrays exist
      return {
        openai: Array.isArray(parsed.openai) ? parsed.openai : [],
        anthropic: Array.isArray(parsed.anthropic) ? parsed.anthropic : [],
        google: Array.isArray(parsed.google) ? parsed.google : [],
        ollama: Array.isArray(parsed.ollama) ? parsed.ollama : [],
        huggingface: Array.isArray(parsed.huggingface) ? parsed.huggingface : [],
        gguf: Array.isArray(parsed.gguf) ? parsed.gguf : [],
      };
    } catch (error) {
      console.error('Error loading configs:', error);
      return defaultConfigs;
    }
  });

  const saveConfigs = (newConfigs: ProviderConfigs) => {
    setConfigs(newConfigs);
    localStorage.setItem("model-settings", JSON.stringify(newConfigs));
  };

  // OpenAI Handlers
  const handleAddOpenAI = (config: APIEndpointConfig) => {
    const newConfigs = {
      ...configs,
      openai: [...configs.openai, config],
    };
    saveConfigs(newConfigs);
    toast({
      title: "Connection Added",
      description: `Added OpenAI connection "${config.name}"`,
    });
  };

  const handleEditOpenAI = (connection: APIEndpointConfig) => {
    const newConfigs = {
      ...configs,
      openai: configs.openai.map((c) =>
        c.id === connection.id ? connection : c
      ),
    };
    saveConfigs(newConfigs);
    toast({
      title: "Connection Updated",
      description: `Updated OpenAI connection "${connection.name}"`,
    });
  };

  const handleDeleteOpenAI = (id: string) => {
    const newConfigs = {
      ...configs,
      openai: configs.openai.filter((c) => c.id !== id),
    };
    saveConfigs(newConfigs);
    toast({
      title: "Connection Deleted",
      description: "OpenAI connection has been removed",
    });
  };

  const handleToggleOpenAI = (id: string, enabled: boolean) => {
    const newConfigs = {
      ...configs,
      openai: configs.openai.map((c) =>
        c.id === id ? { ...c, enabled } : c
      ),
    };
    saveConfigs(newConfigs);
  };

  // Ollama Handlers
  const handleAddOllama = (config: OllamaEndpointConfig) => {
    const newConfigs = {
      ...configs,
      ollama: [...configs.ollama, config],
    };
    saveConfigs(newConfigs);
    toast({
      title: "Connection Added",
      description: `Added Ollama connection "${config.name}"`,
    });
  };

  const handleEditOllama = (connection: OllamaEndpointConfig) => {
    const newConfigs = {
      ...configs,
      ollama: configs.ollama.map((c) =>
        c.id === connection.id ? connection : c
      ),
    };
    saveConfigs(newConfigs);
    toast({
      title: "Connection Updated",
      description: `Updated Ollama connection "${connection.name}"`,
    });
  };

  const handleDeleteOllama = (id: string) => {
    const newConfigs = {
      ...configs,
      ollama: configs.ollama.filter((c) => c.id !== id),
    };
    saveConfigs(newConfigs);
    toast({
      title: "Connection Deleted",
      description: "Ollama connection has been removed",
    });
  };

  const handleToggleOllama = (id: string, enabled: boolean) => {
    const newConfigs = {
      ...configs,
      ollama: configs.ollama.map((c) =>
        c.id === id ? { ...c, enabled } : c
      ),
    };
    saveConfigs(newConfigs);
  };

  return (
    <div className="container py-8 space-y-8">
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <h2 className="text-3xl font-bold tracking-tight">Settings</h2>
          <p className="text-muted-foreground">
            Configure your model integrations and connections
          </p>
        </div>
        <Button variant="outline" onClick={() => navigate(-1)}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back
        </Button>
      </div>

      <div className="space-y-8">
        <ConnectionList<APIEndpointConfig>
          title="OpenAI Connections"
          description="Configure OpenAI API endpoints and models"
          connections={configs.openai}
          onAdd={handleAddOpenAI}
          onEdit={handleEditOpenAI}
          onDelete={handleDeleteOpenAI}
          onToggle={handleToggleOpenAI}
          renderConnectionInfo={(connection) => (
            <>
              <div>Model: {connection.modelName || "Not selected"}</div>
              <div>
                Endpoint:{" "}
                {connection.baseUrl ? (
                  <span className="font-mono text-xs">{connection.baseUrl}</span>
                ) : (
                  "Default"
                )}
              </div>
            </>
          )}
          renderEditForm={({ connection, onCancel, onSubmit }) => (
            <OpenAIConnectionForm
              connection={connection}
              onSubmit={onSubmit}
              onCancel={onCancel}
            />
          )}
        />

        <ConnectionList<OllamaEndpointConfig>
          title="Ollama Connections"
          description="Configure Ollama endpoints and models"
          connections={configs.ollama}
          onAdd={handleAddOllama}
          onEdit={handleEditOllama}
          onDelete={handleDeleteOllama}
          onToggle={handleToggleOllama}
          renderConnectionInfo={(connection) => (
            <>
              <div>Model: {connection.modelName}</div>
              <div>
                Endpoint:{" "}
                <span className="font-mono text-xs">{connection.baseUrl}</span>
              </div>
              {connection.context_size && (
                <div>Context Size: {connection.context_size}</div>
              )}
            </>
          )}
          renderEditForm={({ connection, onCancel, onSubmit }) => (
            <OllamaConnectionForm
              connection={connection}
              onSubmit={onSubmit}
              onCancel={onCancel}
            />
          )}
        />

        {/* Add other provider sections here */}
      </div>
    </div>
  );
};

export default Settings; 
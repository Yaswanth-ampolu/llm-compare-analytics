import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Settings } from "lucide-react";
import { type ModelSettings as ModelSettingsType } from "@/lib/model-service";

interface ModelSettingsProps {
  value: ModelSettingsType;
  onChange: (settings: ModelSettingsType) => void;
}

export function ModelSettings({ value, onChange }: ModelSettingsProps) {
  const handleSettingChange = (
    provider: keyof ModelSettingsType,
    field: string,
    fieldValue: string | number
  ) => {
    onChange({
      ...value,
      [provider]: {
        ...value[provider],
        [field]: fieldValue,
      },
    });
  };

  const renderProviderSettings = (provider: keyof ModelSettingsType, title: string) => (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>Configure your {title} integration settings</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor={`${provider}-api-key`}>API Key</Label>
          <Input
            id={`${provider}-api-key`}
            type="password"
            value={value[provider].apiKey || ""}
            onChange={(e) =>
              handleSettingChange(provider, "apiKey", e.target.value)
            }
            placeholder={`Enter your ${title} API key`}
          />
        </div>
        {provider === "ollama" && (
          <div className="space-y-2">
            <Label htmlFor="ollama-base-url">Base URL</Label>
            <Input
              id="ollama-base-url"
              type="text"
              value={value.ollama.baseUrl || ""}
              onChange={(e) =>
                handleSettingChange("ollama", "baseUrl", e.target.value)
              }
              placeholder="http://localhost:11434"
            />
          </div>
        )}
        {provider === "huggingface" && (
          <div className="space-y-2">
            <Label htmlFor="hf-model-name">Model Name</Label>
            <Input
              id="hf-model-name"
              type="text"
              value={value.huggingface.modelName || ""}
              onChange={(e) =>
                handleSettingChange("huggingface", "modelName", e.target.value)
              }
              placeholder="Enter model name or ID"
            />
          </div>
        )}
      </CardContent>
    </Card>
  );

  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button variant="outline" size="icon">
          <Settings className="h-4 w-4" />
        </Button>
      </SheetTrigger>
      <SheetContent className="w-[400px] sm:w-[540px] overflow-y-auto">
        <SheetHeader>
          <SheetTitle>Model Settings</SheetTitle>
          <SheetDescription>
            Configure your LLM integrations and API settings
          </SheetDescription>
        </SheetHeader>
        <div className="py-6">
          <Tabs defaultValue="openai" className="w-full">
            <TabsList className="grid w-full grid-cols-5">
              <TabsTrigger value="openai">OpenAI</TabsTrigger>
              <TabsTrigger value="anthropic">Anthropic</TabsTrigger>
              <TabsTrigger value="google">Google</TabsTrigger>
              <TabsTrigger value="ollama">Ollama</TabsTrigger>
              <TabsTrigger value="huggingface">HuggingFace</TabsTrigger>
            </TabsList>
            <TabsContent value="openai" className="mt-4">
              {renderProviderSettings("openai", "OpenAI")}
            </TabsContent>
            <TabsContent value="anthropic" className="mt-4">
              {renderProviderSettings("anthropic", "Anthropic")}
            </TabsContent>
            <TabsContent value="google" className="mt-4">
              {renderProviderSettings("google", "Google AI")}
            </TabsContent>
            <TabsContent value="ollama" className="mt-4">
              {renderProviderSettings("ollama", "Ollama")}
            </TabsContent>
            <TabsContent value="huggingface" className="mt-4">
              {renderProviderSettings("huggingface", "HuggingFace")}
            </TabsContent>
          </Tabs>
        </div>
      </SheetContent>
    </Sheet>
  );
} 
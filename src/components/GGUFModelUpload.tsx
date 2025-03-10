import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/components/ui/use-toast";
import { Upload, Play, StopCircle } from "lucide-react";
import type { ModelConfig } from "@/lib/model-service";
import { GGUFService } from "@/lib/gguf-service";

interface GGUFModelUploadProps {
  value: ModelConfig;
  onChange: (config: ModelConfig) => void;
}

export function GGUFModelUpload({ value, onChange }: GGUFModelUploadProps) {
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isServerRunning, setIsServerRunning] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const ggufService = GGUFService.getInstance();

  // Check server status on mount
  useEffect(() => {
    const checkServerStatus = async () => {
      const running = await ggufService.isServerRunning();
      setIsServerRunning(running);
    };
    checkServerStatus();
  }, []);

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    try {
      const path = await ggufService.uploadModel(file);
      onChange({
        ...value,
        ggufPath: path,
        modelName: file.name.replace('.gguf', ''),
      });

      toast({
        title: "Model Uploaded",
        description: `Successfully uploaded ${file.name}`,
      });
    } catch (error) {
      toast({
        title: "Upload Failed",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsUploading(false);
    }
  };

  const toggleServer = async () => {
    if (!value.ggufPath) {
      toast({
        title: "No Model Selected",
        description: "Please upload a GGUF model first",
        variant: "destructive",
      });
      return;
    }

    if (isServerRunning) {
      try {
        await ggufService.stopServer();
        setIsServerRunning(false);
        toast({
          title: "Server Stopped",
          description: "Local model server has been stopped",
        });
      } catch (error) {
        toast({
          title: "Error",
          description: error.message,
          variant: "destructive",
        });
      }
    } else {
      try {
        await ggufService.startServer({
          modelPath: value.ggufPath,
          temperature: value.temperature,
          maxTokens: value.maxTokens,
        });
        setIsServerRunning(true);
        toast({
          title: "Server Started",
          description: "Local model server is now running",
        });
      } catch (error) {
        toast({
          title: "Error",
          description: error.message,
          variant: "destructive",
        });
      }
    }
  };

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label>GGUF Model File</Label>
        <div className="flex gap-2">
          <Input
            type="text"
            value={value.ggufPath || ""}
            placeholder="No model selected"
            readOnly
            className="flex-1"
          />
          <Button
            variant="secondary"
            onClick={() => fileInputRef.current?.click()}
            disabled={isUploading}
          >
            <Upload className="mr-2 h-4 w-4" />
            {isUploading ? "Uploading..." : "Upload"}
          </Button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".gguf"
            onChange={handleFileChange}
            className="hidden"
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label>Server Control</Label>
        <div className="flex gap-2">
          <Button
            variant={isServerRunning ? "destructive" : "default"}
            onClick={toggleServer}
            className="flex-1"
          >
            {isServerRunning ? (
              <>
                <StopCircle className="mr-2 h-4 w-4" />
                Stop Server
              </>
            ) : (
              <>
                <Play className="mr-2 h-4 w-4" />
                Start Server
              </>
            )}
          </Button>
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="gguf-temperature">Temperature</Label>
        <Input
          id="gguf-temperature"
          type="number"
          min="0"
          max="2"
          step="0.1"
          value={value.temperature || "0.7"}
          onChange={(e) =>
            onChange({
              ...value,
              temperature: parseFloat(e.target.value),
            })
          }
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="gguf-max-tokens">Max Tokens</Label>
        <Input
          id="gguf-max-tokens"
          type="number"
          min="1"
          max="4096"
          value={value.maxTokens || "1000"}
          onChange={(e) =>
            onChange({
              ...value,
              maxTokens: parseInt(e.target.value),
            })
          }
        />
      </div>
    </div>
  );
} 
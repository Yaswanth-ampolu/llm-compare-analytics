import { OllamaEndpointConfig, ModelResponse, ModelMetrics } from '../types/model-config';

interface OllamaResponse {
  model: string;
  created_at: string;
  response: string;
  done: boolean;
  total_duration: number;
  load_duration: number;
  prompt_eval_count: number;
  prompt_eval_duration: number;
  eval_count: number;
  eval_duration: number;
}

interface ModelInfo {
  name: string;
  size: number;
  digest: string;
  details: {
    parameter_size: string;
    quantization_level: string;
  };
}

interface OllamaModelInfo {
  name: string;
  size: number;
  digest: string;
  modified_at: string;
  details: {
    format: string;
    family: string;
    parameter_size: string;
    quantization_level?: string;
  };
}

interface OllamaStats {
  total_duration?: number;
  load_duration?: number;
  sample_count?: number;
  sample_duration?: number;
  prompt_eval_count?: number;
  prompt_eval_duration?: number;
  eval_count?: number;
  eval_duration?: number;
}

export class OllamaService {
  private config: OllamaEndpointConfig;
  private modelInfo: Record<string, OllamaModelInfo> = {};

  constructor(config: OllamaEndpointConfig) {
    this.config = config;
    this.loadModelInfo();
  }

  private async loadModelInfo() {
    try {
      const models = await this.listModels();
      for (const modelName of models) {
        await this.fetchModelInfo(modelName);
      }
    } catch (error) {
      console.error('Failed to load model info:', error);
    }
  }

  private async fetchModelInfo(modelName: string): Promise<void> {
    try {
      const response = await fetch(`${this.config.baseUrl}/api/show`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ name: modelName }),
      });

      if (!response.ok) {
        throw new Error('Failed to fetch model info');
      }

      const info = await response.json();
      this.modelInfo[modelName] = info;
    } catch (error) {
      console.error(`Failed to get info for model ${modelName}:`, error);
    }
  }

  private async checkEndpoint(): Promise<boolean> {
    try {
      const response = await fetch(`${this.config.baseUrl}/api/tags`);
      return response.ok;
    } catch {
      return false;
    }
  }

  private estimateTokenCount(text: string): number {
    // Rough estimation: 1 token ≈ 4 characters
    return Math.ceil(text.length / 4);
  }

  private calculateMetrics(stats: OllamaStats, responseTime: number, text: string): ModelMetrics {
    const completionTokens = this.estimateTokenCount(text);
    const evalTokensPerSecond = stats.eval_count && stats.eval_duration
      ? (stats.eval_count / (stats.eval_duration / 1000))
      : completionTokens / (responseTime / 1000);

    const modelInfo = this.modelInfo[this.config.modelName];
    const contextSize = this.config.context_size || 4096; // Default context size

    return {
      responseTime,
      tokensPerSecond: evalTokensPerSecond,
      totalTokens: stats.prompt_eval_count,
      completionTokens: stats.eval_count,
      promptTokens: stats.prompt_eval_count ? stats.prompt_eval_count - (stats.eval_count || 0) : undefined,
      contextSize,
      memoryUsed: stats.total_duration ? (stats.total_duration * 1024 * 1024) : undefined, // Rough memory usage estimation
    };
  }

  private getApiUrl(endpoint: string): string {
    // If baseUrl is provided, use it directly, otherwise use the proxy
    if (this.config.baseUrl && this.config.baseUrl !== 'http://localhost:11434') {
      return `${this.config.baseUrl}/api/${endpoint}`;
    }
    return `/api/ollama/${endpoint}`;
  }

  async generateCompletion(prompt: string) {
    const startTime = performance.now();
    
    try {
      const response = await fetch(this.getApiUrl('generate'), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: this.config.modelName,
          prompt: prompt,
          stream: false,
          options: {
            temperature: this.config.temperature || 0.7,
            num_predict: this.config.maxTokens,
            num_ctx: this.config.context_size,
            num_thread: this.config.threads,
          },
        }),
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({ error: response.statusText }));
        throw new Error(error.error || 'Ollama API error');
      }

      const data: OllamaResponse = await response.json();
      const endTime = performance.now();
      
      // Calculate metrics from the Ollama response
      const responseTime = data.total_duration / 1e6; // Convert nanoseconds to milliseconds
      const totalTokens = data.prompt_eval_count + data.eval_count;
      const totalProcessingTime = (data.prompt_eval_duration + data.eval_duration) / 1e9; // Convert nanoseconds to seconds
      const tokensPerSecond = totalTokens / totalProcessingTime;

      return {
        responseTime,
        tokensPerSecond,
        totalTokens,
        promptTokens: data.prompt_eval_count,
        completionTokens: data.eval_count,
        processingTime: totalProcessingTime,
      };
    } catch (error) {
      console.error("Error generating Ollama completion:", error);
      throw error;
    }
  }

  async listModels(): Promise<string[]> {
    try {
      const response = await fetch(this.getApiUrl('tags'), {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to list models: ${response.statusText}`);
      }

      const data = await response.json();
      return data.models?.map((model: any) => model.name) || [];
    } catch (error) {
      console.error("Error listing Ollama models:", error);
      return []; // Return empty array instead of throwing
    }
  }

  async pullModel(modelName: string): Promise<void> {
    try {
      const response = await fetch(`${this.config.baseUrl}/api/pull`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: modelName,
        }),
      });

      if (!response.ok) {
        throw new Error(`Failed to pull model: ${response.statusText}`);
      }
    } catch (error) {
      console.error("Error pulling Ollama model:", error);
      throw error;
    }
  }

  public getModelInfo(modelName: string): OllamaModelInfo | undefined {
    return this.modelInfo[modelName];
  }
} 
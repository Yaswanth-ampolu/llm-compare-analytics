import { GGUFConfig, ModelResponse, ModelMetrics } from '../types/model-config';

export class GGUFService {
  private config: GGUFConfig;
  private serverPort: number = 8080;
  private serverProcess: any = null;

  constructor(config: GGUFConfig) {
    this.config = config;
    this.serverPort = config.serverPort || 8080;
  }

  private estimateTokenCount(text: string): number {
    // Rough estimation: 1 token ≈ 4 characters
    return Math.ceil(text.length / 4);
  }

  public async isServerRunning(): Promise<boolean> {
    try {
      const response = await fetch(`http://localhost:${this.serverPort}/health`);
      return response.ok;
    } catch {
      return false;
    }
  }

  public async startServer(): Promise<void> {
    try {
      const response = await fetch('/api/gguf/start', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          modelPath: this.config.modelPath,
          port: this.serverPort,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to start GGUF server');
      }
    } catch (error) {
      throw new Error(`Failed to start GGUF server: ${error.message}`);
    }
  }

  public async stopServer(): Promise<void> {
    try {
      const response = await fetch('/api/gguf/stop', {
        method: 'POST',
      });

      if (!response.ok) {
        throw new Error('Failed to stop GGUF server');
      }
    } catch (error) {
      throw new Error(`Failed to stop GGUF server: ${error.message}`);
    }
  }

  public async generateResponse(prompt: string): Promise<ModelResponse> {
    const start = Date.now();
    try {
      // Check if server is running
      const isRunning = await this.isServerRunning();
      if (!isRunning) {
        throw new Error('GGUF server is not running');
      }

      const response = await fetch(`http://localhost:${this.serverPort}/completion`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          prompt,
          temperature: this.config.temperature || 0.7,
          max_tokens: this.config.maxTokens || 1000,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'GGUF API error');
      }

      const data = await response.json();
      const end = Date.now();
      const responseTime = end - start;

      // Calculate metrics
      const completionTokens = this.estimateTokenCount(data.content);
      const promptTokens = this.estimateTokenCount(prompt);

      const metrics: ModelMetrics = {
        responseTime,
        tokensPerSecond: completionTokens / (responseTime / 1000),
        totalTokens: promptTokens + completionTokens,
        promptTokens,
        completionTokens,
      };

      return {
        id: this.config.id,
        provider: 'GGUF',
        model: this.config.name,
        text: data.content,
        metrics,
      };
    } catch (error) {
      return {
        id: this.config.id,
        provider: 'GGUF',
        model: this.config.name,
        text: '',
        metrics: {
          responseTime: 0,
          tokensPerSecond: 0,
        },
        error: error.message,
      };
    }
  }
} 
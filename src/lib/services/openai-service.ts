import { APIEndpointConfig, ModelResponse, ModelMetrics, ModelCapabilities } from '../types/model-config';

interface OpenAIRateLimit {
  requests_limit: number;
  tokens_limit: number;
  requests_remaining: number;
  tokens_remaining: number;
  requests_reset: string;
  tokens_reset: string;
}

interface OpenAIHeaders {
  'x-request-id': string;
  'x-ratelimit-limit-requests': string;
  'x-ratelimit-limit-tokens': string;
  'x-ratelimit-remaining-requests': string;
  'x-ratelimit-remaining-tokens': string;
  'x-ratelimit-reset-requests': string;
  'x-ratelimit-reset-tokens': string;
}

export class OpenAIService {
  private config: APIEndpointConfig;
  private baseUrl: string;
  private lastRateLimit?: OpenAIRateLimit;
  private modelCapabilities: Record<string, ModelCapabilities> = {
    'gpt-4': {
      maxContextSize: 8192,
      inputCostPer1k: 0.03,
      outputCostPer1k: 0.06,
      supportsStreaming: true,
      supportsJsonMode: true,
      supportsFunctions: true,
    },
    'gpt-4-turbo-preview': {
      maxContextSize: 128000,
      inputCostPer1k: 0.01,
      outputCostPer1k: 0.03,
      supportsStreaming: true,
      supportsJsonMode: true,
      supportsFunctions: true,
    },
    'gpt-3.5-turbo': {
      maxContextSize: 16385,
      inputCostPer1k: 0.0005,
      outputCostPer1k: 0.0015,
      supportsStreaming: true,
      supportsJsonMode: true,
      supportsFunctions: true,
    },
  };

  constructor(config: APIEndpointConfig) {
    this.config = config;
    this.baseUrl = config.baseUrl || 'https://api.openai.com/v1';
  }

  private getHeaders(): Record<string, string> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${this.config.apiKey}`,
    };

    if (this.config.organization) {
      headers['OpenAI-Organization'] = this.config.organization;
    }

    if (!this.config.isProjectKey && this.config.projectId) {
      headers['OpenAI-Project'] = this.config.projectId;
    }

    return headers;
  }

  private updateRateLimits(headers: OpenAIHeaders) {
    this.lastRateLimit = {
      requests_limit: parseInt(headers['x-ratelimit-limit-requests'] || '0'),
      tokens_limit: parseInt(headers['x-ratelimit-limit-tokens'] || '0'),
      requests_remaining: parseInt(headers['x-ratelimit-remaining-requests'] || '0'),
      tokens_remaining: parseInt(headers['x-ratelimit-remaining-tokens'] || '0'),
      requests_reset: headers['x-ratelimit-reset-requests'],
      tokens_reset: headers['x-ratelimit-reset-tokens'],
    };
  }

  private calculateCost(promptTokens: number, completionTokens: number, model: string): number {
    const capabilities = this.modelCapabilities[model] || this.modelCapabilities['gpt-4'];
    return (
      (promptTokens * capabilities.inputCostPer1k! +
        completionTokens * capabilities.outputCostPer1k!) /
      1000
    );
  }

  public async testConnection(): Promise<{ success: boolean; rateLimit?: OpenAIRateLimit }> {
    try {
      const response = await fetch(`${this.baseUrl}/models`, {
        headers: this.getHeaders(),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error?.message || 'OpenAI API error');
      }

      this.updateRateLimits(response.headers as unknown as OpenAIHeaders);
      return { success: true, rateLimit: this.lastRateLimit };
    } catch (error) {
      throw new Error(`Connection test failed: ${error.message}`);
    }
  }

  public async listModels(): Promise<string[]> {
    try {
      const response = await fetch(`${this.baseUrl}/models`, {
        headers: this.getHeaders(),
      });

      if (!response.ok) {
        throw new Error('Failed to fetch models');
      }

      this.updateRateLimits(response.headers as unknown as OpenAIHeaders);
      const data = await response.json();
      return data.data
        .filter((model: any) => 
          model.id.startsWith('gpt-') && 
          !model.id.includes('instruct')
        )
        .map((model: any) => model.id);
    } catch (error) {
      console.error('Failed to list OpenAI models:', error);
      return Object.keys(this.modelCapabilities);
    }
  }

  public async generateResponse(prompt: string): Promise<ModelResponse> {
    const start = Date.now();
    try {
      const response = await fetch(`${this.baseUrl}/chat/completions`, {
        method: "POST",
        headers: this.getHeaders(),
        body: JSON.stringify({
          model: this.config.modelName || "gpt-4",
          messages: [{ role: "user", content: prompt }],
          temperature: this.config.temperature || 0.7,
          max_tokens: this.config.maxTokens || 1000,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error?.message || 'OpenAI API error');
      }

      this.updateRateLimits(response.headers as unknown as OpenAIHeaders);
      const data = await response.json();
      const end = Date.now();
      const responseTime = end - start;

      const metrics: ModelMetrics = {
        responseTime,
        tokensPerSecond: (data.usage.completion_tokens / (responseTime / 1000)),
        totalTokens: data.usage.total_tokens,
        promptTokens: data.usage.prompt_tokens,
        completionTokens: data.usage.completion_tokens,
        cost: this.calculateCost(
          data.usage.prompt_tokens,
          data.usage.completion_tokens,
          this.config.modelName || "gpt-4"
        ),
        contextSize: this.modelCapabilities[this.config.modelName || "gpt-4"]?.maxContextSize,
      };

      return {
        id: this.config.id,
        provider: "OpenAI",
        model: this.config.modelName || "gpt-4",
        text: data.choices[0].message.content,
        metrics,
      };
    } catch (error) {
      return {
        id: this.config.id,
        provider: "OpenAI",
        model: this.config.modelName || "gpt-4",
        text: "",
        metrics: {
          responseTime: 0,
          tokensPerSecond: 0,
        },
        error: error.message,
      };
    }
  }

  public getModelCapabilities(model: string): ModelCapabilities | undefined {
    return this.modelCapabilities[model];
  }

  public getRateLimit(): OpenAIRateLimit | undefined {
    return this.lastRateLimit;
  }
} 
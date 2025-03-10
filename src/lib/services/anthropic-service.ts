import { APIKeyConfig, ModelResponse, ModelMetrics } from '../types/model-config';

export class AnthropicService {
  private config: APIKeyConfig;

  constructor(config: APIKeyConfig) {
    this.config = config;
  }

  private calculateCost(totalTokens: number, model: string): number {
    // Claude pricing (as of March 2024)
    const prices: Record<string, number> = {
      'claude-3-opus': 0.015,
      'claude-3-sonnet': 0.003,
      'claude-2.1': 0.008,
      'claude-instant-1.2': 0.0008,
    };

    const pricePerToken = prices[model] || prices['claude-3-opus'];
    return (totalTokens * pricePerToken) / 1000;
  }

  private estimateTokenCount(text: string): number {
    // Rough estimation: 1 token ≈ 4 characters
    return Math.ceil(text.length / 4);
  }

  public async generateResponse(prompt: string): Promise<ModelResponse> {
    const start = Date.now();
    try {
      const response = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": this.config.apiKey,
          "anthropic-version": "2024-01-01",
        },
        body: JSON.stringify({
          model: this.config.modelName || "claude-3-opus-20240229",
          messages: [{ role: "user", content: prompt }],
          max_tokens: this.config.maxTokens || 1000,
          temperature: this.config.temperature || 0.7,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error?.message || 'Anthropic API error');
      }

      const data = await response.json();
      const end = Date.now();
      const responseTime = end - start;

      // Estimate token counts since Anthropic doesn't provide them directly
      const promptTokens = this.estimateTokenCount(prompt);
      const completionTokens = this.estimateTokenCount(data.content[0].text);
      const totalTokens = promptTokens + completionTokens;

      const metrics: ModelMetrics = {
        responseTime,
        tokensPerSecond: (completionTokens / (responseTime / 1000)),
        totalTokens,
        promptTokens,
        completionTokens,
        cost: this.calculateCost(
          totalTokens,
          this.config.modelName || "claude-3-opus"
        ),
      };

      return {
        id: this.config.id,
        provider: "Anthropic",
        model: this.config.modelName || "claude-3-opus",
        text: data.content[0].text,
        metrics,
      };
    } catch (error) {
      return {
        id: this.config.id,
        provider: "Anthropic",
        model: this.config.modelName || "claude-3-opus",
        text: "",
        metrics: {
          responseTime: 0,
          tokensPerSecond: 0,
        },
        error: error.message,
      };
    }
  }
} 
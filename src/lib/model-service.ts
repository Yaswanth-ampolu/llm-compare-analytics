interface ModelConfig {
  apiKey?: string;
  baseUrl?: string;
  modelName?: string;
  temperature?: number;
  maxTokens?: number;
  ggufPath?: string; // Path to uploaded GGUF file
}

interface ModelSettings {
  openai: ModelConfig;
  anthropic: ModelConfig;
  google: ModelConfig;
  ollama: ModelConfig;
  huggingface: ModelConfig;
  gguf: ModelConfig; // New GGUF configuration
}

interface ModelResponse {
  text: string;
  responseTime: number;
  tokensPerSecond: number;
  provider: string;
  model: string;
  error?: string;
}

class ModelService {
  private settings: ModelSettings;

  constructor(settings: ModelSettings) {
    this.settings = settings;
  }

  private async callGGUF(prompt: string): Promise<ModelResponse> {
    const start = Date.now();
    try {
      // Call the local llama.cpp server
      const baseUrl = "http://localhost:8080"; // Default llama.cpp server port
      const response = await fetch(`${baseUrl}/completion`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          prompt,
          temperature: this.settings.gguf.temperature || 0.7,
          max_tokens: this.settings.gguf.maxTokens || 1000,
        }),
      });

      const data = await response.json();
      const end = Date.now();

      return {
        text: data.content,
        responseTime: end - start,
        tokensPerSecond: data.tokens_per_second || 0,
        provider: "GGUF",
        model: this.settings.gguf.modelName || "Local Model",
      };
    } catch (error) {
      return {
        text: "",
        responseTime: 0,
        tokensPerSecond: 0,
        provider: "GGUF",
        model: this.settings.gguf.modelName || "Local Model",
        error: error.message,
      };
    }
  }

  private async callOpenAI(prompt: string): Promise<ModelResponse> {
    const start = Date.now();
    try {
      const response = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${this.settings.openai.apiKey}`,
        },
        body: JSON.stringify({
          model: "gpt-4",
          messages: [{ role: "user", content: prompt }],
          temperature: this.settings.openai.temperature || 0.7,
          max_tokens: this.settings.openai.maxTokens || 1000,
        }),
      });

      const data = await response.json();
      const end = Date.now();

      return {
        text: data.choices[0].message.content,
        responseTime: end - start,
        tokensPerSecond: (data.usage.completion_tokens / ((end - start) / 1000)),
        provider: "OpenAI",
        model: "GPT-4",
      };
    } catch (error) {
      return {
        text: "",
        responseTime: 0,
        tokensPerSecond: 0,
        provider: "OpenAI",
        model: "GPT-4",
        error: error.message,
      };
    }
  }

  private async callAnthropic(prompt: string): Promise<ModelResponse> {
    const start = Date.now();
    try {
      const response = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": this.settings.anthropic.apiKey,
          "anthropic-version": "2023-06-01",
        },
        body: JSON.stringify({
          model: "claude-3-opus-20240229",
          messages: [{ role: "user", content: prompt }],
          max_tokens: this.settings.anthropic.maxTokens || 1000,
        }),
      });

      const data = await response.json();
      const end = Date.now();

      return {
        text: data.content[0].text,
        responseTime: end - start,
        tokensPerSecond: 0, // Anthropic doesn't provide token counts
        provider: "Anthropic",
        model: "Claude 3",
      };
    } catch (error) {
      return {
        text: "",
        responseTime: 0,
        tokensPerSecond: 0,
        provider: "Anthropic",
        model: "Claude 3",
        error: error.message,
      };
    }
  }

  private async callOllama(prompt: string): Promise<ModelResponse> {
    const start = Date.now();
    try {
      const baseUrl = this.settings.ollama.baseUrl || "http://localhost:11434";
      const response = await fetch(`${baseUrl}/api/generate`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: this.settings.ollama.modelName || "llama2",
          prompt: prompt,
        }),
      });

      const data = await response.json();
      const end = Date.now();

      return {
        text: data.response,
        responseTime: end - start,
        tokensPerSecond: 0, // Calculate if Ollama provides token info
        provider: "Ollama",
        model: this.settings.ollama.modelName || "llama2",
      };
    } catch (error) {
      return {
        text: "",
        responseTime: 0,
        tokensPerSecond: 0,
        provider: "Ollama",
        model: this.settings.ollama.modelName || "llama2",
        error: error.message,
      };
    }
  }

  private async callHuggingFace(prompt: string): Promise<ModelResponse> {
    const start = Date.now();
    try {
      const response = await fetch(
        `https://api-inference.huggingface.co/models/${this.settings.huggingface.modelName}`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${this.settings.huggingface.apiKey}`,
          },
          body: JSON.stringify({
            inputs: prompt,
            parameters: {
              temperature: this.settings.huggingface.temperature || 0.7,
              max_tokens: this.settings.huggingface.maxTokens || 1000,
            },
          }),
        }
      );

      const data = await response.json();
      const end = Date.now();

      return {
        text: data[0].generated_text,
        responseTime: end - start,
        tokensPerSecond: 0, // HuggingFace doesn't provide token counts
        provider: "HuggingFace",
        model: this.settings.huggingface.modelName,
      };
    } catch (error) {
      return {
        text: "",
        responseTime: 0,
        tokensPerSecond: 0,
        provider: "HuggingFace",
        model: this.settings.huggingface.modelName,
        error: error.message,
      };
    }
  }

  public async compareModels(prompt: string): Promise<ModelResponse[]> {
    const promises: Promise<ModelResponse>[] = [];

    if (this.settings.openai.apiKey) {
      promises.push(this.callOpenAI(prompt));
    }
    if (this.settings.anthropic.apiKey) {
      promises.push(this.callAnthropic(prompt));
    }
    if (this.settings.ollama.baseUrl) {
      promises.push(this.callOllama(prompt));
    }
    if (this.settings.huggingface.apiKey && this.settings.huggingface.modelName) {
      promises.push(this.callHuggingFace(prompt));
    }
    if (this.settings.gguf.ggufPath) {
      promises.push(this.callGGUF(prompt));
    }

    return Promise.all(promises);
  }
}

export type { ModelConfig, ModelSettings, ModelResponse };
export { ModelService }; 
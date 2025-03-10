export interface BaseModelConfig {
  id: string;
  name: string;
  enabled: boolean;
  provider: string;
  temperature?: number;
  maxTokens?: number;
}

export interface APIEndpointConfig extends BaseModelConfig {
  provider: 'openai' | 'anthropic' | 'google' | 'huggingface';
  apiKey: string;
  baseUrl?: string;  // Optional base URL override
  modelName?: string;
  organization?: string;  // For OpenAI org ID
  projectId?: string;    // For OpenAI project ID
  isProjectKey?: boolean; // Whether this is a project-scoped API key
}

export interface OllamaEndpointConfig extends BaseModelConfig {
  provider: 'ollama';
  baseUrl: string;  // Required for Ollama
  modelName: string;
  context_size?: number;
  threads?: number;
}

export interface GGUFModelConfig extends BaseModelConfig {
  provider: 'gguf';
  modelPath: string;
  serverPort?: number;
  context_size?: number;
  threads?: number;
}

export interface ProviderConfigs {
  openai: APIEndpointConfig[];
  anthropic: APIEndpointConfig[];
  google: APIEndpointConfig[];
  ollama: OllamaEndpointConfig[];
  huggingface: APIEndpointConfig[];
  gguf: GGUFModelConfig[];
}

export interface ModelCapabilities {
  maxContextSize: number;
  inputCostPer1k?: number;
  outputCostPer1k?: number;
  supportsStreaming: boolean;
  supportsJsonMode?: boolean;
  supportsFunctions?: boolean;
}

export interface ModelMetrics {
  responseTime: number;
  tokensPerSecond: number;
  totalTokens?: number;
  promptTokens?: number;
  completionTokens?: number;
  cost?: number;
  contextSize?: number;
  memoryUsed?: number;
}

export interface ModelResponse {
  id: string;
  provider: string;
  model: string;
  text: string;
  metrics: ModelMetrics;
  error?: string;
}

export interface ComparisonResult {
  prompt: string;
  timestamp: string;
  responses: ModelResponse[];
  totalTime: number;
  errors?: string[];
} 
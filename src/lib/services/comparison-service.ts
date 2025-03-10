import { OpenAIService } from './openai-service';
import { AnthropicService } from './anthropic-service';
import { OllamaService } from './ollama-service';
import { GGUFService } from './gguf-service';
import {
  ProviderConfigs,
  ComparisonResult,
  ModelResponse,
} from '../types/model-config';

export class ComparisonService {
  private static instance: ComparisonService;
  private configs: ProviderConfigs;
  private services: {
    openai: OpenAIService[];
    anthropic: AnthropicService[];
    ollama: OllamaService[];
    gguf: GGUFService[];
  };

  private constructor() {
    this.configs = {
      openai: [],
      anthropic: [],
      google: [],
      ollama: [],
      huggingface: [],
      gguf: [],
    };
    this.services = {
      openai: [],
      anthropic: [],
      ollama: [],
      gguf: [],
    };
  }

  public static getInstance(): ComparisonService {
    if (!ComparisonService.instance) {
      ComparisonService.instance = new ComparisonService();
    }
    return ComparisonService.instance;
  }

  public updateConfigs(configs: ProviderConfigs): void {
    this.configs = configs;
    
    // Reinitialize services with new configs
    this.services = {
      openai: configs.openai
        .filter(config => config.enabled)
        .map(config => new OpenAIService(config)),
      
      anthropic: configs.anthropic
        .filter(config => config.enabled)
        .map(config => new AnthropicService(config)),
      
      ollama: configs.ollama
        .filter(config => config.enabled)
        .map(config => new OllamaService(config)),
      
      gguf: configs.gguf
        .filter(config => config.enabled)
        .map(config => new GGUFService(config)),
    };
  }

  public async compareModels(prompt: string): Promise<ComparisonResult> {
    const start = Date.now();
    const promises: Promise<ModelResponse>[] = [];

    // Collect all enabled services
    for (const service of this.services.openai) {
      promises.push(service.generateResponse(prompt));
    }

    for (const service of this.services.anthropic) {
      promises.push(service.generateResponse(prompt));
    }

    for (const service of this.services.ollama) {
      promises.push(service.generateResponse(prompt));
    }

    for (const service of this.services.gguf) {
      promises.push(service.generateResponse(prompt));
    }

    // Run all comparisons in parallel
    const responses = await Promise.all(promises);
    const end = Date.now();

    // Collect errors
    const errors = responses
      .filter(response => response.error)
      .map(response => `${response.provider} (${response.model}): ${response.error}`);

    return {
      prompt,
      timestamp: new Date().toISOString(),
      responses,
      totalTime: end - start,
      errors: errors.length > 0 ? errors : undefined,
    };
  }

  public async validateConnections(): Promise<Record<string, boolean>> {
    const results: Record<string, boolean> = {};

    // Test OpenAI connections
    for (const service of this.services.openai) {
      try {
        const response = await service.generateResponse("test");
        results[`openai-${service['config'].id}`] = !response.error;
      } catch {
        results[`openai-${service['config'].id}`] = false;
      }
    }

    // Test Anthropic connections
    for (const service of this.services.anthropic) {
      try {
        const response = await service.generateResponse("test");
        results[`anthropic-${service['config'].id}`] = !response.error;
      } catch {
        results[`anthropic-${service['config'].id}`] = false;
      }
    }

    // Test Ollama connections
    for (const service of this.services.ollama) {
      try {
        const models = await service.listModels();
        results[`ollama-${service['config'].id}`] = models.length > 0;
      } catch {
        results[`ollama-${service['config'].id}`] = false;
      }
    }

    // Test GGUF connections
    for (const service of this.services.gguf) {
      try {
        const isRunning = await service.isServerRunning();
        results[`gguf-${service['config'].id}`] = isRunning;
      } catch {
        results[`gguf-${service['config'].id}`] = false;
      }
    }

    return results;
  }

  public getActiveConfigs(): ProviderConfigs {
    return this.configs;
  }

  public async getOllamaModels(endpointId: string): Promise<string[]> {
    const service = this.services.ollama.find(
      s => s['config'].id === endpointId
    );
    if (!service) {
      return [];
    }
    return service.listModels();
  }

  public async pullOllamaModel(endpointId: string, modelName: string): Promise<boolean> {
    const service = this.services.ollama.find(
      s => s['config'].id === endpointId
    );
    if (!service) {
      return false;
    }
    return service.pullModel(modelName);
  }
} 
import { getSetting } from "@/lib/settings";
import Anthropic from "@anthropic-ai/sdk";

// ─── AIProvider Interface ───
export interface AIProvider {
  name: string;
  generateText(prompt: string, systemPrompt?: string): Promise<string>;
}

// ─── Anthropic (Claude) Provider ───
export class AnthropicProvider implements AIProvider {
  name = "anthropic";
  private apiKey: string;
  private model: string;

  constructor(apiKey: string, model?: string) {
    this.apiKey = apiKey;
    this.model = model || "claude-sonnet-4-20250514";
  }

  async generateText(prompt: string, systemPrompt?: string): Promise<string> {
    const client = new Anthropic({ apiKey: this.apiKey });

    const messages: Anthropic.MessageParam[] = [{ role: "user", content: prompt }];

    const response = await client.messages.create({
      model: this.model,
      max_tokens: 8192,
      ...(systemPrompt ? { system: systemPrompt } : {}),
      messages,
    });

    const block = response.content[0];
    return block.type === "text" ? block.text : "";
  }
}

// ─── Ollama (Local) Provider ───
export class OllamaProvider implements AIProvider {
  name = "ollama";
  private baseUrl: string;
  private model: string;

  constructor(model?: string, baseUrl?: string) {
    this.model = model || "llama3";
    this.baseUrl = baseUrl || "http://localhost:11434";
  }

  async generateText(prompt: string, systemPrompt?: string): Promise<string> {
    const body: Record<string, unknown> = {
      model: this.model,
      prompt,
      stream: false,
    };
    if (systemPrompt) {
      body.system = systemPrompt;
    }

    const response = await fetch(`${this.baseUrl}/api/generate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      throw new Error(`Ollama API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    return data.response || "";
  }
}

// ─── Azure OpenAI Provider ───
export class AzureOpenAIProvider implements AIProvider {
  name = "azure-openai";
  private endpoint: string;
  private apiKey: string;
  private deploymentName: string;
  private apiVersion: string;

  constructor(endpoint: string, apiKey: string, deploymentName: string, apiVersion?: string) {
    this.endpoint = endpoint.replace(/\/$/, "");
    this.apiKey = apiKey;
    this.deploymentName = deploymentName;
    this.apiVersion = apiVersion || "2024-06-01";
  }

  async generateText(prompt: string, systemPrompt?: string): Promise<string> {
    const messages: { role: string; content: string }[] = [];
    if (systemPrompt) {
      messages.push({ role: "system", content: systemPrompt });
    }
    messages.push({ role: "user", content: prompt });

    const url = `${this.endpoint}/openai/deployments/${this.deploymentName}/chat/completions?api-version=${this.apiVersion}`;

    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "api-key": this.apiKey,
      },
      body: JSON.stringify({
        messages,
        max_tokens: 8192,
      }),
    });

    if (!response.ok) {
      throw new Error(`Azure OpenAI API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    return data.choices?.[0]?.message?.content || "";
  }
}

// ─── AWS Bedrock Provider (Placeholder) ───
export class BedrockProvider implements AIProvider {
  name = "bedrock";

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async generateText(_prompt: string, _systemPrompt?: string): Promise<string> {
    throw new Error(
      "AWS Bedrock integration requires AWS SDK configuration. " +
      "Install @aws-sdk/client-bedrock-runtime and configure AWS credentials " +
      "(region, access key, secret key) in your environment or settings to use this provider."
    );
  }
}

// ─── Manual (No AI) Provider ───
export class ManualProvider implements AIProvider {
  name = "manual";

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async generateText(_prompt: string, _systemPrompt?: string): Promise<string> {
    throw new Error(
      "AI is disabled. Please configure personas manually through the UI, " +
      "or select an AI provider in Settings > AI Configuration."
    );
  }
}

// ─── Factory: getAIProvider() ───
// Reads provider/key from database settings, falls back to env vars.
export function getAIProvider(): AIProvider {
  const provider = getSetting("ai.provider") || process.env.AI_PROVIDER || "claude";
  const apiKey = getSetting("ai.apiKey") || "";
  const model = getSetting("ai.model") || "";

  switch (provider.toLowerCase()) {
    case "claude":
    case "anthropic": {
      const key = apiKey || process.env.ANTHROPIC_API_KEY || "";
      if (!key || key === "your_key_here" || key.length < 10) {
        throw new Error(
          "Anthropic API key is missing or invalid. " +
          "Set it in Settings > AI Configuration or via ANTHROPIC_API_KEY environment variable."
        );
      }
      return new AnthropicProvider(key, model || undefined);
    }

    case "ollama": {
      const ollamaModel = model || process.env.OLLAMA_MODEL || "llama3";
      const ollamaUrl = getSetting("ai.ollamaUrl") || process.env.OLLAMA_URL || "http://localhost:11434";
      return new OllamaProvider(ollamaModel, ollamaUrl);
    }

    case "azure":
    case "azure-openai":
    case "azure_openai": {
      const azureEndpoint = getSetting("ai.azureEndpoint") || process.env.AZURE_OPENAI_ENDPOINT || "";
      const azureKey = apiKey || process.env.AZURE_OPENAI_API_KEY || "";
      const azureDeployment = getSetting("ai.azureDeployment") || process.env.AZURE_OPENAI_DEPLOYMENT || "";
      if (!azureEndpoint || !azureKey || !azureDeployment) {
        throw new Error(
          "Azure OpenAI configuration incomplete. Required: endpoint URL, API key, and deployment name. " +
          "Set these in Settings > AI Configuration or via environment variables."
        );
      }
      return new AzureOpenAIProvider(azureEndpoint, azureKey, azureDeployment);
    }

    case "bedrock":
    case "aws-bedrock":
    case "aws_bedrock":
      return new BedrockProvider();

    case "manual":
    case "none":
    case "disabled":
      return new ManualProvider();

    default:
      throw new Error(
        `Unknown AI provider: "${provider}". ` +
        `Supported providers: claude, ollama, azure-openai, bedrock, manual.`
      );
  }
}

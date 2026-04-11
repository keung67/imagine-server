import { describe, it, expect, vi } from "vitest";
import { providerRegistry } from "../registry";
import { IProvider } from "../base";
import type { Bindings } from "../../types";

// Setup a mock provider
class MockProvider implements IProvider {
  name = "mock_provider";
  supportedActions = ["generate"];

  async handleRequest(c: any, action: string, params: any): Promise<any> {
    return { images: ["base64-mock"] };
  }

  getApiModelId(model: string): string {
    return model;
  }

  getModelConfigs(): any {
    return {
      "mock-model-1": {
        apiId: "api-mock-1",
        config: {
          id: "mock-model-1",
          name: "mock-model-1",
          type: ["text2img"],
        },
      },
    };
  }
}

describe("ProviderRegistry", () => {
  it("should register and retrieve a provider", () => {
    const p = new MockProvider();
    providerRegistry.register(p);

    expect(providerRegistry.has("mock_provider")).toBe(true);
    expect(providerRegistry.get("mock_provider")).toBe(p);
  });

  it("should list all registered provider names including built-ins and new mocks", () => {
    const names = providerRegistry.getProviderNames();
    expect(names).toContain("mock_provider");
    expect(names).toContain("gitee");
    expect(names).toContain("gemini");
  });

  it("should load all model configs from all registered providers", () => {
    const configs = providerRegistry.getAllModelConfigs();
    expect(configs.length).toBeGreaterThan(0);
    // Our mock provider adds at least 1 config
    const mockConfigs = configs.filter((c) => c.name === "mock-model-1");
    expect(mockConfigs.length).toBe(1);
    expect(mockConfigs[0].name).toBe("mock-model-1");
  });

  it("should properly parse model ids", () => {
    const result1 = providerRegistry.parseModelId("provider_a/model_x");
    expect(result1).toEqual({ provider: "provider_a", model: "model_x" });

    // Legacy format without slashes falls back to "gitee"
    const result2 = providerRegistry.parseModelId("some_old_model_id");
    expect(result2).toEqual({ provider: "gitee", model: "some_old_model_id" });
  });

  it("should filter models by available tokens", async () => {
    // We mock the token-manager specifically for testing the registry behavior
    vi.mock("../../api/token-manager", () => {
      return {
        hasAvailableToken: async (providerName: string) => {
          // Only allow "mock_provider" to pass the check
          return providerName === "mock_provider";
        },
      };
    });

    const env: Bindings = {};
    const availableConfigs =
      await providerRegistry.getAllAvailableModelConfigs(env);

    // According to our mock, only models from "mock_provider" should be returned
    expect(availableConfigs.every((c) => c.name === "mock-model-1")).toBe(true);
    expect(availableConfigs.length).toBe(1);

    vi.restoreAllMocks();
  });
});

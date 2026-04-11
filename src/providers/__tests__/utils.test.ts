import { describe, it, expect } from "vitest";
import {
  extractCompleteEventData,
  getBaseDimensions,
  getDimensions,
} from "../utils";

describe("Provider Utils", () => {
  describe("extractCompleteEventData", () => {
    it("should return JSON data on complete event", () => {
      const stream = "event: complete\ndata: {\"key\":\"value\"}\n\n";
      const result = extractCompleteEventData(stream);
      expect(result).toEqual({ key: "value" });
    });

    it("should throw error on error event", () => {
      const stream = "event: error\ndata: {\"error\":\"something went wrong\"}\n\n";
      expect(() => extractCompleteEventData(stream)).toThrow("SSE stream error event received");
    });

    it("should return null for incomplete stream", () => {
      const stream = "event: running\ndata: {\"status\":\"generating\"}\n\n";
      const result = extractCompleteEventData(stream);
      expect(result).toBeNull();
    });

    it("should return null for invalid JSON data", () => {
      const stream = "event: complete\ndata: invalid-json\n\n";
      const result = extractCompleteEventData(stream);
      expect(result).toBeNull();
    });
  });

  describe("getBaseDimensions", () => {
    it("should return correct dimensions for 16:9", () => {
      expect(getBaseDimensions("16:9")).toEqual({ width: 1024, height: 576 });
    });

    it("should return correct dimensions for 4:3", () => {
      expect(getBaseDimensions("4:3")).toEqual({ width: 1024, height: 768 });
    });

    it("should return correct dimensions for 1:1 and unknown ratios", () => {
      expect(getBaseDimensions("1:1")).toEqual({ width: 1024, height: 1024 });
      expect(getBaseDimensions("unknown")).toEqual({ width: 1024, height: 1024 });
    });
  });

  describe("getDimensions", () => {
    it("should return base dimensions when enableHD is false", () => {
      const result = getDimensions("16:9", false);
      expect(result).toEqual({ width: 1024, height: 576 });
    });

    it("should return 2x dimensions when enableHD is true (default multiplier)", () => {
      const result = getDimensions("16:9", true);
      expect(result).toEqual({ width: 2048, height: 1152 });
    });

    it("should return 1.5x dimensions for specific flux models when HD is true", () => {
      const result = getDimensions("1:1", true, "flux-1-schnell");
      expect(result).toEqual({ width: 1536, height: 1536 });

      const resultDev = getDimensions("1:1", true, "FLUX.1-dev");
      expect(resultDev).toEqual({ width: 1536, height: 1536 });
    });

    it("should return 1x dimensions for z-image model when HD is true", () => {
      const result = getDimensions("1:1", true, "z-image");
      expect(result).toEqual({ width: 1024, height: 1024 });
    });
  });
});

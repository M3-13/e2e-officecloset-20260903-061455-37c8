import { describe, it, expect } from "vitest";
import config from "./vite.config.js";

describe("vite dev server proxy", () => {
  it("forwards /api to the backend", () => {
    expect(config.server.proxy["/api"]).toBeTruthy();
    expect(config.server.proxy["/api"].target).toBe("http://localhost:8000");
  });

  it("forwards /uploads so uploaded wardrobe images are delivered", () => {
    expect(config.server.proxy["/uploads"]).toBeTruthy();
    expect(config.server.proxy["/uploads"].target).toBe(
      "http://localhost:8000",
    );
  });

  it("points /uploads at the same backend as /api", () => {
    expect(config.server.proxy["/uploads"].target).toBe(
      config.server.proxy["/api"].target,
    );
  });
});

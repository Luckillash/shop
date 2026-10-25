import { afterEach, describe, expect, test, vi } from "vitest";
import { supabasePublishableKey, supabaseUrl } from "./config";

describe("config de Supabase", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  test("devuelve las variables definidas", () => {
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://demo.supabase.co");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY", "sb_publishable_demo");
    expect(supabaseUrl()).toBe("https://demo.supabase.co");
    expect(supabasePublishableKey()).toBe("sb_publishable_demo");
  });

  test("falla con un mensaje claro si falta una variable", () => {
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "");
    expect(() => supabaseUrl()).toThrow("NEXT_PUBLIC_SUPABASE_URL");
  });
});

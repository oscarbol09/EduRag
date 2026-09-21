import { describe, it, expect } from "vitest";
import robots from "../src/app/robots";
import sitemap from "../src/app/sitemap";

describe("SEO & Production Meta Verification", () => {
  describe("robots()", () => {
    it("returns correct robots configuration with rules and sitemap", () => {
      const config = robots();

      expect(config).toBeDefined();
      expect(config.sitemap).toBe("https://edu-rag-red.vercel.app/sitemap.xml");
      expect(Array.isArray(config.rules)).toBe(true);

      const rule = Array.isArray(config.rules) ? config.rules[0] : config.rules;
      expect(rule).toBeDefined();
      expect(rule?.userAgent).toBe("*");
      expect(rule?.allow).toContain("/");
      expect(rule?.allow).toContain("/marketplace");
      expect(rule?.disallow).toContain("/teacher/");
      expect(rule?.disallow).toContain("/admin/");
      expect(rule?.disallow).toContain("/chat/");
    });
  });

  describe("sitemap()", () => {
    it("returns array of routes with expected priorities and change frequencies", () => {
      const routes = sitemap();

      expect(Array.isArray(routes)).toBe(true);
      expect(routes.length).toBeGreaterThanOrEqual(4);

      const urls = routes.map((r) => r.url);
      expect(urls).toContain("https://edu-rag-red.vercel.app");
      expect(urls).toContain("https://edu-rag-red.vercel.app/marketplace");
      expect(urls).toContain("https://edu-rag-red.vercel.app/login");
      expect(urls).toContain("https://edu-rag-red.vercel.app/register");

      const homeRoute = routes.find((r) => r.url === "https://edu-rag-red.vercel.app");
      expect(homeRoute?.priority).toBe(1.0);
      expect(homeRoute?.changeFrequency).toBe("weekly");

      const marketplaceRoute = routes.find((r) => r.url === "https://edu-rag-red.vercel.app/marketplace");
      expect(marketplaceRoute?.priority).toBe(0.9);
      expect(marketplaceRoute?.changeFrequency).toBe("daily");
    });
  });
});

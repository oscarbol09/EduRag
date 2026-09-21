import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://edu-rag-red.vercel.app";

  return {
    rules: [
      {
        userAgent: "*",
        allow: ["/", "/marketplace", "/login", "/register"],
        disallow: ["/teacher/", "/admin/", "/chat/", "/api/"],
      },
    ],
    sitemap: `${baseUrl}/sitemap.xml`,
  };
}

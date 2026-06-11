import { describe, it, expect, vi, beforeEach } from "vitest";
import { api } from "@/lib/api";

const mockFetch = vi.fn();
vi.stubGlobal("fetch", mockFetch);

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

function mockJsonResponse(data: unknown, status = 200) {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: vi.fn().mockResolvedValue(data),
  };
}

function mockErrorResponse(detail: string, status = 400) {
  return {
    ok: false,
    status,
    json: vi.fn().mockResolvedValue({ detail }),
  };
}

describe("api.auth", () => {
  beforeEach(() => {
    mockFetch.mockReset();
    localStorage.clear();
  });

  it("login calls correct endpoint and returns data", async () => {
    const userData = { id: "1", email: "test@test.com", role: "teacher" };
    mockFetch.mockResolvedValue(mockJsonResponse({ token: "abc", user: userData }));

    const result = await api.auth.login("test@test.com", "pass");

    expect(mockFetch).toHaveBeenCalledWith(
      `${API_URL}/auth/login`,
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({ email: "test@test.com", password: "pass" }),
      })
    );
    expect(result.token).toBe("abc");
    expect(result.user.email).toBe("test@test.com");
  });

  it("me calls correct endpoint with Authorization header", async () => {
    localStorage.setItem("token", "test-token");
    const userData = { id: "1", email: "a@b.com", role: "student" };
    mockFetch.mockResolvedValue(mockJsonResponse(userData));

    const result = await api.auth.me();

    expect(mockFetch).toHaveBeenCalledWith(
      `${API_URL}/auth/me`,
      expect.objectContaining({
        headers: expect.objectContaining({
          Authorization: "Bearer test-token",
        }),
      })
    );
    expect(result.email).toBe("a@b.com");
  });

  it("register sends role: student and returns data", async () => {
    const userData = { id: "1", email: "new@test.com", role: "student" };
    mockFetch.mockResolvedValue(mockJsonResponse({ token: "def", user: userData }));

    const result = await api.auth.register("new@test.com", "pass123");

    expect(mockFetch).toHaveBeenCalledWith(
      `${API_URL}/auth/register`,
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({ email: "new@test.com", password: "pass123", role: "student" }),
      })
    );
    expect(result.token).toBe("def");
  });

  it("updateProfile sends correct data", async () => {
    localStorage.setItem("token", "tok");
    const updated = { id: "1", firstName: "Ana" };
    mockFetch.mockResolvedValue(mockJsonResponse(updated));

    const result = await api.auth.updateProfile({
      firstName: "Ana",
      lastName: "García",
      institution: "U",
    });

    expect(mockFetch).toHaveBeenCalledWith(
      `${API_URL}/auth/me/profile`,
      expect.objectContaining({
        method: "PUT",
        body: JSON.stringify({ firstName: "Ana", lastName: "García", institution: "U" }),
      })
    );
    expect(result.firstName).toBe("Ana");
  });
});

describe("api.chatbots", () => {
  beforeEach(() => {
    mockFetch.mockReset();
    localStorage.clear();
  });

  it("list calls correct endpoint", async () => {
    mockFetch.mockResolvedValue(mockJsonResponse([]));
    await api.chatbots.list("owner-1");
    expect(mockFetch).toHaveBeenCalledWith(
      `${API_URL}/chatbots?owner_id=owner-1`,
      expect.any(Object)
    );
  });

  it("list without owner calls /chatbots", async () => {
    mockFetch.mockResolvedValue(mockJsonResponse([]));
    await api.chatbots.list();
    expect(mockFetch).toHaveBeenCalledWith(
      `${API_URL}/chatbots`,
      expect.any(Object)
    );
  });

  it("get calls /chatbots/{id}", async () => {
    mockFetch.mockResolvedValue(mockJsonResponse({ id: "bot-1" }));
    const result = await api.chatbots.get("bot-1");
    expect(mockFetch).toHaveBeenCalledWith(`${API_URL}/chatbots/bot-1`, expect.any(Object));
    expect(result.id).toBe("bot-1");
  });

  it("create sends POST with correct body", async () => {
    localStorage.setItem("token", "tok");
    const bot = { id: "new", name: "Test Bot" };
    mockFetch.mockResolvedValue(mockJsonResponse(bot));
    const data = { name: "Test Bot", subject_area: "Math", education_level: "secondary" as const };
    const result = await api.chatbots.create(data);
    expect(mockFetch).toHaveBeenCalledWith(
      `${API_URL}/chatbots`,
      expect.objectContaining({ method: "POST" })
    );
    expect(result.name).toBe("Test Bot");
  });

  it("update sends PUT", async () => {
    localStorage.setItem("token", "tok");
    mockFetch.mockResolvedValue(mockJsonResponse({ id: "bot-1", name: "Updated" }));
    await api.chatbots.update("bot-1", { name: "Updated" });
    expect(mockFetch).toHaveBeenCalledWith(
      `${API_URL}/chatbots/bot-1`,
      expect.objectContaining({ method: "PUT" })
    );
  });

  it("delete sends DELETE", async () => {
    localStorage.setItem("token", "tok");
    mockFetch.mockResolvedValue(mockJsonResponse({}));
    await api.chatbots.delete("bot-1");
    expect(mockFetch).toHaveBeenCalledWith(
      `${API_URL}/chatbots/bot-1`,
      expect.objectContaining({ method: "DELETE" })
    );
  });

  it("publish sends POST", async () => {
    localStorage.setItem("token", "tok");
    mockFetch.mockResolvedValue(mockJsonResponse({ id: "bot-1", is_published: true }));
    await api.chatbots.publish("bot-1");
    expect(mockFetch).toHaveBeenCalledWith(
      `${API_URL}/chatbots/bot-1/publish`,
      expect.objectContaining({ method: "POST" })
    );
  });

  it("getEmbed calls /chatbots/{id}/embed", async () => {
    mockFetch.mockResolvedValue(mockJsonResponse({ embed_code: "<iframe>", public_url: "https://..." }));
    const result = await api.chatbots.getEmbed("bot-1");
    expect(result.embed_code).toBe("<iframe>");
  });
});

describe("api.documents", () => {
  beforeEach(() => {
    mockFetch.mockReset();
    localStorage.clear();
  });

  it("list calls /documents?chatbot_id=", async () => {
    mockFetch.mockResolvedValue(mockJsonResponse([]));
    await api.documents.list("cb-1");
    expect(mockFetch).toHaveBeenCalledWith(
      `${API_URL}/documents?chatbot_id=cb-1`,
      expect.any(Object)
    );
  });

  it("upload sends FormData via POST", async () => {
    localStorage.setItem("token", "tok");
    const file = new File(["content"], "test.md", { type: "text/markdown" });
    const doc = { id: "doc-1", filename: "test.md" };
    mockFetch.mockResolvedValue(mockJsonResponse(doc));

    const result = await api.documents.upload("cb-1", file);

    expect(mockFetch).toHaveBeenCalledWith(
      `${API_URL}/documents/upload`,
      expect.objectContaining({ method: "POST" })
    );
    const callArgs = mockFetch.mock.calls[0][1];
    expect(callArgs.body).toBeInstanceOf(FormData);
    expect(result.filename).toBe("test.md");
  });

  it("delete sends DELETE with chatbot_id", async () => {
    localStorage.setItem("token", "tok");
    mockFetch.mockResolvedValue(mockJsonResponse({}));
    await api.documents.delete("doc-1", "cb-1");
    expect(mockFetch).toHaveBeenCalledWith(
      `${API_URL}/documents/doc-1?chatbot_id=cb-1`,
      expect.objectContaining({ method: "DELETE" })
    );
  });
});

describe("api.chat", () => {
  beforeEach(() => {
    mockFetch.mockReset();
    localStorage.clear();
  });

  it("send calls POST /chat/{id} with message", async () => {
    const response = { response: "Hello", conversation_id: "conv-1", sources: [] };
    mockFetch.mockResolvedValue(mockJsonResponse(response));

    const result = await api.chat.send("bot-1", { message: "Hi" });
    expect(mockFetch).toHaveBeenCalledWith(
      `${API_URL}/chat/bot-1`,
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({ message: "Hi" }),
      })
    );
    expect(result.response).toBe("Hello");
  });

  it("history calls /chat/{id}/history", async () => {
    const conv = { id: "conv-1", messages: [], chatbot_id: "bot-1", created_at: "", updated_at: "" };
    mockFetch.mockResolvedValue(mockJsonResponse(conv));

    const result = await api.chat.history("bot-1", "conv-1");
    expect(mockFetch).toHaveBeenCalledWith(
      `${API_URL}/chat/bot-1/history?conversation_id=conv-1`,
      expect.any(Object)
    );
    expect(result.id).toBe("conv-1");
  });
});

describe("api.admin", () => {
  beforeEach(() => {
    mockFetch.mockReset();
    localStorage.clear();
  });

  it("createTeacher sends POST", async () => {
    localStorage.setItem("token", "tok");
    mockFetch.mockResolvedValue(mockJsonResponse({ id: "t-1", role: "teacher" }));
    const result = await api.admin.createTeacher({ email: "t@t.com", firstName: "T" });
    expect(mockFetch).toHaveBeenCalledWith(
      `${API_URL}/admin/teachers`,
      expect.objectContaining({ method: "POST" })
    );
    expect(result.role).toBe("teacher");
  });

  it("listTeachers calls GET", async () => {
    localStorage.setItem("token", "tok");
    mockFetch.mockResolvedValue(mockJsonResponse([]));
    await api.admin.listTeachers();
    expect(mockFetch).toHaveBeenCalledWith(`${API_URL}/admin/teachers`, expect.any(Object));
  });
});

describe("api.system", () => {
  beforeEach(() => {
    mockFetch.mockReset();
  });

  it("health returns status", async () => {
    mockFetch.mockResolvedValue(mockJsonResponse({ status: "healthy" }));
    const result = await api.system.health();
    expect(result.status).toBe("healthy");
  });

  it("platformStats returns stats", async () => {
    mockFetch.mockResolvedValue(mockJsonResponse({ totalChatbots: 10, totalTeachers: 3, totalMessages: 500 }));
    const result = await api.system.platformStats();
    expect(result.totalChatbots).toBe(10);
  });
});

describe("error handling", () => {
  beforeEach(() => {
    mockFetch.mockReset();
    localStorage.clear();
  });

  it("throws error with detail message on non-ok response", async () => {
    mockFetch.mockResolvedValue(mockErrorResponse("Not found", 404));
    await expect(api.system.health()).rejects.toThrow("Not found");
  });

  it("throws 'Unknown error' when response has no parseable detail", async () => {
    mockFetch.mockResolvedValue({
      ok: false,
      status: 500,
      json: vi.fn().mockRejectedValue(new Error("parse error")),
    });
    await expect(api.system.health()).rejects.toThrow("Unknown error");
  });

  it("throws timeout error on abort", async () => {
    const abortError = new Error("The operation was aborted");
    abortError.name = "AbortError";
    mockFetch.mockRejectedValue(abortError);
    await expect(api.auth.me()).rejects.toThrow("cancelada");
  });
});

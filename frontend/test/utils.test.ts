import { describe, it, expect } from "vitest";
import { cn, formatDate, formatDateTime, truncate, parseTeacherInstitution } from "@/lib/utils";

describe("cn", () => {
  it("merges class names", () => {
    expect(cn("foo", "bar")).toBe("foo bar");
  });

  it("handles conditional classes", () => {
    expect(cn("base", false && "hidden", "visible")).toBe("base visible");
  });
});

describe("formatDate", () => {
  it("formats a date string in Spanish locale", () => {
    const result = formatDate("2026-06-11T12:00:00Z");
    expect(result).toContain("jun");
  });

  it("formats another date correctly", () => {
    const result = formatDate("2025-01-15T00:00:00Z");
    expect(result).toContain("2025");
  });
});

describe("formatDateTime", () => {
  it("includes time in the output", () => {
    const result = formatDateTime("2026-06-11T14:30:00Z");
    expect(result).toContain(":30");
  });
});

describe("truncate", () => {
  it("returns the string as-is when shorter than max length", () => {
    expect(truncate("hello", 10)).toBe("hello");
  });

  it("truncates and appends ellipsis when longer", () => {
    expect(truncate("hello world", 5)).toBe("hello...");
  });

  it("returns exact string when length equals max", () => {
    expect(truncate("hello", 5)).toBe("hello");
  });
});

describe("parseTeacherInstitution", () => {
  it("uses firstName and lastName when available", () => {
    const result = parseTeacherInstitution({
      firstName: "Ana",
      lastName: "García",
      institution: "Colegio | Legacy",
      institutionName: "Colegio Nuevo",
    });
    expect(result.fullName).toBe("Ana García");
    expect(result.institutionName).toBe("Colegio Nuevo");
  });

  it("falls back to legacy pipe format", () => {
    const result = parseTeacherInstitution({
      firstName: "",
      lastName: "",
      institution: "Carlos Ruiz | Instituto Técnico",
      institutionName: undefined,
    });
    expect(result.fullName).toBe("Carlos Ruiz");
    expect(result.institutionName).toBe("Instituto Técnico");
  });

  it("uses institutionName when institution is missing", () => {
    const result = parseTeacherInstitution({
      firstName: "Luis",
      lastName: "Pérez",
      institution: undefined,
      institutionName: "Universidad Central",
    });
    expect(result.fullName).toBe("Luis Pérez");
    expect(result.institutionName).toBe("Universidad Central");
  });

  it("returns empty fullName when no names provided", () => {
    const result = parseTeacherInstitution({
      firstName: "",
      lastName: "",
      institution: "Solo Institución",
      institutionName: undefined,
    });
    expect(result.fullName).toBe("");
    expect(result.institutionName).toBe("Solo Institución");
  });

  it("returns 'Sin institución' when no institution data exists", () => {
    const result = parseTeacherInstitution({
      firstName: "",
      lastName: "",
      institution: undefined,
      institutionName: undefined,
    });
    expect(result.institutionName).toBe("Sin institución");
  });
});

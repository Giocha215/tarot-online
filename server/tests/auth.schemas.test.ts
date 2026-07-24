import { describe, expect, it } from "vitest";
import {
  loginSchema,
  passwordSchema,
  registerSchema,
} from "../src/modules/auth/auth.schemas.js";

describe("passwordSchema", () => {
  it.each([
    ["corta1234", "menos de 10 caracteres"],
    ["solamenteletras", "sin números"],
    ["1234567890123", "sin letras"],
  ])("rechaza %s (%s)", (pwd) => {
    expect(passwordSchema.safeParse(pwd).success).toBe(false);
  });

  it("acepta una contraseña razonable", () => {
    expect(passwordSchema.safeParse("tarot-2026-luna").success).toBe(true);
  });

  it("rechaza más de 72 bytes (bcrypt trunca en silencio)", () => {
    expect(passwordSchema.safeParse(`a1${"x".repeat(80)}`).success).toBe(false);
    // 24 emojis de 4 bytes = 96 bytes, aunque .length sea solo 24
    expect(passwordSchema.safeParse(`a1${"🔮".repeat(24)}`).success).toBe(false);
  });
});

describe("registerSchema", () => {
  it("normaliza el email a minúsculas y recorta espacios", () => {
    const parsed = registerSchema.parse({
      email: "  Ana.Silva@Example.COM ",
      password: "tarot-2026-luna",
      displayName: "  Ana Silva  ",
    });
    expect(parsed.email).toBe("ana.silva@example.com");
    expect(parsed.displayName).toBe("Ana Silva");
  });

  it("rechaza emails mal formados", () => {
    for (const email of ["sinarroba.com", "a@", "@b.com", ""]) {
      const r = registerSchema.safeParse({
        email,
        password: "tarot-2026-luna",
        displayName: "Ana",
      });
      expect(r.success, `debería rechazar "${email}"`).toBe(false);
    }
  });

  it("rechaza un nombre de 1 carácter", () => {
    const r = registerSchema.safeParse({
      email: "a@b.com",
      password: "tarot-2026-luna",
      displayName: "A",
    });
    expect(r.success).toBe(false);
  });
});

describe("loginSchema", () => {
  it("NO aplica reglas de fuerza a la contraseña", () => {
    // Un usuario antiguo con contraseña débil debe poder seguir entrando.
    expect(
      loginSchema.safeParse({ email: "a@b.com", password: "abc" }).success,
    ).toBe(true);
  });

  it("exige contraseña no vacía", () => {
    expect(
      loginSchema.safeParse({ email: "a@b.com", password: "" }).success,
    ).toBe(false);
  });
});

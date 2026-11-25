import { describe, it, expect } from "vitest";
import { isSafeHttpUrl, safeHttpUrlSchema, escapeLikePattern } from "../../src/shared/validators/url.js";
import { invitationTemplate } from "../../src/infra/email/templates/invitation.js";

describe("Security Validators & Sanitization", () => {
  describe("isSafeHttpUrl / safeHttpUrlSchema", () => {
    it("allows valid http and https URLs", () => {
      expect(isSafeHttpUrl("https://usepontus.com.br/logo.png")).toBe(true);
      expect(isSafeHttpUrl("http://localhost:3000/test")).toBe(true);
      expect(safeHttpUrlSchema.safeParse("https://instagram.com/pontus").success).toBe(true);
      expect(safeHttpUrlSchema.safeParse("").success).toBe(true);
    });

    it("blocks javascript:, data:, vbscript: and malformed URLs", () => {
      const malicious = [
        "javascript:alert(1)",
        "JAVASCRIPT:alert(document.cookie)",
        "data:text/html,<script>alert(1)</script>",
        "vbscript:msgbox(1)",
        "ftp://files.example.com/a.png",
        "not-a-url",
      ];

      for (const url of malicious) {
        expect(isSafeHttpUrl(url)).toBe(false);
        expect(safeHttpUrlSchema.safeParse(url).success).toBe(false);
      }
    });
  });

  describe("escapeLikePattern", () => {
    it("escapes SQL LIKE wildcards and backslashes", () => {
      expect(escapeLikePattern("100%_test\\path")).toBe("100\\%\\_test\\\\path");
      expect(escapeLikePattern("normal text")).toBe("normal text");
    });
  });

  describe("invitationTemplate HTML escaping", () => {
    it("escapes HTML tags in tenantName and inviteLink", () => {
      const html = invitationTemplate({
        tenantName: '<script>alert("xss")</script> & <a href="https://evil.com">Click</a>',
        inviteLink: 'https://app.usepontus.com.br/convites/aceitar?token=123" onclick="alert(1)',
        role: "operador",
      });

      expect(html).not.toContain("<script>");
      expect(html).not.toContain('<a href="https://evil.com">');
      expect(html).toContain("&lt;script&gt;alert(&quot;xss&quot;)&lt;/script&gt;");
      expect(html).toContain("&quot; onclick=&quot;alert(1)");
    });
  });
});

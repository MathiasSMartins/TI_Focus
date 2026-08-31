import { describe, expect, it } from "vitest"

import { getInitials } from "@/utils/get-initials"

describe("getInitials", () => {
  it("usa até duas iniciais", () => {
    expect(getInitials("Mathias Martins Silva")).toBe("MM")
  })

  it("retorna fallback para nome ausente", () => {
    expect(getInitials(null)).toBe("TF")
  })
})

// @vitest-environment jsdom
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { render, screen, fireEvent, waitFor, cleanup } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";

vi.mock("../api/account.js", () => ({
  getAccount: vi.fn(),
  getAccountData: vi.fn(),
  deleteAccount: vi.fn(),
  clearToken: vi.fn(),
}));

vi.mock("../api/client.js", () => ({
  getToken: vi.fn(() => "token-123"),
}));

import { getAccount, getAccountData } from "../api/account.js";
import AccountPage from "./AccountPage.jsx";

const PROFILE = { id: 1, username: "alice", email: "alice@example.com" };

function renderPage() {
  return render(
    <MemoryRouter>
      <AccountPage />
    </MemoryRouter>,
  );
}

describe("AccountPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getAccount.mockResolvedValue(PROFILE);
    getAccountData.mockResolvedValue({ user: PROFILE, items: [], outfits: [] });
    URL.createObjectURL = vi.fn(() => "blob:mock-url");
    URL.revokeObjectURL = vi.fn();
  });

  afterEach(() => {
    cleanup();
  });

  it("renders the user's profile data instead of a raw id", async () => {
    renderPage();
    expect(await screen.findByText("alice")).toBeTruthy();
    expect(screen.getByText("alice@example.com")).toBeTruthy();
  });

  it("downloads the exported JSON when the export button is clicked", async () => {
    const clickSpy = vi
      .spyOn(HTMLAnchorElement.prototype, "click")
      .mockImplementation(() => {});
    renderPage();

    fireEvent.click(await screen.findByRole("button", { name: "Daten exportieren" }));

    await waitFor(() => expect(getAccountData).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(URL.createObjectURL).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(clickSpy).toHaveBeenCalledTimes(1));
    clickSpy.mockRestore();
  });

  it("moves initial focus to the cancel button when the dialog opens", async () => {
    renderPage();
    fireEvent.click(await screen.findByRole("button", { name: "Konto löschen" }));

    const cancel = await screen.findByRole("button", { name: "Abbrechen" });
    await waitFor(() => expect(document.activeElement).toBe(cancel));
  });

  it("closes on Escape and returns focus to the trigger", async () => {
    renderPage();
    const trigger = await screen.findByRole("button", { name: "Konto löschen" });
    fireEvent.click(trigger);

    await screen.findByRole("dialog");
    fireEvent.keyDown(document, { key: "Escape" });

    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
    await waitFor(() => expect(document.activeElement).toBe(trigger));
  });

  it("traps focus within the dialog on Tab", async () => {
    renderPage();
    fireEvent.click(await screen.findByRole("button", { name: "Konto löschen" }));

    const cancel = await screen.findByRole("button", { name: "Abbrechen" });
    const confirm = screen.getByRole("button", { name: "Endgültig löschen" });
    await waitFor(() => expect(document.activeElement).toBe(cancel));

    fireEvent.keyDown(document, { key: "Tab", shiftKey: true });
    expect(document.activeElement).toBe(confirm);

    fireEvent.keyDown(document, { key: "Tab" });
    expect(document.activeElement).toBe(cancel);
  });
});

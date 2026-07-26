import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { KeyRound, Loader2, RefreshCw, Trash2, Copy, Check } from "lucide-react";
import { Navigation } from "@/components/navigation";
import { Footer } from "@/components/footer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useWallet } from "@/hooks/useWallet";
import { copyToClipboard } from "@/lib/clipboard/secureClipboard";
import {
  createApiKey,
  listApiKeys,
  revokeApiKey,
  rotateApiKey,
  type ApiScope,
  type RateLimitTier,
} from "@/lib/api/apiKeys";

const SCOPES: ApiScope[] = ["read", "write", "admin"];
const TIERS: RateLimitTier[] = ["free", "pro", "enterprise"];

export default function ApiKeysPage() {
  const { address } = useWallet();
  const queryClient = useQueryClient();

  const [label, setLabel] = useState("");
  const [scopes, setScopes] = useState<ApiScope[]>(["read"]);
  const [tier, setTier] = useState<RateLimitTier>("free");
  const [newPlaintext, setNewPlaintext] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const keysQuery = useQuery({
    queryKey: ["api-keys", address],
    queryFn: async () => (address ? listApiKeys(address) : { keys: [] }),
    enabled: Boolean(address),
  });

  const refresh = () =>
    queryClient.invalidateQueries({ queryKey: ["api-keys", address] });

  const toggleScope = (scope: ApiScope) =>
    setScopes((prev) =>
      prev.includes(scope) ? prev.filter((s) => s !== scope) : [...prev, scope],
    );

  const handleCreate = async () => {
    if (!address || !label.trim()) {
      setError("A label is required.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const result = await createApiKey({
        ownerWallet: address,
        label: label.trim(),
        scopes: scopes.length ? scopes : ["read"],
        rateLimitTier: tier,
      });
      setNewPlaintext(result.plaintext);
      setLabel("");
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create key.");
    } finally {
      setBusy(false);
    }
  };

  const handleRotate = async (id: string) => {
    if (!address) return;
    setBusy(true);
    setError(null);
    try {
      const result = await rotateApiKey(id, address);
      setNewPlaintext(result.plaintext);
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to rotate key.");
    } finally {
      setBusy(false);
    }
  };

  const handleRevoke = async (id: string) => {
    if (!address) return;
    setBusy(true);
    setError(null);
    try {
      await revokeApiKey(id, address);
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to revoke key.");
    } finally {
      setBusy(false);
    }
  };

  const copyPlaintext = async () => {
    if (!newPlaintext) return;
    const res = await copyToClipboard(newPlaintext);
    if (res.success) {
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    }
  };

  const keys = keysQuery.data?.keys ?? [];

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      <Navigation />
      <main className="mx-auto max-w-3xl space-y-8 px-4 py-10">
        <header className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-cyan-400/10 text-cyan-200">
            <KeyRound className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-2xl font-semibold">API keys</h1>
            <p className="text-sm text-slate-400">
              Generate keys for third-party integrations against the Prompt Mint API.
            </p>
          </div>
        </header>

        {!address ? (
          <div className="rounded-2xl border border-white/10 bg-white/5 p-6 text-sm text-slate-300">
            Connect your Stellar wallet to manage API keys.
          </div>
        ) : (
          <>
            {newPlaintext ? (
              <div className="rounded-2xl border border-amber-400/30 bg-amber-500/10 p-5">
                <p className="text-sm font-medium text-amber-100">
                  Copy your new key now — it will not be shown again.
                </p>
                <div className="mt-3 flex items-center gap-2">
                  <code className="flex-1 truncate rounded-lg bg-slate-950/70 px-3 py-2 font-mono text-xs text-emerald-200">
                    {newPlaintext}
                  </code>
                  <Button size="sm" variant="outline" onClick={() => void copyPlaintext()}>
                    {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                    {copied ? "Copied" : "Copy"}
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => setNewPlaintext(null)}>
                    Dismiss
                  </Button>
                </div>
              </div>
            ) : null}

            {error ? (
              <div className="rounded-2xl border border-red-400/20 bg-red-500/10 px-4 py-3 text-sm text-red-200">
                {error}
              </div>
            ) : null}

            <section className="space-y-4 rounded-2xl border border-white/10 bg-white/5 p-5">
              <h2 className="text-lg font-semibold">Create a key</h2>
              <Input
                value={label}
                onChange={(e) => setLabel(e.target.value)}
                placeholder="Key label (e.g. Zapier integration)"
                className="border-white/10 bg-white/5 text-slate-100"
                aria-label="API key label"
              />
              <div className="flex flex-wrap gap-4 text-sm">
                <div className="space-y-2">
                  <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Scopes</p>
                  <div className="flex gap-3">
                    {SCOPES.map((scope) => (
                      <label key={scope} className="flex items-center gap-2 text-slate-200">
                        <input
                          type="checkbox"
                          className="h-4 w-4 accent-cyan-400"
                          checked={scopes.includes(scope)}
                          onChange={() => toggleScope(scope)}
                        />
                        {scope}
                      </label>
                    ))}
                  </div>
                </div>
                <div className="space-y-2">
                  <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Rate tier</p>
                  <select
                    value={tier}
                    onChange={(e) => setTier(e.target.value as RateLimitTier)}
                    className="rounded-lg border border-white/10 bg-slate-950/70 px-3 py-2 text-slate-100"
                    aria-label="Rate limit tier"
                  >
                    {TIERS.map((t) => (
                      <option key={t} value={t}>
                        {t}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <Button
                className="bg-cyan-300 text-slate-950 hover:bg-cyan-200"
                onClick={() => void handleCreate()}
                disabled={busy}
              >
                {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <KeyRound className="h-4 w-4" />}
                Generate key
              </Button>
            </section>

            <section className="space-y-3">
              <h2 className="text-lg font-semibold">Your keys</h2>
              {keysQuery.isLoading ? (
                <div className="rounded-2xl border border-white/10 bg-white/5 p-6 text-sm text-slate-300">
                  Loading keys...
                </div>
              ) : keys.length === 0 ? (
                <div className="rounded-2xl border border-white/10 bg-white/5 p-6 text-sm text-slate-400">
                  No API keys yet.
                </div>
              ) : (
                <ul className="space-y-3">
                  {keys.map((key) => (
                    <li
                      key={key.id}
                      className={`rounded-2xl border p-4 ${
                        key.revoked
                          ? "border-white/5 bg-white/[0.02] opacity-70"
                          : "border-white/10 bg-white/5"
                      }`}
                    >
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <div>
                          <p className="font-medium text-white">
                            {key.label}
                            {key.revoked ? (
                              <span className="ml-2 text-xs text-red-300">(revoked)</span>
                            ) : null}
                          </p>
                          <code className="font-mono text-xs text-slate-400">
                            {key.maskedKey}
                          </code>
                          <p className="mt-1 text-xs text-slate-500">
                            {key.scopes.join(", ")} · {key.rateLimitTier} (
                            {key.rateLimit}/min) · {key.requestCount} requests
                          </p>
                        </div>
                        {!key.revoked ? (
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => void handleRotate(key.id)}
                              disabled={busy}
                            >
                              <RefreshCw className="h-4 w-4" />
                              Rotate
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              className="border-red-400/30 text-red-200 hover:bg-red-500/10"
                              onClick={() => void handleRevoke(key.id)}
                              disabled={busy}
                            >
                              <Trash2 className="h-4 w-4" />
                              Revoke
                            </Button>
                          </div>
                        ) : null}
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          </>
        )}
      </main>
      <Footer />
    </div>
  );
}

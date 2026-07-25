import { Link, useNavigate, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { AlertTriangle, ArrowLeft, Loader2, PackageSearch } from "lucide-react";
import { Navigation } from "@/components/navigation";
import { Footer } from "@/components/footer";
import { Button } from "@/components/ui/button";
import { PromptModal } from "@/pages/browse/PromptModal";
import { ShareLinkButton } from "@/components/ShareLinkButton";
import { PromptHashClient } from "@/lib/stellar/promptHashClient";
import { browserStellarConfig } from "@/lib/stellar/browserConfig";
import {
  buildPromptShareUrl,
  parsePromptIdParam,
} from "@/lib/marketplace/shareUrls";

export default function PromptDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const parsed = parsePromptIdParam(id);

  const promptQuery = useQuery({
    queryKey: ["prompt-detail", parsed.ok ? parsed.promptId : null],
    queryFn: async () => {
      if (!parsed.ok) {
        throw new Error(parsed.error);
      }
      return PromptHashClient.getPrompt(
        browserStellarConfig,
        BigInt(parsed.promptId),
      );
    },
    enabled: parsed.ok,
    retry: false,
  });

  if (!parsed.ok) {
    return (
      <div className="min-h-screen bg-slate-950 text-white">
        <Navigation />
        <main className="mx-auto flex max-w-2xl flex-col items-center px-4 py-20 text-center">
          <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-rose-500/10 text-rose-300">
            <AlertTriangle className="h-7 w-7" />
          </div>
          <h1 className="text-2xl font-semibold">Invalid prompt link</h1>
          <p className="mt-3 text-sm text-slate-400">{parsed.error}</p>
          <Button asChild className="mt-8 bg-cyan-200 text-slate-950 hover:bg-cyan-100">
            <Link to="/browse">
              <ArrowLeft className="h-4 w-4" />
              Back to marketplace
            </Link>
          </Button>
        </main>
        <Footer />
      </div>
    );
  }

  if (promptQuery.isLoading) {
    return (
      <div className="min-h-screen bg-slate-950 text-white">
        <Navigation />
        <main className="flex min-h-[50vh] items-center justify-center">
          <div className="flex items-center gap-3 text-slate-300">
            <Loader2 className="h-5 w-5 animate-spin text-cyan-200" />
            Loading listing…
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  if (promptQuery.isError || !promptQuery.data) {
    const message =
      promptQuery.error instanceof Error
        ? promptQuery.error.message
        : `Prompt #${parsed.promptId} was not found.`;

    return (
      <div className="min-h-screen bg-slate-950 text-white">
        <Navigation />
        <main className="mx-auto flex max-w-2xl flex-col items-center px-4 py-20 text-center">
          <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-500/10 text-amber-200">
            <PackageSearch className="h-7 w-7" />
          </div>
          <h1 className="text-2xl font-semibold">Listing unavailable</h1>
          <p className="mt-3 text-sm text-slate-400">{message}</p>
          <p className="mt-2 max-w-md text-xs text-slate-500">
            The link may be mistyped, or the listing may have been removed from
            discovery. On-chain access rights are unchanged by this page.
          </p>
          <Button asChild className="mt-8 bg-cyan-200 text-slate-950 hover:bg-cyan-100">
            <Link to="/browse">
              <ArrowLeft className="h-4 w-4" />
              Back to marketplace
            </Link>
          </Button>
        </main>
        <Footer />
      </div>
    );
  }

  const shareUrl = buildPromptShareUrl(parsed.promptId);

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      <Navigation />
      <main className="mx-auto max-w-3xl space-y-4 px-4 py-8">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Button
            asChild
            variant="outline"
            className="border-white/15 bg-white/[0.03] text-white hover:bg-white/10"
          >
            <Link to="/browse">
              <ArrowLeft className="h-4 w-4" />
              Marketplace
            </Link>
          </Button>
          <ShareLinkButton
            url={shareUrl}
            label="Copy listing link"
            shareTitle={promptQuery.data.title}
            shareText={`Check out this prompt on Prompt Mint: ${promptQuery.data.title}`}
          />
        </div>
        <p className="text-xs text-slate-500">
          Shareable URL:{" "}
          <span className="font-mono text-slate-400">{shareUrl}</span>
        </p>
      </main>

      <PromptModal
        itemId={parsed.promptId}
        isOpen
        onClose={() => navigate("/browse")}
      />
      <Footer />
    </div>
  );
}

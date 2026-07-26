import { AlertCircle, CheckCircle2, Loader2 } from "lucide-react";
import { useMemo } from "react";
import { useTransactionFeedback } from "./TransactionProvider";

interface TransactionProgressProps {
  title?: string;
  className?: string;
}

export function TransactionProgress({
  title = "Transaction progress",
  className,
}: TransactionProgressProps) {
  const { transactions } = useTransactionFeedback();

  const latest = useMemo(() => transactions[transactions.length - 1], [transactions]);

  if (!latest || latest.status === "idle") {
    return null;
  }

  const isPending = latest.status === "pending";
  const isSuccess = latest.status === "success";

  return (
    <div
      className={[
        "rounded-xl border border-white/10 bg-slate-900/80 p-4 shadow-sm",
        isPending ? "border-cyan-500/30 bg-cyan-950/20" : isSuccess ? "border-emerald-500/30 bg-emerald-950/20" : "border-red-500/30 bg-red-950/20",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
      role="status"
      aria-live="polite"
    >
      <div className="flex items-start gap-3">
        {isPending ? (
          <Loader2 className="mt-0.5 h-5 w-5 shrink-0 animate-spin text-cyan-400" />
        ) : isSuccess ? (
          <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-400" />
        ) : (
          <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-red-400" />
        )}

        <div className="min-w-0 flex-1 space-y-2">
          <div className="flex items-center gap-2">
            <p className="text-sm font-semibold text-white">{title}</p>
            <span className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${isPending ? "bg-cyan-500/15 text-cyan-300" : isSuccess ? "bg-emerald-500/15 text-emerald-300" : "bg-red-500/15 text-red-300"}`}>
              {isPending ? "In progress" : isSuccess ? "Completed" : "Needs attention"}
            </span>
          </div>
          <p className="text-sm text-slate-300">{latest.message}</p>
          {latest.status === "error" && latest.retryAction ? (
            <button
              type="button"
              onClick={latest.retryAction}
              className="rounded-md border border-red-400/40 bg-red-500/10 px-3 py-1.5 text-sm font-medium text-red-200 transition hover:bg-red-500/20"
            >
              Retry
            </button>
          ) : null}
        </div>
      </div>
    </div>
  );
}

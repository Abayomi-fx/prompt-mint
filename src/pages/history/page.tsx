import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  ArrowDownLeft,
  ArrowUpRight,
  ExternalLink,
  ReceiptText,
  Repeat2,
  Wallet,
} from "lucide-react";
import { Navigation } from "@/components/navigation";
import { Footer } from "@/components/footer";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/EmptyState";
import {
  XlmAmountTooltip,
  TimestampTooltip,
} from "@/components/ui/Tooltip";
import { useWallet } from "@/hooks/useWallet";
import { useTransactionHistory } from "@/hooks/useTransactionHistory";
import type {
  TransactionRecord,
  TransactionStatus,
  TransactionType,
} from "@/lib/history/transactions";
import { explorerTxUrl } from "@/lib/stellar/explorer";

const TYPE_META: Record<
  TransactionType,
  { label: string; icon: typeof ArrowUpRight }
> = {
  purchase: { label: "Purchase", icon: ArrowDownLeft },
  sale: { label: "Sale", icon: ArrowUpRight },
  transfer: { label: "Transfer", icon: Repeat2 },
};

const STATUS_STYLE: Record<TransactionStatus, string> = {
  success: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
  pending: "bg-amber-500/15 text-amber-400 border-amber-500/30",
  failed: "bg-red-500/15 text-red-400 border-red-500/30",
};

function toDayStart(value: string): number | undefined {
  if (!value) return undefined;
  const ms = new Date(`${value}T00:00:00`).getTime();
  return Number.isNaN(ms) ? undefined : ms;
}

function toDayEnd(value: string): number | undefined {
  if (!value) return undefined;
  const ms = new Date(`${value}T23:59:59.999`).getTime();
  return Number.isNaN(ms) ? undefined : ms;
}

function TransactionRow({ tx }: { tx: TransactionRecord }) {
  const meta = TYPE_META[tx.type];
  const Icon = meta.icon;
  return (
    <tr className="border-b border-slate-800 hover:bg-slate-900/40">
      <td className="py-3 px-4">
        <span className="inline-flex items-center gap-2 text-slate-200">
          <Icon className="h-4 w-4 text-emerald-400" aria-hidden="true" />
          {meta.label}
        </span>
      </td>
      <td className="py-3 px-4 text-slate-200">
        {tx.title ? (
          tx.promptId ? (
            <Link
              to={`/prompt/${tx.promptId}`}
              className="hover:text-emerald-400 transition-colors"
            >
              {tx.title}
            </Link>
          ) : (
            tx.title
          )
        ) : (
          <span className="text-slate-500">—</span>
        )}
      </td>
      <td className="py-3 px-4 text-slate-300 font-mono text-sm">
        {tx.amountStroops ? (
          <XlmAmountTooltip stroops={tx.amountStroops} />
        ) : (
          "—"
        )}
      </td>
      <td className="py-3 px-4">
        <Badge className={`border ${STATUS_STYLE[tx.status]}`}>
          {tx.status}
        </Badge>
      </td>
      <td className="py-3 px-4 text-slate-400 text-sm">
        <TimestampTooltip value={tx.timestamp} />
      </td>
      <td className="py-3 px-4">
        {tx.txHash ? (
          <a
            href={explorerTxUrl(tx.txHash)}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1 text-xs text-slate-400 hover:text-emerald-400 font-mono transition-colors"
          >
            View <ExternalLink className="h-3 w-3" />
          </a>
        ) : (
          <span className="text-slate-600 text-xs">n/a</span>
        )}
      </td>
    </tr>
  );
}

export default function TransactionHistoryPage() {
  const { address } = useWallet();
  const { filtered, filter, setFilter, transactions } =
    useTransactionHistory(address);

  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");

  const typeValue = filter.type ?? "all";
  const statusValue = filter.status ?? "all";

  const applyDateRange = useMemo(
    () => (from: string, to: string) => {
      setFilter({
        ...filter,
        fromTimestamp: toDayStart(from),
        toTimestamp: toDayEnd(to),
      });
    },
    [filter, setFilter]
  );

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      <Navigation />
      <main className="max-w-5xl mx-auto px-4 py-10">
        <header className="mb-8 flex items-center gap-3">
          <ReceiptText className="h-7 w-7 text-emerald-400" aria-hidden="true" />
          <div>
            <h1 className="text-2xl font-semibold">Transaction History</h1>
            <p className="text-sm text-slate-400">
              Your purchases, sales and transfers on the Stellar network.
            </p>
          </div>
        </header>

        {!address ? (
          <div className="flex flex-col items-center gap-3 py-20 text-center text-slate-400">
            <Wallet className="h-10 w-10 text-slate-600" aria-hidden="true" />
            <p>Connect your wallet to view your transaction history.</p>
          </div>
        ) : (
          <>
            <div className="flex flex-wrap items-end gap-4 mb-6 p-4 rounded-lg border border-slate-800 bg-slate-900/40">
              <label className="flex flex-col gap-1 text-xs text-slate-400">
                Type
                <select
                  aria-label="Filter by type"
                  value={typeValue}
                  onChange={(e) =>
                    setFilter({
                      ...filter,
                      type: e.target.value as TransactionType | "all",
                    })
                  }
                  className="bg-slate-900 border border-slate-700 rounded px-2 py-1 text-sm text-white"
                >
                  <option value="all">All</option>
                  <option value="purchase">Purchase</option>
                  <option value="sale">Sale</option>
                  <option value="transfer">Transfer</option>
                </select>
              </label>

              <label className="flex flex-col gap-1 text-xs text-slate-400">
                Status
                <select
                  aria-label="Filter by status"
                  value={statusValue}
                  onChange={(e) =>
                    setFilter({
                      ...filter,
                      status: e.target.value as TransactionStatus | "all",
                    })
                  }
                  className="bg-slate-900 border border-slate-700 rounded px-2 py-1 text-sm text-white"
                >
                  <option value="all">All</option>
                  <option value="success">Success</option>
                  <option value="pending">Pending</option>
                  <option value="failed">Failed</option>
                </select>
              </label>

              <label className="flex flex-col gap-1 text-xs text-slate-400">
                From
                <input
                  type="date"
                  aria-label="From date"
                  value={fromDate}
                  onChange={(e) => {
                    setFromDate(e.target.value);
                    applyDateRange(e.target.value, toDate);
                  }}
                  className="bg-slate-900 border border-slate-700 rounded px-2 py-1 text-sm text-white"
                />
              </label>

              <label className="flex flex-col gap-1 text-xs text-slate-400">
                To
                <input
                  type="date"
                  aria-label="To date"
                  value={toDate}
                  onChange={(e) => {
                    setToDate(e.target.value);
                    applyDateRange(fromDate, e.target.value);
                  }}
                  className="bg-slate-900 border border-slate-700 rounded px-2 py-1 text-sm text-white"
                />
              </label>
            </div>

            {transactions.length === 0 ? (
              <EmptyState
                variant="no-transactions"
                action={
                  <Button
                    asChild
                    className="bg-emerald-500 font-bold text-slate-950 hover:bg-emerald-400"
                  >
                    <Link to="/browse">Browse prompts</Link>
                  </Button>
                }
                size="lg"
              />
            ) : filtered.length === 0 ? (
              <EmptyState
                variant="search-empty"
                title="No matching transactions"
                description="Try clearing or adjusting your filters to see more activity."
                action={
                  <Button
                    variant="outline"
                    className="border-white/15 bg-white/5 text-white hover:bg-white/10"
                    onClick={() =>
                      setFilter({ type: "all", status: "all" })
                    }
                  >
                    Clear filters
                  </Button>
                }
                size="lg"
              />
            ) : (
              <div className="overflow-x-auto rounded-lg border border-slate-800">
                <table className="w-full text-left">
                  <thead className="bg-slate-900/60 text-xs uppercase text-slate-400">
                    <tr>
                      <th className="py-3 px-4 font-medium">Type</th>
                      <th className="py-3 px-4 font-medium">Prompt</th>
                      <th className="py-3 px-4 font-medium">Amount</th>
                      <th className="py-3 px-4 font-medium">Status</th>
                      <th className="py-3 px-4 font-medium">Date</th>
                      <th className="py-3 px-4 font-medium">Explorer</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map((tx) => (
                      <TransactionRow key={tx.id} tx={tx} />
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </>
        )}
      </main>
      <Footer />
    </div>
  );
}

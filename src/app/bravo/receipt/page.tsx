// /bravo/receipt?reference=<orderRef>&token=<statusToken>
// Hosted receipt for a paid Bravo order. All details are server-verified from the database;
// nothing is read from the URL except the reference and the one-time status token.
// Without a valid token the page shows no order data (a bare reference never exposes the
// activation key); Bravo's local printable receipt remains the fallback.
import { getBravoDeps } from "@/lib/bravo/service";
import { getReceiptView } from "@/lib/bravo/receipt";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const metadata = {
  title: "Bravo Receipt",
  robots: { index: false, follow: false },
};

export default async function ReceiptPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const params = await searchParams;
  const reference = params.reference ?? "";
  const token = params.token ?? null;

  let view: Awaited<ReturnType<typeof getReceiptView>> | null = null;
  let loadError = false;
  try {
    view = await getReceiptView(getBravoDeps(), reference, token);
  } catch {
    loadError = true;
  }

  return (
    <div className="mx-auto max-w-lg px-4 py-12 text-black dark:text-white">
      <h1 className="text-2xl font-extrabold tracking-tight">Bravo CBT — Receipt</h1>
      {loadError ? (
        <p className="mt-4 text-sm text-black/70 dark:text-white/70">Receipts are temporarily unavailable. Please use the receipt in the app.</p>
      ) : view?.kind === "unauthorized" ? (
        <p className="mt-4 text-sm text-black/70 dark:text-white/70">
          For security, the hosted receipt needs the one-time status token from your order. Open the receipt from the Bravo app (or use the printable receipt saved on your device).
        </p>
      ) : view?.kind === "not_found" ? (
        <p className="mt-4 text-sm text-black/70 dark:text-white/70">No order found for that reference. Check the reference in the app.</p>
      ) : view?.kind === "ok" ? (
        <dl className="mt-6 space-y-3 rounded-2xl border border-black/10 p-5 text-sm dark:border-white/10">
          <div className="flex justify-between"><dt className="text-black/60 dark:text-white/60">Reference</dt><dd className="font-mono">{view.order.orderRef}</dd></div>
          <div className="flex justify-between"><dt className="text-black/60 dark:text-white/60">Status</dt><dd className="font-semibold">{view.order.status}</dd></div>
          <div className="flex justify-between"><dt className="text-black/60 dark:text-white/60">Amount</dt><dd>{view.order.amountNaira.toLocaleString()} {view.order.currency}</dd></div>
          <div className="flex justify-between"><dt className="text-black/60 dark:text-white/60">Plan</dt><dd>{view.order.plan}</dd></div>
          <div className="flex justify-between"><dt className="text-black/60 dark:text-white/60">Product ID</dt><dd className="font-mono text-xs">{view.order.productId}</dd></div>
          <div className="flex justify-between"><dt className="text-black/60 dark:text-white/60">Edition</dt><dd>{view.order.editionYear ?? "—"}</dd></div>
          {view.order.paidAt && <div className="flex justify-between"><dt className="text-black/60 dark:text-white/60">Paid at</dt><dd>{view.order.paidAt}</dd></div>}
          {view.order.email && <div className="flex justify-between"><dt className="text-black/60 dark:text-white/60">Contact</dt><dd>{view.order.email}</dd></div>}
          <p className="text-xs text-black/60 dark:text-white/60">{view.order.message}</p>
          {view.order.activationKey && (
            <div className="border-t border-black/10 pt-3 dark:border-white/10">
              <dt className="text-black/60 dark:text-white/60">Activation key</dt>
              <dd className="mt-1 break-all rounded-lg bg-black/5 p-2 font-mono text-xs dark:bg-white/10">{view.order.activationKey}</dd>
            </div>
          )}
        </dl>
      ) : null}
    </div>
  );
}

'use client';

import { money } from '@/components/admin/finance/FinanceUi';

export default function InvoiceDocument({
  invoice,
  items,
}: {
  invoice: Record<string, unknown>;
  items: Record<string, unknown>[];
}) {
  const tax = Number(invoice.cgst || 0) + Number(invoice.sgst || 0) + Number(invoice.igst || 0);
  return (
    <div className="invoice-print mx-auto max-w-3xl bg-white p-8 text-slate-900">
      <div className="flex items-start justify-between border-b border-slate-200 pb-4">
        <div>
          <p className="text-xs uppercase tracking-wide text-slate-500">Tax invoice</p>
          <h1 className="text-2xl font-semibold">{String(invoice.invoice_number || 'Draft')}</h1>
          <p className="text-sm text-slate-500">Date {String(invoice.invoice_date || '')}</p>
          {invoice.due_date ? <p className="text-sm text-slate-500">Due {String(invoice.due_date)}</p> : null}
        </div>
        <div className="text-right text-sm">
          <p className="font-semibold">{String((invoice.company_snapshot as { company_name?: string } | undefined)?.company_name || 'Techantum')}</p>
          <p>{String(invoice.currency || 'INR')}</p>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-6 py-4 text-sm">
        <div>
          <p className="text-[11px] uppercase text-slate-400">Bill to</p>
          <p className="font-semibold">{String(invoice.client_name || '')}</p>
          <p className="whitespace-pre-line text-slate-600">{String(invoice.client_address || '')}</p>
          {invoice.client_gstin ? <p>GSTIN {String(invoice.client_gstin)}</p> : null}
          {invoice.client_pan ? <p>PAN {String(invoice.client_pan)}</p> : null}
        </div>
        <div>
          <p className="text-[11px] uppercase text-slate-400">Place of supply</p>
          <p>{String(invoice.place_of_supply || '—')}</p>
          {invoice.purchase_order_number ? <p>PO {String(invoice.purchase_order_number)}</p> : null}
        </div>
      </div>
      <table className="w-full text-sm">
        <thead>
          <tr className="border-y border-slate-200 text-left text-[11px] uppercase text-slate-500">
            <th className="py-2">Description</th>
            <th className="py-2">SAC/HSN</th>
            <th className="py-2">Qty</th>
            <th className="py-2">Rate</th>
            <th className="py-2">Taxable</th>
            <th className="py-2">Total</th>
          </tr>
        </thead>
        <tbody>
          {items.map((item) => (
            <tr key={String(item.id || item.line_no)} className="border-b border-slate-100">
              <td className="py-2">{String(item.description || '')}</td>
              <td className="py-2">{String(item.sac_hsn || '')}</td>
              <td className="py-2">{String(item.quantity || '')}</td>
              <td className="py-2">{money(item.rate)}</td>
              <td className="py-2">{money(item.taxable_amount)}</td>
              <td className="py-2">{money(item.total_amount)}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <div className="ml-auto mt-4 w-64 space-y-1 text-sm">
        <div className="flex justify-between"><span>Taxable</span><span>{money(invoice.taxable_amount)}</span></div>
        <div className="flex justify-between"><span>CGST</span><span>{money(invoice.cgst)}</span></div>
        <div className="flex justify-between"><span>SGST</span><span>{money(invoice.sgst)}</span></div>
        <div className="flex justify-between"><span>IGST</span><span>{money(invoice.igst)}</span></div>
        <div className="flex justify-between"><span>Tax</span><span>{money(tax)}</span></div>
        <div className="flex justify-between font-semibold"><span>Invoice total</span><span>{money(invoice.total_amount)}</span></div>
        <div className="flex justify-between"><span>Received</span><span>{money(invoice.amount_received)}</span></div>
        <div className="flex justify-between"><span>Outstanding</span><span>{money(invoice.outstanding_amount)}</span></div>
      </div>
      {invoice.terms ? (
        <div className="mt-8 text-xs text-slate-500">
          <p className="font-semibold uppercase">Terms</p>
          <p className="whitespace-pre-line">{String(invoice.terms)}</p>
        </div>
      ) : null}
    </div>
  );
}

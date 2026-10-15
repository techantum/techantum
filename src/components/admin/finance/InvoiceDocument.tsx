'use client';

import { useEffect, useState } from 'react';
import { formatINR, rupeesInWords, toCents } from '@/lib/finance/money';

function line(value: unknown) {
  return String(value || '').trim();
}

function plainAmount(value: unknown) {
  try {
    return formatINR(toCents(value), false);
  } catch {
    return '0.00';
  }
}

function rupee(value: unknown) {
  return `₹ ${plainAmount(value)}`;
}

function rupeeCents(cents: number) {
  return `₹ ${formatINR(cents, false)}`;
}

function percentLabel(value: number) {
  const rounded = Math.round(value * 100) / 100;
  return String(rounded).replace(/\.0$/, '');
}

export default function InvoiceDocument({
  invoice,
  items,
}: {
  invoice: Record<string, unknown>;
  items: Record<string, unknown>[];
}) {
  const snapshot = (invoice.company_snapshot || {}) as Record<string, string>;
  const [settings, setSettings] = useState<Record<string, unknown> | null>(null);
  const [branding, setBranding] = useState<Record<string, unknown> | null>(null);

  useEffect(() => {
    fetch('/api/admin/finance/settings')
      .then((r) => r.json())
      .then((body) => {
        if (body && !body.error) setSettings(body);
      })
      .catch(() => undefined);
    fetch('/api/admin/branding')
      .then((r) => r.json())
      .then((body) => {
        if (body && !body.error) setBranding(body);
      })
      .catch(() => undefined);
  }, []);

  const companyName = line(branding?.company_name || snapshot.company_name || settings?.company_name) || 'Techantum Solutions';
  const gstin = line(snapshot.gstin || settings?.gstin);
  const pan = line(snapshot.pan || settings?.pan);
  const cin = line(snapshot.cin || settings?.cin);
  const address = line(branding?.address || snapshot.address || settings?.billing_address || settings?.registered_address);
  const phone = line(branding?.phone || snapshot.phone || settings?.phone);
  const email = line(branding?.email || snapshot.email || settings?.email);
  const logoUrl = line(branding?.logo_url);
  const clientAddress = line(invoice.client_address);
  const city = line(invoice.client_city);
  const pin = line(invoice.client_pincode);
  const locality = [city, line(invoice.client_state)].filter(Boolean).join(', ');
  const localityLine = [locality, pin].filter(Boolean).join(' ');
  const showLocality = localityLine && !clientAddress.toLowerCase().includes(city.toLowerCase()) && !clientAddress.includes(pin);
  const party = [line(invoice.client_name), clientAddress, showLocality ? localityLine : '', invoice.client_phone ? `Ph: ${line(invoice.client_phone)}` : ''].filter(Boolean);

  const taxable = toCents(invoice.taxable_amount);
  const cgst = toCents(invoice.cgst);
  const sgst = toCents(invoice.sgst);
  const igst = toCents(invoice.igst);
  const rates = [...new Set(items.map((item) => Number(item.gst_rate)).filter((n) => Number.isFinite(n) && n > 0))];
  const singleRate = rates.length === 1 ? rates[0] : null;
  const half = singleRate != null ? ` (${percentLabel(singleRate / 2)}%)` : '';
  const full = singleRate != null ? ` (${percentLabel(singleRate)}%)` : '';
  const bank = [
    settings?.account_name ? `A/c Name: ${line(settings.account_name)}` : '',
    settings?.bank_name ? `Bank: ${line(settings.bank_name)}` : '',
    settings?.branch ? `Branch: ${line(settings.branch)}` : '',
    settings?.account_number ? `A/c No.: ${line(settings.account_number)}` : '',
    settings?.ifsc ? `IFSC: ${line(settings.ifsc)}` : '',
  ].filter(Boolean);

  return (
    <div className="invoice-print mx-auto max-w-3xl bg-white p-6 text-[13px] text-neutral-900 print:max-w-none print:p-0">
      <div className="flex items-start justify-between gap-6">
        <div className="h-9 shrink-0">
          {logoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={logoUrl} alt={companyName} className="h-9 w-auto max-w-[9rem] object-contain object-left" />
          ) : null}
        </div>
        <div className="max-w-xs text-right text-xs leading-snug text-neutral-600">
          <p className="text-sm font-semibold text-neutral-900">{companyName}</p>
          {line(branding?.tagline) ? <p>{line(branding?.tagline)}</p> : null}
          {address ? <p>{address}</p> : null}
          {(phone || email) && <p>{[phone, email].filter(Boolean).join(' · ')}</p>}
          {gstin ? <p>GSTIN: {gstin}</p> : null}
          {pan ? <p>PAN: {pan}</p> : null}
          {cin ? <p>CIN: {cin}</p> : null}
        </div>
      </div>

      <div className="mt-5">
        <h1 className="text-xl font-semibold">Invoice</h1>
        <p className="text-sm text-neutral-500">Invoice number: {line(invoice.invoice_number) || 'DRAFT'}</p>
      </div>

      <div className="mt-4 grid grid-cols-[1.3fr_0.9fr] gap-6 text-xs">
        <div>
          <p className="font-semibold">Bill to</p>
          {party.map((row, index) => (
            <p key={row} className={index === 0 ? 'mt-1 font-semibold' : 'text-neutral-700'}>
              {row}
            </p>
          ))}
          {invoice.client_gstin ? <p className="text-neutral-700">GSTIN: {line(invoice.client_gstin)}</p> : null}
        </div>
        <div className="space-y-1">
          {[
            ['Invoice date', line(invoice.invoice_date).slice(0, 10)],
            invoice.payment_mode ? ['Payment mode', line(invoice.payment_mode)] : null,
            invoice.default_payment_terms ? ['Payment terms', line(invoice.default_payment_terms)] : null,
            invoice.project_name ? ['Project', line(invoice.project_name)] : null,
          ]
            .filter((row): row is [string, string] => Boolean(row))
            .map(([label, value]) => (
              <div key={label} className="flex justify-between gap-3">
                <span className="text-neutral-500">{label}</span>
                <span className="text-right font-semibold">{value}</span>
              </div>
            ))}
        </div>
      </div>

      <table className="mt-3 w-full border-collapse text-xs">
        <thead>
          <tr className="bg-[#f3f5f8]">
            {['S.No', 'DESCRIPTION', 'HSN', 'QTY', 'RATE', 'AMOUNT'].map((heading) => (
              <th
                key={heading}
                className={`border border-[#b7c0cc] px-2 py-1 font-semibold ${heading === 'DESCRIPTION' ? 'text-left' : heading === 'S.No' || heading === 'HSN' ? 'text-center' : 'text-right'}`}
              >
                {heading}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {items.map((item, index) => (
            <tr key={String(item.id || item.line_no || index)}>
              <td className="border border-[#b7c0cc] px-2 py-1 text-center">{index + 1}</td>
              <td className="border border-[#b7c0cc] px-2 py-1">{line(item.description)}</td>
              <td className="border border-[#b7c0cc] px-2 py-1 text-center">{line(item.sac_hsn)}</td>
              <td className="border border-[#b7c0cc] px-2 py-1 text-right">{Number(item.quantity || 0)}</td>
              <td className="border border-[#b7c0cc] px-2 py-1 text-right tabular-nums">{plainAmount(item.rate)}</td>
              <td className="border border-[#b7c0cc] px-2 py-1 text-right tabular-nums">{plainAmount(item.taxable_amount || item.total_amount)}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className="mt-1 space-y-0.5 text-xs">
        <div className="flex justify-end gap-8"><span className="w-48 text-right">Subtotal</span><span className="w-28 text-right tabular-nums">{rupeeCents(taxable)}</span></div>
        {sgst || cgst ? (
          <>
            <div className="flex justify-end gap-8"><span className="w-48 text-right">SGST{half}</span><span className="w-28 text-right tabular-nums">{rupeeCents(sgst)}</span></div>
            <div className="flex justify-end gap-8"><span className="w-48 text-right">CGST{half}</span><span className="w-28 text-right tabular-nums">{rupeeCents(cgst)}</span></div>
          </>
        ) : igst ? (
          <div className="flex justify-end gap-8"><span className="w-48 text-right">Integrated GST{full}</span><span className="w-28 text-right tabular-nums">{rupeeCents(igst)}</span></div>
        ) : null}
        {toCents(invoice.round_off) !== 0 ? (
          <div className="flex justify-end gap-8"><span className="w-48 text-right">Round off</span><span className="w-28 text-right tabular-nums">{rupee(invoice.round_off)}</span></div>
        ) : null}
        <div className="flex justify-end gap-8 bg-[#e7eef6] py-1 font-semibold">
          <span className="w-48 text-right">Total</span>
          <span className="w-28 text-right tabular-nums">{rupee(invoice.total_amount)}</span>
        </div>
      </div>

      <p className="mt-3 text-xs font-semibold">Amount Chargeable (in words): {rupeesInWords(toCents(invoice.total_amount))}</p>

      {(bank.length > 0 || settings?.payment_qr_path || settings?.upi_id) && (
      <div className="mt-3 grid grid-cols-[1.4fr_0.8fr] gap-3 text-xs">
          {bank.length > 0 ? (
          <div className="border border-[#b7c0cc] p-2">
            <p className="font-semibold">Bank Details</p>
            {bank.map((row) => (
              <p key={row}>{row}</p>
            ))}
          </div>
          ) : <div />}
          {settings?.payment_qr_path || settings?.upi_id ? (
          <div className="border border-[#b7c0cc] p-2 text-center">
            {settings?.payment_qr_path ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src="/api/admin/finance/settings/file/payment_qr_path" alt="UPI QR" className="mx-auto h-16 w-16 object-contain" />
            ) : null}
            <p className="mt-1 font-semibold">Scan to Pay (UPI)</p>
            {settings?.upi_id ? <p>{line(settings.upi_id)}</p> : null}
          </div>
          ) : null}
      </div>
      )}

      <div className="mt-4 grid grid-cols-[1.4fr_0.8fr] gap-3 text-xs">
        <p>We declare that this invoice shows the actual price of the services described and that all particulars are true and correct.</p>
        <div>
          <p className="font-semibold">For {companyName}</p>
          {settings?.signature_path ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src="/api/admin/finance/settings/file/signature_path" alt="" className="mt-1 h-8 w-auto object-contain" />
          ) : (
            <div className="h-8" />
          )}
          <p className="mt-2">Authorised Signatory</p>
        </div>
      </div>
      <p className="mt-6 text-center text-xs text-neutral-500">This is a computer-generated invoice.</p>
    </div>
  );
}

import { NextResponse } from 'next/server';
import { requestMeta, requireFinanceAccess, type FinanceAction } from '@/lib/finance/access';
import { listAuditLogs, writeFinanceAudit } from '@/lib/finance/audit';
import { buildCaPackage, buildCaWorkbook } from '@/lib/finance/ca-export';
import {
  createFinanceClient,
  getFinanceClientDetail,
  listFinanceClientsDetailed,
  listFinanceCurrencies,
  setFinanceClientStatus,
  updateFinanceClient,
} from '@/lib/finance/clients';
import { getFinanceDashboard } from '@/lib/finance/dashboard';
import { downloadName, getDocument, listDocuments, uploadAndRegister, type DocumentType } from '@/lib/finance/documents';
import {
  addReceiptDocument,
  cancelReceipt,
  createReceipt,
  getReceipt,
  listReceipts,
  recordReceiptPayment,
} from '@/lib/finance/expenses';
import {
  cancelInvoice,
  createInvoice,
  finalizeInvoice,
  getInvoice,
  invoicePdfFilename,
  listInvoices,
  persistInvoicePdf,
  updateDraftInvoice,
} from '@/lib/finance/invoices';
import { financeErrorResponse, fileResponse, streamFileResponse } from '@/lib/finance/http';
import {
  listExpenseCategories,
  listFinanceClients,
  listFinanceProjects,
  listServices,
  upsertCategory,
  upsertService,
} from '@/lib/finance/lookups';
import { attachPaymentFile, recordInvoicePayment, reverseInvoicePayment } from '@/lib/finance/payments';
import {
  categoryExpenseReport,
  clientBillingSummary,
  expenseRegister,
  financialSummary,
  gstSummary,
  invoicePaymentRegister,
  monthlyPnl,
  receivablesAgeing,
  salesRegister,
  salarySummary,
  tdsSummary,
  transactionRegister,
  vendorExpenseReport,
} from '@/lib/finance/reports';
import {
  getPayslip,
  listEmployees,
  listPayslips,
  replacePayslip,
  uploadPayslip,
  upsertEmployee,
} from '@/lib/finance/payslips';
import { getFinanceSettings, updateFinanceSettings } from '@/lib/finance/settings';
import { absoluteFinancePath, saveFinanceFile } from '@/lib/finance/storage';
import { listTransactions } from '@/lib/finance/transactions';
import { getVendor, listVendors, upsertVendor } from '@/lib/finance/vendors';
import { currentFinancialYear, resolvePeriod, todayISO, type PeriodFilter } from '@/lib/finance/fy';

function isReceiptsPath(seg: string) {
  return seg === 'receipts' || seg === 'expenses';
}

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

async function parseJson(request: Request) {
  try {
    return await request.json();
  } catch {
    return {};
  }
}

function periodFromUrl(url: URL): PeriodFilter {
  const period = url.searchParams.get('period') || 'current_month';
  if (period === 'previous_month') return { kind: 'previous_month' };
  if (period === 'financial_year') return { kind: 'financial_year', fy: url.searchParams.get('fy') || undefined };
  if (period === 'custom') {
    return { kind: 'custom', from: url.searchParams.get('from') || todayISO(), to: url.searchParams.get('to') || todayISO() };
  }
  return { kind: 'current_month' };
}

async function auth(action: FinanceAction) {
  const result = await requireFinanceAccess(action);
  if ('error' in result && result.error) return result;
  return result;
}

export async function GET(request: Request, ctx: { params: Promise<{ path: string[] }> }) {
  const gated = await auth('read');
  if ('error' in gated && gated.error) return gated.error;
  const path = (await ctx.params).path || [];
  const url = new URL(request.url);
  const page = Number(url.searchParams.get('page') || 1);
  const pageSize = Number(url.searchParams.get('pageSize') || 25);
  try {
    if (path[0] === 'dashboard') return NextResponse.json(await getFinanceDashboard(periodFromUrl(url)));
    if (path[0] === 'settings' && path[1] === 'file' && path[2]) {
      const settings = await getFinanceSettings();
      const key = path[2] as 'logo_path' | 'payment_qr_path' | 'signature_path' | 'seal_path';
      const stored = settings[key];
      if (!stored) return NextResponse.json({ error: 'File not found' }, { status: 404 });
      return streamFileResponse(absoluteFinancePath(stored), path[2], 'application/octet-stream');
    }
    if (path[0] === 'settings') return NextResponse.json(await getFinanceSettings());
    if (path[0] === 'currencies') return NextResponse.json(await listFinanceCurrencies());
    if (path[0] === 'clients' && path[1]) return NextResponse.json(await getFinanceClientDetail(path[1]));
    if (path[0] === 'clients') {
      if (url.searchParams.get('detailed') === '1') {
        return NextResponse.json(
          await listFinanceClientsDetailed({
            q: url.searchParams.get('q') || undefined,
            status: url.searchParams.get('status') || undefined,
            clientType: url.searchParams.get('clientType') || undefined,
            page,
            pageSize,
          })
        );
      }
      return NextResponse.json(await listFinanceClients(url.searchParams.get('q') || undefined));
    }
    if (path[0] === 'projects') return NextResponse.json(await listFinanceProjects(url.searchParams.get('clientId') || undefined));
    if (path[0] === 'services') return NextResponse.json(await listServices(url.searchParams.get('active') === '1'));
    if (path[0] === 'receipt-categories' || path[0] === 'expense-categories') {
      return NextResponse.json(await listExpenseCategories(url.searchParams.get('active') === '1'));
    }
    if (path[0] === 'employees') return NextResponse.json(await listEmployees({ q: url.searchParams.get('q') || undefined }));
    if (path[0] === 'invoices' && path[1] && path[2] === 'pdf') {
      const detail = await getInvoice(path[1]);
      if (detail.invoice.pdf_path) {
        const download = url.searchParams.get('download') === '1';
        if (download) {
          await writeFinanceAudit(undefined, {
            userId: gated.user.id,
            action: 'Invoice PDF Downloaded',
            entityType: 'invoice',
            entityId: path[1],
          });
        }
        return streamFileResponse(
          absoluteFinancePath(detail.invoice.pdf_path),
          invoicePdfFilename(detail.invoice),
          'application/pdf',
          download ? 'attachment' : 'inline'
        );
      }
      return NextResponse.json({ error: 'PDF is generated when the invoice is finalized' }, { status: 404 });
    }
    if (path[0] === 'invoices' && path[1]) return NextResponse.json(await getInvoice(path[1]));
    if (path[0] === 'invoices') {
      return NextResponse.json(
        await listInvoices({
          q: url.searchParams.get('q') || undefined,
          from: url.searchParams.get('from') || undefined,
          to: url.searchParams.get('to') || undefined,
          clientId: url.searchParams.get('clientId') || undefined,
          projectId: url.searchParams.get('projectId') || undefined,
          paymentStatus: url.searchParams.get('paymentStatus') || undefined,
          invoiceStatus: url.searchParams.get('invoiceStatus') || undefined,
          fy: url.searchParams.get('fy') || undefined,
          page,
          pageSize,
        })
      );
    }
    if (path[0] === 'vendors' && path[1]) return NextResponse.json(await getVendor(path[1]));
    if (path[0] === 'vendors') {
      return NextResponse.json(
        await listVendors({ q: url.searchParams.get('q') || undefined, status: url.searchParams.get('status') || undefined, page, pageSize })
      );
    }
    if (isReceiptsPath(path[0]) && path[1]) return NextResponse.json(await getReceipt(path[1]));
    if (isReceiptsPath(path[0])) {
      return NextResponse.json(
        await listReceipts({
          q: url.searchParams.get('q') || undefined,
          from: url.searchParams.get('from') || undefined,
          to: url.searchParams.get('to') || undefined,
          vendorId: url.searchParams.get('vendorId') || undefined,
          categoryId: url.searchParams.get('categoryId') || undefined,
          paymentStatus: url.searchParams.get('paymentStatus') || undefined,
          projectId: url.searchParams.get('projectId') || undefined,
          missingDocs: url.searchParams.get('missingDocs') === '1',
          page,
          pageSize,
        })
      );
    }
    if (path[0] === 'payslips' && path[1] && path[2] === 'download') {
      const payslip = await getPayslip(path[1]);
      await writeFinanceAudit(undefined, {
        userId: gated.user.id,
        action: 'Payslip Downloaded',
        entityType: 'payslip',
        entityId: path[1],
      });
      return streamFileResponse(
        absoluteFinancePath(payslip.storage_path),
        payslip.stored_filename || payslip.original_filename,
        payslip.mime_type,
        'attachment'
      );
    }
    if (path[0] === 'payslips') {
      return NextResponse.json(
        await listPayslips({
          q: url.searchParams.get('q') || undefined,
          year: url.searchParams.get('year') ? Number(url.searchParams.get('year')) : undefined,
          month: url.searchParams.get('month') ? Number(url.searchParams.get('month')) : undefined,
          employeeId: url.searchParams.get('employeeId') || undefined,
          page,
          pageSize,
        })
      );
    }
    if (path[0] === 'transactions') {
      return NextResponse.json(
        await listTransactions({
          q: url.searchParams.get('q') || undefined,
          from: url.searchParams.get('from') || undefined,
          to: url.searchParams.get('to') || undefined,
          type: url.searchParams.get('type') || undefined,
          page,
          pageSize,
        })
      );
    }
    if (path[0] === 'documents' && path[1] && path[2] === 'download') {
      const doc = await getDocument(path[1]);
      return streamFileResponse(absoluteFinancePath(doc.storage_path), downloadName(doc), doc.mime_type);
    }
    if (path[0] === 'documents') {
      return NextResponse.json(
        await listDocuments({
          q: url.searchParams.get('q') || undefined,
          documentType: url.searchParams.get('documentType') || undefined,
          fy: url.searchParams.get('fy') || undefined,
          from: url.searchParams.get('from') || undefined,
          to: url.searchParams.get('to') || undefined,
          page,
          pageSize,
        })
      );
    }
    if (path[0] === 'audit') {
      return NextResponse.json(
        await listAuditLogs({
          entityType: url.searchParams.get('entityType') || undefined,
          entityId: url.searchParams.get('entityId') || undefined,
          page,
          pageSize,
        })
      );
    }
    if (path[0] === 'reports') {
      const period = periodFromUrl(url);
      const resolved = path[1] === 'receivables' ? null : resolvePeriod(period);
      const from = resolved?.from || url.searchParams.get('from') || currentFinancialYear().start;
      const to = resolved?.to || url.searchParams.get('to') || currentFinancialYear().end;
      const clientId = url.searchParams.get('clientId') || undefined;
      const vendorId = url.searchParams.get('vendorId') || undefined;
      const categoryId = url.searchParams.get('categoryId') || undefined;
      if (path[1] === 'summary') return NextResponse.json(await financialSummary(period));
      if (path[1] === 'sales' || path[1] === 'invoices') return NextResponse.json({ rows: await salesRegister(from, to, clientId), period: resolved });
      if (path[1] === 'invoice-payments') return NextResponse.json({ rows: await invoicePaymentRegister(from, to, clientId), period: resolved });
      if (path[1] === 'expenses' || path[1] === 'receipts') {
        return NextResponse.json({ rows: await expenseRegister(from, to, vendorId, categoryId), period: resolved });
      }
      if (path[1] === 'receivables') return NextResponse.json(await receivablesAgeing());
      if (path[1] === 'clients') return NextResponse.json({ rows: await clientBillingSummary(from, to), period: resolved });
      if (path[1] === 'gst') return NextResponse.json({ ...(await gstSummary(from, to)), period: resolved });
      if (path[1] === 'tds') return NextResponse.json({ ...(await tdsSummary(from, to)), period: resolved });
      if (path[1] === 'pnl') return NextResponse.json({ rows: await monthlyPnl(from, to), period: resolved });
      if (path[1] === 'vendors') return NextResponse.json({ rows: await vendorExpenseReport(from, to), period: resolved });
      if (path[1] === 'categories') return NextResponse.json({ rows: await categoryExpenseReport(from, to), period: resolved });
      if (path[1] === 'salaries' || path[1] === 'payslips') return NextResponse.json({ rows: await salarySummary(from, to), period: resolved });
      if (path[1] === 'transactions') return NextResponse.json({ rows: await transactionRegister(from, to), period: resolved });
    }
    if (path[0] === 'ca-export') {
      const exportAuth = await auth('export');
      if ('error' in exportAuth && exportAuth.error) return exportAuth.error;
      const fy = url.searchParams.get('fy') || currentFinancialYear().label;
      const kind = url.searchParams.get('kind') || 'sales';
      const period = resolvePeriod({ kind: 'financial_year', fy });
      const buffer = await buildCaWorkbook(kind, period.from, period.to);
      return fileResponse(buffer, `${kind}-register-${fy}.xlsx`, 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    }
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  } catch (err) {
    return financeErrorResponse(err);
  }
}

export async function POST(request: Request, ctx: { params: Promise<{ path: string[] }> }) {
  const path = (await ctx.params).path || [];
  const action: FinanceAction = path[0] === 'ca-package' || path[0] === 'ca-export' ? 'export' : path[0] === 'settings' ? 'settings' : 'write';
  const gated = await auth(action);
  if ('error' in gated && gated.error) return gated.error;
  const userId = gated.user.id;
  const meta = requestMeta(request);
  try {
    if (path[0] === 'settings' && path[1] === 'file') {
      const form = await request.formData();
      const file = form.get('file');
      const field = String(form.get('field') || '');
      if (!(file instanceof File)) return NextResponse.json({ error: 'File is required' }, { status: 400 });
      const allowed = ['logo_path', 'payment_qr_path', 'signature_path', 'seal_path'];
      if (!allowed.includes(field)) return NextResponse.json({ error: 'Invalid settings file field' }, { status: 400 });
      const stored = await saveFinanceFile(file, 'settings');
      const settings = await updateFinanceSettings({ [field]: stored.storage_path }, userId, meta);
      return NextResponse.json(settings);
    }
    if (path[0] === 'settings') return NextResponse.json(await updateFinanceSettings(await parseJson(request), userId, meta));
    if (path[0] === 'clients' && path[1] && path[2] === 'status') {
      const body = await parseJson(request);
      return NextResponse.json(await setFinanceClientStatus(path[1], String(body.status || ''), userId));
    }
    if (path[0] === 'clients' && path[1]) return NextResponse.json(await updateFinanceClient(path[1], await parseJson(request), userId));
    if (path[0] === 'clients') return NextResponse.json(await createFinanceClient(await parseJson(request), userId));
    if (path[0] === 'services') return NextResponse.json(await upsertService(await parseJson(request), userId));
    if (path[0] === 'receipt-categories' || path[0] === 'expense-categories') {
      const body = await parseJson(request);
      return NextResponse.json(await upsertCategory('finance_expense_categories', body, body.id));
    }
    if (path[0] === 'employees') return NextResponse.json(await upsertEmployee(await parseJson(request), userId));
    if (path[0] === 'invoices' && path[1] && path[2] === 'finalize') return NextResponse.json(await finalizeInvoice(path[1], userId, meta));
    if (path[0] === 'invoices' && path[1] && path[2] === 'cancel') {
      const cancelAuth = await auth('cancel');
      if ('error' in cancelAuth && cancelAuth.error) return cancelAuth.error;
      const body = await parseJson(request);
      return NextResponse.json(await cancelInvoice(path[1], String(body.reason || ''), userId, meta));
    }
    if (path[0] === 'invoices' && path[1] && path[2] === 'pdf') {
      await persistInvoicePdf(path[1], userId, true);
      return getInvoice(path[1]).then((d) => NextResponse.json(d));
    }
    if (path[0] === 'invoices') return NextResponse.json(await createInvoice(await parseJson(request), userId));
    if (path[0] === 'invoice-payments' && path[1] && path[2] === 'reverse') {
      const body = await parseJson(request);
      return NextResponse.json(await reverseInvoicePayment(path[1], String(body.reason || ''), userId));
    }
    if (path[0] === 'invoice-payments' && path[1] && path[2] === 'attachment') {
      const form = await request.formData();
      const file = form.get('file');
      if (!(file instanceof File)) return NextResponse.json({ error: 'File is required' }, { status: 400 });
      return NextResponse.json(await attachPaymentFile(path[1], file, userId));
    }
    if (path[0] === 'invoice-payments') return NextResponse.json(await recordInvoicePayment(await parseJson(request), userId, meta));
    if (path[0] === 'vendors') return NextResponse.json(await upsertVendor(await parseJson(request), userId));
    if (isReceiptsPath(path[0]) && path[1] && path[2] === 'cancel') {
      const body = await parseJson(request);
      return NextResponse.json(await cancelReceipt(path[1], String(body.reason || ''), userId));
    }
    if (isReceiptsPath(path[0]) && path[1] && path[2] === 'documents') {
      const form = await request.formData();
      const file = form.get('file');
      if (!(file instanceof File)) return NextResponse.json({ error: 'File is required' }, { status: 400 });
      return NextResponse.json(await addReceiptDocument(path[1], file, userId));
    }
    if (isReceiptsPath(path[0])) {
      const formType = request.headers.get('content-type') || '';
      if (formType.includes('multipart/form-data')) {
        const form = await request.formData();
        const file = form.get('file');
        const body: Record<string, unknown> = {};
        form.forEach((value, key) => {
          if (key !== 'file') body[key] = String(value);
        });
        const receipt = await createReceipt(body, userId);
        if (file instanceof File && file.size > 0) await addReceiptDocument(receipt.id, file, userId);
        return NextResponse.json(receipt);
      }
      return NextResponse.json(await createReceipt(await parseJson(request), userId));
    }
    if (path[0] === 'receipt-payments' || path[0] === 'expense-payments') {
      return NextResponse.json(await recordReceiptPayment(await parseJson(request), userId));
    }
    if (path[0] === 'payslips' && path[1] && path[2] === 'replace') {
      const form = await request.formData();
      const file = form.get('file');
      if (!(file instanceof File)) return NextResponse.json({ error: 'File is required' }, { status: 400 });
      return NextResponse.json(await replacePayslip(path[1], file, String(form.get('remarks') || '') || null, userId));
    }
    if (path[0] === 'payslips') {
      const form = await request.formData();
      const file = form.get('file');
      if (!(file instanceof File)) return NextResponse.json({ error: 'Payslip PDF is required' }, { status: 400 });
      const body: Record<string, unknown> = {};
      form.forEach((value, key) => {
        if (key !== 'file') body[key] = String(value);
      });
      return NextResponse.json(await uploadPayslip(body, file, userId));
    }
    if (path[0] === 'documents') {
      const form = await request.formData();
      const file = form.get('file');
      if (!(file instanceof File)) return NextResponse.json({ error: 'File is required' }, { status: 400 });
      return NextResponse.json(
        await uploadAndRegister(file, {
          documentType: String(form.get('documentType') || 'other') as DocumentType,
          folder: 'documents',
          referenceType: String(form.get('referenceType') || '') || null,
          referenceId: String(form.get('referenceId') || '') || null,
          documentDate: String(form.get('documentDate') || '') || null,
          notes: String(form.get('notes') || '') || null,
          userId,
        })
      );
    }
    if (path[0] === 'ca-package') {
      const body = await parseJson(request);
      const pack = await buildCaPackage(body, userId);
      return fileResponse(pack.buffer, pack.zipName, 'application/zip');
    }
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  } catch (err) {
    return financeErrorResponse(err);
  }
}

export async function PATCH(request: Request, ctx: { params: Promise<{ path: string[] }> }) {
  const gated = await auth('write');
  if ('error' in gated && gated.error) return gated.error;
  const path = (await ctx.params).path || [];
  const userId = gated.user.id;
  try {
    if (path[0] === 'invoices' && path[1]) return NextResponse.json(await updateDraftInvoice(path[1], await parseJson(request), userId));
    if (path[0] === 'vendors' && path[1]) return NextResponse.json(await upsertVendor(await parseJson(request), userId, path[1]));
    if (path[0] === 'services' && path[1]) return NextResponse.json(await upsertService(await parseJson(request), userId, path[1]));
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  } catch (err) {
    return financeErrorResponse(err);
  }
}

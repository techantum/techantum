import { createHmac } from 'node:crypto';
import { FinanceValidationError } from '@/lib/finance/errors';

const API = 'https://api.razorpay.com/v1';

export function razorpayKeyId() {
  return String(process.env.RAZORPAY_KEY_ID || process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID || '').trim();
}

function razorpayKeySecret() {
  return String(process.env.RAZORPAY_KEY_SECRET || '').trim();
}

export function razorpayConfigured() {
  return Boolean(razorpayKeyId() && razorpayKeySecret());
}

async function razorpayRequest(path: string) {
  const response = await fetch(`${API}${path}`, { headers: { Authorization: authHeader() } });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new FinanceValidationError(body.error?.description || 'Could not read the Razorpay payment.');
  }
  return body;
}

export async function fetchRazorpayOrder(orderId: string) {
  return razorpayRequest(`/orders/${encodeURIComponent(orderId)}`) as Promise<{
    id: string;
    amount: number;
    currency: string;
    status: string;
    notes?: Record<string, string>;
  }>;
}

export async function fetchRazorpayPayment(paymentId: string) {
  return razorpayRequest(`/payments/${encodeURIComponent(paymentId)}`) as Promise<{
    id: string;
    order_id: string;
    amount: number;
    status: string;
  }>;
}

function authHeader() {
  const id = razorpayKeyId();
  const secret = razorpayKeySecret();
  if (!id || !secret) throw new FinanceValidationError('Add RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET to the server environment.');
  return `Basic ${Buffer.from(`${id}:${secret}`).toString('base64')}`;
}

export async function createRazorpayOrder(input: {
  amountInr: number;
  receipt: string;
  notes: Record<string, string>;
}) {
  const amount = Math.round(Number(input.amountInr || 0) * 100);
  if (amount < 100) throw new FinanceValidationError('Razorpay requires a charge of at least ₹1.');
  const response = await fetch(`${API}/orders`, {
    method: 'POST',
    headers: {
      Authorization: authHeader(),
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      amount,
      currency: 'INR',
      receipt: input.receipt.slice(0, 40),
      notes: input.notes,
    }),
  });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new FinanceValidationError(body.error?.description || 'Could not create a Razorpay order.');
  }
  return body as { id: string; amount: number; currency: string; status: string };
}

export function verifyRazorpaySignature(orderId: string, paymentId: string, signature: string) {
  const secret = razorpayKeySecret();
  if (!secret) throw new FinanceValidationError('RAZORPAY_KEY_SECRET is missing.');
  const expected = createHmac('sha256', secret).update(`${orderId}|${paymentId}`).digest('hex');
  return expected === signature;
}

export function verifyRazorpayWebhook(rawBody: string, signature: string) {
  const secret = String(process.env.RAZORPAY_WEBHOOK_SECRET || razorpayKeySecret() || '').trim();
  if (!secret) throw new FinanceValidationError('RAZORPAY_WEBHOOK_SECRET is missing.');
  const expected = createHmac('sha256', secret).update(rawBody).digest('hex');
  return expected === signature;
}

async function razorpayPost(path: string, payload: Record<string, unknown>, method: 'POST' | 'PUT' = 'POST') {
  const response = await fetch(`${API}${path}`, {
    method,
    headers: { Authorization: authHeader(), 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new FinanceValidationError(body.error?.description || 'Razorpay request failed.');
  }
  return body;
}

export async function ensureRazorpayPlan(pkg: { id: string; name: string; price_monthly: number; razorpay_plan_id?: string | null }) {
  if (pkg.razorpay_plan_id) return pkg.razorpay_plan_id;
  const plan = await razorpayPost('/plans', {
    period: 'monthly',
    interval: 1,
    item: {
      name: `${pkg.name} monthly`,
      amount: Math.round(pkg.price_monthly * 100),
      currency: 'INR',
    },
    notes: { packageId: pkg.id },
  });
  const planId = String(plan.id || '');
  if (!planId) throw new FinanceValidationError('Could not create a Razorpay plan.');
  const { setPackageRazorpayPlan } = await import('./catalog');
  await setPackageRazorpayPlan(pkg.id, planId);
  return planId;
}

export function indianMobile(raw: string) {
  const digits = String(raw || '').replace(/\D/g, '');
  const local = digits.length === 12 && digits.startsWith('91') ? digits.slice(2) : digits;
  if (!/^[6-9]\d{9}$/.test(local)) {
    throw new FinanceValidationError('Enter the 10-digit Indian mobile number linked to your UPI app.');
  }
  return local;
}

export async function ensureRazorpayCustomer(input: { name: string; email: string; contact: string }) {
  const contact = indianMobile(input.contact);
  const customer = await razorpayPost('/customers', {
    name: input.name || 'Hookooh user',
    email: input.email,
    contact,
    fail_existing: '0',
  });
  const id = String(customer.id || '');
  if (!id) throw new FinanceValidationError('Could not open the Razorpay customer for this mobile number.');
  const saved = String(customer.contact || '').replace(/\D/g, '').slice(-10);
  if (saved && saved !== contact) {
    await razorpayPost(`/customers/${id}`, { contact, email: input.email, name: input.name || customer.name || 'Hookooh user' }, 'PUT');
  }
  return { id, contact };
}

export async function createRazorpaySubscription(input: {
  planId: string;
  startAtUnix: number;
  notes: Record<string, string>;
  totalCount?: number;
  customerId: string;
}) {
  return razorpayPost('/subscriptions', {
    plan_id: input.planId,
    total_count: input.totalCount || 120,
    quantity: 1,
    customer_notify: 1,
    customer_id: input.customerId,
    start_at: input.startAtUnix,
    notes: input.notes,
  }) as Promise<{ id: string; status: string }>;
}

function registeredCheckoutUrl(params: Record<string, string>) {
  const origin = (process.env.RAZORPAY_CHECKOUT_ORIGIN || 'https://mypropti.com').replace(/\/$/, '');
  const url = new URL('/hookooh-autopay.html', origin);
  url.searchParams.set('key', razorpayKeyId());
  for (const [key, value] of Object.entries(params)) {
    if (value) url.searchParams.set(key, value);
  }
  return url.toString();
}

export function autopayCheckoutUrl(input: {
  subscriptionId: string;
  customerId: string;
  name: string;
  email: string;
  contact: string;
  description: string;
}) {
  return registeredCheckoutUrl({
    subscription_id: input.subscriptionId,
    customer_id: input.customerId,
    name: input.name,
    email: input.email,
    contact: input.contact,
    description: input.description.slice(0, 180),
    back: 'trial',
  });
}

export function orderCheckoutUrl(input: {
  orderId: string;
  amount: number;
  packageId: string;
  name: string;
  email: string;
  description: string;
}) {
  return registeredCheckoutUrl({
    order_id: input.orderId,
    amount: String(input.amount),
    package_id: input.packageId,
    name: input.name,
    email: input.email,
    description: input.description.slice(0, 180),
    back: 'billing',
  });
}

export async function cancelRazorpaySubscription(subscriptionId: string) {
  try {
    return await razorpayPost(`/subscriptions/${encodeURIComponent(subscriptionId)}/cancel`, { cancel_at_cycle_end: 1 });
  } catch {
    return razorpayPost(`/subscriptions/${encodeURIComponent(subscriptionId)}/cancel`, { cancel_at_cycle_end: 0 });
  }
}

export function verifyRazorpaySubscriptionSignature(paymentId: string, subscriptionId: string, signature: string) {
  const secret = razorpayKeySecret();
  if (!secret) throw new FinanceValidationError('RAZORPAY_KEY_SECRET is missing.');
  const expected = createHmac('sha256', secret).update(`${paymentId}|${subscriptionId}`).digest('hex');
  return expected === signature;
}

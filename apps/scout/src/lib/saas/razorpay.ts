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
  const secret = String(process.env.RAZORPAY_WEBHOOK_SECRET || '').trim();
  if (!secret) throw new FinanceValidationError('RAZORPAY_WEBHOOK_SECRET is missing.');
  const expected = createHmac('sha256', secret).update(rawBody).digest('hex');
  return expected === signature;
}

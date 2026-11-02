# Cost estimates (India-oriented, indicative)

Figures are **planning estimates**, not quotes. Vendor invoices vary by volume, contract, and GST. Update rates in **Settings → Cost estimator** when you lock contracts.

## 1) AI voice calling (per minute + monthly)

| Component | Typical range (INR) | Notes |
|-----------|---------------------|-------|
| Telephony / IVR pulse or per-min | ₹0.40 – ₹1.50 / min | Your existing IVR rates often apply |
| STT streaming | ₹0.30 – ₹1.20 / min | Language pack premiums possible |
| TTS neural voice | ₹0.20 – ₹0.90 / min | Multilingual voices higher |
| LLM tokens (voice turn) | ₹0.15 – ₹0.80 / min equiv. | Depends on model + context |
| **Blended AI call minute** | **₹1.20 – ₹4.00 / min** | All-in media+AI |

**Example monthly (outbound)**

| Volume | Minutes / month | Low (₹1.5/min) | Mid (₹2.5/min) | High (₹3.5/min) |
|--------|-----------------|----------------|----------------|-----------------|
| 50 calls/day × 3 min | 4,500 | ₹6,750 | ₹11,250 | ₹15,750 |
| 200 calls/day × 3.5 min | 21,000 | ₹31,500 | ₹52,500 | ₹73,500 |
| 500 calls/day × 4 min | 60,000 | ₹90,000 | ₹1,50,000 | ₹2,10,000 |

Add 10–20% for failed/retry attempts.

## 2) WhatsApp Business API (India)

Meta charges **per delivered template message** by category (indicative Oct 2025 INR list rates):

| Category | Approx. INR / delivered msg |
|----------|-----------------------------|
| Marketing | ~₹0.78 |
| Utility | ~₹0.115 |
| Authentication | ~₹0.115 |
| Service (user-initiated window) | Free / free tier then low service rates depending on Meta updates |

Non-template replies inside the 24‑hour customer service window are typically free.

**Example:** 10,000 marketing templates + 6,000 utility ≈ ₹7,800 + ₹690 ≈ **₹8.5k** Meta fees (ex-GST), plus BSP/platform markup if any.

## 3) Zoho CRM integration & customization

| Item | Indicative |
|------|------------|
| Zoho CRM licenses | Per Zoho plan (customer-owned) |
| OAuth + module mapping (standard Leads/Contacts/Calls/Notes) | Included in this platform build |
| Custom fields / Deluge / blueprints | ₹25k – ₹1.5L one-time depending on depth |
| Ongoing sync monitoring | Part of platform support |

## 4) IVR / telephony integration

| Item | Indicative |
|------|------------|
| Adapter wiring to existing IVR (webhook/SIP) | ₹50k – ₹3L one-time (complexity-driven) |
| Concurrent channel fees | Charged by your telco/IVR |
| Recording storage | ₹1 – ₹5 / GB-month |

Integration method in this app: **provider-agnostic adapter** (`telephony` + webhook events). Prerequisites: API base URL, auth, outbound campaign API or SIP, status webhooks, transfer extension/queue IDs.

## 5) Document verification & storage

| Item | Indicative |
|------|------------|
| Object storage (docs/recordings) | ₹1.5 – ₹4 / GB-month |
| OCR assist (clarity/fields) | ₹0.5 – ₹3 / page |
| Official Aadhaar/PAN KYC API (if legally required) | ₹3 – ₹15 / check via licensed provider |
| Human review labor | Internal sales/ops cost |

**This platform does not treat OCR as official Aadhaar/PAN verification.** Official KYC requires an authorized provider and lawful purpose/consent.

## 6) Platform fees, maintenance, support (AI Lead CRM)

| Item | Indicative monthly |
|------|--------------------|
| Platform (app, CRM schema, workflows, dashboards) | ₹40k – ₹1.5L (tier by seats/volume) |
| Maintenance + monitoring | 15–20% of platform |
| Priority support / SLA | Optional add-on |

## 7) Concurrent calling capacity & infrastructure

| Tier | Concurrent AI calls | Rough infra |
|------|---------------------|-------------|
| Pilot | 5 | Single region app + DB; IVR 5 channels |
| Growth | 25 | Horizontal worker pods; IVR 25 channels |
| Scale | 100+ | Dedicated media + autoscaled workers; IVR contract |

App settings expose `maxConcurrency` (default 5). True ceiling = **min(app limit, IVR channels, STT/TTS quota, LLM rate limits)**.

## Zoho + WhatsApp + AI Call + Docs — combined monthly sketch

For **~200 AI calls/day** and **~15k WhatsApp templates/month**:

| Bucket | Mid estimate |
|--------|--------------|
| AI voice minutes | ₹50k – ₹75k |
| WhatsApp Meta fees | ₹10k – ₹20k |
| Storage/OCR | ₹5k – ₹15k |
| Platform + support | ₹60k – ₹1.2L |
| **Total (ex-GST, ex-Zoho licenses)** | **≈ ₹1.3L – ₹2.3L / month** |

Exact commercials finalized after IVR rate card + daily volume + language pack selection.

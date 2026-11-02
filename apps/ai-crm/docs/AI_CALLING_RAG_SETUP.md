# AI Calling, LLM & RAG — How It Works and What You Need

## End-to-end flow (already in AI CRM)

```text
Lead in CRM / Zoho
   → WhatsApp template (only if consent)
   → Customer replies (24h service window)
   → AI WhatsApp qualification (LLM + RAG knowledge)
   → Hot / Warm / Cold score stored on lead
   → If Hot/Warm + calling consent + policy window
        → AI outbound call job (telephony/IVR adapter)
   → Call transcript / summary / disposition
   → Document request (Aadhaar / PAN / electricity bill) for Hot leads
   → Clarity + field consistency checks (assistive OCR)
   → Human verification for mismatches
   → Assign sales + sync history to Zoho CRM
```

**Important product rule:** AI voice call is never started just because WhatsApp was sent. Call only after customer response + qualification rules + consent.

## How AI voice calling works

1. **Orchestration (this app)**  
   Campaign scheduler, concurrency limits, retries, dispositions, CRM updates, human transfer flags.

2. **Telephony / IVR (your provider)**  
   Places the PSTN/SIP call, streams audio, supports barge-in/transfer.  
   Integration methods supported in code:
   - REST webhook callbacks (status + recording URL)
   - Media WebSocket / SIP trunk (provider-specific adapter)
   - Click-to-call / campaign API if your IVR exposes one

3. **STT (speech-to-text)**  
   Converts customer audio → text in near real time (streaming preferred).

4. **LLM (conversation brain)**  
   Uses system instructions + RAG snippets + retail call-script knowledge to decide next utterance and extract slots (intent, budget, timeline, language).

5. **TTS (text-to-speech)**  
   Speaks the AI reply in the detected/preferred Indian language voice.

6. **CRM write-back**  
   Internal `crm` schema always updated; Zoho adapter pushes lead fields, notes, call activity, recording link.

## Building the LLM layer

| Layer | What to configure | Status in app |
|-------|-------------------|---------------|
| Chat LLM | `OPENAI_API_KEY` / `CRM_LLM_API_KEY` | Live when key present |
| Agent instructions | AI Agent Configuration screen | DB-backed |
| Qualification rules | Scoring rules on agent + `evaluateLead` | Live |
| Tooling / functions | Schedule call, request docs, escalate | Workflow engine |
| Fine-tuning (optional) | Train on your retail call transcripts | Bring transcripts → knowledge/RAG first; fine-tune later if needed |

**Recommended path (fastest to demo):**  
Prompt + RAG on your FAQs and call transcripts → evaluate quality → only then consider fine-tuning.

## Building the RAG system

1. Upload knowledge docs (FAQ, product catalogue, objection handling, anonymized call transcripts) in **AI Agent Configuration**.
2. App chunks text and stores embeddings (`crm.knowledge_chunks`).
3. On each customer message / call turn, retrieve top‑k chunks by cosine similarity.
4. Inject retrieved text into the LLM system context (never invent prices not in knowledge).

**Missing for production RAG**
- Dedicated vector DB or `pgvector` for large corpora (current: in-app cosine over stored embeddings — fine for hundreds of chunks)
- Transcript ingestion pipeline from call recordings
- Periodic re-index job

## Prerequisites checklist (missing vs ready)

| Capability | Ready now | You still need to provide |
|------------|-----------|---------------------------|
| WhatsApp Cloud API | Yes when Meta tokens are set | Approved templates, WABA production review |
| LLM (OpenAI) | Yes | Usage budget / org limits |
| STT / TTS | Adapter stubs | Vendor keys (Deepgram/Google/Azure/ElevenLabs etc.) |
| Telephony / IVR | Adapter + campaign APIs | Your IVR provider docs, SIP/API keys, DIDs, transfer queues |
| Zoho CRM | Adapter + sync APIs | Zoho OAuth client, refresh token, module map |
| Document OCR | Assistive checks | OCR vendor key; official KYC provider if legal ID verification required |
| Object storage | Path fields | S3/Supabase bucket for docs & recordings |
| Multilingual voices | Language config + detection hooks | TTS voices for hi/en/bn/ta/te/mr (and kn if needed) |
| Demo call | `CRM_TELEPHONY_PROVIDER=mock` exercises dial→webhook (no fake transcripts); real PSTN needs your IVR | 30‑min joint session with your IVR + one DID |

## Demo call plan (pre-payment)

1. Connect WhatsApp sandbox/live number and one test lead.
2. Run WhatsApp → reply → qualify → schedule call.
3. With your IVR engineer on call: wire webhook + one outbound DID.
4. Play 6-language scripted scenarios (or as many voices as provisioned).
5. Verify Zoho lead update + recording link + disposition.

No live paid campaign until you approve the demo on your infrastructure.

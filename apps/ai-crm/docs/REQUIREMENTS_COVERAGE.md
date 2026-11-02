# Requirements coverage matrix

| Requirement | Coverage in AI CRM |
|-------------|--------------------|
| Hot / Warm / Cold from responses + intent | ✅ `evaluateLead` + WhatsApp AI qualification |
| WhatsApp first message → AI only after reply | ✅ Workflow + conversation engine |
| Trigger AI call from WhatsApp qualification rules | ✅ `schedule_ai_call_if_qualified` |
| Multilingual Indian AI agent (6 langs) | ✅ Agent languages + detection hooks; TTS voices need vendor keys |
| Train from retail call transcripts | ✅ RAG knowledge upload (transcripts as docs) |
| Request Aadhaar / PAN / electricity bill for Hot leads | ✅ Document request workflow |
| Clarity / completeness / consistency checks | ✅ Assistive verification engine + human queue |
| Flag mismatches for human verification | ✅ Review statuses + mismatch reasons |
| Transfer verified leads to sales with history | ✅ Tasks + assignment + activity timeline |
| Integrate existing IVR/telephony | ✅ Provider adapter + webhooks + campaigns |
| Outbound campaigns + inbound handling hooks | ✅ Campaigns + inbound webhook endpoint |
| Human agent transfer | ✅ Disposition `transferred` + task |
| Call logs, recordings links, dispositions | ✅ `crm.voice_calls` |
| Zoho as system of record sync | ✅ Zoho adapter (import/update/activities) |
| Prevent duplicates | ✅ Phone/email/external ID dedupe |
| Reporting dashboard | ✅ Overview + Reports |
| Concurrent capacity & cost estimator | ✅ Settings + Costs page |
| Live demo before paid rollout | ✅ Sandbox/live adapters; telephony demo when IVR connected |

### Explicit non-claims
- OCR ≠ official Aadhaar/PAN KYC.
- Live AI audio requires your IVR + STT/TTS keys.
- Zoho write-back requires customer OAuth credentials.

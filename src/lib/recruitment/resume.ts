import { extractPdfText } from '@/lib/whatsapp/ingest';

const MAX_RESUME_BYTES = 8 * 1024 * 1024;

export async function extractResumeText(file: File): Promise<{ text: string; warning?: string }> {
  if (file.size > MAX_RESUME_BYTES) {
    throw new Error('Resume must be under 8 MB.');
  }
  const ext = file.name.split('.').pop()?.toLowerCase() || '';
  const buffer = Buffer.from(await file.arrayBuffer());

  if (ext === 'pdf' || file.type === 'application/pdf') {
    const { text } = await extractPdfText(new Uint8Array(buffer));
    if (!text.trim()) throw new Error('Could not extract text from PDF. Try a text-based PDF.');
    return { text };
  }

  if (ext === 'docx' || file.type.includes('wordprocessingml')) {
    return {
      text: buffer.toString('utf8').replace(/\u0000/g, '').slice(0, 50000),
      warning: 'DOCX parsing is limited. For best results, upload PDF.',
    };
  }

  if (ext === 'doc') {
    return {
      text: '',
      warning: 'Legacy .doc files are not parsed locally. Convert to PDF for full AI screening.',
    };
  }

  throw new Error('Supported formats: PDF, DOCX (PDF recommended).');
}

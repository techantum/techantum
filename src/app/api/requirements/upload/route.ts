import { NextResponse } from 'next/server';
import { getPublicRequirement, saveAttachment } from '@/lib/client-requirements/service';
import { saveUploadedFile } from '@/lib/storage/local';

const MAX_FILE_BYTES = 100 * 1024 * 1024;
const ALLOWED_TYPES = new Set([
  'image/png',
  'image/jpeg',
  'image/webp',
  'image/gif',
  'image/svg+xml',
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-powerpoint',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  'application/zip',
  'video/mp4',
  'video/webm',
  'video/quicktime',
]);

const EXTENSION_TYPES: Record<string, string> = {
  pdf: 'application/pdf',
  doc: 'application/msword',
  docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  xls: 'application/vnd.ms-excel',
  xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  ppt: 'application/vnd.ms-powerpoint',
  pptx: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  zip: 'application/zip',
  mp4: 'video/mp4',
  mov: 'video/quicktime',
  webm: 'video/webm',
  png: 'image/png',
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  webp: 'image/webp',
  gif: 'image/gif',
  svg: 'image/svg+xml',
};

function safeName(name: string) {
  return name.replace(/[^a-zA-Z0-9._-]/g, '-').replace(/-+/g, '-').slice(0, 120);
}

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const token = String(formData.get('token') || '');
    const requirementId = String(formData.get('requirementId') || '');
    const password = String(formData.get('password') || '');
    const sectionSlug = String(formData.get('sectionSlug') || '');
    const fieldKey = String(formData.get('fieldKey') || '');
    const file = formData.get('file') as File | null;
    if (!token || !requirementId || !file) {
      return NextResponse.json({ error: 'token, requirementId, and file are required' }, { status: 400 });
    }
    if (file.size > MAX_FILE_BYTES) {
      return NextResponse.json({ error: 'File must be 100 MB or smaller' }, { status: 400 });
    }
    const ext = file.name.split('.').pop()?.toLowerCase() || 'bin';
    const contentType = file.type || EXTENSION_TYPES[ext] || 'application/octet-stream';
    if (!ALLOWED_TYPES.has(contentType)) {
      return NextResponse.json({ error: 'Unsupported file type' }, { status: 400 });
    }
    const payload = await getPublicRequirement(token, password);
    if (payload.requirement.id !== requirementId) {
      return NextResponse.json({ error: 'Requirement mismatch' }, { status: 400 });
    }
    const fileName = `${Date.now()}-${safeName(file.name)}`;
    const saved = await saveUploadedFile(`requirements/${requirementId}`, fileName, file);
    const attachment = await saveAttachment({
      requirementId,
      projectId: payload.project.id,
      sectionSlug,
      fieldKey,
      originalName: file.name,
      fileName,
      fileType: contentType,
      fileSize: file.size,
      storagePath: saved.relativePath,
      publicUrl: saved.url,
    });
    return NextResponse.json(attachment);
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Upload failed' }, { status: 400 });
  }
}

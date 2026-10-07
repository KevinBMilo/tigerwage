export const MAX_FILE_BYTES = 5 * 1024 * 1024; // 5 MB

export const ALLOWED_TYPES: Record<string, string> = {
  'application/pdf': '.pdf',
  'application/msword': '.doc',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': '.docx',
  'text/plain': '.txt',
};

export function isAllowedType(type: unknown): type is string {
  return typeof type === 'string' && Object.hasOwn(ALLOWED_TYPES, type);
}

// Keeps file names safe for download headers
export function cleanFileName(name: string): string {
  const cleaned = name.replace(/[^\w.\- ()]/g, '_').trim().slice(0, 200);
  return cleaned || 'document';
}
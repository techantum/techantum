'use client';

import Icon from '@/components/ui/AppIcon';

interface FileUploadZoneProps {
  label: string;
  helpText?: string;
  accept: string;
  hint: string;
  icon: 'PhotoIcon' | 'DocumentTextIcon' | 'CloudArrowUpIcon';
  disabled?: boolean;
  files: { id: string; original_name: string; public_url: string; file_type?: string }[];
  onUpload: (file: File) => void;
}

export default function FileUploadZone({
  label,
  helpText,
  accept,
  hint,
  icon,
  disabled,
  files,
  onUpload,
}: FileUploadZoneProps) {
  return (
    <div className="space-y-1.5">
      <span className="block font-inter text-xs font-medium text-foreground">{label}</span>
      {helpText && <p className="font-inter text-[10px] text-muted-foreground">{helpText}</p>}
      <label
        className={`flex flex-col items-center justify-center gap-1 rounded-lg border-2 border-dashed border-border bg-muted/30 px-3 py-4 text-center transition-colors ${
          disabled ? 'opacity-60 cursor-not-allowed' : 'cursor-pointer hover:border-primary/40 hover:bg-muted/50'
        }`}
      >
        <Icon name={icon} size={20} className="text-muted-foreground" />
        <span className="font-inter text-xs font-medium text-foreground">{hint}</span>
        <span className="font-inter text-[10px] text-muted-foreground">Click to browse or drag files here</span>
        <input
          type="file"
          accept={accept}
          multiple
          disabled={disabled}
          className="sr-only"
          onChange={(e) => {
            Array.from(e.target.files ?? []).forEach(onUpload);
            e.target.value = '';
          }}
        />
      </label>
      {files.length > 0 && (
        <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
          {files.map((file) => (
            <li key={file.id}>
              <a
                href={file.public_url}
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-2 rounded-lg border border-border bg-card px-3 py-2 text-xs font-inter text-foreground hover:border-primary/30 transition-colors"
              >
                <Icon
                  name={file.file_type?.startsWith('image/') ? 'PhotoIcon' : 'DocumentTextIcon'}
                  size={16}
                  className="shrink-0 text-muted-foreground"
                />
                <span className="truncate">{file.original_name}</span>
              </a>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

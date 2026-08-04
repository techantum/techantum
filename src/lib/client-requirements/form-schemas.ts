export type RepeatableFieldType = 'text' | 'textarea' | 'richtext' | 'url' | 'number';

export interface RepeatableFieldDef {
  key: string;
  label: string;
  type: RepeatableFieldType;
  placeholder?: string;
  rows?: number;
}

export interface RepeatableBlockDef {
  addLabel: string;
  fields: RepeatableFieldDef[];
}

/** Streamlined repeatable blocks — enough for onboarding without overwhelming the client. */
export const REPEATABLE_BLOCKS: Record<'services' | 'projects' | 'testimonials', RepeatableBlockDef> = {
  services: {
    addLabel: 'Add service',
    fields: [
      { key: 'service_name', label: 'Service name', type: 'text', placeholder: 'e.g. Warehouse construction' },
      { key: 'overview', label: 'Overview', type: 'richtext', placeholder: 'What you offer and who it is for' },
      { key: 'key_features', label: 'Key features / benefits', type: 'textarea', rows: 3 },
    ],
  },
  projects: {
    addLabel: 'Add project',
    fields: [
      { key: 'project_name', label: 'Project name', type: 'text' },
      { key: 'location', label: 'Location', type: 'text' },
      { key: 'description', label: 'Description', type: 'richtext' },
      { key: 'completion_year', label: 'Year', type: 'text', placeholder: 'e.g. 2024' },
    ],
  },
  testimonials: {
    addLabel: 'Add testimonial',
    fields: [
      { key: 'client_name', label: 'Client name', type: 'text' },
      { key: 'company', label: 'Company', type: 'text' },
      { key: 'designation', label: 'Designation', type: 'text' },
      { key: 'testimonial', label: 'Testimonial', type: 'richtext' },
    ],
  },
};

export const INPUT_CLASS =
  'w-full px-3 py-1.5 rounded-md border border-border bg-input text-foreground font-inter text-sm focus:ring-2 focus:ring-ring focus:border-transparent transition-all';

export const LABEL_CLASS = 'block font-inter text-xs font-medium text-foreground mb-1';

export const HELP_CLASS = 'mt-0.5 font-inter text-xs text-muted-foreground';

export const BTN_PRIMARY =
  'inline-flex items-center justify-center gap-1.5 bg-primary text-primary-foreground px-3.5 py-1.5 rounded-md font-inter text-xs font-semibold hover:bg-primary/90 transition-all disabled:opacity-50 disabled:cursor-not-allowed';

export const BTN_SECONDARY =
  'inline-flex items-center justify-center gap-1.5 border border-border bg-card text-foreground px-3.5 py-1.5 rounded-md font-inter text-xs font-medium hover:bg-muted transition-all disabled:opacity-50 disabled:cursor-not-allowed';

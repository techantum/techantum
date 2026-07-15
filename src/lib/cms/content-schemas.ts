export type FieldType = 'text' | 'textarea' | 'richtext' | 'number' | 'url' | 'image' | 'video' | 'lines';

/** CMS field labels with semantic heading levels for SEO */
export const headingLabel = {
  h1: (text: string) => `${text} (H1)`,
  h2: (text: string) => `${text} (H2)`,
  h3: (text: string) => `${text} (H3)`,
  h4: (text: string) => `${text} (H4)`,
};

export interface FieldSchema {
  key: string;
  label: string;
  type: FieldType;
  placeholder?: string;
}

export interface ArrayFieldSchema {
  key: string;
  label: string;
  itemLabel?: string;
  fields: FieldSchema[];
  subArrays?: ArrayFieldSchema[];
}

export interface StringListSchema {
  key: string;
  label: string;
  itemLabel?: string;
}

export interface ContentSchema {
  fields?: FieldSchema[];
  arrays?: ArrayFieldSchema[];
  stringLists?: StringListSchema[];
  /** Complex entries use raw JSON editor */
  useJsonEditor?: boolean;
}

export const contentSchemas: Record<string, ContentSchema> = {
  'homepage.hero': {
    fields: [
      { key: 'heroVideoUrl', label: 'Hero background video', type: 'video', placeholder: 'Upload MP4/WebM (max 50 MB)' },
      { key: 'heroPosterUrl', label: 'Hero video poster image', type: 'image', placeholder: 'Shown while video loads' },
      { key: 'heroVideoFallbackUrl', label: 'Hero video fallback URL', type: 'url', placeholder: 'Optional backup video URL' },
      { key: 'badge', label: 'Badge', type: 'text' },
      { key: 'eyebrow', label: 'Eyebrow', type: 'text' },
      { key: 'titleLine1', label: headingLabel.h1('Title line 1'), type: 'text' },
      { key: 'titleLine2', label: headingLabel.h1('Title line 2'), type: 'text' },
      { key: 'description', label: 'Description', type: 'richtext' },
      { key: 'primaryCta', label: 'Primary button text', type: 'text' },
      { key: 'primaryCtaHref', label: 'Primary button link', type: 'text' },
      { key: 'secondaryCta', label: 'Secondary button text', type: 'text' },
      { key: 'secondaryCtaHref', label: 'Secondary button link', type: 'text' },
      { key: 'cardTitle', label: 'Hero form title', type: 'text' },
    ],
    stringLists: [{ key: 'serviceOptions', label: 'Hero form service options', itemLabel: 'Service' }],
  },
  'homepage.stats': {
    arrays: [
      {
        key: 'stats',
        label: 'Statistics',
        itemLabel: 'Stat',
        fields: [
          { key: 'id', label: 'ID', type: 'text' },
          { key: 'icon', label: 'Icon name', type: 'text' },
          { key: 'value', label: 'Value', type: 'text' },
          { key: 'label', label: 'Label', type: 'text' },
          { key: 'description', label: 'Description', type: 'textarea' },
        ],
      },
    ],
  },
  'homepage.services': {
    fields: [
      { key: 'eyebrow', label: 'Eyebrow', type: 'text' },
      { key: 'title', label: headingLabel.h2('Section title'), type: 'text' },
      { key: 'description', label: 'Description', type: 'richtext' },
    ],
    arrays: [
      {
        key: 'services',
        label: 'Services',
        itemLabel: 'Service',
        fields: [
          { key: 'id', label: 'ID', type: 'text' },
          { key: 'name', label: 'Name', type: 'text' },
          { key: 'description', label: 'Description', type: 'textarea' },
          { key: 'image', label: 'Image', type: 'image' },
          { key: 'imageAlt', label: 'Image alt text', type: 'text' },
          { key: 'href', label: 'Link', type: 'text' },
          { key: 'icon', label: 'Icon name', type: 'text' },
        ],
      },
    ],
  },
  'homepage.tech_stack': {
    fields: [
      { key: 'eyebrow', label: 'Eyebrow', type: 'text' },
      { key: 'title', label: headingLabel.h2('Section title'), type: 'text' },
      { key: 'description', label: 'Description', type: 'richtext' },
    ],
    arrays: [
      {
        key: 'technologies',
        label: 'Technologies',
        itemLabel: 'Technology',
        fields: [
          { key: 'id', label: 'ID', type: 'text' },
          { key: 'name', label: 'Name', type: 'text' },
          { key: 'icon', label: 'Icon / emoji', type: 'text' },
        ],
      },
    ],
  },
  'homepage.testimonials': {
    fields: [
      { key: 'eyebrow', label: 'Eyebrow', type: 'text' },
      { key: 'title', label: headingLabel.h2('Section title'), type: 'text' },
      { key: 'description', label: 'Description', type: 'richtext' },
    ],
    arrays: [
      {
        key: 'testimonials',
        label: 'Testimonials',
        itemLabel: 'Testimonial',
        fields: [
          { key: 'id', label: 'ID', type: 'text' },
          { key: 'name', label: 'Name', type: 'text' },
          { key: 'country', label: 'Country', type: 'text' },
          { key: 'company', label: 'Company', type: 'text' },
          { key: 'rating', label: 'Rating (1–5)', type: 'number' },
          { key: 'text', label: 'Quote', type: 'textarea' },
          { key: 'service', label: 'Service', type: 'text' },
        ],
      },
    ],
  },
  'homepage.faq': {
    fields: [
      { key: 'title', label: headingLabel.h2('Section title'), type: 'text' },
      { key: 'description', label: 'Description', type: 'richtext' },
    ],
    arrays: [
      {
        key: 'faqs',
        label: 'FAQ items',
        itemLabel: 'FAQ',
        fields: [
          { key: 'question', label: 'Question', type: 'text' },
          { key: 'answer', label: 'Answer', type: 'richtext' },
        ],
      },
    ],
  },
  'homepage.cta': {
    fields: [
      { key: 'title', label: headingLabel.h2('Section title'), type: 'text' },
      { key: 'description', label: 'Description', type: 'richtext' },
      { key: 'primaryCta', label: 'Button text', type: 'text' },
      { key: 'primaryCtaHref', label: 'Button link', type: 'text' },
      { key: 'phoneLabel', label: 'Phone label', type: 'text' },
    ],
    stringLists: [{ key: 'bullets', label: 'Bullet points', itemLabel: 'Bullet' }],
  },
  'services.page': {
    fields: [{ key: 'exploreTitle', label: 'Explore section title', type: 'text' }],
    arrays: [
      {
        key: 'categories',
        label: 'Service categories',
        itemLabel: 'Category',
        fields: [
          { key: 'id', label: 'ID', type: 'text' },
          { key: 'name', label: 'Name', type: 'text' },
          { key: 'description', label: 'Description', type: 'text' },
          { key: 'href', label: 'Link', type: 'text' },
          { key: 'icon', label: 'Icon name', type: 'text' },
          { key: 'iconClass', label: 'Icon CSS class', type: 'text' },
          { key: 'bgClass', label: 'Background CSS class', type: 'text' },
        ],
      },
    ],
  },
  'services.hero': {
    fields: [
      { key: 'eyebrow', label: 'Eyebrow (caption)', type: 'text' },
      { key: 'title', label: headingLabel.h1('Page title'), type: 'text' },
      { key: 'description', label: 'Description', type: 'richtext' },
    ],
  },
  'site.not_found': {
    fields: [
      { key: 'code', label: 'Error code', type: 'text' },
      { key: 'title', label: headingLabel.h1('Page title'), type: 'text' },
      { key: 'description', label: 'Description', type: 'textarea' },
      { key: 'primaryCta', label: 'Primary button text', type: 'text' },
      { key: 'primaryCtaHref', label: 'Primary button link', type: 'text' },
      { key: 'secondaryCta', label: 'Secondary button text', type: 'text' },
    ],
  },
  'about.hero': {
    fields: [
      { key: 'eyebrow', label: 'Eyebrow (caption)', type: 'text' },
      { key: 'title', label: headingLabel.h1('Page title'), type: 'text' },
      { key: 'description', label: 'Description', type: 'richtext' },
      { key: 'description2', label: 'Description paragraph 2', type: 'richtext' },
      { key: 'image', label: 'Hero image', type: 'image' },
      { key: 'imageAlt', label: 'Image alt text', type: 'text' },
    ],
  },
  'about.page': {
    fields: [
      { key: 'missionTitle', label: 'Mission title', type: 'text' },
      { key: 'missionDescription', label: 'Mission description', type: 'textarea' },
      { key: 'timelineTitle', label: 'Timeline title', type: 'text' },
      { key: 'timelineDescription', label: 'Timeline description', type: 'textarea' },
      { key: 'valuesTitle', label: 'Values title', type: 'text' },
      { key: 'valuesDescription', label: 'Values description', type: 'textarea' },
      { key: 'regionsTitle', label: 'Regions title', type: 'text' },
      { key: 'regionsDescription', label: 'Regions description', type: 'textarea' },
      { key: 'certificationsTitle', label: 'Certifications title', type: 'text' },
      { key: 'certificationsDescription', label: 'Certifications description', type: 'textarea' },
      { key: 'glanceTitle', label: 'At a glance title', type: 'text' },
    ],
    arrays: [
      {
        key: 'missionCards',
        label: 'Mission cards',
        itemLabel: 'Card',
        fields: [
          { key: 'id', label: 'ID', type: 'text' },
          { key: 'icon', label: 'Icon name', type: 'text' },
          { key: 'iconClass', label: 'Icon CSS class', type: 'text' },
          { key: 'bgClass', label: 'Background CSS class', type: 'text' },
          { key: 'title', label: headingLabel.h2('Section title'), type: 'text' },
          { key: 'description', label: 'Description', type: 'textarea' },
        ],
      },
      {
        key: 'milestones',
        label: 'Timeline milestones',
        itemLabel: 'Milestone',
        fields: [
          { key: 'id', label: 'ID', type: 'text' },
          { key: 'year', label: 'Year', type: 'text' },
          { key: 'title', label: headingLabel.h2('Section title'), type: 'text' },
          { key: 'description', label: 'Description', type: 'textarea' },
        ],
      },
      {
        key: 'values',
        label: 'Core values',
        itemLabel: 'Value',
        fields: [
          { key: 'id', label: 'ID', type: 'text' },
          { key: 'icon', label: 'Icon name', type: 'text' },
          { key: 'title', label: headingLabel.h2('Section title'), type: 'text' },
          { key: 'description', label: 'Description', type: 'textarea' },
        ],
      },
      {
        key: 'regions',
        label: 'Client regions',
        itemLabel: 'Region',
        fields: [
          { key: 'id', label: 'ID', type: 'text' },
          { key: 'name', label: 'Name', type: 'text' },
          { key: 'flag', label: 'Flag emoji', type: 'text' },
          { key: 'projects', label: 'Projects count', type: 'text' },
        ],
      },
      {
        key: 'certifications',
        label: 'Certifications',
        itemLabel: 'Certification',
        fields: [
          { key: 'id', label: 'ID', type: 'text' },
          { key: 'title', label: headingLabel.h2('Section title'), type: 'text' },
          { key: 'description', label: 'Description', type: 'text' },
          { key: 'icon', label: 'Icon name', type: 'text' },
        ],
      },
      {
        key: 'glanceStats',
        label: 'At a glance stats',
        itemLabel: 'Stat',
        fields: [
          { key: 'id', label: 'ID', type: 'text' },
          { key: 'label', label: 'Label', type: 'text' },
          { key: 'value', label: 'Value', type: 'text' },
        ],
      },
    ],
  },
  'portfolio.hero': {
    fields: [
      { key: 'eyebrow', label: 'Eyebrow', type: 'text' },
      { key: 'title', label: headingLabel.h2('Section title'), type: 'text' },
      { key: 'description', label: 'Description', type: 'richtext' },
    ],
  },
  'portfolio.data': {
    fields: [
      { key: 'industriesEyebrow', label: 'Industries eyebrow', type: 'text' },
      { key: 'industriesTitle', label: 'Industries title', type: 'text' },
      { key: 'industriesDescription', label: 'Industries description', type: 'textarea' },
      { key: 'featuredEyebrow', label: 'Featured eyebrow', type: 'text' },
      { key: 'featuredTitle', label: 'Featured title', type: 'text' },
      { key: 'featuredDescription', label: 'Featured description', type: 'textarea' },
    ],
    arrays: [
      {
        key: 'industries',
        label: 'Industries',
        itemLabel: 'Industry',
        fields: [
          { key: 'id', label: 'ID', type: 'text' },
          { key: 'name', label: 'Name', type: 'text' },
          { key: 'icon', label: 'Icon name', type: 'text' },
        ],
      },
      {
        key: 'featuredProjects',
        label: 'Featured projects',
        itemLabel: 'Project',
        fields: [
          { key: 'id', label: 'ID', type: 'text' },
          { key: 'name', label: 'Name', type: 'text' },
          { key: 'url', label: 'Project URL', type: 'url' },
          { key: 'industry', label: 'Industry', type: 'text' },
          { key: 'category', label: 'Category', type: 'text' },
          { key: 'description', label: 'Description', type: 'textarea' },
          { key: 'tags', label: 'Tags (one per line)', type: 'lines' },
        ],
      },
      {
        key: 'industryProjectGroups',
        label: 'Industry project groups',
        itemLabel: 'Group',
        fields: [
          { key: 'id', label: 'ID', type: 'text' },
          { key: 'title', label: headingLabel.h2('Section title'), type: 'text' },
          { key: 'subtitle', label: 'Subtitle', type: 'textarea' },
        ],
        subArrays: [
          {
            key: 'projects',
            label: 'Projects',
            itemLabel: 'Project',
            fields: [
              { key: 'id', label: 'ID', type: 'text' },
              { key: 'name', label: 'Name', type: 'text' },
              { key: 'url', label: 'URL', type: 'url' },
              { key: 'description', label: 'Description', type: 'textarea' },
              { key: 'tags', label: 'Tags (one per line)', type: 'lines' },
            ],
          },
        ],
      },
    ],
  },
  'portfolio.cta': {
    fields: [
      { key: 'title', label: headingLabel.h2('Section title'), type: 'text' },
      { key: 'description', label: 'Description', type: 'richtext' },
      { key: 'ctaText', label: 'Button text', type: 'text' },
      { key: 'ctaHref', label: 'Button link', type: 'text' },
    ],
  },
  'contact.page': {
    fields: [
      { key: 'formTitle', label: 'Form title', type: 'text' },
      { key: 'formDescription', label: 'Form description', type: 'textarea' },
      { key: 'submitButton', label: 'Submit button text', type: 'text' },
      { key: 'submittingButton', label: 'Submitting button text', type: 'text' },
      { key: 'successTitle', label: 'Success title', type: 'text' },
      { key: 'successMessage', label: 'Success message', type: 'textarea' },
      { key: 'errorTitle', label: 'Error title', type: 'text' },
      { key: 'privacyNote', label: 'Privacy note', type: 'textarea' },
      { key: 'sidebarContactTitle', label: 'Sidebar contact title', type: 'text' },
      { key: 'sidebarAboutTitle', label: 'Sidebar about title', type: 'text' },
      { key: 'sidebarAboutCompany', label: 'Sidebar company line', type: 'text' },
      { key: 'sidebarAboutServices', label: 'Sidebar services line', type: 'text' },
      { key: 'sidebarAboutEstablished', label: 'Sidebar established year', type: 'text' },
      { key: 'sidebarHoursTitle', label: 'Sidebar hours title', type: 'text' },
      { key: 'hoursFootnote', label: 'Hours footnote', type: 'textarea' },
    ],
    stringLists: [{ key: 'serviceOptions', label: 'Service dropdown options', itemLabel: 'Service' }],
    arrays: [
      {
        key: 'businessHours',
        label: 'Business hours',
        itemLabel: 'Hours row',
        fields: [
          { key: 'id', label: 'ID', type: 'text' },
          { key: 'label', label: 'Day(s)', type: 'text' },
          { key: 'value', label: 'Hours', type: 'text' },
        ],
      },
    ],
  },
  'contact.hero': {
    fields: [
      { key: 'eyebrow', label: 'Eyebrow', type: 'text' },
      { key: 'title', label: headingLabel.h2('Section title'), type: 'text' },
      { key: 'description', label: 'Description', type: 'richtext' },
    ],
  },
  'blog.hero': {
    fields: [
      { key: 'eyebrow', label: 'Eyebrow', type: 'text' },
      { key: 'title', label: headingLabel.h2('Section title'), type: 'text' },
      { key: 'description', label: 'Description', type: 'richtext' },
    ],
  },
  'blog.posts': {
    arrays: [
      {
        key: 'articles',
        label: 'Blog articles',
        itemLabel: 'Article',
        fields: [
          { key: 'id', label: 'ID', type: 'text' },
          { key: 'title', label: headingLabel.h2('Section title'), type: 'text' },
          { key: 'excerpt', label: 'Excerpt', type: 'textarea' },
          { key: 'image', label: 'Image', type: 'image' },
          { key: 'imageAlt', label: 'Image alt text', type: 'text' },
          { key: 'category', label: 'Category', type: 'text' },
          { key: 'readTime', label: 'Read time', type: 'text' },
          { key: 'date', label: 'Date (YYYY-MM-DD)', type: 'text' },
        ],
      },
    ],
  },
  'testimonials.page': {
    arrays: [
      {
        key: 'testimonials',
        label: 'Testimonials',
        itemLabel: 'Testimonial',
        fields: [
          { key: 'id', label: 'ID', type: 'text' },
          { key: 'name', label: 'Name', type: 'text' },
          { key: 'country', label: 'Country', type: 'text' },
          { key: 'company', label: 'Company', type: 'text' },
          { key: 'rating', label: 'Rating (1–5)', type: 'number' },
          { key: 'date', label: 'Date (YYYY-MM-DD)', type: 'text' },
          { key: 'service', label: 'Service category', type: 'text' },
          { key: 'text', label: 'Quote', type: 'textarea' },
        ],
      },
    ],
  },
  'testimonials.hero': {
    fields: [
      { key: 'eyebrow', label: 'Eyebrow', type: 'text' },
      { key: 'title', label: headingLabel.h2('Section title'), type: 'text' },
      { key: 'description', label: 'Description', type: 'richtext' },
    ],
  },
};

export function getContentSchema(key: string): ContentSchema | undefined {
  return contentSchemas[key];
}

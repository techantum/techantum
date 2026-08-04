export const defaultContactPageContent = {
  formTitle: 'Request a Quote',
  formDescription:
    'Tell us about your project requirements and our team will respond within 24 hours with a consultation and estimate.',
  submitButton: 'Submit Enquiry',
  submittingButton: 'Submitting...',
  successTitle: 'Enquiry Submitted!',
  successMessage: 'Thank you for contacting KEIL. Our team will respond within 24 business hours.',
  errorTitle: 'Submission Failed',
  privacyNote:
    "By submitting this form, you agree to our Privacy Policy. We'll only use your information to respond to your enquiry.",
  serviceOptions: [
    'Warehouse / Godowns',
    'Industrial Sheds',
    'EC Poultry Sheds',
    'Convention Centers',
    'Multiple Services',
    'Other',
  ],
  sidebarContactTitle: 'Contact Information',
  sidebarAboutTitle: 'About KEIL',
  sidebarAboutCompany: 'KEIL — Pre-Engineered Building Solutions',
  sidebarAboutServices: 'Warehouses · Industrial Sheds · Poultry Sheds · Convention Centers',
  sidebarAboutEstablished: '1998',
  sidebarHoursTitle: 'Business Hours',
  businessHours: [
    { id: 'hours_weekday', label: 'Monday - Saturday', value: '9:00 AM - 6:00 PM IST' },
    { id: 'hours_sunday', label: 'Sunday', value: 'Closed' },
  ],
  hoursFootnote: '* We respond to all project enquiries within 24 hours on business days.',
  googleMapsEmbed: '',
  googleMapsUrl: '',
  branchLocations: [] as { id: string; name: string; address: string; phone: string }[],
};

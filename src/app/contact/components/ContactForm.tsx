'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import Icon from '@/components/ui/AppIcon';
import { trackFormConversion, trackFormInteraction } from '@/lib/analytics';

const formSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters').max(100, 'Name is too long'),
  country: z.string().min(1, 'Please select a country'),
  email: z.string().email('Please enter a valid email address'),
  tel: z.string().min(10, 'Please enter a valid phone number').max(20, 'Phone number is too long'),
  service: z.string().min(1, 'Please select a service'),
  timeline: z.string().min(1, 'Please specify your timeline or budget').max(200, 'Description is too long'),
  message: z.string().max(1000, 'Message is too long').optional(),
});

type FormData = z.infer<typeof formSchema>;

interface ContactFormProps {
  page: Record<string, unknown>;
  initialService?: string;
}

export default function ContactForm({ page, initialService }: ContactFormProps) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitStatus, setSubmitStatus] = useState<'idle' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState('');
  const [csrfToken, setCSRFToken] = useState('');
  const [honeypot, setHoneypot] = useState('');

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      service: initialService ?? '',
    },
  });

  useEffect(() => {
    async function fetchCSRFToken() {
      try {
        const response = await fetch('/api/csrf');
        const data = await response.json();
        setCSRFToken(data.token);
      } catch (error) {
        console.error('Failed to fetch CSRF token:', error);
      }
    }
    fetchCSRFToken();
  }, []);

  const countries = [
    'Afghanistan', 'Albania', 'Algeria', 'Argentina', 'Australia', 'Austria', 'Bangladesh', 'Belgium',
    'Brazil', 'Canada', 'Chile', 'China', 'Colombia', 'Denmark', 'Egypt', 'Finland', 'France',
    'Germany', 'Greece', 'India', 'Indonesia', 'Iran', 'Iraq', 'Ireland', 'Italy', 'Japan',
    'Kenya', 'Malaysia', 'Mexico', 'Morocco', 'Netherlands', 'New Zealand', 'Nigeria', 'Norway',
    'Pakistan', 'Peru', 'Philippines', 'Poland', 'Portugal', 'Romania', 'Russia', 'Saudi Arabia',
    'Singapore', 'South Africa', 'South Korea', 'Spain', 'Sweden', 'Switzerland', 'Thailand',
    'Turkey', 'Ukraine', 'United Arab Emirates', 'United Kingdom', 'United States', 'Vietnam',
  ];

  const services = (page.serviceOptions as string[]) ?? [];

  const onSubmit = async (data: FormData) => {
    setIsSubmitting(true);
    setErrorMessage('');

    try {
      const response = await fetch('/api/contact', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: data.name,
          country: data.country,
          email: data.email,
          phone: data.tel,
          productCategory: data.service,
          quantity: data.timeline,
          message: data.message || '',
          source: 'contact_page',
          csrfToken,
          honeypot,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        if (response.status === 429) {
          throw new Error(`Too many requests. Please try again in ${result.retryAfter} seconds.`);
        }
        throw new Error(result.error || 'Failed to submit form');
      }

      trackFormConversion({
        formId: 'contact_form',
        productCategory: data.service,
        country: data.country,
        value: 100,
      });

      reset();
      setHoneypot('');
      router.push('/thank-you');
    } catch (error: unknown) {
      console.error('Form submission error:', error);
      setSubmitStatus('error');
      setErrorMessage(error instanceof Error ? error.message : 'Failed to submit form. Please try again.');
      trackFormInteraction('error', 'form_submission');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="bg-card rounded-2xl p-5 shadow-sm border border-border">
      <h2 className="font-bricolage text-3xl font-bold text-foreground mb-2">
        {String(page.formTitle)}
      </h2>
      <p className="font-inter text-base text-muted-foreground mb-6">
        {String(page.formDescription)}
      </p>

      {submitStatus === 'error' && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-start gap-3">
          <Icon name="ExclamationCircleIcon" size={24} className="text-red-600 shrink-0" variant="solid" />
          <div>
            <p className="font-inter font-semibold text-sm text-red-600 mb-1">
              {String(page.errorTitle)}
            </p>
            <p className="font-inter text-sm text-red-600/80">
              {errorMessage}
            </p>
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div className="hidden" aria-hidden="true">
          <label htmlFor="website">Website</label>
          <input
            type="text"
            id="website"
            name="website"
            tabIndex={-1}
            autoComplete="off"
            value={honeypot}
            onChange={(e) => setHoneypot(e.target.value)}
          />
        </div>

        <div>
          <label htmlFor="name" className="block font-inter text-sm font-medium text-foreground mb-2">
            Full Name *
          </label>
          <input
            type="text"
            id="name"
            {...register('name')}
            className="w-full px-4 py-3 rounded-lg border border-border bg-input text-foreground font-inter text-base focus:ring-2 focus:ring-ring focus:border-transparent transition-all"
            placeholder="Enter your full name"
          />
          {errors.name && (
            <p className="mt-1 text-sm text-red-600">{errors.name.message}</p>
          )}
        </div>

        <div>
          <label htmlFor="country" className="block font-inter text-sm font-medium text-foreground mb-2">
            Country *
          </label>
          <select
            id="country"
            {...register('country')}
            className="w-full px-4 py-3 rounded-lg border border-border bg-input text-foreground font-inter text-base focus:ring-2 focus:ring-ring focus:border-transparent transition-all"
          >
            <option value="">Select your country</option>
            {countries.map((country) => (
              <option key={country} value={country}>
                {country}
              </option>
            ))}
          </select>
          {errors.country && (
            <p className="mt-1 text-sm text-red-600">{errors.country.message}</p>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label htmlFor="email" className="block font-inter text-sm font-medium text-foreground mb-2">
              Email Address *
            </label>
            <input
              type="email"
              id="email"
              {...register('email')}
              className="w-full px-4 py-3 rounded-lg border border-border bg-input text-foreground font-inter text-base focus:ring-2 focus:ring-ring focus:border-transparent transition-all"
              placeholder="Enter your email address"
            />
            {errors.email && (
              <p className="mt-1 text-sm text-red-600">{errors.email.message}</p>
            )}
          </div>
          <div>
            <label htmlFor="tel" className="block font-inter text-sm font-medium text-foreground mb-2">
              Phone Number *
            </label>
            <input
              type="tel"
              id="tel"
              {...register('tel')}
              className="w-full px-4 py-3 rounded-lg border border-border bg-input text-foreground font-inter text-base focus:ring-2 focus:ring-ring focus:border-transparent transition-all"
              placeholder="Enter your phone number"
            />
            {errors.tel && (
              <p className="mt-1 text-sm text-red-600">{errors.tel.message}</p>
            )}
          </div>
        </div>

        <div>
          <label htmlFor="service" className="block font-inter text-sm font-medium text-foreground mb-2">
            Service Needed *
          </label>
          <select
            id="service"
            {...register('service')}
            className="w-full px-4 py-3 rounded-lg border border-border bg-input text-foreground font-inter text-base focus:ring-2 focus:ring-ring focus:border-transparent transition-all"
          >
            <option value="">Select a service</option>
            {services.map((service) => (
              <option key={service} value={service}>
                {service}
              </option>
            ))}
          </select>
          {errors.service && (
            <p className="mt-1 text-sm text-red-600">{errors.service.message}</p>
          )}
        </div>

        <div>
          <label htmlFor="timeline" className="block font-inter text-sm font-medium text-foreground mb-2">
            Timeline / Budget *
          </label>
          <input
            type="text"
            id="timeline"
            {...register('timeline')}
            className="w-full px-4 py-3 rounded-lg border border-border bg-input text-foreground font-inter text-base focus:ring-2 focus:ring-ring focus:border-transparent transition-all"
            placeholder="Enter your timeline or budget"
          />
          {errors.timeline && (
            <p className="mt-1 text-sm text-red-600">{errors.timeline.message}</p>
          )}
        </div>

        <div>
          <label htmlFor="message" className="block font-inter text-sm font-medium text-foreground mb-2">
            Project Details
          </label>
          <textarea
            id="message"
            {...register('message')}
            rows={5}
            className="w-full px-4 py-3 rounded-lg border border-border bg-input text-foreground font-inter text-base focus:ring-2 focus:ring-ring focus:border-transparent transition-all resize-none"
            placeholder="Enter your project details"
          />
          {errors.message && (
            <p className="mt-1 text-sm text-red-600">{errors.message.message}</p>
          )}
        </div>

        <button
          type="submit"
          disabled={isSubmitting || !csrfToken}
          className="w-full bg-primary text-primary-foreground px-8 py-4 rounded-lg font-inter font-semibold text-base hover:bg-primary/90 transition-all hover-lift disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          {isSubmitting ? (
            <>
              <Icon name="ArrowPathIcon" size={20} className="animate-spin" />
              {String(page.submittingButton)}
            </>
          ) : (
            <>
              {String(page.submitButton)}
              <Icon name="PaperAirplaneIcon" size={20} />
            </>
          )}
        </button>

        <p className="font-inter text-xs text-muted-foreground text-center">
          {String(page.privacyNote)}
        </p>
      </form>
    </div>
  );
}

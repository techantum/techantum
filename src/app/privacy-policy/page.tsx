import SiteHeader from '@/components/common/SiteHeader';
import SiteFooter from '@/components/common/SiteFooter';
import Link from 'next/link';
import Icon from '@/components/ui/AppIcon';

/** Public marketing page — SSG at build time, ISR every 5 minutes. */
export const dynamic = 'force-static';
export const revalidate = 300;

export default function PrivacyPolicyPage() {
  return (
    <>
      <SiteHeader />
      <main className="min-h-screen bg-background">
        {/* Hero Section */}
        <section className="pt-32 pb-16 bg-gradient-to-br from-primary/5 via-background to-secondary/5 page-hero reveal">
          <div className="max-w-4xl mx-auto px-6">
            <div className="reveal">
              <div className="flex items-center gap-2 text-primary mb-4">
                <Icon name="ShieldCheckIcon" size={24} />
                <span className="font-inter text-sm font-medium uppercase tracking-wider">Your Privacy Matters</span>
              </div>
              <h1 className="font-bricolage font-bold text-4xl md:text-5xl text-foreground mb-6">
                Privacy Policy
              </h1>
              <p className="font-inter text-lg text-muted-foreground mb-5">
                At TechAntum, we're committed to protecting your personal information while delivering exceptional digital services. This policy explains how we handle your data with care and transparency.
              </p>
              <p className="font-inter text-sm text-muted-foreground">
                <strong>Last Updated:</strong> February 14, 2026
              </p>
            </div>
          </div>
        </section>

        {/* Content Section */}
        <section className="page-section">
          <div className="max-w-4xl mx-auto px-6 space-y-12">
            {/* Introduction */}
            <div className="reveal">
              <div className="bg-card border border-border rounded-2xl p-8">
                <h2 className="font-bricolage font-bold text-2xl text-foreground mb-4">
                  Welcome to Our Privacy Commitment
                </h2>
                <p className="font-inter text-muted-foreground mb-4">
                  When you work with TechAntum on websites, web applications, or mobile apps, trust is everything. That's why we've built our privacy practices around transparency, security, and respect for your information.
                </p>
                <p className="font-inter text-muted-foreground">
                  Whether you're requesting a project quote or exploring our services, you can rest assured that your data is handled with the highest level of care and in full compliance with GDPR and Dutch privacy regulations.
                </p>
              </div>
            </div>

            {/* Information We Collect */}
            <div className="reveal">
              <h2 className="font-bricolage font-bold text-2xl text-foreground mb-6">
                What Information Do We Collect?
              </h2>
              <div className="space-y-4">
                <div className="bg-card border border-border rounded-xl p-4">
                  <h3 className="font-bricolage font-semibold text-xl text-foreground mb-3 flex items-center gap-2">
                    <Icon name="UserIcon" size={20} className="text-primary" />
                    Personal Information You Share With Us
                  </h3>
                  <p className="font-inter text-muted-foreground mb-3">
                    When you reach out to request a quote or place an order, we collect information that helps us serve you better:
                  </p>
                  <ul className="space-y-2 font-inter text-muted-foreground">
                    <li className="flex items-start gap-2">
                      <span className="text-primary mt-1">•</span>
                      <span><strong>Contact Details:</strong> Your name, email address, phone number, and company name</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-primary mt-1">•</span>
                      <span><strong>Business Information:</strong> Company address, VAT number, and industry details</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-primary mt-1">•</span>
                      <span><strong>Order Preferences:</strong> Product specifications, quantity requirements, and delivery preferences</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-primary mt-1">•</span>
                      <span><strong>Communication Records:</strong> Your inquiries, feedback, and correspondence with our team</span>
                    </li>
                  </ul>
                </div>

                <div className="bg-card border border-border rounded-xl p-4">
                  <h3 className="font-bricolage font-semibold text-xl text-foreground mb-3 flex items-center gap-2">
                    <Icon name="ComputerDesktopIcon" size={20} className="text-primary" />
                    Information We Collect Automatically
                  </h3>
                  <p className="font-inter text-muted-foreground mb-3">
                    To improve your browsing experience and optimize our services, we automatically gather:
                  </p>
                  <ul className="space-y-2 font-inter text-muted-foreground">
                    <li className="flex items-start gap-2">
                      <span className="text-primary mt-1">•</span>
                      <span><strong>Technical Data:</strong> IP address, browser type, device information, and operating system</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-primary mt-1">•</span>
                      <span><strong>Usage Information:</strong> Pages visited, time spent on our site, and navigation patterns</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-primary mt-1">•</span>
                      <span><strong>Cookies:</strong> Small files that help us remember your preferences and improve functionality</span>
                    </li>
                  </ul>
                </div>
              </div>
            </div>

            {/* How We Use Information */}
            <div className="reveal">
              <h2 className="font-bricolage font-bold text-2xl text-foreground mb-6">
                How We Use Your Information
              </h2>
              <p className="font-inter text-muted-foreground mb-6">
                Every piece of information you share helps us deliver better service and products tailored to your business needs:
              </p>
              <div className="grid md:grid-cols-2 gap-4">
                <div className="bg-gradient-to-br from-primary/5 to-transparent border border-border rounded-xl p-4">
                  <Icon name="ClipboardDocumentCheckIcon" size={24} className="text-primary mb-3" />
                  <h3 className="font-bricolage font-semibold text-lg text-foreground mb-2">
                    Processing Your Orders
                  </h3>
                  <p className="font-inter text-sm text-muted-foreground">
                    We use your contact and business information to process quotes, confirm orders, arrange deliveries, and ensure you receive exactly what you need, when you need it.
                  </p>
                </div>

                <div className="bg-gradient-to-br from-secondary/5 to-transparent border border-border rounded-xl p-4">
                  <Icon name="ChatBubbleLeftRightIcon" size={24} className="text-primary mb-3" />
                  <h3 className="font-bricolage font-semibold text-lg text-foreground mb-2">
                    Customer Communication
                  </h3>
                  <p className="font-inter text-sm text-muted-foreground">
                    We reach out to answer your questions, provide product updates, share industry insights, and keep you informed about new offerings that could benefit your business.
                  </p>
                </div>

                <div className="bg-gradient-to-br from-primary/5 to-transparent border border-border rounded-xl p-4">
                  <Icon name="ChartBarIcon" size={24} className="text-primary mb-3" />
                  <h3 className="font-bricolage font-semibold text-lg text-foreground mb-2">
                    Service Improvement
                  </h3>
                  <p className="font-inter text-sm text-muted-foreground">
                    Your usage data helps us understand what works well and what needs enhancement, allowing us to continuously refine our website and product offerings.
                  </p>
                </div>

                <div className="bg-gradient-to-br from-secondary/5 to-transparent border border-border rounded-xl p-4">
                  <Icon name="ShieldCheckIcon" size={24} className="text-primary mb-3" />
                  <h3 className="font-bricolage font-semibold text-lg text-foreground mb-2">
                    Legal Compliance
                  </h3>
                  <p className="font-inter text-sm text-muted-foreground">
                    We maintain records as required by Dutch and EU regulations, ensuring our business operations meet all legal standards and protect both parties.
                  </p>
                </div>
              </div>
            </div>

            {/* Data Sharing */}
            <div className="reveal">
              <h2 className="font-bricolage font-bold text-2xl text-foreground mb-6">
                Who We Share Your Information With
              </h2>
              <div className="bg-card border border-border rounded-xl p-4">
                <p className="font-inter text-muted-foreground mb-4">
                  We respect your privacy and only share your information when absolutely necessary:
                </p>
                <ul className="space-y-3 font-inter text-muted-foreground">
                  <li className="flex items-start gap-3">
                    <Icon name="TruckIcon" size={20} className="text-primary mt-0.5 shrink-0" />
                    <div>
                      <strong className="text-foreground">Logistics Partners:</strong> Trusted shipping and delivery companies who help us get your products to you safely and on time.
                    </div>
                  </li>
                  <li className="flex items-start gap-3">
                    <Icon name="CreditCardIcon" size={20} className="text-primary mt-0.5 shrink-0" />
                    <div>
                      <strong className="text-foreground">Payment Processors:</strong> Secure financial institutions that handle transactions while protecting your payment information.
                    </div>
                  </li>
                  <li className="flex items-start gap-3">
                    <Icon name="EnvelopeIcon" size={20} className="text-primary mt-0.5 shrink-0" />
                    <div>
                      <strong className="text-foreground">Communication Services:</strong> Email and messaging platforms that enable us to stay in touch with you efficiently.
                    </div>
                  </li>
                  <li className="flex items-start gap-3">
                    <Icon name="ScaleIcon" size={20} className="text-primary mt-0.5 shrink-0" />
                    <div>
                      <strong className="text-foreground">Legal Authorities:</strong> When required by law, we may share information with government agencies or regulatory bodies.
                    </div>
                  </li>
                </ul>
                <p className="font-inter text-muted-foreground mt-4 text-sm italic">
                  We never sell your personal information to third parties. Your trust is more valuable to us than any transaction.
                </p>
              </div>
            </div>

            {/* Data Security */}
            <div className="reveal">
              <h2 className="font-bricolage font-bold text-2xl text-foreground mb-6">
                How We Protect Your Data
              </h2>
              <div className="bg-gradient-to-br from-primary/10 via-secondary/5 to-background border border-border rounded-xl p-8">
                <p className="font-inter text-muted-foreground mb-6">
                  Security isn't just a feature—it's a fundamental part of how we operate. We've implemented multiple layers of protection:
                </p>
                <div className="grid md:grid-cols-3 gap-4">
                  <div className="text-center">
                    <div className="bg-primary/10 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-3">
                      <Icon name="LockClosedIcon" size={28} className="text-primary" />
                    </div>
                    <h4 className="font-bricolage font-semibold text-foreground mb-2">Encryption</h4>
                    <p className="font-inter text-sm text-muted-foreground">SSL/TLS encryption protects data in transit</p>
                  </div>
                  <div className="text-center">
                    <div className="bg-primary/10 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-3">
                      <Icon name="ServerIcon" size={28} className="text-primary" />
                    </div>
                    <h4 className="font-bricolage font-semibold text-foreground mb-2">Secure Storage</h4>
                    <p className="font-inter text-sm text-muted-foreground">Protected servers with access controls</p>
                  </div>
                  <div className="text-center">
                    <div className="bg-primary/10 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-3">
                      <Icon name="UserGroupIcon" size={28} className="text-primary" />
                    </div>
                    <h4 className="font-bricolage font-semibold text-foreground mb-2">Limited Access</h4>
                    <p className="font-inter text-sm text-muted-foreground">Only authorized personnel can view your data</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Your Rights */}
            <div className="reveal">
              <h2 className="font-bricolage font-bold text-2xl text-foreground mb-6">
                Your Privacy Rights
              </h2>
              <div className="bg-card border border-border rounded-xl p-4">
                <p className="font-inter text-muted-foreground mb-4">
                  Under GDPR and Dutch privacy law, you have complete control over your personal information:
                </p>
                <div className="space-y-3">
                  <div className="flex items-start gap-3">
                    <Icon name="EyeIcon" size={20} className="text-primary mt-0.5 shrink-0" />
                    <div>
                      <strong className="font-inter text-foreground">Right to Access:</strong>
                      <span className="font-inter text-muted-foreground"> Request a copy of all personal data we hold about you</span>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <Icon name="PencilIcon" size={20} className="text-primary mt-0.5 shrink-0" />
                    <div>
                      <strong className="font-inter text-foreground">Right to Correction:</strong>
                      <span className="font-inter text-muted-foreground"> Update or correct any inaccurate information</span>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <Icon name="TrashIcon" size={20} className="text-primary mt-0.5 shrink-0" />
                    <div>
                      <strong className="font-inter text-foreground">Right to Deletion:</strong>
                      <span className="font-inter text-muted-foreground"> Request removal of your data (subject to legal requirements)</span>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <Icon name="ArrowDownTrayIcon" size={20} className="text-primary mt-0.5 shrink-0" />
                    <div>
                      <strong className="font-inter text-foreground">Right to Portability:</strong>
                      <span className="font-inter text-muted-foreground"> Receive your data in a structured, commonly used format</span>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <Icon name="NoSymbolIcon" size={20} className="text-primary mt-0.5 shrink-0" />
                    <div>
                      <strong className="font-inter text-foreground">Right to Object:</strong>
                      <span className="font-inter text-muted-foreground"> Opt out of marketing communications at any time</span>
                    </div>
                  </div>
                </div>
                <div className="mt-6 p-4 bg-primary/5 rounded-lg">
                  <p className="font-inter text-sm text-foreground">
                    To exercise any of these rights, simply contact us at{' '}
                    <a href="mailto:privacy@hollandsefacilitygroup.com" className="text-primary hover:underline font-medium">
                      privacy@hollandsefacilitygroup.com
                    </a>
                    {' '}or call{' '}
                    <a href="tel:+914040268570" className="text-primary hover:underline font-medium">
                      +91 40 40268570
                    </a>
                    . We'll respond within 30 days.
                  </p>
                </div>
              </div>
            </div>

            {/* Cookies */}
            <div className="reveal">
              <h2 className="font-bricolage font-bold text-2xl text-foreground mb-6">
                Our Use of Cookies
              </h2>
              <div className="bg-card border border-border rounded-xl p-4">
                <p className="font-inter text-muted-foreground mb-4">
                  Cookies are small text files that help us provide you with a better browsing experience. We use:
                </p>
                <ul className="space-y-3 font-inter text-muted-foreground">
                  <li className="flex items-start gap-2">
                    <span className="text-primary mt-1">•</span>
                    <span><strong>Essential Cookies:</strong> Required for the website to function properly (cannot be disabled)</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-primary mt-1">•</span>
                    <span><strong>Performance Cookies:</strong> Help us understand how visitors interact with our site</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-primary mt-1">•</span>
                    <span><strong>Functional Cookies:</strong> Remember your preferences and settings</span>
                  </li>
                </ul>
                <p className="font-inter text-sm text-muted-foreground mt-4">
                  You can control cookies through your browser settings, though disabling certain cookies may affect website functionality.
                </p>
              </div>
            </div>

            {/* Data Retention */}
            <div className="reveal">
              <h2 className="font-bricolage font-bold text-2xl text-foreground mb-6">
                How Long We Keep Your Data
              </h2>
              <div className="bg-card border border-border rounded-xl p-4">
                <p className="font-inter text-muted-foreground mb-4">
                  We only retain your information for as long as necessary:
                </p>
                <ul className="space-y-2 font-inter text-muted-foreground">
                  <li className="flex items-start gap-2">
                    <span className="text-primary mt-1">•</span>
                    <span><strong>Active Customers:</strong> Throughout our business relationship and for 7 years after the last transaction (as required by Dutch tax law)</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-primary mt-1">•</span>
                    <span><strong>Inquiries:</strong> Quote requests and general inquiries are kept for 2 years</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-primary mt-1">•</span>
                    <span><strong>Marketing Data:</strong> Until you unsubscribe or request deletion</span>
                  </li>
                </ul>
              </div>
            </div>

            {/* International Transfers */}
            <div className="reveal">
              <h2 className="font-bricolage font-bold text-2xl text-foreground mb-6">
                International Data Transfers
              </h2>
              <div className="bg-card border border-border rounded-xl p-4">
                <p className="font-inter text-muted-foreground">
                  While we primarily operate within the European Union, some of our service providers may be located outside the EU. When we transfer data internationally, we ensure appropriate safeguards are in place, including standard contractual clauses approved by the European Commission and adequacy decisions recognizing equivalent data protection standards.
                </p>
              </div>
            </div>

            {/* Updates to Policy */}
            <div className="reveal">
              <h2 className="font-bricolage font-bold text-2xl text-foreground mb-6">
                Changes to This Privacy Policy
              </h2>
              <div className="bg-card border border-border rounded-xl p-4">
                <p className="font-inter text-muted-foreground mb-4">
                  As our business grows and regulations evolve, we may update this privacy policy from time to time. When we make significant changes, we'll notify you by:
                </p>
                <ul className="space-y-2 font-inter text-muted-foreground mb-4">
                  <li className="flex items-start gap-2">
                    <span className="text-primary mt-1">•</span>
                    <span>Posting a prominent notice on our website</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-primary mt-1">•</span>
                    <span>Sending an email to registered customers</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-primary mt-1">•</span>
                    <span>Updating the "Last Updated" date at the top of this page</span>
                  </li>
                </ul>
                <p className="font-inter text-muted-foreground">
                  We encourage you to review this policy periodically to stay informed about how we're protecting your information.
                </p>
              </div>
            </div>

            {/* Contact Section */}
            <div className="reveal">
              <div className="bg-gradient-to-br from-primary/10 via-secondary/5 to-background border-2 border-primary/20 rounded-2xl p-8">
                <h2 className="font-bricolage font-bold text-2xl text-foreground mb-4">
                  Questions About Your Privacy?
                </h2>
                <p className="font-inter text-muted-foreground mb-6">
                  We're here to help! If you have any questions about this privacy policy, want to exercise your rights, or simply want to learn more about how we protect your data, don't hesitate to reach out.
                </p>
                <div className="space-y-3 mb-6">
                  <div className="flex items-center gap-3">
                    <Icon name="EnvelopeIcon" size={20} className="text-primary" />
                    <a href="mailto:privacy@hollandsefacilitygroup.com" className="font-inter text-foreground hover:text-primary transition-colors">
                      privacy@hollandsefacilitygroup.com
                    </a>
                  </div>
                  <div className="flex items-center gap-3">
                    <Icon name="PhoneIcon" size={20} className="text-primary" />
                    <a href="tel:+914040268570" className="font-inter text-foreground hover:text-primary transition-colors">
                      +91 40 40268570
                    </a>
                    <a
                      href="https://wa.me/917032923474"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-primary hover:text-primary/80 transition-colors ml-1"
                      title="Contact us on WhatsApp"
                    >
                      <Icon name="ChatBubbleLeftRightIcon" size={20} />
                    </a>
                  </div>
                  <div className="flex items-start gap-3">
                    <Icon name="MapPinIcon" size={20} className="text-primary mt-0.5" />
                    <span className="font-inter text-foreground">
                      Plot no 118, 3rd Floor, Brundavanam, Road no 3 Kakatiya Hills, Guttala_Begumpet Madhapur, Jubilee Hills, Hyderabad, Telangana - 500033
                    </span>
                  </div>
                </div>
                <Link
                  href="/contact"
                  className="inline-flex items-center gap-2 bg-primary text-primary-foreground px-6 py-3 rounded-full font-inter font-medium hover:bg-primary/90 transition-colors"
                >
                  Get in Touch
                  <Icon name="ArrowRightIcon" size={16} />
                </Link>
              </div>
            </div>

            {/* CTA Section */}
            <div className="reveal">
              <div className="bg-card border border-border rounded-2xl p-5 text-center">
                <h2 className="font-bricolage font-bold text-2xl text-foreground mb-4">
                  Ready to Build Something Great?
                </h2>
                <p className="font-inter text-muted-foreground mb-6 max-w-2xl mx-auto">
                  Now that you know how seriously we take your privacy, discover why businesses trust TechAntum for websites, web applications, and mobile app development.
                </p>
                <div className="flex flex-wrap justify-center gap-4">
                  <Link
                    href="/services"
                    className="bg-primary text-primary-foreground px-8 py-3 rounded-full font-inter font-medium hover:bg-primary/90 transition-colors"
                  >
                    Explore Our Services
                  </Link>
                  <Link
                    href="/contact"
                    className="bg-card border-2 border-primary text-primary px-8 py-3 rounded-full font-inter font-medium hover:bg-primary/5 transition-colors"
                  >
                    Request a Quote
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>
      <SiteFooter />
    </>
  );
}
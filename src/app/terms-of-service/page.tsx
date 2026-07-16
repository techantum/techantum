import SiteHeader from '@/components/common/SiteHeader';
import SiteFooter from '@/components/common/SiteFooter';
import Link from 'next/link';
import Icon from '@/components/ui/AppIcon';

/** Public marketing page — SSG at build time, ISR every 5 minutes. */
export const dynamic = 'force-static';
export const revalidate = 300;

export default function TermsOfServicePage() {
  return (
    <>
      <SiteHeader />
      <main className="min-h-screen bg-background">
        {/* Hero Section */}
        <section className="pt-32 pb-16 bg-gradient-to-br from-secondary/5 via-background to-primary/5 page-hero reveal">
          <div className="max-w-4xl mx-auto px-6">
            <div className="reveal">
              <div className="flex items-center gap-2 text-primary mb-4">
                <Icon name="DocumentTextIcon" size={24} />
                <span className="font-inter text-sm font-medium uppercase tracking-wider">Clear & Fair Terms</span>
              </div>
              <h1 className="font-bricolage font-bold text-4xl md:text-5xl text-foreground mb-6">
                Terms & Conditions
              </h1>
              <p className="font-inter text-lg text-muted-foreground mb-5">
                Welcome to TechAntum! These terms outline our commitment to providing you with exceptional software development services. We believe in transparency, fairness, and building long-term partnerships with our clients.
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
                  Welcome to Our Partnership
                </h2>
                <p className="font-inter text-muted-foreground mb-4">
                  By accessing our website and engaging TechAntum for development services, you're entering into a business relationship built on mutual trust and respect.
                </p>
                <p className="font-inter text-muted-foreground">
                  We've worked hard to make these terms as clear and straightforward as possible. If you have any questions or need clarification on any point, our team is always ready to help. Your success is our success, and we're committed to making your experience with us smooth and rewarding.
                </p>
              </div>
            </div>

            {/* Company Information */}
            <div className="reveal">
              <h2 className="font-bricolage font-bold text-2xl text-foreground mb-6">
                About TechAntum
              </h2>
              <div className="bg-card border border-border rounded-xl p-4">
                <p className="font-inter text-muted-foreground mb-4">
                  These terms apply to all services provided by:
                </p>
                <div className="space-y-2 font-inter text-muted-foreground">
                  <p><strong className="text-foreground">Company Name:</strong> TechAntum</p>
                  <p><strong className="text-foreground">Registered Address:</strong> Plot no 118, 3rd Floor, Brundavanam, Road no 3 Kakatiya Hills, Guttala_Begumpet Madhapur, Jubilee Hills, Hyderabad, Telangana - 500033</p>
                  <p><strong className="text-foreground">Chamber of Commerce:</strong> 72627034</p>
                  <p><strong className="text-foreground">VAT Number:</strong> NL04905974</p>
                  <p><strong className="text-foreground">Email:</strong> <a href="mailto:info@techantum.com" className="text-primary hover:underline">info@techantum.com</a></p>
                  <p><strong className="text-foreground">Phone:</strong> <a href="tel:+914040268570" className="text-primary hover:underline">+91 40 40268570</a></p>
                </div>
              </div>
            </div>

            {/* Acceptance of Terms */}
            <div className="reveal">
              <h2 className="font-bricolage font-bold text-2xl text-foreground mb-6">
                Acceptance of Terms
              </h2>
              <div className="bg-card border border-border rounded-xl p-4">
                <p className="font-inter text-muted-foreground mb-4">
                  By using our website, requesting quotes, or placing orders, you acknowledge that you have read, understood, and agree to be bound by these terms and conditions. If you're acting on behalf of a company or organization, you confirm that you have the authority to bind that entity to these terms.
                </p>
                <p className="font-inter text-muted-foreground">
                  We reserve the right to update these terms periodically to reflect changes in our business practices or legal requirements. When we make significant changes, we'll notify you through email or a prominent notice on our website. Continued use of our services after such changes constitutes acceptance of the updated terms.
                </p>
              </div>
            </div>

            {/* Services */}
            <div className="reveal">
              <h2 className="font-bricolage font-bold text-2xl text-foreground mb-6">
                Our Services
              </h2>
              <div className="space-y-4">
                <div className="bg-gradient-to-br from-primary/5 to-transparent border border-border rounded-xl p-4">
                  <h3 className="font-bricolage font-semibold text-xl text-foreground mb-3">
                    What We Offer
                  </h3>
                  <p className="font-inter text-muted-foreground mb-4">
                    TechAntum specializes in custom software development across three core service areas:
                  </p>
                  <div className="grid md:grid-cols-1 gap-3">
                    <div className="flex items-start gap-2">
                      <Icon name="CheckCircleIcon" size={20} className="text-primary mt-0.5 shrink-0" />
                      <span className="font-inter text-muted-foreground"><strong className="text-foreground">Websites:</strong> Corporate sites, landing pages, e-commerce stores, and CMS-powered websites</span>
                    </div>
                    <div className="flex items-start gap-2">
                      <Icon name="CheckCircleIcon" size={20} className="text-primary mt-0.5 shrink-0" />
                      <span className="font-inter text-muted-foreground"><strong className="text-foreground">Web Applications:</strong> Custom web apps, SaaS platforms, admin dashboards, and API development</span>
                    </div>
                    <div className="flex items-start gap-2">
                      <Icon name="CheckCircleIcon" size={20} className="text-primary mt-0.5 shrink-0" />
                      <span className="font-inter text-muted-foreground"><strong className="text-foreground">Mobile Applications:</strong> Native iOS/Android and cross-platform apps with full lifecycle support</span>
                    </div>
                  </div>
                </div>

                <div className="bg-card border border-border rounded-xl p-4">
                  <h3 className="font-bricolage font-semibold text-xl text-foreground mb-3">
                    Service Quality & Deliverables
                  </h3>
                  <p className="font-inter text-muted-foreground mb-3">
                    All services are described as accurately as possible on our website. We reserve the right to:
                  </p>
                  <ul className="space-y-2 font-inter text-muted-foreground">
                    <li className="flex items-start gap-2">
                      <span className="text-primary mt-1">•</span>
                      <span>Adjust project scope and timelines by mutual agreement as requirements evolve</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-primary mt-1">•</span>
                      <span>Update service descriptions and technology recommendations to reflect industry best practices</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-primary mt-1">•</span>
                      <span>Modify deliverables with reasonable notice when agreed upon by both parties</span>
                    </li>
                  </ul>
                  <p className="font-inter text-sm text-muted-foreground mt-4 italic">
                    We stand behind the quality of every project we deliver. All work follows industry standards and best practices.
                  </p>
                </div>
              </div>
            </div>

            {/* Project Process */}
            <div className="reveal">
              <h2 className="font-bricolage font-bold text-2xl text-foreground mb-6">
                How Projects Work
              </h2>
              <div className="space-y-4">
                <div className="bg-card border border-border rounded-xl p-4">
                  <h3 className="font-bricolage font-semibold text-lg text-foreground mb-3 flex items-center gap-2">
                    <span className="bg-primary text-primary-foreground w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold">1</span>
                    Quote Request
                  </h3>
                  <p className="font-inter text-muted-foreground">
                    Start by requesting a quote through our website or by contacting our sales team directly. Provide details about the products you need, quantities, delivery location, and any special requirements. We'll respond within 24 business hours with a comprehensive quote tailored to your needs.
                  </p>
                </div>

                <div className="bg-card border border-border rounded-xl p-4">
                  <h3 className="font-bricolage font-semibold text-lg text-foreground mb-3 flex items-center gap-2">
                    <span className="bg-primary text-primary-foreground w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold">2</span>
                    Quote Acceptance
                  </h3>
                  <p className="font-inter text-muted-foreground">
                    Once you accept our quote, we'll send you a formal order confirmation detailing products, quantities, prices, delivery terms, and payment conditions. This confirmation constitutes a binding contract between both parties. Please review it carefully and notify us immediately of any discrepancies.
                  </p>
                </div>

                <div className="bg-card border border-border rounded-xl p-4">
                  <h3 className="font-bricolage font-semibold text-lg text-foreground mb-3 flex items-center gap-2">
                    <span className="bg-primary text-primary-foreground w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold">3</span>
                    Order Processing
                  </h3>
                  <p className="font-inter text-muted-foreground">
                    After receiving your payment (or payment confirmation for credit accounts), we'll begin processing your order. You'll receive regular updates on order status, including preparation, quality checks, and shipping arrangements.
                  </p>
                </div>

                <div className="bg-card border border-border rounded-xl p-4">
                  <h3 className="font-bricolage font-semibold text-lg text-foreground mb-3 flex items-center gap-2">
                    <span className="bg-primary text-primary-foreground w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold">4</span>
                    Delivery & Receipt
                  </h3>
                  <p className="font-inter text-muted-foreground">
                    We'll coordinate delivery according to the agreed terms (FOB, CIF, DDP, etc.). Upon delivery, please inspect the shipment promptly and report any issues within 48 hours. Your signature on delivery documents confirms receipt in good condition unless noted otherwise.
                  </p>
                </div>
              </div>
            </div>

            {/* Pricing and Payment */}
            <div className="reveal">
              <h2 className="font-bricolage font-bold text-2xl text-foreground mb-6">
                Pricing & Payment Terms
              </h2>
              <div className="bg-card border border-border rounded-xl p-4">
                <h3 className="font-bricolage font-semibold text-xl text-foreground mb-4">
                  Transparent Pricing
                </h3>
                <p className="font-inter text-muted-foreground mb-4">
                  All prices are quoted in Euros (EUR) unless otherwise specified. Our quotes include:
                </p>
                <ul className="space-y-2 font-inter text-muted-foreground mb-6">
                  <li className="flex items-start gap-2">
                    <Icon name="CheckCircleIcon" size={18} className="text-primary mt-0.5 shrink-0" />
                    <span>Product cost based on current market rates</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Icon name="CheckCircleIcon" size={18} className="text-primary mt-0.5 shrink-0" />
                    <span>Packaging and handling fees</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Icon name="CheckCircleIcon" size={18} className="text-primary mt-0.5 shrink-0" />
                    <span>Applicable taxes (VAT) unless exempt</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Icon name="CheckCircleIcon" size={18} className="text-primary mt-0.5 shrink-0" />
                    <span>Shipping costs (when applicable based on delivery terms)</span>
                  </li>
                </ul>

                <h3 className="font-bricolage font-semibold text-xl text-foreground mb-4 mt-6">
                  Payment Methods
                </h3>
                <p className="font-inter text-muted-foreground mb-3">
                  We accept the following payment methods:
                </p>
                <div className="grid md:grid-cols-2 gap-3 mb-6">
                  <div className="flex items-center gap-2">
                    <Icon name="CreditCardIcon" size={18} className="text-primary" />
                    <span className="font-inter text-muted-foreground">Bank Transfer (SEPA/SWIFT)</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Icon name="DocumentTextIcon" size={18} className="text-primary" />
                    <span className="font-inter text-muted-foreground">Letter of Credit (L/C)</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Icon name="BanknotesIcon" size={18} className="text-primary" />
                    <span className="font-inter text-muted-foreground">Trade Credit (approved accounts)</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Icon name="ShieldCheckIcon" size={18} className="text-primary" />
                    <span className="font-inter text-muted-foreground">Escrow Services</span>
                  </div>
                </div>

                <h3 className="font-bricolage font-semibold text-xl text-foreground mb-4 mt-6">
                  Payment Terms
                </h3>
                <ul className="space-y-2 font-inter text-muted-foreground">
                  <li className="flex items-start gap-2">
                    <span className="text-primary mt-1">•</span>
                    <span><strong className="text-foreground">New Customers:</strong> Full payment or 50% deposit required before shipment</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-primary mt-1">•</span>
                    <span><strong className="text-foreground">Established Customers:</strong> Net 30 or Net 60 terms available upon credit approval</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-primary mt-1">•</span>
                    <span><strong className="text-foreground">Late Payments:</strong> Interest of 1.5% per month (18% annually) applies to overdue amounts</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-primary mt-1">•</span>
                    <span><strong className="text-foreground">Currency Fluctuations:</strong> Prices are locked at time of order confirmation</span>
                  </li>
                </ul>
              </div>
            </div>

            {/* Delivery Terms */}
            <div className="reveal">
              <h2 className="font-bricolage font-bold text-2xl text-foreground mb-6">
                Delivery & Shipping
              </h2>
              <div className="bg-card border border-border rounded-xl p-4">
                <p className="font-inter text-muted-foreground mb-4">
                  We offer flexible delivery options to meet your business needs:
                </p>
                <div className="space-y-4">
                  <div className="bg-primary/5 rounded-lg p-4">
                    <h4 className="font-bricolage font-semibold text-foreground mb-2">FOB (Free On Board)</h4>
                    <p className="font-inter text-sm text-muted-foreground">We deliver to the port of shipment. You arrange and pay for international shipping and assume risk once goods are loaded.</p>
                  </div>
                  <div className="bg-primary/5 rounded-lg p-4">
                    <h4 className="font-bricolage font-semibold text-foreground mb-2">CIF (Cost, Insurance, and Freight)</h4>
                    <p className="font-inter text-sm text-muted-foreground">We arrange and pay for shipping and insurance to your destination port. Risk transfers when goods are loaded at origin.</p>
                  </div>
                  <div className="bg-primary/5 rounded-lg p-4">
                    <h4 className="font-bricolage font-semibold text-foreground mb-2">DDP (Delivered Duty Paid)</h4>
                    <p className="font-inter text-sm text-muted-foreground">We handle everything including customs clearance and delivery to your specified location. Maximum convenience for you.</p>
                  </div>
                </div>
                <p className="font-inter text-sm text-muted-foreground mt-4 italic">
                  Delivery timeframes vary by product, quantity, and destination. Typical lead times range from 2-6 weeks. We'll provide specific timelines in your quote.
                </p>
              </div>
            </div>

            {/* Quality Assurance */}
            <div className="reveal">
              <h2 className="font-bricolage font-bold text-2xl text-foreground mb-6">
                Quality Assurance & Inspections
              </h2>
              <div className="bg-gradient-to-br from-primary/10 via-secondary/5 to-background border border-border rounded-xl p-8">
                <p className="font-inter text-muted-foreground mb-6">
                  Quality is at the heart of everything we do. Every shipment undergoes rigorous quality control:
                </p>
                <div className="grid md:grid-cols-3 gap-4 mb-6">
                  <div className="text-center">
                    <div className="bg-primary/10 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-3">
                      <Icon name="BeakerIcon" size={28} className="text-primary" />
                    </div>
                    <h4 className="font-bricolage font-semibold text-foreground mb-2">Lab Testing</h4>
                    <p className="font-inter text-sm text-muted-foreground">Independent laboratory analysis for purity and composition</p>
                  </div>
                  <div className="text-center">
                    <div className="bg-primary/10 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-3">
                      <Icon name="ClipboardDocumentCheckIcon" size={28} className="text-primary" />
                    </div>
                    <h4 className="font-bricolage font-semibold text-foreground mb-2">Documentation</h4>
                    <p className="font-inter text-sm text-muted-foreground">Complete certificates of analysis and compliance</p>
                  </div>
                  <div className="text-center">
                    <div className="bg-primary/10 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-3">
                      <Icon name="EyeIcon" size={28} className="text-primary" />
                    </div>
                    <h4 className="font-bricolage font-semibold text-foreground mb-2">Visual Inspection</h4>
                    <p className="font-inter text-sm text-muted-foreground">Physical examination before packaging and shipment</p>
                  </div>
                </div>
                <p className="font-inter text-muted-foreground">
                  You're welcome to arrange third-party inspections at any stage. We'll cooperate fully and provide access to products, documentation, and facilities as needed.
                </p>
              </div>
            </div>

            {/* Returns and Refunds */}
            <div className="reveal">
              <h2 className="font-bricolage font-bold text-2xl text-foreground mb-6">
                Returns, Refunds & Disputes
              </h2>
              <div className="bg-card border border-border rounded-xl p-4">
                <h3 className="font-bricolage font-semibold text-xl text-foreground mb-4">
                  Our Commitment to Satisfaction
                </h3>
                <p className="font-inter text-muted-foreground mb-4">
                  While we strive for perfection, we understand that issues can occasionally arise. Here's how we handle them:
                </p>
                <div className="space-y-4">
                  <div>
                    <h4 className="font-inter font-semibold text-foreground mb-2">Defective or Non-Conforming Products</h4>
                    <p className="font-inter text-sm text-muted-foreground mb-2">
                      If products don't meet agreed specifications, notify us within 48 hours of delivery with:
                    </p>
                    <ul className="space-y-1 font-inter text-sm text-muted-foreground ml-4">
                      <li className="flex items-start gap-2">
                        <span className="text-primary mt-1">•</span>
                        <span>Detailed description of the issue</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="text-primary mt-1">•</span>
                        <span>Photographic evidence</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="text-primary mt-1">•</span>
                        <span>Relevant documentation (delivery notes, lab reports)</span>
                      </li>
                    </ul>
                    <p className="font-inter text-sm text-muted-foreground mt-2">
                      We'll investigate promptly and offer replacement, credit, or refund as appropriate.
                    </p>
                  </div>

                  <div>
                    <h4 className="font-inter font-semibold text-foreground mb-2">Damaged Shipments</h4>
                    <p className="font-inter text-sm text-muted-foreground">
                      Note any visible damage on the delivery receipt before signing. For concealed damage discovered after delivery, notify us and the carrier within 48 hours. We'll work with you to file insurance claims and arrange replacements.
                    </p>
                  </div>

                  <div>
                    <h4 className="font-inter font-semibold text-foreground mb-2">Order Cancellations</h4>
                    <p className="font-inter text-sm text-muted-foreground">
                      Orders can be cancelled without penalty up to 24 hours after confirmation. After that, cancellation fees may apply based on production stage and costs incurred. We'll always work with you to find a fair solution.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Liability */}
            <div className="reveal">
              <h2 className="font-bricolage font-bold text-2xl text-foreground mb-6">
                Limitation of Liability
              </h2>
              <div className="bg-card border border-border rounded-xl p-4">
                <p className="font-inter text-muted-foreground mb-4">
                  While we take every precaution to ensure quality and reliability, our liability is limited as follows:
                </p>
                <ul className="space-y-2 font-inter text-muted-foreground">
                  <li className="flex items-start gap-2">
                    <span className="text-primary mt-1">•</span>
                    <span>Our total liability for any claim shall not exceed the value of the specific order in question</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-primary mt-1">•</span>
                    <span>We are not liable for indirect, consequential, or incidental damages including lost profits or business interruption</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-primary mt-1">•</span>
                    <span>Force majeure events (natural disasters, war, strikes, government actions) excuse performance without liability</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-primary mt-1">•</span>
                    <span>Claims must be filed within 6 months of delivery or they are waived</span>
                  </li>
                </ul>
                <p className="font-inter text-sm text-muted-foreground mt-4 italic">
                  These limitations are standard in wholesale trade and reflect the nature of our business relationship. They don't affect your statutory rights under Dutch or EU law.
                </p>
              </div>
            </div>

            {/* Intellectual Property */}
            <div className="reveal">
              <h2 className="font-bricolage font-bold text-2xl text-foreground mb-6">
                Intellectual Property Rights
              </h2>
              <div className="bg-card border border-border rounded-xl p-4">
                <p className="font-inter text-muted-foreground mb-4">
                  All content on this website—including text, images, logos, graphics, and design elements—is owned by TechAntum or our licensors and protected by copyright, trademark, and other intellectual property laws.
                </p>
                <p className="font-inter text-muted-foreground">
                  You may view and download content for personal, non-commercial use only. Any reproduction, distribution, modification, or commercial use requires our prior written permission. Unauthorized use may result in legal action.
                </p>
              </div>
            </div>

            {/* Confidentiality */}
            <div className="reveal">
              <h2 className="font-bricolage font-bold text-2xl text-foreground mb-6">
                Confidentiality & Non-Disclosure
              </h2>
              <div className="bg-card border border-border rounded-xl p-4">
                <p className="font-inter text-muted-foreground mb-4">
                  During our business relationship, both parties may share confidential information including pricing, specifications, business strategies, and customer data. We agree to:
                </p>
                <ul className="space-y-2 font-inter text-muted-foreground">
                  <li className="flex items-start gap-2">
                    <span className="text-primary mt-1">•</span>
                    <span>Keep all confidential information strictly private</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-primary mt-1">•</span>
                    <span>Use it only for the purposes of our business relationship</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-primary mt-1">•</span>
                    <span>Not disclose it to third parties without written consent</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-primary mt-1">•</span>
                    <span>Return or destroy confidential materials upon request</span>
                  </li>
                </ul>
                <p className="font-inter text-muted-foreground mt-4">
                  This obligation continues for 3 years after our business relationship ends.
                </p>
              </div>
            </div>

            {/* Governing Law */}
            <div className="reveal">
              <h2 className="font-bricolage font-bold text-2xl text-foreground mb-6">
                Governing Law & Dispute Resolution
              </h2>
              <div className="bg-card border border-border rounded-xl p-4">
                <p className="font-inter text-muted-foreground mb-4">
                  These terms are governed by the laws of the Netherlands. Any disputes will be resolved through:
                </p>
                <div className="space-y-3">
                  <div className="flex items-start gap-3">
                    <span className="bg-primary text-primary-foreground w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold shrink-0 mt-0.5">1</span>
                    <div>
                      <h4 className="font-inter font-semibold text-foreground mb-1">Negotiation</h4>
                      <p className="font-inter text-sm text-muted-foreground">We'll first attempt to resolve disputes through good-faith discussions between our teams.</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <span className="bg-primary text-primary-foreground w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold shrink-0 mt-0.5">2</span>
                    <div>
                      <h4 className="font-inter font-semibold text-foreground mb-1">Mediation</h4>
                      <p className="font-inter text-sm text-muted-foreground">If negotiation fails, we'll engage a neutral mediator to facilitate resolution.</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <span className="bg-primary text-primary-foreground w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold shrink-0 mt-0.5">3</span>
                    <div>
                      <h4 className="font-inter font-semibold text-foreground mb-1">Arbitration or Litigation</h4>
                      <p className="font-inter text-sm text-muted-foreground">As a last resort, disputes will be submitted to arbitration or the competent courts in The Hague, Netherlands.</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Severability */}
            <div className="reveal">
              <h2 className="font-bricolage font-bold text-2xl text-foreground mb-6">
                Severability & Entire Agreement
              </h2>
              <div className="bg-card border border-border rounded-xl p-4">
                <p className="font-inter text-muted-foreground mb-4">
                  If any provision of these terms is found to be invalid or unenforceable, the remaining provisions will continue in full force and effect. The invalid provision will be replaced with a valid one that most closely matches the original intent.
                </p>
                <p className="font-inter text-muted-foreground">
                  These terms, together with your order confirmation and any additional agreements, constitute the entire agreement between you and TechAntum They supersede all prior discussions, negotiations, and agreements.
                </p>
              </div>
            </div>

            {/* Contact Section */}
            <div className="reveal">
              <div className="bg-gradient-to-br from-primary/10 via-secondary/5 to-background border-2 border-primary/20 rounded-2xl p-8">
                <h2 className="font-bricolage font-bold text-2xl text-foreground mb-4">
                  Questions About These Terms?
                </h2>
                <p className="font-inter text-muted-foreground mb-6">
                  We're committed to transparency and clarity. If you have any questions about these terms and conditions, need clarification on any point, or want to discuss specific arrangements for your business, our team is here to help.
                </p>
                <div className="space-y-3 mb-6">
                  <div className="flex items-center gap-3">
                    <Icon name="EnvelopeIcon" size={20} className="text-primary" />
                    <a href="mailto:legal@hollandsefacilitygroup.com" className="font-inter text-foreground hover:text-primary transition-colors">
                      legal@hollandsefacilitygroup.com
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
                  Contact Our Team
                  <Icon name="ArrowRightIcon" size={16} />
                </Link>
              </div>
            </div>

            {/* CTA Section */}
            <div className="reveal">
              <div className="bg-card border border-border rounded-2xl p-5 text-center">
                <h2 className="font-bricolage font-bold text-2xl text-foreground mb-4">
                  Ready to Start Your Project?
                </h2>
                <p className="font-inter text-muted-foreground mb-6 max-w-2xl mx-auto">
                  Now that you understand our terms, let&apos;s talk about your next digital project. Whether you need a website, web application, or mobile app, we&apos;re ready to help.
                </p>
                <div className="flex flex-wrap justify-center gap-4">
                  <Link
                    href="/services"
                    className="bg-primary text-primary-foreground px-8 py-3 rounded-full font-inter font-medium hover:bg-primary/90 transition-colors"
                  >
                    Explore Services
                  </Link>
                  <Link
                    href="/contact"
                    className="bg-card border-2 border-primary text-primary px-8 py-3 rounded-full font-inter font-medium hover:bg-primary/5 transition-colors"
                  >
                    Get a Quote
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
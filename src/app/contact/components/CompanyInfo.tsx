import Icon from '@/components/ui/AppIcon';

export default function CompanyInfo() {
  return (
    <div className="space-y-6">
      <div className="bg-card rounded-2xl p-6 shadow-sm border border-border">
        <h3 className="font-bricolage text-xl font-semibold text-foreground mb-4">
          Contact Information
        </h3>
        <div className="space-y-4">
          <div className="flex items-start gap-3">
            <Icon name="MapPinIcon" size={20} className="text-primary mt-0.5 shrink-0" />
            <div>
              <p className="font-inter text-sm font-medium text-foreground mb-1">Address</p>
              <p className="font-inter text-sm text-muted-foreground">
                Plot no 118, 3rd Floor, Brundavanam<br />
                Road no 3 Kakatiya Hills, Guttala_Begumpet Madhapur<br />
                Jubilee Hills, Hyderabad, Telangana - 500033
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <Icon name="PhoneIcon" size={20} className="text-primary mt-0.5 shrink-0" />
            <div className="flex-1">
              <p className="font-inter text-sm font-medium text-foreground mb-1">Phone</p>
              <a
                href="tel:+914040268570"
                className="font-inter text-sm text-primary hover:underline"
              >
                +91 40 40268570
              </a>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <Icon name="ChatBubbleLeftRightIcon" size={20} className="text-primary mt-0.5 shrink-0" />
            <div className="flex-1">
              <p className="font-inter text-sm font-medium text-foreground mb-1">WhatsApp</p>
              <a
                href="https://wa.me/917032923474"
                target="_blank"
                rel="noopener noreferrer"
                className="font-inter text-sm text-primary hover:underline"
              >
                +91 70329 23474
              </a>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <Icon name="EnvelopeIcon" size={20} className="text-primary mt-0.5 shrink-0" />
            <div>
              <p className="font-inter text-sm font-medium text-foreground mb-1">Email</p>
              <a
                href="mailto:info@techantum.com"
                className="font-inter text-sm text-primary hover:underline"
              >
                info@techantum.com
              </a>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-card rounded-2xl p-6 shadow-sm border border-border">
        <h3 className="font-bricolage text-xl font-semibold text-foreground mb-4">
          About TechAntum
        </h3>
        <div className="space-y-3">
          <div>
            <p className="font-inter text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">
              Company
            </p>
            <p className="font-inter text-sm text-foreground">
              TechAntum — Digital Solutions
            </p>
          </div>
          <div>
            <p className="font-inter text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">
              Services
            </p>
            <p className="font-inter text-sm text-foreground">
              Websites · Web Applications · Mobile Applications
            </p>
          </div>
          <div>
            <p className="font-inter text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">
              Established
            </p>
            <p className="font-inter text-sm text-foreground">2018</p>
          </div>
        </div>
      </div>

      <div className="bg-card rounded-2xl p-6 shadow-sm border border-border">
        <h3 className="font-bricolage text-xl font-semibold text-foreground mb-4">
          Business Hours
        </h3>
        <div className="space-y-2">
          <div className="flex justify-between font-inter text-sm">
            <span className="text-foreground">Monday - Friday</span>
            <span className="text-muted-foreground">9:00 AM - 6:00 PM IST</span>
          </div>
          <div className="flex justify-between font-inter text-sm">
            <span className="text-foreground">Saturday</span>
            <span className="text-muted-foreground">10:00 AM - 2:00 PM IST</span>
          </div>
          <div className="flex justify-between font-inter text-sm">
            <span className="text-foreground">Sunday</span>
            <span className="text-muted-foreground">Closed</span>
          </div>
        </div>
        <p className="font-inter text-xs text-muted-foreground mt-4">
          * We respond to all project inquiries within 24 hours on business days.
        </p>
      </div>
    </div>
  )
}

import Link from 'next/link';
import AppImage from '@/components/ui/AppImage';
import Icon from '@/components/ui/AppIcon';

export default function MobileApplicationsSection() {
  const offerings = [
    {
      id: 'mobile_native',
      name: 'Native iOS & Android',
      description: 'Platform-native apps that deliver the best performance and user experience on each device.',
      features: ['Swift / Kotlin', 'Native UI', 'Device APIs', 'App Store Ready'],
      image: 'https://images.unsplash.com/photo-1512941937669-90a1b58e7e9c',
      imageAlt: 'Mobile phones displaying native iOS and Android applications',
    },
    {
      id: 'mobile_cross',
      name: 'Cross-Platform Apps',
      description: 'Build once, deploy everywhere with React Native or Flutter for faster time-to-market.',
      features: ['React Native', 'Flutter', 'Shared Codebase', 'Faster Delivery'],
      image: 'https://images.unsplash.com/photo-1555774698-0c77d0d5c11d',
      imageAlt: 'Cross-platform mobile app running on multiple device types',
    },
    {
      id: 'mobile_uiux',
      name: 'UI/UX Design',
      description: 'User-centered mobile designs with intuitive navigation, accessibility, and polished interactions.',
      features: ['Wireframing', 'Prototyping', 'User Testing', 'Design Systems'],
      image: 'https://images.unsplash.com/photo-1586717791821-3f44a563fa4c',
      imageAlt: 'Mobile UI/UX design mockups and wireframes on tablet',
    },
    {
      id: 'mobile_backend',
      name: 'Backend Integration',
      description: 'Connect your mobile app to APIs, databases, authentication, and real-time services.',
      features: ['REST / GraphQL', 'Push Notifications', 'Offline Sync', 'Secure Auth'],
      image: 'https://images.unsplash.com/photo-1558494949-ef010cbdcc31',
      imageAlt: 'Mobile app connected to backend server infrastructure',
    },
    {
      id: 'mobile_deploy',
      name: 'App Store Deployment',
      description: 'End-to-end publishing support for Apple App Store and Google Play Store.',
      features: ['Store Submission', 'Compliance Review', 'Release Management', 'Version Updates'],
      image: 'https://images.unsplash.com/photo-1611162617474-5b21e939e113',
      imageAlt: 'App store listing pages for mobile application launch',
    },
    {
      id: 'mobile_maintenance',
      name: 'Maintenance & Support',
      description: 'Ongoing updates, bug fixes, OS compatibility, and performance monitoring for your app.',
      features: ['Bug Fixes', 'OS Updates', 'Performance Tuning', 'Feature Additions'],
      image: 'https://images.unsplash.com/photo-1522071820081-009f0129c71c',
      imageAlt: 'Development team providing ongoing mobile app support',
    },
  ];

  return (
    <section id="mobile-applications" className="page-section reveal">
      <div className="page-container">
        <div className="mb-5">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 rounded-xl bg-accent/10 flex items-center justify-center">
              <Icon name="DevicePhoneMobileIcon" size={24} className="text-accent" />
            </div>
            <h2 className="font-bricolage text-4xl md:text-5xl font-bold text-foreground">
              Mobile Applications
            </h2>
          </div>
          <p className="font-inter text-lg text-muted-foreground max-w-3xl">
            Native and cross-platform mobile apps that engage users and drive business growth on iOS and Android.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 reveal reveal-stagger">
          {offerings.map((item) => (
            <div
              key={item.id}
              className="bg-card rounded-2xl overflow-hidden shadow-sm border border-border hover-lift group"
            >
              <div className="relative h-48 overflow-hidden">
                <AppImage
                  src={item.image}
                  alt={item.imageAlt}
                  width={600}
                  height={300}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                />
              </div>
              <div className="p-6">
                <h3 className="font-bricolage text-xl font-semibold text-foreground mb-2">
                  {item.name}
                </h3>
                <p className="font-inter text-sm text-muted-foreground mb-4">{item.description}</p>
                <div className="flex flex-wrap gap-2">
                  {item.features.map((feature) => (
                    <span
                      key={feature}
                      className="font-inter text-xs bg-accent/10 text-accent px-2 py-1 rounded-full"
                    >
                      {feature}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-8 text-center">
          <Link
            href="/contact"
            className="inline-flex items-center gap-2 font-inter text-base font-medium text-accent hover:underline"
          >
            Start your mobile app project
            <Icon name="ArrowRightIcon" size={20} />
          </Link>
        </div>
      </div>
    </section>
  );
}

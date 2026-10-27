import { getBranding, getServiceCatalog } from '@/lib/cms';
import Footer from './Footer';

export default async function SiteFooter() {
  const [branding, services] = await Promise.all([getBranding(), getServiceCatalog()]);
  return <Footer branding={branding} services={services} />;
}

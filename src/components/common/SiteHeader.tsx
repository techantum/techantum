import { getBranding, getServiceCatalog } from '@/lib/cms';
import Header from './Header';

export default async function SiteHeader() {
  const [branding, services] = await Promise.all([getBranding(), getServiceCatalog()]);
  return <Header branding={branding} services={services} />;
}

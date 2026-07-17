import BodySnippets from '@/components/BodySnippets';
import { getPageSeo } from '@/lib/seo/page-metadata';
import { getRequestPathname } from '@/lib/seo/request-path';

export default async function PageBodySnippets() {
  const pathname = await getRequestPathname();
  const pageSeo = await getPageSeo(pathname);
  if (!pageSeo?.footer_scripts?.trim()) return null;
  return <BodySnippets html={pageSeo.footer_scripts} />;
}

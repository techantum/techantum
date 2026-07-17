import HeadSnippets from '@/components/HeadSnippets';
import { getPageSeo } from '@/lib/seo/page-metadata';
import { getRequestPathname } from '@/lib/seo/request-path';

export default async function PageHeadSnippets() {
  const pathname = await getRequestPathname();
  const pageSeo = await getPageSeo(pathname);
  if (!pageSeo?.header_scripts?.trim()) return null;
  return <HeadSnippets html={pageSeo.header_scripts} />;
}

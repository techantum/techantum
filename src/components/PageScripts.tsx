import CustomScripts from '@/components/CustomScripts';
import { getPageScripts } from '@/lib/seo/page-metadata';

export default async function PageScripts({ path }: { path: string }) {
  const scripts = await getPageScripts(path);

  return (
    <>
      <CustomScripts html={scripts.header} placement="header" />
      <CustomScripts html={scripts.footer} placement="footer" />
    </>
  );
}

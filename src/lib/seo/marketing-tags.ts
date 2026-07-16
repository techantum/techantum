import type { SiteSeo } from '@/lib/cms/types';

/**
 * Builds trusted tracking snippets from CMS-configured IDs.
 * Only alphanumeric tag IDs from the admin SEO form are injected.
 */
export function buildMarketingHeaderScripts(seo: SiteSeo): string {
  const parts: string[] = [];

  const gtmId = sanitizeTagId(seo.gtm_id);
  if (gtmId) {
    parts.push(`<!-- Google Tag Manager -->
<script>(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':
new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],
j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src=
'https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);
})(window,document,'script','dataLayer','${gtmId}');</script>
<!-- End Google Tag Manager -->`);
  }

  const ga4Id = sanitizeTagId(seo.ga4_id);
  if (ga4Id && !gtmId) {
    parts.push(`<!-- Google Analytics GA4 -->
<script async src="https://www.googletagmanager.com/gtag/js?id=${ga4Id}"></script>
<script>window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}
gtag('js', new Date());gtag('config', '${ga4Id}');</script>`);
  }

  const pixelId = sanitizeTagId(seo.facebook_pixel_id);
  if (pixelId) {
    parts.push(`<!-- Meta Pixel -->
<script>!function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?
n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;
n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;
t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}(window,document,'script',
'https://connect.facebook.net/en_US/fbevents.js');fbq('init','${pixelId}');fbq('track','PageView');</script>
<noscript><img height="1" width="1" style="display:none"
src="https://www.facebook.com/tr?id=${pixelId}&ev=PageView&noscript=1"/></noscript>`);
  }

  const linkedinId = sanitizeTagId(seo.linkedin_partner_id);
  if (linkedinId) {
    parts.push(`<!-- LinkedIn Insight Tag -->
<script>_linkedin_partner_id="${linkedinId}";window._linkedin_data_partner_ids=window._linkedin_data_partner_ids||[];
window._linkedin_data_partner_ids.push(_linkedin_partner_id);</script>
<script async src="https://snap.licdn.com/li.lms-analytics/insight.min.js"></script>`);
  }

  return parts.join('\n');
}

export function buildMarketingBodyScripts(seo: SiteSeo): string {
  const gtmId = sanitizeTagId(seo.gtm_id);
  if (!gtmId) return '';
  return `<!-- Google Tag Manager (noscript) -->
<noscript><iframe src="https://www.googletagmanager.com/ns.html?id=${gtmId}"
height="0" width="0" style="display:none;visibility:hidden"></iframe></noscript>
<!-- End Google Tag Manager (noscript) -->`;
}

export function getSocialSameAsUrls(seo: SiteSeo): string[] {
  return [
    seo.facebook_url,
    seo.instagram_url,
    seo.linkedin_url,
    seo.youtube_url,
    seo.twitter_url,
  ].filter((url): url is string => Boolean(url?.trim()));
}

function sanitizeTagId(value?: string | null): string {
  if (!value?.trim()) return '';
  const cleaned = value.trim();
  if (!/^[A-Za-z0-9_-]+$/.test(cleaned)) return '';
  return cleaned;
}

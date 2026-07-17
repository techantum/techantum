import Script from 'next/script';
import type { SiteSeo } from '@/lib/cms/types';
import { getMarketingTagIds } from '@/lib/seo/marketing-tags';

interface MarketingTagsProps {
  seo: SiteSeo;
}

/** Google Tag Manager + GA4 + ad pixels — rendered with next/script so tags actually execute. */
export function MarketingHeadTags({ seo }: MarketingTagsProps) {
  const { gtmId, ga4Id, facebookPixelId, linkedinPartnerId } = getMarketingTagIds(seo);

  return (
    <>
      {gtmId ? (
        <Script id="gtm-head" strategy="beforeInteractive">{`
(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':
new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],
j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src=
'https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);
})(window,document,'script','dataLayer','${gtmId}');
        `}</Script>
      ) : null}

      {ga4Id && !gtmId ? (
        <>
          <Script
            id="ga4-loader"
            src={`https://www.googletagmanager.com/gtag/js?id=${ga4Id}`}
            strategy="beforeInteractive"
          />
          <Script id="ga4-config" strategy="beforeInteractive">{`
window.dataLayer = window.dataLayer || [];
function gtag(){dataLayer.push(arguments);}
gtag('js', new Date());
gtag('config', '${ga4Id}');
          `}</Script>
        </>
      ) : null}

      {facebookPixelId ? (
        <>
          <Script id="meta-pixel" strategy="afterInteractive">{`
!function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?
n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;
n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;
t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}(window,document,'script',
'https://connect.facebook.net/en_US/fbevents.js');
fbq('init','${facebookPixelId}');
fbq('track','PageView');
          `}</Script>
          <noscript>
            <img
              height="1"
              width="1"
              style={{ display: 'none' }}
              alt=""
              src={`https://www.facebook.com/tr?id=${facebookPixelId}&ev=PageView&noscript=1`}
            />
          </noscript>
        </>
      ) : null}

      {linkedinPartnerId ? (
        <>
          <Script id="linkedin-partner" strategy="afterInteractive">{`
_linkedin_partner_id="${linkedinPartnerId}";
window._linkedin_data_partner_ids=window._linkedin_data_partner_ids||[];
window._linkedin_data_partner_ids.push(_linkedin_partner_id);
          `}</Script>
          <Script
            id="linkedin-insight"
            src="https://snap.licdn.com/li.lms-analytics/insight.min.js"
            strategy="afterInteractive"
          />
        </>
      ) : null}
    </>
  );
}

export function MarketingBodyTags({ seo }: MarketingTagsProps) {
  const { gtmId } = getMarketingTagIds(seo);
  if (!gtmId) return null;

  return (
    <noscript>
      <iframe
        title="Google Tag Manager"
        src={`https://www.googletagmanager.com/ns.html?id=${gtmId}`}
        height="0"
        width="0"
        style={{ display: 'none', visibility: 'hidden' }}
      />
    </noscript>
  );
}

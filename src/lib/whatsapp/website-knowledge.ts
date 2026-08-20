import { defaultAboutOverview, defaultAboutUsp } from '../techantum-defaults';
import { digitalTransformationJourney, serviceDivisions } from '../service-packages-data';

export const TECHANTUM_OUT_OF_SCOPE_REPLY =
  'Thank you for sharing that. This sits a little beyond Techantum Solutions’ website, web application and mobile application services. Our team will get back to you regarding this.';

export function getWebsiteServiceCatalog(): string {
  const divisions = serviceDivisions
    .map((division) => {
      const plans = division.plans
        .map((plan) => {
          const extras = [...(plan.includes || []), ...(plan.solutions || []), ...(plan.features || [])]
            .slice(0, 8)
            .join(', ');
          return `  - ${plan.name}: ${plan.description}${extras ? ` Includes: ${extras}.` : ''}`;
        })
        .join('\n');
      return `${division.name}
${division.description}
Best for: ${division.targetAudience.join(', ')}
Packages:
${plans}`;
    })
    .join('\n\n');

  return `TECHANTUM SOLUTIONS — WEBSITE SERVICES
${defaultAboutOverview.introDescription}

${defaultAboutUsp.description}
${defaultAboutUsp.differentiators.map((item) => `- ${item.title}: ${item.description}`).join('\n')}

We work with clients in India, Germany and the United States.

Core services:
${divisions}

End-to-end journey: ${digitalTransformationJourney.join(' → ')}.

We do not quote exact prices, discounts or delivery dates unless they appear in the knowledge base. For anything outside websites, web applications, mobile applications, UI/UX, integrations, cloud deployment and related support, say the team will follow up.`;
}

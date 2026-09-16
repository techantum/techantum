import { defaultAboutOverview, defaultAboutUsp } from '../techantum-defaults';
import { digitalTransformationJourney, serviceDivisions } from '../service-packages-data';

export const TECHANTUM_OUT_OF_SCOPE_REPLY =
  'This is a bit outside our website, web app and mobile app work. Our team can still check and get back to you.';

export const TECHANTUM_CONTINUE_REPLY =
  'Thank you. Please share in 1–2 lines what you need. Our team will review it and speak with you to understand the complete requirement.';

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

We do not mention price, budget, discounts or delivery dates. For anything outside websites, web applications, mobile applications, UI/UX, integrations, cloud deployment and related support, say the team will follow up.`;
}

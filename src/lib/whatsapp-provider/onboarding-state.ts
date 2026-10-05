export type MetaConnectionStatus = 'DISCONNECTED' | 'AUTHORIZED' | 'WABA_LINKED' | 'CONNECTED';

export type OnboardingSetup = {
  hasToken: boolean;
  hasBusiness: boolean;
  hasWaba: boolean;
  hasPhone: boolean;
  phoneCount: number;
  wabaCount: number;
  templateCount: number;
  connectionStatus: MetaConnectionStatus;
  ready: boolean;
  blockers: string[];
};

export function computeOnboardingSetup(input: {
  hasToken?: boolean;
  businessId?: string | null;
  wabas?: unknown[] | null;
  phones?: unknown[] | null;
  templateCount?: number | null;
}): OnboardingSetup {
  const wabas = input.wabas || [];
  const phones = input.phones || [];
  const hasToken = Boolean(input.hasToken);
  const hasBusiness = Boolean(input.businessId);
  const hasWaba = wabas.length > 0;
  const hasPhone = phones.length > 0;
  const blockers: string[] = [];

  if (!hasToken && !hasWaba) blockers.push('Connect the Facebook account that should own this WhatsApp Business API.');
  if (!hasWaba) blockers.push('A WhatsApp Business Account from Meta is required before you can continue.');
  if (!hasPhone) blockers.push('At least one WhatsApp phone number must be imported or created in Meta.');

  let connectionStatus: MetaConnectionStatus = 'DISCONNECTED';
  if (hasWaba && hasPhone) connectionStatus = 'CONNECTED';
  else if (hasWaba) connectionStatus = 'WABA_LINKED';
  else if (hasToken || hasBusiness) connectionStatus = 'AUTHORIZED';

  return {
    hasToken,
    hasBusiness,
    hasWaba,
    hasPhone,
    phoneCount: phones.length,
    wabaCount: wabas.length,
    templateCount: input.templateCount || 0,
    connectionStatus,
    ready: hasWaba && hasPhone,
    blockers,
  };
}

export function nextOnboardingStep(setup: OnboardingSetup, detailsSaved: boolean) {
  if (!detailsSaved && !setup.hasWaba) return 1;
  if (!setup.hasWaba) return 2;
  if (!setup.hasPhone) return 3;
  return 5;
}

export function canEnterOnboardingStep(step: number, setup: OnboardingSetup, detailsSaved: boolean) {
  if (step <= 1) return true;
  if (step === 2) return detailsSaved || setup.hasWaba || setup.hasToken;
  if (step === 3 || step === 4) return setup.hasWaba;
  if (step === 5) return setup.ready;
  return false;
}

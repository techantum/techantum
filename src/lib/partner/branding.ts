import { createAdminClient } from '@/lib/supabase/admin';

export type PartnerPublicBranding = {
  company_name: string;
  logo_url: string | null;
  partner_code: string;
};

export async function lookupPartnerPublicBranding(input: {
  email?: string;
  code?: string;
}): Promise<PartnerPublicBranding | null> {
  const supabase = createAdminClient();
  const email = input.email?.trim().toLowerCase() || '';
  const code = input.code?.trim().toUpperCase() || '';

  if (code) {
    const { data } = await supabase
      .from('partners')
      .select('company_name, logo_url, partner_code, status')
      .eq('partner_code', code)
      .maybeSingle();
    if (data && data.status !== 'archived' && data.status !== 'suspended') {
      return {
        company_name: data.company_name,
        logo_url: data.logo_url ?? null,
        partner_code: data.partner_code,
      };
    }
  }

  if (email) {
    const { data: partnerUser } = await supabase
      .from('partner_users')
      .select('partner_id')
      .eq('email', email)
      .maybeSingle();

    const partnerId = partnerUser?.partner_id;
    if (partnerId) {
      const { data } = await supabase
        .from('partners')
        .select('company_name, logo_url, partner_code, status')
        .eq('id', partnerId)
        .maybeSingle();
      if (data && data.status !== 'archived' && data.status !== 'suspended') {
        return {
          company_name: data.company_name,
          logo_url: data.logo_url ?? null,
          partner_code: data.partner_code,
        };
      }
    }

    const { data: byCompanyEmail } = await supabase
      .from('partners')
      .select('company_name, logo_url, partner_code, status')
      .eq('email', email)
      .maybeSingle();
    if (byCompanyEmail && byCompanyEmail.status !== 'archived' && byCompanyEmail.status !== 'suspended') {
      return {
        company_name: byCompanyEmail.company_name,
        logo_url: byCompanyEmail.logo_url ?? null,
        partner_code: byCompanyEmail.partner_code,
      };
    }
  }

  return null;
}

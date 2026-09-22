import { createAdminClient } from '@/lib/supabase/admin';
import { decryptSecret, encryptSecret } from '@/lib/ai/crypto';

export async function storeClientCredential(clientId: string, credentialType: string, value: string, expiresAt?: string | null) {
  const supabase = createAdminClient();
  const encrypted = encryptSecret(value);
  const { error } = await supabase.from('wa_integration_credentials').upsert(
    {
      client_id: clientId,
      provider: 'META',
      credential_type: credentialType,
      encrypted_value: encrypted,
      key_version: 'v1',
      expires_at: expiresAt || null,
    },
    { onConflict: 'client_id,provider,credential_type' }
  );
  if (error) throw new Error(error.message);
}

export async function readClientCredential(clientId: string, credentialType: string) {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from('wa_integration_credentials')
    .select('encrypted_value, expires_at')
    .eq('client_id', clientId)
    .eq('provider', 'META')
    .eq('credential_type', credentialType)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data?.encrypted_value) return null;
  return {
    value: decryptSecret(data.encrypted_value),
    expiresAt: data.expires_at as string | null,
  };
}

export async function deleteClientCredential(clientId: string, credentialType?: string) {
  const supabase = createAdminClient();
  let query = supabase.from('wa_integration_credentials').delete().eq('client_id', clientId);
  if (credentialType) query = query.eq('credential_type', credentialType);
  const { error } = await query;
  if (error) throw new Error(error.message);
}

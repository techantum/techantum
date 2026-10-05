import { redirect } from 'next/navigation';

export default function AIGatewayRedirect() {
  redirect('/admin/whatsapp/settings?tab=provider');
}

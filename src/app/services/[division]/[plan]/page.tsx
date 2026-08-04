import { redirect } from 'next/navigation';

/** Legacy plan URLs redirect to the parent service page. */
export default async function PlanRedirectPage({
  params,
}: {
  params: Promise<{ division: string; plan: string }>;
}) {
  const { division } = await params;
  redirect(`/services/${division}`);
}

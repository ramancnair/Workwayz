'use client';

import { redirect, useParams } from 'next/navigation';

export default function DeprecatedBillingPage() {
  const { projectId } = useParams() as { projectId: string };
  redirect(`/projects/${projectId}/pmo/fb-payment-milestones`);
}


'use client';

import { redirect } from 'next/navigation';

export default function InitialEstimationRootPage({ params }: { params: { projectId: string } }) {
  redirect(`/projects/${params.projectId}/initial-estimation/ballpark`);
}

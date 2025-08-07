
'use client';

import { redirect } from 'next/navigation';

export default function DeprecatedKanbanPage({ params }: { params: { projectId: string } }) {
  redirect(`/projects/${params.projectId}/development/kanban`);
}

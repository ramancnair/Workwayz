
'use client';

import { redirect } from "next/navigation";

export default function DevelopmentPage({ params }: { params: { projectId: string } }) {
    redirect(`/projects/${params.projectId}/development/dashboard`);
}

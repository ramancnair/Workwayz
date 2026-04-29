'use client';

import { redirect } from "next/navigation";
import { use } from "react";

export default function DevelopmentPage({ params }: { params: Promise<{ projectId: string }> }) {
    const { projectId } = use(params);
    redirect(`/projects/${projectId}/agile-dev/dashboard`);
}

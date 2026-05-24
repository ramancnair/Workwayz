'use client';

import { redirect, useParams } from "next/navigation";

export default function DevelopmentPage() {
    const { projectId } = useParams() as { projectId: string };
    redirect(`/projects/${projectId}/development/dashboard`);
}

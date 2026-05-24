'use client';

import { redirect, useParams } from "next/navigation";

export default function TestingPage() {
    const { projectId } = useParams() as { projectId: string };
    redirect(`/projects/${projectId}/testing/dashboard`);
}

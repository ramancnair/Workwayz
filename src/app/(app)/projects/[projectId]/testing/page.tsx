'use client';

import { redirect } from "next/navigation";

export default function TestingPage({ params }: { params: { projectId: string } }) {
    redirect(`/projects/${params.projectId}/testing/dashboard`);
}

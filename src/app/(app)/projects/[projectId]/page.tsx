'use client';
import { redirect } from 'next/navigation';
import { use, useEffect, useState } from 'react';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { type Project } from '@/types';

export default function ProjectRootPage({ params }: { params: Promise<{ projectId: string }> }) {
  const { projectId } = use(params);
  const [status, setStatus] = useState<Project['status'] | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (db && projectId) {
      getDoc(doc(db, 'projects', projectId)).then(docSnap => {
        if (docSnap.exists()) {
          setStatus(docSnap.data().status);
        }
        setIsLoading(false);
      });
    } else {
        setIsLoading(false);
    }
  }, [projectId]);

  if (isLoading) {
    // You can return a loading indicator here
    return <div>Loading project details...</div>;
  }
  
  if (status === 'Initial Estimation') {
    redirect(`/projects/${projectId}/initial-estimation/ballpark`);
  }
  
  redirect(`/projects/${projectId}/development/dashboard`);
}

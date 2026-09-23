'use client';

import React from 'react';
import Link from 'next/link';
import { PageHeader } from '@/components/PageHeader';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Construction, ArrowLeft, RefreshCw, Sparkles } from 'lucide-react';

export default function UpdateCheckPage() {
  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-12">
      <PageHeader 
        title="Update Check" 
        description="Verify software integrity, check for new updates, and view system status." 
      />

      <Card className="border-border/60 shadow-sm overflow-hidden">
        <CardContent className="flex flex-col items-center justify-center text-center py-20 px-6">
          <div className="relative mb-6">
            <div className="w-20 h-20 rounded-2xl bg-amber-500/10 text-amber-500 flex items-center justify-center ring-8 ring-amber-500/5">
              <Construction className="w-10 h-10 animate-bounce" />
            </div>
            <div className="absolute -bottom-1 -right-1 bg-background rounded-full p-1 shadow-sm border border-border">
              <RefreshCw className="w-4 h-4 text-primary animate-spin" />
            </div>
          </div>

          <div className="flex items-center gap-2 mb-3">
            <Badge variant="outline" className="text-amber-600 bg-amber-50 border-amber-200 dark:bg-amber-950/40 dark:text-amber-400 dark:border-amber-800/60 font-medium px-3 py-1">
              <Sparkles className="w-3.5 h-3.5 mr-1 inline" />
              Under Construction
            </Badge>
          </div>

          <h2 className="text-2xl font-bold tracking-tight text-foreground mb-2">
            Page Under Construction
          </h2>

          <p className="text-muted-foreground max-w-md text-sm leading-relaxed mb-8">
            This module is currently being built. Automated update checking, release stream monitoring, and patch verification tools will be available here soon.
          </p>

          <div className="flex flex-wrap items-center justify-center gap-3">
            <Button asChild variant="default" className="gap-2">
              <Link href="/project-home">
                <ArrowLeft className="w-4 h-4" />
                Back to Project Home
              </Link>
            </Button>
            <Button asChild variant="outline" className="gap-2">
              <Link href="/portfolio-dashboard">
                View Portfolio Dashboard
              </Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

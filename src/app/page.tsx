import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { ArrowRight, LayoutDashboard, Folder, Users } from 'lucide-react';

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      <header className="container mx-auto px-4 py-6 flex items-center justify-between border-b border-border/40">
        <div className="flex items-center gap-2">
          <div className="bg-primary text-primary-foreground p-2 rounded-lg">
            <LayoutDashboard className="h-6 w-6" />
          </div>
          <span className="text-xl font-bold tracking-tight">ProjectFlow</span>
        </div>
        <div className="flex items-center gap-4">
          <Link href="/login" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
            Log in
          </Link>
          <Link href="/signup">
            <Button>Sign up free</Button>
          </Link>
        </div>
      </header>

      <main className="flex-1">
        <section className="container mx-auto px-4 py-24 md:py-32 flex flex-col items-center text-center space-y-8">
          <div className="space-y-4 max-w-3xl">
            <h1 className="text-4xl md:text-6xl font-extrabold tracking-tight">
              Manage Portfolios and Projects with <span className="text-primary">Clarity</span>
            </h1>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              ProjectFlow streamlines your project management workflow. Organize by portfolios, track estimations, and deliver results on time.
            </p>
          </div>
          <div className="flex flex-col sm:flex-row gap-4 pt-4">
             <Link href="/signup">
              <Button size="lg" className="w-full sm:w-auto text-base">
                Get Started <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
            <Link href="/login">
              <Button size="lg" variant="outline" className="w-full sm:w-auto text-base">
                Log In
              </Button>
            </Link>
          </div>
        </section>

        <section className="bg-muted/30 py-24">
          <div className="container mx-auto px-4">
            <h2 className="text-3xl font-bold text-center mb-12 tracking-tight">Everything you need to succeed</h2>
            <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
              <div className="bg-background p-6 rounded-2xl border border-border/50 shadow-sm flex flex-col items-center text-center space-y-4">
                <div className="bg-primary/10 p-4 rounded-full text-primary">
                  <Folder className="h-8 w-8" />
                </div>
                <h3 className="text-xl font-semibold">Portfolio Management</h3>
                <p className="text-muted-foreground">Group your projects intelligently into portfolios for better oversight and reporting.</p>
              </div>
              <div className="bg-background p-6 rounded-2xl border border-border/50 shadow-sm flex flex-col items-center text-center space-y-4">
                <div className="bg-primary/10 p-4 rounded-full text-primary">
                  <LayoutDashboard className="h-8 w-8" />
                </div>
                <h3 className="text-xl font-semibold">Project Tracking</h3>
                <p className="text-muted-foreground">Monitor tasks, estimations, and statuses with our intuitive kanban and dashboard views.</p>
              </div>
              <div className="bg-background p-6 rounded-2xl border border-border/50 shadow-sm flex flex-col items-center text-center space-y-4">
                <div className="bg-primary/10 p-4 rounded-full text-primary">
                  <Users className="h-8 w-8" />
                </div>
                <h3 className="text-xl font-semibold">Team Collaboration</h3>
                <p className="text-muted-foreground">Assign project managers, set up automated updates, and keep everyone aligned.</p>
              </div>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-border/40 py-8 bg-background">
        <div className="container mx-auto px-4 text-center text-muted-foreground">
          <p>&copy; {new Date().getFullYear()} ProjectFlow. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}

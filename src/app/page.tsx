import { Navbar } from "@/components/landing/Navbar";
import { Hero } from "@/components/landing/Hero";
import { LiveMonitor } from "@/components/landing/LiveMonitor";
import { Detectors } from "@/components/landing/Detectors";
import { DiagnosticReport } from "@/components/landing/DiagnosticReport";
import { DashboardTour } from "@/components/landing/DashboardTour";
import { PlatformSync } from "@/components/landing/PlatformSync";
import { Stats } from "@/components/landing/Stats";
import { HowItWorks } from "@/components/landing/HowItWorks";
import { Pricing } from "@/components/landing/Pricing";
import { ProfileCard } from "@/components/landing/ProfileCard";
import { CTA } from "@/components/landing/CTA";
import { Footer } from "@/components/landing/Footer";
import { getAllProfiles } from "@/lib/profiles";

export default function Home() {
  const profiles = getAllProfiles();

  return (
    <main className="min-h-screen">
      <Navbar />
      <Hero />
      <LiveMonitor />
      <Detectors />
      <DiagnosticReport />
      <DashboardTour />
      <PlatformSync />
      <Stats />
      <HowItWorks />
      <Pricing />

      <section id="demo" className="max-w-5xl mx-auto px-4 py-20">
        <div className="text-center mb-12">
          <p className="text-sm font-medium text-muted-foreground/70 uppercase tracking-wider mb-3">
            Live demo
          </p>
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
            Four real audits, four different verdicts
          </h2>
          <p className="mt-4 text-muted-foreground max-w-2xl mx-auto">
            Explore four client-shaped profiles — one critical, two warnings,
            one healthy. See exactly what Runmend would surface and what
            Claude would write.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {profiles.map((profile) => (
            <ProfileCard key={profile.id} profile={profile} />
          ))}
        </div>
      </section>

      <CTA />
      <Footer />
    </main>
  );
}

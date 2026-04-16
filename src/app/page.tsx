import { Navbar } from "@/components/landing/Navbar";
import { Hero } from "@/components/landing/Hero";
import { DashboardPreview } from "@/components/landing/DashboardPreview";
import { Stats } from "@/components/landing/Stats";
import { HowItWorks } from "@/components/landing/HowItWorks";
import { Features } from "@/components/landing/Features";
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
      <DashboardPreview />
      <Stats />
      <HowItWorks />
      <Features />

      <section id="demo" className="max-w-5xl mx-auto px-4 py-20">
        <div className="text-center mb-12">
          <p className="text-sm font-medium text-muted-foreground/70 uppercase tracking-wider mb-3">
            Live demo
          </p>
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
            See real audit reports
          </h2>
          <p className="mt-4 text-muted-foreground max-w-2xl mx-auto">
            Explore four company profiles with real-world automation issues —
            from critical failures to minor optimizations.
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

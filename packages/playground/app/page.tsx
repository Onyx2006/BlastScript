import { Hero } from "@/components/Hero";
import { StatsStrip } from "@/components/StatsStrip";
import { Glossary } from "@/components/Glossary";
import { Playground } from "@/components/Playground";
import { SiteNav, SiteFooter } from "@/components/SiteChrome";

export default function Home() {
  return (
    <>
      <SiteNav />
      <main>
        <Hero />
        <StatsStrip />
        <Glossary />
        <Playground />
      </main>
      <SiteFooter />
    </>
  );
}

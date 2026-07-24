import { AIConsultants } from "@/components/site/ai-consultants";
import { AvailableNow } from "@/components/site/available-now";
import { Blog } from "@/components/site/blog";
import { Footer } from "@/components/site/footer";
import { Header } from "@/components/site/header";
import { Hero } from "@/components/site/hero";
import { Horoscope } from "@/components/site/horoscope";
import { Spreads } from "@/components/site/spreads";
import { Trust } from "@/components/site/trust";

export default function Home() {
  return (
    <div id="top" className="relative min-h-screen overflow-x-hidden">
      {/* decorative celestial backdrop */}
      <div
        aria-hidden
        className="pointer-events-none fixed inset-0 -z-10 opacity-[0.5]"
      >
        <div className="absolute left-[8%] top-[18%] text-gold/40 animate-twinkle text-lg">
          ✦
        </div>
        <div
          className="absolute right-[12%] top-[26%] text-accent1/30 animate-twinkle text-2xl"
          style={{ animationDelay: "1.2s" }}
        >
          ✦
        </div>
        <div
          className="absolute left-[18%] top-[62%] text-gold/30 animate-twinkle"
          style={{ animationDelay: "2s" }}
        >
          ✦
        </div>
        <div
          className="absolute right-[16%] top-[70%] text-accent1/20 animate-twinkle text-lg"
          style={{ animationDelay: "0.6s" }}
        >
          ✦
        </div>
      </div>

      <Header />
      <main>
        <Spreads />
        <AvailableNow />
        <Hero />
        <AIConsultants />
        <Trust />
        <Horoscope />
        <Blog />
        <Footer />
      </main>
    </div>
  );
}

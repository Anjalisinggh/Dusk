import { Skyline } from "@/components/Skyline";
import { Web } from "@/components/Web";
import { Tendrils } from "@/components/Tendrils";
import { Particles } from "@/components/Particles";
import { Parallax } from "@/components/Parallax";
import { SymbioteOrb } from "@/components/SymbioteOrb";
import { Clock } from "@/components/Clock";

export default function Home() {
  return (
    <main className="scene">
      {/* back to front: sky, light, city, fog, web, tendrils, dust, words */}
      <div className="sky" aria-hidden />
      <div className="sun layer" style={{ "--depth": 4 } as React.CSSProperties} aria-hidden />
      <Skyline />
      <div className="fog fog--far" aria-hidden />
      <Web />
      <div className="fog fog--near" aria-hidden />
      <Tendrils />
      <Particles />
      <div className="vignette" aria-hidden />

      <header className="top">
        <span className="top__mark">Dusk</span>
        <Clock />
      </header>

      <section className="hero">
        <h1 className="hero__title">
          <span className="hero__line">Two sides.</span>
          <span className="hero__line hero__line--outline">One identity.</span>
        </h1>
        <p className="hero__sub">Every hero has another side.</p>
      </section>

      <div className="hero__orb">
        <SymbioteOrb />
      </div>
      <Parallax />
    </main>
  );
}

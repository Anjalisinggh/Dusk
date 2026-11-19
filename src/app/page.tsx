import { City } from "@/components/City";
import { Clock } from "@/components/Clock";
import { ThemeSwitch } from "@/components/ThemeSwitch";
import { FlipButton } from "@/components/FlipButton";

/** Copy that differs between the two hours. Only the one for the current theme is shown. */
function Two({ day, night }: { day: React.ReactNode; night: React.ReactNode }) {
  return (
    <>
      <span className="by-day">{day}</span>
      <span className="by-night">{night}</span>
    </>
  );
}

export default function Home() {
  return (
    <>
      <City />
      <div className="veil" aria-hidden />

      <header className="top">
        <a className="top__mark" href="#top">
          Dusk
        </a>
        <div className="top__right">
          <Clock />
          <ThemeSwitch />
        </div>
      </header>

      <main id="top">
        <section className="shot shot--open">
          <div className="shot__text">
            <h1 className="title">
              <span>Two sides.</span>
              <span>One identity.</span>
            </h1>
            <p className="lede">
              <Two day="Every hero has another side." night="Every hero has another side. This is it." />
            </p>
          </div>
          <p className="cue" aria-hidden>
            Scroll to go down into it
          </p>
        </section>

        <section className="shot shot--left">
          <div className="shot__text">
            <h2>
              <Two day="The side you know." night="The side you don't." />
            </h2>
            <p>
              <Two
                day="Seven forty two in the evening. The avenue runs straight into the sun and every pane of glass hands the light back. This is the city that gets its picture taken."
                night="Three twelve in the morning. Same avenue, same towers. Now the only thing you can read is which windows are still lit, and nobody is taking pictures."
              />
            </p>
          </div>
        </section>

        <section className="shot shot--right">
          <div className="shot__text">
            <h2>Down here, nothing moves.</h2>
            <p>
              <Two
                day="Same kerb, same crossing, same forty floors overhead. The street does not change between the two. Only the light does, and what the light lets you see."
                night="Same kerb, same crossing, same forty floors overhead. The street did not change. The light did, and now you see what it was hiding."
              />
            </p>
            <FlipButton />
          </div>
        </section>

        <section className="shot shot--close">
          <div className="shot__text">
            <p className="wordmark">Dusk</p>
            <p className="lede">The hour that belongs to both.</p>
          </div>
          <footer className="foot">
            <span>Sky photography: Poly Haven, CC0.</span>
            <a href="#top">Back to the top</a>
          </footer>
        </section>
      </main>
    </>
  );
}

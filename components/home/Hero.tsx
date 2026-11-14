import { T } from '@/components/ui/T';
import { imageUrl } from '@/lib/images';
import { CommandBar } from './CommandBar';
import { HowItWorksButton } from './HowItWorksButton';

const POSTER = 'https://images.unsplash.com/photo-1757356657991-c3fd6e2e812e?auto=format&fit=crop&w=2000&q=70';

/**
 * Hero with the brand film as a muted background loop. The loop plays as soon as
 * /public/videos/requestluxury-hero.mp4 exists; until then a still poster over the
 * obsidian gradient is shown.
 */
export function Hero() {
  const heroVideo = process.env.NEXT_PUBLIC_HERO_VIDEO || '';
  const explainerVideo = process.env.NEXT_PUBLIC_EXPLAINER_VIDEO || '';

  return (
    <section className="relative isolate overflow-hidden bg-obsidian text-white">
      <div aria-hidden="true" className="hero-poster absolute inset-0 -z-30" />
      {heroVideo ? (
        <video
          aria-hidden="true"
          className="absolute inset-0 -z-20 h-full w-full object-cover"
          src={heroVideo}
          poster={imageUrl(POSTER, 1600, 60)}
          autoPlay
          muted
          loop
          playsInline
          preload="metadata"
        />
      ) : (
        <img
          aria-hidden="true"
          alt=""
          src={imageUrl(POSTER, 1600, 60)}
          srcSet={`${imageUrl(POSTER, 900, 60)} 900w, ${imageUrl(POSTER, 1600, 60)} 1600w, ${imageUrl(POSTER, 2400, 60)} 2400w`}
          sizes="100vw"
          fetchPriority="high"
          className="absolute inset-0 -z-20 h-full w-full object-cover opacity-55"
        />
      )}
      <div aria-hidden="true" className="absolute inset-0 -z-10 bg-gradient-to-b from-obsidian/80 via-obsidian/45 to-obsidian" />
      <div aria-hidden="true" className="hero-lines absolute inset-0 -z-10 opacity-60" />

      <div className="container-rl pb-12 pt-20 md:pt-28 lg:pt-36">
        <div className="max-w-4xl animate-fade-up">
          <p className="eyebrow eyebrow-light">
            <T k="hero.eyebrow" />
          </p>
          <h1 className="display mt-6 text-[2.9rem] sm:text-6xl lg:text-[5.4rem]">
            <T k="hero.title" />
          </h1>
          <p className="mt-7 max-w-2xl text-base leading-relaxed text-white/75 md:text-lg">
            <T k="hero.subtitle" />
          </p>
          <div className="mt-10">
            <HowItWorksButton videoSrc={explainerVideo} />
          </div>
        </div>

        <div className="mt-14 md:mt-20">
          <CommandBar />
        </div>

        <p className="mt-8 text-center text-[11px] uppercase tracking-[0.3em] text-white/45">
          London · Geneva · Dubai · Monaco · New York
        </p>
      </div>
    </section>
  );
}

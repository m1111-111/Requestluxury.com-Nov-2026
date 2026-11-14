'use client';

import { useEffect, useState } from 'react';
import { Play } from 'lucide-react';
import { usePreferences } from '@/components/providers/PreferencesProvider';
import { Modal } from '@/components/ui/Modal';

const STEPS = [
  {
    number: '01',
    title: 'Curated global inventory & private deal rooms',
    text: 'Every listing is submitted by a vetted dealer and reviewed by our moderators before it is published. Floor plans, provenance and survey documents wait in a private deal room, released when you register your interest.',
  },
  {
    number: '02',
    title: 'Live timed auctions & instant multi-currency pricing',
    text: 'See every price in your own currency at the live rate. Buy outright, reserve with a refundable deposit, or bid in a timed auction that extends by two minutes whenever a late bid arrives.',
  },
  {
    number: '03',
    title: 'Direct specialist concierge & jet charter',
    text: 'Each enquiry is registered with a reference and protected for twelve months. Our concierge introduces you to the right specialist and can arrange the charter, the FX and the insurance around your purchase.',
  },
  {
    number: '04',
    title: 'One address for six worlds',
    text: 'Residences, supercars, yachts, aviation, horology and jewelry: one account, one concierge, and one standard of discretion from London and Geneva to Dubai, Monaco and New York.',
  },
];

/** "Watch how RequestLuxury works (60s)". Plays the explainer film when one has been rendered, otherwise a storyboard. */
export function HowItWorksButton({ videoSrc }: { videoSrc: string }) {
  const { t } = usePreferences();
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState(0);

  useEffect(() => {
    if (!open || videoSrc) return;
    const timer = window.setInterval(() => setStep((current) => (current + 1) % STEPS.length), 6000);
    return () => window.clearInterval(timer);
  }, [open, videoSrc]);

  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className="group inline-flex items-center gap-4 text-start">
        <span className="flex h-14 w-14 items-center justify-center rounded-full border border-gold/70 text-gold transition-colors group-hover:bg-gold group-hover:text-obsidian">
          <Play aria-hidden="true" className="h-5 w-5 translate-x-0.5 fill-current rtl:-translate-x-0.5 rtl:rotate-180" />
        </span>
        <span className="text-[12px] font-semibold uppercase tracking-[0.18em] text-white/90 group-hover:text-gold">{t('hero.watch')}</span>
      </button>

      <Modal open={open} onClose={() => setOpen(false)} title="How RequestLuxury works" size="xl" tone="dark">
        {videoSrc ? (
          <video src={videoSrc} controls autoPlay playsInline className="aspect-video w-full bg-black" />
        ) : (
          <div className="grid gap-8 lg:grid-cols-[1fr_1.1fr]">
            <ol className="space-y-2">
              {STEPS.map((item, index) => (
                <li key={item.number}>
                  <button
                    type="button"
                    onClick={() => setStep(index)}
                    aria-current={index === step}
                    className={`flex w-full items-baseline gap-4 border-s-2 px-4 py-3 text-start transition-colors ${
                      index === step ? 'border-gold bg-white/5' : 'border-white/10 hover:border-white/40'
                    }`}
                  >
                    <span className="font-serif text-xl text-gold">{item.number}</span>
                    <span className={`text-[15px] leading-snug ${index === step ? 'text-white' : 'text-white/60'}`}>{item.title}</span>
                  </button>
                </li>
              ))}
            </ol>
            <div key={step} className="hero-poster hero-lines flex min-h-[18rem] animate-fade-up flex-col justify-end border border-white/10 p-8">
              <p className="font-serif text-6xl text-gold/90">{STEPS[step].number}</p>
              <h3 className="mt-4 font-serif text-3xl leading-tight">{STEPS[step].title}</h3>
              <p className="mt-4 text-[15px] leading-relaxed text-white/75">{STEPS[step].text}</p>
              <div aria-hidden="true" className="mt-6 flex gap-2">
                {STEPS.map((item, index) => (
                  <span key={item.number} className={`h-0.5 flex-1 ${index <= step ? 'bg-gold' : 'bg-white/15'}`} />
                ))}
              </div>
            </div>
          </div>
        )}
      </Modal>
    </>
  );
}

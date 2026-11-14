import type { Metadata } from 'next';
import { Mail, MessageCircle } from 'lucide-react';
import { LeadForm } from '@/components/forms/LeadForm';
import { SITE } from '@/lib/constants';

export const metadata: Metadata = {
  title: 'Contact the Concierge Desk',
  description: 'Speak to the RequestLuxury concierge desk about an asset, a charter, a bespoke search or a partnership.',
  alternates: { canonical: '/contact' },
};

export default function ContactPage() {
  return (
    <section className="container-rl grid gap-12 py-16 md:py-24 lg:grid-cols-[1fr_520px] lg:gap-20">
      <div>
        <p className="eyebrow">Concierge desk</p>
        <h1 className="display mt-4 text-5xl text-obsidian md:text-7xl">How can we help?</h1>
        <p className="mt-6 max-w-xl text-[1.05rem] leading-relaxed text-stone">
          Ask about a listing, brief us on something you want found, or talk to us about listing your inventory. A specialist replies personally, normally within
          one business day.
        </p>
        <ul className="mt-10 space-y-5">
          <li className="flex items-center gap-4">
            <span className="flex h-12 w-12 items-center justify-center border border-gold/50 bg-white">
              <Mail aria-hidden="true" className="h-5 w-5 text-gold-deep" strokeWidth={1.5} />
            </span>
            <span>
              <span className="label !mb-0">Email</span>
              <a href={`mailto:${SITE.conciergeEmail}`} className="text-[15px] font-semibold text-obsidian hover:text-gold-deep">
                {SITE.conciergeEmail}
              </a>
            </span>
          </li>
          {SITE.whatsapp && (
            <li className="flex items-center gap-4">
              <span className="flex h-12 w-12 items-center justify-center border border-gold/50 bg-white">
                <MessageCircle aria-hidden="true" className="h-5 w-5 text-gold-deep" strokeWidth={1.5} />
              </span>
              <span>
                <span className="label !mb-0">WhatsApp</span>
                <a href={`https://wa.me/${SITE.whatsapp}`} target="_blank" rel="noopener noreferrer" className="text-[15px] font-semibold text-obsidian hover:text-gold-deep">
                  Message the concierge
                </a>
              </span>
            </li>
          )}
        </ul>
      </div>
      <div className="border border-sand bg-white p-6 shadow-card md:p-8">
        <LeadForm
          leadType="concierge_service"
          metadata={{ service: 'general-enquiry', source: 'contact-page' }}
          fields={[
            {
              name: 'topic',
              label: 'Topic',
              type: 'select',
              options: ['A listing', 'Bespoke sourcing', 'Charter', 'Selling with RequestLuxury', 'Sponsorship', 'Press', 'Something else'],
              required: true,
            },
          ]}
          messageLabel="Your message"
          messageRequired
        />
      </div>
    </section>
  );
}

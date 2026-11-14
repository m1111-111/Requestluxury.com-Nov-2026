import { Resend } from 'resend';
import type { Lead, LeadReceipt, LeadType } from '@/types';
import { FEES, LEAD_TYPE_LABELS, SITE } from './constants';
import { escapeHtml, formatDate } from './format';

export interface EmailMessage {
  to: string | string[];
  subject: string;
  html: string;
  text: string;
  replyTo?: string;
  cc?: string[];
}

export interface EmailResult {
  ok: boolean;
  /** False when the message was written to the server log instead of being sent. */
  delivered: boolean;
  error?: string;
}

export function adminEmail(): string {
  return process.env.ADMIN_EMAIL || SITE.conciergeEmail;
}

function fromAddress(): string {
  return process.env.EMAIL_FROM || `RequestLuxury Concierge <${SITE.conciergeEmail}>`;
}

/**
 * Sends through Resend. Without RESEND_API_KEY the message is printed to the server
 * log, so every flow keeps working before email is configured.
 */
export async function sendEmail(message: EmailMessage): Promise<EmailResult> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    console.info(
      `[email:console-fallback] RESEND_API_KEY is not set. To: ${[message.to].flat().join(', ')} | Subject: ${message.subject}\n${message.text}`,
    );
    return { ok: true, delivered: false };
  }
  try {
    const resend = new Resend(apiKey);
    const { error } = await resend.emails.send({
      from: fromAddress(),
      to: message.to,
      subject: message.subject,
      html: message.html,
      text: message.text,
      replyTo: message.replyTo,
      cc: message.cc,
    });
    if (error) {
      console.error(`[email] Resend rejected "${message.subject}": ${error.message}`);
      return { ok: false, delivered: false, error: error.message };
    }
    return { ok: true, delivered: true };
  } catch (error) {
    const reason = error instanceof Error ? error.message : 'unknown error';
    console.error(`[email] Failed to send "${message.subject}": ${reason}`);
    return { ok: false, delivered: false, error: reason };
  }
}

// ── Templates ────────────────────────────────────────────────────────────────

function layout(heading: string, bodyHtml: string): string {
  return `<!doctype html>
<html lang="en">
<body style="margin:0;padding:0;background:#FAF9F6;font-family:Helvetica,Arial,sans-serif;color:#171717;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#FAF9F6;padding:32px 12px;">
<tr><td align="center">
<table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:#ffffff;border:1px solid #E8E4DA;">
<tr><td style="background:#0B0B0C;padding:26px 32px;">
<div style="font-family:Georgia,'Times New Roman',serif;font-size:20px;letter-spacing:5px;color:#C5A467;">REQUEST LUXURY</div>
</td></tr>
<tr><td style="padding:32px;">
<h1 style="margin:0 0 18px;font-family:Georgia,'Times New Roman',serif;font-weight:400;font-size:26px;line-height:1.25;color:#0B0B0C;">${escapeHtml(heading)}</h1>
${bodyHtml}
</td></tr>
<tr><td style="padding:20px 32px;border-top:1px solid #E8E4DA;font-size:12px;line-height:1.6;color:#6B6860;">
RequestLuxury &middot; <a href="${SITE.url}" style="color:#8A6D2F;">${SITE.url.replace(/^https?:\/\//, '')}</a> &middot; ${escapeHtml(SITE.conciergeEmail)}
</td></tr>
</table>
</td></tr>
</table>
</body>
</html>`;
}

function rows(pairs: Array<[string, string | null | undefined]>): string {
  const cells = pairs
    .filter(([, value]) => value !== null && value !== undefined && value !== '')
    .map(
      ([label, value]) =>
        `<tr><td style="padding:8px 12px 8px 0;font-size:12px;letter-spacing:1px;text-transform:uppercase;color:#6B6860;white-space:nowrap;vertical-align:top;">${escapeHtml(label)}</td><td style="padding:8px 0;font-size:14px;line-height:1.5;color:#171717;">${escapeHtml(value).replace(/\n/g, '<br>')}</td></tr>`,
    )
    .join('');
  return `<table role="presentation" cellpadding="0" cellspacing="0" style="width:100%;border-top:1px solid #E8E4DA;border-bottom:1px solid #E8E4DA;margin:18px 0;">${cells}</table>`;
}

function paragraph(text: string): string {
  return `<p style="margin:0 0 14px;font-size:15px;line-height:1.65;color:#171717;">${text}</p>`;
}

function button(label: string, href: string): string {
  return `<p style="margin:22px 0 6px;"><a href="${escapeHtml(href)}" style="display:inline-block;background:#0B0B0C;color:#C5A467;text-decoration:none;font-size:13px;letter-spacing:2px;text-transform:uppercase;padding:14px 26px;">${escapeHtml(label)}</a></p>`;
}

function plain(pairs: Array<[string, string | null | undefined]>): string {
  return pairs
    .filter(([, value]) => value)
    .map(([label, value]) => `${label}: ${value}`)
    .join('\n');
}

export interface LeadEmailContext {
  leadType: LeadType;
  name: string;
  email: string;
  phone?: string | null;
  message?: string | null;
  listingTitle?: string | null;
  listingUrl?: string | null;
  details?: Array<[string, string]>;
}

/** Internal notification for every new lead. */
export function leadNotificationEmail(receipt: LeadReceipt, context: LeadEmailContext): EmailMessage {
  const pairs: Array<[string, string | null | undefined]> = [
    ['Reference', receipt.reference],
    ['Type', LEAD_TYPE_LABELS[context.leadType]],
    ['Name', context.name],
    ['Email', context.email],
    ['Phone', context.phone],
    ['Asset', context.listingTitle],
    ['Partner', receipt.dealer_name],
    ...(context.details ?? []),
    ['Message', context.message],
    ['Lead fee tier', receipt.lead_fee_tier_gbp > 0 ? `£${receipt.lead_fee_tier_gbp}` : null],
    ['Protected until', formatDate(receipt.protection_expires_at)],
  ];
  const heading = `New ${LEAD_TYPE_LABELS[context.leadType].toLowerCase()}: ${receipt.reference}`;
  return {
    to: adminEmail(),
    replyTo: context.email,
    subject: `[${receipt.reference}] ${LEAD_TYPE_LABELS[context.leadType]}${context.listingTitle ? ` · ${context.listingTitle}` : ''}`,
    html: layout(heading, rows(pairs) + button('Open in admin', `${SITE.url}/admin/leads`)),
    text: `${heading}\n\n${plain(pairs)}\n\n${SITE.url}/admin/leads`,
  };
}

/** Confirmation to the buyer, carrying the protected reference. */
export function leadConfirmationEmail(receipt: LeadReceipt, context: LeadEmailContext): EmailMessage {
  const subject = context.listingTitle
    ? `Your private enquiry: ${context.listingTitle} (${receipt.reference})`
    : `We have your request (${receipt.reference})`;
  const intro = context.listingTitle
    ? `Thank you, ${escapeHtml(context.name)}. Your enquiry about <strong>${escapeHtml(context.listingTitle)}</strong> has been registered and passed to our concierge desk.`
    : `Thank you, ${escapeHtml(context.name)}. Your request has been registered with our concierge desk.`;
  const pairs: Array<[string, string | null | undefined]> = [
    ['Your reference', receipt.reference],
    ['Registered until', formatDate(receipt.protection_expires_at)],
  ];
  const body =
    paragraph(intro) +
    rows(pairs) +
    paragraph(
      `A specialist will reply personally, normally within one business day. Please quote your reference in any correspondence: it records your introduction for ${FEES.protectionMonths} months, so the terms we arrange for you are honoured throughout.`,
    ) +
    (context.listingUrl ? button('View the listing', context.listingUrl) : '');
  return {
    to: context.email,
    replyTo: adminEmail(),
    subject,
    html: layout('Your request is registered', body),
    text: `Thank you, ${context.name}. Your request has been registered.\n\n${plain(pairs)}\n\nA specialist will reply personally, normally within one business day.\n\nRequestLuxury Concierge\n${SITE.conciergeEmail}`,
  };
}

/** The 12-Month Registration Certificate sent to the partner dealer when a lead is forwarded. */
export function registrationCertificateEmail(
  lead: Lead,
  dealer: { company_name: string; contact_email: string },
  listingTitle: string | null,
): EmailMessage {
  const pairs: Array<[string, string | null | undefined]> = [
    ['Certificate no.', lead.lead_reference_code],
    ['Introduced client', lead.buyer_name],
    ['Client email', lead.buyer_email],
    ['Client phone', lead.buyer_phone],
    ['Introduced to', dealer.company_name],
    ['Asset of interest', listingTitle ?? 'Bespoke request (see message)'],
    ['Date registered', formatDate(lead.created_at)],
    ['Protected until', formatDate(lead.protection_expires_at)],
    ['Client message', lead.message],
  ];
  const terms = `This certificate records that RequestLuxury introduced the client named above to ${escapeHtml(dealer.company_name)} on the date shown. Any transaction concluded between the client and ${escapeHtml(dealer.company_name)}, for this or any other asset, within ${FEES.protectionMonths} months of the registration date is attributable to this introduction under the partner agreement.`;
  const body =
    paragraph(`Please find below a new client introduction from RequestLuxury, together with its registration certificate.`) +
    rows(pairs) +
    paragraph(`<span style="font-size:13px;color:#6B6860;">${terms}</span>`) +
    paragraph('Please reply to this email to confirm receipt and contact the client directly, quoting the certificate number.');
  return {
    to: dealer.contact_email,
    cc: [adminEmail()],
    replyTo: adminEmail(),
    subject: `Client introduction & 12-month registration certificate ${lead.lead_reference_code}`,
    html: layout('Certificate of Introduction', body),
    text: `CERTIFICATE OF INTRODUCTION — 12-MONTH REGISTRATION\n\n${plain(pairs)}\n\n${terms.replace(/<[^>]+>/g, '')}`,
  };
}

export function dealerApplicationEmail(
  application: Record<string, string>,
  listingsReceived: number,
  rejected: number,
): EmailMessage {
  const pairs: Array<[string, string | null | undefined]> = [
    ['Company', application.company_name],
    ['Contact', application.contact_name],
    ['Email', application.contact_email],
    ['WhatsApp', application.whatsapp_number],
    ['Website', application.website_url],
    ['Vertical', application.vertical_focus],
    ['Location', [application.city, application.country].filter(Boolean).join(', ')],
    ['RERA ORN', application.rera_orn_number],
    ['Feed URL', application.feed_url],
    ['Listings received', String(listingsReceived)],
    ['Rows rejected', rejected > 0 ? String(rejected) : null],
  ];
  return {
    to: adminEmail(),
    replyTo: application.contact_email,
    subject: `New dealer application: ${application.company_name}`,
    html: layout('New dealer application', rows(pairs) + button('Review in admin', `${SITE.url}/admin/dealers`)),
    text: `New dealer application\n\n${plain(pairs)}\n\n${SITE.url}/admin/dealers`,
  };
}

export function paymentNotificationEmail(payment: {
  kind: string;
  status: string;
  amount: string;
  buyerEmail: string | null;
  reference: string | null;
  listingTitle: string | null;
}): EmailMessage {
  const pairs: Array<[string, string | null | undefined]> = [
    ['Payment', payment.kind.replace(/_/g, ' ')],
    ['Status', payment.status],
    ['Amount', payment.amount],
    ['Client', payment.buyerEmail],
    ['Lead reference', payment.reference],
    ['Asset', payment.listingTitle],
  ];
  return {
    to: adminEmail(),
    subject: `Stripe ${payment.status}: ${payment.kind.replace(/_/g, ' ')} ${payment.amount}`,
    html: layout('Stripe payment update', rows(pairs) + button('Open admin', `${SITE.url}/admin`)),
    text: `Stripe payment update\n\n${plain(pairs)}`,
  };
}

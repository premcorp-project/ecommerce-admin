'use client';

/**
 * ContactPageContent — modern contact page with form + info cards.
 *
 * Layout:
 * - Hero section with heading + subtitle
 * - 3 info cards (Email, Phone, Location)
 * - 2-column: Contact form (left) + Additional info (right)
 *
 * Form fields: Name, Email, Phone (optional), Subject, Message
 * On submit: shows success toast (backend endpoint can be wired later)
 */
import { useState } from 'react';
import { Clock, Mail, MapPin, Phone, Send } from 'lucide-react';
import { useTranslations } from 'next-intl';
import toast from 'react-hot-toast';
import { cn } from '@/lib/utils';
import { useConfig } from '@/hooks/use-config';
import { StoreLocationMap } from '@/components/public/common/StoreLocationMap';
import { AppButton } from '@/components/shared/AppButton';

// ─── Info Card ────────────────────────────────────────────────────────────────

interface InfoCardProps {
  icon: React.ReactNode;
  title: string;
  lines: string[];
}

function InfoCard({ icon, title, lines }: InfoCardProps) {
  return (
    <div className="flex flex-col items-center text-center gap-3 rounded-xl border border-border bg-card p-6 transition-all duration-200 hover:border-primary/40 hover:shadow-lg">
      <div className="flex size-12 items-center justify-center rounded-lg bg-primary/10 text-primary">
        {icon}
      </div>
      <h3 className="text-sm font-bold text-foreground">{title}</h3>
      <div className="flex flex-col gap-0.5">
        {lines.map((line, i) => (
          <p key={i} className="text-sm text-muted-foreground">
            {line}
          </p>
        ))}
      </div>
    </div>
  );
}

// ─── Component ────────────────────────────────────────────────────────────────

export function ContactPageContent() {
  const t = useTranslations('public.contact');
  const {
    businessPhone,
    businessEmail,
    businessAddress,
    businessCity,
    businessPostcode,
    businessHours,
    businessLatitude,
    businessLongitude,
    businessName,
  } = useConfig();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const formData = new FormData(e.currentTarget);
      await fetch(
        `${process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:5000/api/v1'}/config/contact`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: formData.get('name'),
            email: formData.get('email'),
            phone: formData.get('phone') || undefined,
            subject: formData.get('subject'),
            message: formData.get('message'),
          }),
        },
      );
      setSubmitted(true);
      toast.success(t('form.successMessage'));
    } catch {
      toast.error(t('form.errorMessage'));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen">
      {/* ── Hero ──────────────────────────────────────────────────────── */}
      <section className="relative overflow-hidden bg-muted/30 py-16 md:py-24">
        {/* Decorative blobs */}
        <div
          className="absolute -top-32 -right-32 size-64 rounded-full bg-primary/5 blur-3xl"
          aria-hidden="true"
        />
        <div
          className="absolute -bottom-32 -left-32 size-64 rounded-full bg-primary/5 blur-3xl"
          aria-hidden="true"
        />

        <div className="container mx-auto px-4 sm:px-6 lg:px-8 text-center relative">
          <h1 className="text-3xl font-bold text-foreground sm:text-4xl lg:text-5xl tracking-tight">
            {t('hero.title')}
          </h1>
          <p className="mt-4 text-base text-muted-foreground max-w-xl mx-auto leading-relaxed">
            {t('hero.subtitle')}
          </p>
        </div>
      </section>

      {/* ── Info Cards ────────────────────────────────────────────────── */}
      <section className="container mx-auto px-4 sm:px-6 lg:px-8 -mt-8 relative z-10">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <InfoCard
            icon={<Mail className="size-5" />}
            title={t('info.email.title')}
            lines={[
              businessEmail || 'hello@chemibuild.com',
              t('info.email.hint'),
            ]}
          />
          <InfoCard
            icon={<Phone className="size-5" />}
            title={t('info.phone.title')}
            lines={[
              businessPhone || t('info.phone.value'),
              t('info.phone.hint'),
            ]}
          />
          <InfoCard
            icon={<MapPin className="size-5" />}
            title={t('info.location.title')}
            lines={[
              businessAddress || t('info.location.value'),
              businessCity
                ? `${businessCity}, ${businessPostcode}`
                : t('info.location.hint'),
            ]}
          />
        </div>
      </section>

      {/* ── Form + Sidebar ────────────────────────────────────────────── */}
      <section className="container mx-auto px-4 sm:px-6 lg:px-8 py-16 md:py-20">
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-10 lg:gap-14">
          {/* Left: Contact Form (3/5) */}
          <div className="lg:col-span-3">
            <div className="rounded-2xl border border-border bg-card p-6 sm:p-8 shadow-sm">
              <h2 className="text-xl font-bold text-foreground mb-1">
                {t('form.title')}
              </h2>
              <p className="text-sm text-muted-foreground mb-6">
                {t('form.subtitle')}
              </p>

              {submitted ? (
                <div className="flex flex-col items-center gap-4 py-12 text-center">
                  <div className="flex size-16 items-center justify-center rounded-full bg-green-100 dark:bg-green-900/30">
                    <Send className="size-7 text-green-600 dark:text-green-400" />
                  </div>
                  <h3 className="text-lg font-bold text-foreground">
                    {t('form.successTitle')}
                  </h3>
                  <p className="text-sm text-muted-foreground max-w-sm">
                    {t('form.successSubtitle')}
                  </p>
                  <button
                    type="button"
                    onClick={() => setSubmitted(false)}
                    className="text-sm font-medium text-primary hover:underline mt-2"
                  >
                    {t('form.sendAnother')}
                  </button>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="flex flex-col gap-5">
                  {/* Name + Email row */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="flex flex-col gap-1.5">
                      <label
                        htmlFor="contact-name"
                        className="text-sm font-medium text-foreground"
                      >
                        {t('form.name')}{' '}
                        <span className="text-destructive">*</span>
                      </label>
                      <input
                        id="contact-name"
                        name="name"
                        type="text"
                        required
                        placeholder={t('form.namePlaceholder')}
                        className={cn(
                          'w-full rounded-lg border border-border bg-background px-4 py-2.5 text-sm text-foreground',
                          'placeholder:text-muted-foreground',
                          'focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent',
                          'transition-shadow duration-150',
                        )}
                      />
                    </div>
                    <div className="flex flex-col gap-1.5">
                      <label
                        htmlFor="contact-email"
                        className="text-sm font-medium text-foreground"
                      >
                        {t('form.email')}{' '}
                        <span className="text-destructive">*</span>
                      </label>
                      <input
                        id="contact-email"
                        name="email"
                        type="email"
                        required
                        placeholder={t('form.emailPlaceholder')}
                        className={cn(
                          'w-full rounded-lg border border-border bg-background px-4 py-2.5 text-sm text-foreground',
                          'placeholder:text-muted-foreground',
                          'focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent',
                          'transition-shadow duration-150',
                        )}
                      />
                    </div>
                  </div>

                  {/* Phone + Subject row */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="flex flex-col gap-1.5">
                      <label
                        htmlFor="contact-phone"
                        className="text-sm font-medium text-foreground"
                      >
                        {t('form.phone')}
                      </label>
                      <input
                        id="contact-phone"
                        name="phone"
                        type="tel"
                        placeholder={t('form.phonePlaceholder')}
                        className={cn(
                          'w-full rounded-lg border border-border bg-background px-4 py-2.5 text-sm text-foreground',
                          'placeholder:text-muted-foreground',
                          'focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent',
                          'transition-shadow duration-150',
                        )}
                      />
                    </div>
                    <div className="flex flex-col gap-1.5">
                      <label
                        htmlFor="contact-subject"
                        className="text-sm font-medium text-foreground"
                      >
                        {t('form.subject')}{' '}
                        <span className="text-destructive">*</span>
                      </label>
                      <select
                        id="contact-subject"
                        name="subject"
                        required
                        className={cn(
                          'w-full rounded-lg border border-border bg-background px-4 py-2.5 text-sm text-foreground',
                          'focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent',
                          'transition-shadow duration-150',
                        )}
                      >
                        <option value="">{t('form.subjectPlaceholder')}</option>
                        <option value="bulk">{t('form.subjects.bulk')}</option>
                        <option value="support">
                          {t('form.subjects.support')}
                        </option>
                        <option value="order">
                          {t('form.subjects.order')}
                        </option>
                        <option value="other">
                          {t('form.subjects.other')}
                        </option>
                      </select>
                    </div>
                  </div>

                  {/* Message */}
                  <div className="flex flex-col gap-1.5">
                    <label
                      htmlFor="contact-message"
                      className="text-sm font-medium text-foreground"
                    >
                      {t('form.message')}{' '}
                      <span className="text-destructive">*</span>
                    </label>
                    <textarea
                      id="contact-message"
                      name="message"
                      required
                      rows={5}
                      placeholder={t('form.messagePlaceholder')}
                      className={cn(
                        'w-full rounded-lg border border-border bg-background px-4 py-2.5 text-sm text-foreground resize-none',
                        'placeholder:text-muted-foreground',
                        'focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent',
                        'transition-shadow duration-150',
                      )}
                    />
                  </div>

                  {/* Submit */}
                  <AppButton
                    type="submit"
                    isLoading={isSubmitting}
                    disabled={isSubmitting}
                    className="self-start"
                  >
                    <Send className="size-4" aria-hidden="true" />
                    {t('form.submit')}
                  </AppButton>
                </form>
              )}
            </div>
          </div>

          {/* Right: Additional info (2/5) */}
          <div className="lg:col-span-2 flex flex-col gap-6">
            {/* Business hours */}
            <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
              <div className="flex items-center gap-3 mb-4">
                <div className="flex size-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <Clock className="size-5" />
                </div>
                <h3 className="text-base font-bold text-foreground">
                  {t('hours.title')}
                </h3>
              </div>
              {businessHours ? (
                <p className="text-sm text-muted-foreground whitespace-pre-line">
                  {businessHours}
                </p>
              ) : (
                <div className="space-y-2.5">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">
                      {t('hours.weekdays')}
                    </span>
                    <span className="font-medium text-foreground">
                      {t('hours.weekdaysTime')}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">
                      {t('hours.saturday')}
                    </span>
                    <span className="font-medium text-foreground">
                      {t('hours.saturdayTime')}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">
                      {t('hours.sunday')}
                    </span>
                    <span className="font-medium text-foreground">
                      {t('hours.sundayTime')}
                    </span>
                  </div>
                </div>
              )}
            </div>

            {/* Quick response promise */}
            <div className="rounded-2xl border border-primary/20 bg-primary/5 p-6">
              <h3 className="text-base font-bold text-foreground mb-2">
                {t('response.title')}
              </h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                {t('response.description')}
              </p>
            </div>

            {/* FAQ link */}
            <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
              <h3 className="text-base font-bold text-foreground mb-2">
                {t('faq.title')}
              </h3>
              <p className="text-sm text-muted-foreground mb-3">
                {t('faq.description')}
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ── Store Location Map ───────────────────────────────────────── */}
      <section className="container mx-auto px-4 sm:px-6 lg:px-8 py-12 md:py-16">
        <div className="text-center mb-8">
          <h2 className="text-2xl font-bold text-foreground">
            {t('map.title')}
          </h2>
          <p className="mt-2 text-sm text-muted-foreground">
            {t('map.subtitle')}
          </p>
        </div>
        <StoreLocationMap
          latitude={businessLatitude || 53.7938}
          longitude={businessLongitude || -1.7564}
          zoom={14}
          height="400px"
          storeName={businessName || 'ChemTech'}
          storeAddress={
            [businessAddress, businessCity, businessPostcode]
              .filter(Boolean)
              .join(', ') || 'Yorkshire, UK'
          }
        />
      </section>
    </div>
  );
}

import BackButton from '../components/BackButton'

export function Privacy() {
  return (
    <section className="mx-auto max-w-4xl px-4 py-12">
      <BackButton />
      <h1 className="mt-2 font-display text-2xl font-semibold text-slate-50">
        Privacy Policy
      </h1>
      <p className="mt-4 text-sm leading-relaxed text-slate-300">
        Last updated: January 2025
      </p>
      <p className="mt-3 text-sm leading-relaxed text-slate-300">
        Your privacy matters to us. This policy explains what information we
        collect and how we use it.
      </p>

      <h2 className="mt-8 text-sm font-semibold text-slate-200">
        Information We Collect
      </h2>
      <ul className="mt-2 list-disc list-inside space-y-1 text-sm text-slate-300">
        <li>Account details (email, username, profile information)</li>
        <li>Uploaded content (beats, artwork, descriptions)</li>
        <li>
          Payment and subscription data (processed securely by third-party
          providers)
        </li>
        <li>Usage analytics (plays, likes, favorites, interactions)</li>
      </ul>

      <h2 className="mt-6 text-sm font-semibold text-slate-200">
        How We Use Your Data
      </h2>
      <ul className="mt-2 list-disc list-inside space-y-1 text-sm text-slate-300">
        <li>To operate and improve the platform experience</li>
        <li>To process payments, subscriptions, and licenses</li>
        <li>To send important account and security notifications</li>
        <li>To prevent fraud, abuse, and policy violations</li>
      </ul>

      <h2 className="mt-6 text-sm font-semibold text-slate-200">Data Sharing</h2>
      <p className="mt-2 text-sm text-slate-300">
        We do not sell your personal data. We only share information with
        trusted services required to operate RiddimBase, such as:
      </p>
      <ul className="mt-2 list-disc list-inside space-y-1 text-sm text-slate-300">
        <li>Payment processors</li>
        <li>Cloud storage providers</li>
        <li>Analytics and error-logging tools</li>
      </ul>

      <h2 className="mt-6 text-sm font-semibold text-slate-200">Cookies</h2>
      <p className="mt-2 text-sm text-slate-300">
        We use cookies and similar technologies for authentication, analytics,
        and core site functionality. You can control cookies through your
        browser settings.
      </p>

      <h2 className="mt-6 text-sm font-semibold text-slate-200">Your Rights</h2>
      <p className="mt-2 text-sm text-slate-300">
        Depending on your region, you may have the right to:
      </p>
      <ul className="mt-2 list-disc list-inside space-y-1 text-sm text-slate-300">
        <li>Request access to the personal data we hold about you</li>
        <li>Request corrections or deletion of your data</li>
        <li>Request account removal</li>
      </ul>

      <p className="mt-8 text-[11px] text-slate-500">
        For privacy questions or requests, contact{' '}
        <a
          href="mailto:privacy@riddimbase.app"
          className="text-emerald-300 hover:text-emerald-200"
        >
          privacy@riddimbase.app
        </a>
        .
      </p>
    </section>
  )
}

export default Privacy


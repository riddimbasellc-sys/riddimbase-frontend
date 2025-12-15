import BackButton from '../components/BackButton'

export function Support() {
  return (
    <section className="mx-auto max-w-4xl px-4 py-12">
      <BackButton />
      <h1 className="mt-2 font-display text-2xl font-semibold text-slate-50">
        Support
      </h1>
      <p className="mt-4 text-sm leading-relaxed text-slate-300">
        We’re here to help.
      </p>
      <p className="mt-3 text-sm leading-relaxed text-slate-300">
        If you need assistance with:
      </p>
      <ul className="mt-2 list-disc list-inside text-sm text-slate-300 space-y-1">
        <li>Account access</li>
        <li>Beat uploads</li>
        <li>Licensing or payments</li>
        <li>Subscription plans</li>
        <li>Technical issues</li>
      </ul>

      <h2 className="mt-8 text-sm font-semibold text-slate-200">
        How to contact us
      </h2>
      <ul className="mt-2 list-disc list-inside text-sm text-slate-300 space-y-1">
        <li>
          Email:{' '}
          <a
            href="mailto:support@riddimbase.app"
            className="text-emerald-300 hover:text-emerald-200"
          >
            support@riddimbase.app
          </a>
        </li>
        <li>Live Chat: available on the site when we’re online</li>
        <li>Response time: within 24–48 hours</li>
      </ul>

      <h2 className="mt-8 text-sm font-semibold text-slate-200">
        When you reach out
      </h2>
      <p className="mt-2 text-sm leading-relaxed text-slate-300">
        To help us solve your issue faster, please include:
      </p>
      <ul className="mt-2 list-disc list-inside text-sm text-slate-300 space-y-1">
        <li>Your username or account email</li>
        <li>A brief description of the issue</li>
        <li>Screenshots or links (if applicable)</li>
      </ul>
    </section>
  )
}

export default Support


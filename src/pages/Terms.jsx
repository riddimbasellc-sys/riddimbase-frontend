import BackButton from '../components/BackButton'

export function Terms() {
  return (
    <section className="mx-auto max-w-4xl px-4 py-12">
      <BackButton />
      <h1 className="mt-2 font-display text-2xl font-semibold text-slate-50">
        Terms of Service
      </h1>
      <p className="mt-4 text-sm leading-relaxed text-slate-300">
        Last updated: January 2025
      </p>
      <p className="mt-3 text-sm leading-relaxed text-slate-300">
        By accessing or using RiddimBase (“the Platform”), you agree to the
        following terms.
      </p>

      <h2 className="mt-8 text-sm font-semibold text-slate-200">1. Accounts</h2>
      <p className="mt-2 text-sm text-slate-300">
        You must provide accurate information when creating an account. You are
        responsible for maintaining the security of your account and any
        activity that occurs under it.
      </p>

      <h2 className="mt-6 text-sm font-semibold text-slate-200">
        2. Producer Content
      </h2>
      <p className="mt-2 text-sm text-slate-300">
        Producers retain full ownership of their beats. By uploading content,
        you grant RiddimBase permission to display and distribute the content
        solely for marketplace functionality, including previews, search, and
        promotion within the platform.
      </p>

      <h2 className="mt-6 text-sm font-semibold text-slate-200">
        3. Licensing &amp; Sales
      </h2>
      <p className="mt-2 text-sm text-slate-300">
        All beat purchases are licenses, not ownership transfers, unless
        explicitly stated (for example, an exclusive license). License terms and
        usage rights are defined at checkout and in the license documents
        delivered after purchase.
      </p>

      <h2 className="mt-6 text-sm font-semibold text-slate-200">
        4. Payments &amp; Subscriptions
      </h2>
      <p className="mt-2 text-sm text-slate-300">
        Subscription fees and transaction charges are non-refundable unless
        required by law. RiddimBase may update pricing or plan features with
        prior notice. Continued use of the Platform after changes means you
        accept the updated terms.
      </p>

      <h2 className="mt-6 text-sm font-semibold text-slate-200">
        5. Prohibited Use
      </h2>
      <p className="mt-2 text-sm text-slate-300">
        You may not use RiddimBase to:
      </p>
      <ul className="mt-2 list-disc list-inside space-y-1 text-sm text-slate-300">
        <li>Upload stolen, infringing, or copyrighted material you do not own</li>
        <li>Abuse messaging, comments, or platform tools</li>
        <li>Attempt to exploit payments, subscriptions, or analytics</li>
        <li>Harass, threaten, or defraud other users</li>
      </ul>

      <h2 className="mt-6 text-sm font-semibold text-slate-200">6. Termination</h2>
      <p className="mt-2 text-sm text-slate-300">
        We reserve the right to suspend or terminate accounts that violate these
        terms, applicable laws, or community guidelines. In serious cases,
        payouts may be held or restricted pending review.
      </p>

      <h2 className="mt-6 text-sm font-semibold text-slate-200">
        7. Limitation of Liability
      </h2>
      <p className="mt-2 text-sm text-slate-300">
        RiddimBase is not responsible for disputes between buyers and producers
        beyond enforcing license delivery and providing reasonable support. The
        Platform is provided “as is” and we do not guarantee sales, exposure, or
        specific results.
      </p>

      <p className="mt-8 text-[11px] text-slate-500">
        For questions about these terms, contact{' '}
        <a
          href="mailto:support@riddimbase.app"
          className="text-emerald-300 hover:text-emerald-200"
        >
          support@riddimbase.app
        </a>
        .
      </p>
    </section>
  )
}

export default Terms


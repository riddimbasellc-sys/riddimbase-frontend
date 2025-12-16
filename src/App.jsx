import { Login } from './pages/Login'
import { Signup } from './pages/Signup'
import { Routes, Route } from 'react-router-dom'
import { Layout } from './components/Layout'
import { Home } from './pages/Home'
import LandingPage from './pages/LandingPage'
import { Beats } from './pages/Beats'
import { BeatDetails } from './pages/BeatDetails'
import { ProducerDashboard } from './pages/ProducerDashboard'
import { ProducerPro } from './pages/ProducerPro'
import { ProducerProfile } from './pages/ProducerProfile'
import { BoostBeat } from './pages/BoostBeat'
import { Producers } from './pages/Producers'
import { Favorites } from './pages/Favorites'
import { UploadBeat } from './pages/UploadBeat'
import { ArtistDashboard } from './pages/ArtistDashboard'
import { Checkout } from './pages/Checkout'
import { AdminDashboard } from './pages/AdminDashboard'
import { AdminBeats } from './pages/AdminBeats'
import { AdminUsers } from './pages/AdminUsers'
import { AdminPayouts } from './pages/AdminPayouts'
import { AdminCoupons } from './pages/AdminCoupons'
import { AdminBanners } from './pages/AdminBanners'
import { AdminAnnouncements } from './pages/AdminAnnouncements'
import { AdminEmailBlast } from './pages/AdminEmailBlast'
import { AdminPlans } from './pages/AdminPlans'
import { AdminReports } from './pages/AdminReports'
import { AdminPlaylists } from './pages/AdminPlaylists'
import { AdminAdsManager } from './pages/AdminAdsManager'
import { AdminJobs } from './pages/AdminJobs'
import { useAdminRole } from './hooks/useAdminRole'
import { Pricing } from './pages/Pricing'
import { SubscriptionCheckout } from './pages/SubscriptionCheckout'
import { Services } from './pages/Services'
import { ServiceProviderProfile } from './pages/ServiceProviderProfile'
import { EditProfile } from './pages/EditProfile'
import { ManageServices } from './pages/ManageServices'
import { JobsBoard } from './pages/JobsBoard'
import { JobPostForm } from './pages/JobPostForm'
import { JobDetails } from './pages/JobDetails'
import ErrorBoundary from './components/ErrorBoundary'
import { Cart } from './pages/Cart'
import { WithdrawEarnings } from './pages/WithdrawEarnings'
import { CartProvider } from './context/CartContext'
import { About } from './pages/About'
import { FAQ } from './pages/FAQ'
import { Support } from './pages/Support'
import { Terms } from './pages/Terms'
import { Privacy } from './pages/Privacy'
import { SupportGeneral } from './pages/support/SupportGeneral'
import { SupportLicensing } from './pages/support/SupportLicensing'
import { SupportEarnings } from './pages/support/SupportEarnings'
import { SupportSafety } from './pages/support/SupportSafety'
import { AdminAgents } from './pages/AdminAgents'
import { AdminTickets } from './pages/AdminTickets'
import { AdminFooterLinks } from './pages/AdminFooterLinks'
import { AdminSocials } from './pages/AdminSocials'
import { AdminSubscriptions } from './pages/AdminSubscriptions'
import AdminTheme from './pages/AdminTheme'
import AdminEmailTemplates from './pages/AdminEmailTemplates'
import AdminAnalytics from './pages/AdminAnalytics'
import AdminDesign from './pages/AdminDesign'
import AdminChat from './pages/AdminChat'
import ProducerInbox from './pages/ProducerInbox'
import { JobDelivery } from './pages/JobDelivery'
import { MyJobs } from './pages/MyJobs'
import { MyAds } from './pages/MyAds'
import { Chat } from './pages/Chat'
import UploadSoundkit from './pages/UploadSoundkit'
import Soundkits from './pages/Soundkits'
import Feed from './pages/Feed'
import { MultiCheckout } from './pages/MultiCheckout'
import ProducerStore from './pages/ProducerStore'

function App() {
  const { isAdmin } = useAdminRole()
  return (
    <ErrorBoundary>
      <CartProvider>
      <Layout>
        <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<Signup />} />
        <Route path="/" element={<LandingPage />} />
        {/* Keep /home for old links but show the same landing experience */}
        <Route path="/home" element={<LandingPage />} />
        <Route path="/beats" element={<Beats />} />
        <Route path="/feed" element={<Feed />} />
        <Route path="/soundkits" element={<Soundkits />} />
        <Route path="/beat/:id" element={<BeatDetails />} />
        <Route path="/beat/:idSlug" element={<BeatDetails />} />
        <Route path="/boost/:beatId" element={<BoostBeat />} />
        <Route path="/producer/dashboard" element={<ProducerDashboard />} />
        <Route path="/producer/pro" element={<ProducerPro />} />
        <Route path="/producer/:producerId" element={<ProducerProfile />} />
        <Route path="/producer/:producerId/store" element={<ProducerStore />} />
        <Route path="/producers" element={<Producers />} />
        <Route path="/favorites" element={<Favorites />} />
        <Route path="/producer/upload" element={<UploadBeat />} />
        <Route path="/producer/soundkits" element={<UploadSoundkit />} />
        <Route path="/producer/withdraw" element={<WithdrawEarnings />} />
        <Route path="/producer/inbox" element={<ProducerInbox />} />
        <Route path="/artist/dashboard" element={<ArtistDashboard />} />
        <Route path="/pricing" element={<Pricing />} />
        <Route path="/services" element={<Services />} />
        <Route path="/services/:id" element={<ServiceProviderProfile />} />
        <Route path="/profile/edit" element={<EditProfile />} />
        <Route path="/services/manage" element={<ManageServices />} />
        <Route path="/jobs" element={<JobsBoard />} />
        <Route path="/jobs/my" element={<MyJobs />} />
        <Route path="/jobs/post" element={<JobPostForm />} />
        <Route path="/jobs/:jobId" element={<JobDetails />} />
        <Route path="/jobs/:jobId/delivery" element={<JobDelivery />} />
        <Route path="/subscribe/:planId" element={<SubscriptionCheckout />} />
        <Route path="/checkout/:id" element={<Checkout />} />
        <Route path="/checkout/cart" element={<MultiCheckout />} />
        <Route path="/my-ads" element={<MyAds />} />
        <Route path="/chat" element={<Chat />} />
        <Route path="/cart" element={<Cart />} />
        <Route path="/about" element={<About />} />
        <Route path="/faq" element={<FAQ />} />
        <Route path="/support" element={<Support />} />
        <Route path="/support/general" element={<SupportGeneral />} />
        <Route path="/support/licensing" element={<SupportLicensing />} />
        <Route path="/support/earnings" element={<SupportEarnings />} />
        <Route path="/support/safety" element={<SupportSafety />} />
        <Route path="/terms" element={<Terms />} />
        <Route path="/privacy" element={<Privacy />} />
        {/* Admin routes: gated pages themselves show Access Denied if not admin */}
        <Route path="/admin" element={<AdminDashboard />} />
        <Route path="/admin/beats" element={<AdminBeats />} />
        <Route path="/admin/users" element={<AdminUsers />} />
        <Route path="/admin/payouts" element={<AdminPayouts />} />
        <Route path="/admin/coupons" element={<AdminCoupons />} />
        <Route path="/admin/banners" element={<AdminBanners />} />
        <Route path="/admin/announcements" element={<AdminAnnouncements />} />
        <Route path="/admin/email-blast" element={<AdminEmailBlast />} />
        <Route path="/admin/plans" element={<AdminPlans />} />
        <Route path="/admin/reports" element={<AdminReports />} />
        <Route path="/admin/playlists" element={<AdminPlaylists />} />
        <Route path="/admin/subscriptions" element={<AdminSubscriptions />} />
        <Route path="/admin/ads" element={<AdminAdsManager />} />
        <Route path="/admin/jobs" element={<AdminJobs />} />
        <Route path="/admin/tickets" element={<AdminTickets />} />
        <Route path="/admin/footer-links" element={<AdminFooterLinks />} />
        <Route path="/admin/agents" element={<AdminAgents />} />
        <Route path="/admin/chat" element={<AdminChat />} />
        <Route path="/admin/socials" element={<AdminSocials />} />
        <Route path="/admin/theme" element={<AdminTheme />} />
        <Route path="/admin/email-templates" element={<AdminEmailTemplates />} />
        <Route path="/admin/analytics" element={<AdminAnalytics />} />
        <Route path="/admin/design" element={<AdminDesign />} />
        </Routes>
      </Layout>
      </CartProvider>
    </ErrorBoundary>
  )
}

export default App



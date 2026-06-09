import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import logo from '@/assets/Logo.png';
import { Shield, Truck, FileText, Users, BarChart3, CheckCircle, ArrowRight } from 'lucide-react';
import TermsOfUseModal from '@/components/TermsOfUseModal';
import PrivacyPolicyModal from '@/components/Privacypolicymodal';
import { getPublicStats } from '@/services/api';

interface DashboardStats {
  activeTenders: number;
  approvedSuppliers: number;
  totalBids: number;
}

const FEATURES = [
  {
    icon: FileText,
    title: 'Browse tenders',
    desc: 'View open procurement opportunities and express interest in tenders relevant to your business.',
  },
  {
    icon: Users,
    title: 'Submit bids',
    desc: 'Prepare and submit competitive bids with all required documentation through our secure platform.',
  },
  {
    icon: BarChart3,
    title: 'Track progress',
    desc: 'Monitor bid evaluations, receive real-time notifications, and manage awarded contracts.',
  },
] as const;

function AnimatedCounter({ value, loading }: { value: number; loading: boolean }) {
  const [display, setDisplay] = useState(0);

  useEffect(() => {
    if (loading || value === 0) { setDisplay(0); return; }
    const steps     = 40;
    const increment = value / steps;
    let current     = 0;
    const timer = setInterval(() => {
      current += increment;
      if (current >= value) { setDisplay(value); clearInterval(timer); }
      else setDisplay(Math.floor(current));
    }, 1000 / steps);
    return () => clearInterval(timer);
  }, [value, loading]);

  if (loading) return <span className="animate-pulse">...</span>;
  return <>{display.toLocaleString()}</>;
}

export default function LandingPage() {
  const [stats, setStats]     = useState<DashboardStats>({ activeTenders: 0, approvedSuppliers: 0, totalBids: 0 });
  const [loading, setLoading] = useState(true);
  const [showTerms, setShowTerms] = useState(false);
  const [showPrivacy, setShowPrivacy] = useState(false);

  useEffect(() => {
    getPublicStats()
      .then(({ data }) => setStats({
        activeTenders:     data.activeTenders     ?? 0,
        approvedSuppliers: data.approvedSuppliers ?? 0,
        totalBids:         data.totalBids         ?? 0,
      }))
      .catch(() => setStats({ activeTenders: 0, approvedSuppliers: 0, totalBids: 0 }))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="min-h-screen flex flex-col">
      {/* Header */}
      <header className="bg-card/50 border-b border-border px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img src={logo} alt="Logo" className="h-16 w-auto min-w-[150px]" />
          </div>
          <div className="flex items-center gap-3">
            <Link to="/admin/login" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Admin Login</Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <main className="flex-1">
        <div className="max-w-7xl mx-auto px-6 py-16 lg:py-24">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            {/* Left - Admin */}
            <div className="space-y-8">
              <div>
                <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-sm font-medium mb-4">
                  <Shield size={14} /> Management Portal
                </span>
                <h2 className="text-4xl lg:text-5xl font-bold leading-tight mb-4">
                  Streamlined<br />
                  <span className="text-primary">Procurement</span><br />
                  Management
                </h2>
                <p className="text-muted-foreground text-lg leading-relaxed">
                  Manage tenders, evaluate bids, and oversee supplier relationships — all from one powerful dashboard.
                </p>
              </div>
              <div className="flex flex-wrap gap-3">
                <Link
                  to="/admin/login"
                  className="inline-flex items-center gap-2 px-5 py-2.5 bg-primary text-primary-foreground rounded-lg text-[14px] font-medium hover:bg-primary/90 transition-colors"
                >
                  Admin portal <ArrowRight size={14} />
                </Link>
              </div>
              <div className="grid grid-cols-3 gap-4 pt-4 border-t border-border">
                <div className="text-center">
                  <p className="text-2xl font-bold text-primary">
                    <AnimatedCounter value={stats.activeTenders} loading={loading} />
                  </p>
                  <p className="text-xs text-muted-foreground">Active Tenders</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold text-black">
                    <AnimatedCounter value={stats.approvedSuppliers} loading={loading} />
                  </p>
                  <p className="text-xs text-muted-foreground">Suppliers</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold text-success">
                    <AnimatedCounter value={stats.totalBids} loading={loading} />
                  </p>
                  <p className="text-xs text-muted-foreground">Bids Processed</p>
                </div>
              </div>
            </div>

            {/* Right - Supplier */}
            <div className="bg-card border border-border rounded-2xl p-8 lg:p-10">
              <div className="flex items-center gap-3 mb-6">
                <div className="p-2 rounded-lg bg-primary">
                  <Truck size={24} className="text-white" />
                </div>
                <div>
                  <h3 className="text-xl font-bold">Supplier Portal</h3>
                  <p className="text-sm text-muted-foreground">Access tenders & submit bids</p>
                </div>
              </div>

              <div className="space-y-4 mb-8">
                {['Browse open procurement tenders', 'Submit competitive bids online', 'Track bid status in real-time', 'Manage your company profile'].map((item, i) => (
                  <div key={i} className="flex items-center gap-3">
                    <CheckCircle size={16} className="text-success flex-shrink-0" />
                    <span className="text-sm text-muted-foreground">{item}</span>
                  </div>
                ))}
              </div>

              <div className="space-y-3">
                <Link
                  to="/supplier/login"
                  className="flex items-center justify-center gap-2 w-full py-2.5 bg-primary text-primary-foreground rounded-lg text-[14px] font-medium hover:bg-primary/90 transition-colors"
                >
                  Supplier login <ArrowRight size={14} />
                </Link>
                <Link
                  to="/supplier/register"
                  className="flex items-center justify-center w-full py-2.5 border border-border rounded-lg text-[14px] font-medium hover:bg-muted/50 transition-colors"
                >
                  Register as new supplier
                </Link>
              </div>

              <p className="text-center text-xs text-muted-foreground mt-4">
                New to the platform? <Link to="/supplier/register" className="text-primary hover:underline">Create an account</Link> to get started.
              </p>
            </div>
          </div>
        </div>

        {/* Features */}
        <div className="border-t border-border bg-muted/30 py-16">
          <div className="max-w-7xl mx-auto px-6">
            <div className="text-center mb-12">
              <h2 className="text-[22px] font-semibold">How it works</h2>
              <p className="text-[14px] text-muted-foreground mt-2">
                Three steps from registration to awarded contract
              </p>
            </div>

            <div className="grid md:grid-cols-3 gap-6 lg:gap-10">
              {FEATURES.map((f, i) => (
                <div key={i} className="relative text-center px-4">
                  <div className="relative inline-flex mb-5">
                    <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center">
                      <f.icon size={22} className="text-primary" />
                    </div>
                    <span className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-primary text-primary-foreground text-[10px] font-bold flex items-center justify-center">
                      {i + 1}
                    </span>
                  </div>
                  <h3 className="text-[15px] font-semibold mb-2">{f.title}</h3>
                  <p className="text-[13px] text-muted-foreground leading-relaxed">{f.desc}</p>

                  {i < FEATURES.length - 1 && (
                    <div className="hidden md:flex absolute top-7 -right-5 lg:-right-7 items-center text-border">
                      <ArrowRight size={16} className="text-muted-foreground/40" />
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-border py-6 px-6">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-3">
          <p className="text-[12px] text-muted-foreground">
            © {new Date().getFullYear()} The Trust Hospital. All rights reserved.
          </p>
          <div className="flex items-center gap-5 text-[12px] text-muted-foreground">
            {['Contact'].map(label => (
              <a key={label} href="#" className="hover:text-foreground transition-colors">{label}</a>
            ))}
            <button onClick={() => setShowPrivacy(true)} className="hover:text-foreground transition-colors">
              Privacy policy
            </button>

            <button onClick={() => setShowTerms(true)} className="hover:text-foreground transition-colors">
              Terms of use
            </button>
          </div>
        </div>
      </footer>
      <PrivacyPolicyModal open={showPrivacy} onClose={() => setShowPrivacy(false)} />
      <TermsOfUseModal open={showTerms} onClose={() => setShowTerms(false)} />
    </div>
  );
}
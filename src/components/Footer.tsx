import { ExternalLink } from 'lucide-react';
import { BrandMark } from './BrandMark';
import type { AppRoute } from './Navbar';

interface FooterProps {
  onNavigate: (route: AppRoute) => void;
}

export function Footer({ onNavigate }: FooterProps) {
  return (
    <footer className="border-t border-white/10 bg-[#020606] text-[#8FA8A4]">
      <div className="mx-auto max-w-[1320px] px-4 py-12 sm:px-6 lg:px-8">
        <div className="grid gap-10 md:grid-cols-12">
          <div className="md:col-span-5">
            <div className="flex items-center gap-2.5 text-[#E2EFEA]">
              <BrandMark className="h-6 w-6 text-[#6D8581]" />
              <span className="font-cyber text-sm font-semibold tracking-wider text-white uppercase">
                SignalSure
              </span>
            </div>
            <p className="mt-3 max-w-sm text-sm leading-relaxed text-[#8FA8A4]">
              AI-assisted scam analysis and calm verification guidance tailored for
              India’s digital payments, messaging, and online services ecosystem.
            </p>
            <p className="mt-4 text-xs leading-relaxed text-[#657C78]">
              SignalSure provides decision-support analysis, not legal proof or a
              guarantee that any message or link is safe. Never submit passwords,
              OTPs, UPI PINs, or card CVVs.
            </p>
          </div>

          <div className="md:col-span-3">
            <h2 className="text-xs font-semibold tracking-wider text-white uppercase">
              Platform
            </h2>
            <ul className="mt-3 space-y-2.5 text-sm">
              <li>
                <a
                  href="/analyze"
                  onClick={(e) => {
                    e.preventDefault();
                    onNavigate('/analyze');
                  }}
                  className="hover:text-[#00F0C8]"
                >
                  Analyze a message or URL
                </a>
              </li>
              <li>
                <a
                  href="/assistant"
                  onClick={(e) => {
                    e.preventDefault();
                    onNavigate('/assistant');
                  }}
                  className="hover:text-[#00F0C8]"
                >
                  Safety Assistant
                </a>
              </li>
              <li>
                <a
                  href="/learn"
                  onClick={(e) => {
                    e.preventDefault();
                    onNavigate('/learn');
                  }}
                  className="hover:text-[#00F0C8]"
                >
                  Safety Guides
                </a>
              </li>
              <li>
                <a
                  href="/report"
                  onClick={(e) => {
                    e.preventDefault();
                    onNavigate('/report');
                  }}
                  className="hover:text-[#00F0C8]"
                >
                  Report an Incident
                </a>
              </li>
              <li>
                <a
                  href="/about"
                  onClick={(e) => {
                    e.preventDefault();
                    onNavigate('/about');
                  }}
                  className="hover:text-[#00F0C8]"
                >
                  About & Integrations
                </a>
              </li>
            </ul>
          </div>

          <div className="md:col-span-4">
            <h2 className="text-xs font-semibold tracking-wider text-white uppercase">
              Official India Cyber Help
            </h2>
            <ul className="mt-3 space-y-2.5 text-sm">
              <li className="text-[#D4E6E3]">
                Financial Fraud Helpline:{' '}
                <span className="font-mono font-medium text-amber-300">1930</span>{' '}
                <span className="text-[#5C736F]">·</span>{' '}
                <span className="text-xs text-[#8FA8A4]">24×7 Toll-Free</span>
              </li>
              <li>
                <a
                  href="https://cybercrime.gov.in/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 text-[#00F0C8] hover:text-[#66F9E0]"
                >
                  National Cyber Crime Reporting Portal
                  <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
                </a>
              </li>
              <li>
                <a
                  href="https://sancharsaathi.gov.in/sfc/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 text-[#00F0C8] hover:text-[#66F9E0]"
                >
                  Sanchar Saathi Chakshu (Fraud Calls & SMS)
                  <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
                </a>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-10 flex flex-col gap-2 border-t border-white/10 pt-6 text-xs text-[#657C78] sm:flex-row sm:items-center sm:justify-between">
          <p>© {new Date().getFullYear()} SignalSure. Built for safer digital verification in India.</p>
          <p>Privacy-first design · Zero retained credentials</p>
        </div>
      </div>
    </footer>
  );
}

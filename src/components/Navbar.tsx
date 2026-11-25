import { useState } from 'react';
import { Menu, X } from 'lucide-react';
import { BrandMark } from './BrandMark';

export type AppRoute =
  | '/'
  | '/analyze'
  | '/assistant'
  | '/learn'
  | '/report'
  | '/about';

interface NavbarProps {
  currentRoute: AppRoute;
  onNavigate: (route: AppRoute) => void;
}

const NAV_LINKS: Array<{ route: AppRoute; label: string }> = [
  { route: '/analyze', label: 'Analyze' },
  { route: '/assistant', label: 'Safety Assistant' },
  { route: '/learn', label: 'Learn' },
  { route: '/report', label: 'Report' },
  { route: '/about', label: 'About' },
];

export function Navbar({ currentRoute, onNavigate }: NavbarProps) {
  const [mobileOpen, setMobileOpen] = useState(false);

  const handleNav = (route: AppRoute) => {
    setMobileOpen(false);
    onNavigate(route);
  };

  return (
    <header className="sticky top-0 z-40 border-b border-white/10 bg-[#030808]">
      <div className="mx-auto flex max-w-[1320px] items-center justify-between gap-8 px-4 py-3.5 sm:px-6 lg:px-8">
        {/* Zone 1: Single-line brand mark + wordmark */}
        <a
          href="/"
          onClick={(e) => {
            e.preventDefault();
            handleNav('/');
          }}
          className="flex shrink-0 items-center gap-2.5 whitespace-nowrap text-[#F1F7F6] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#00F0C8]"
        >
          <BrandMark className="h-7 w-7 text-[#8FA8A4]" />
          <span className="font-cyber text-sm font-semibold tracking-wider text-white uppercase">
            SignalSure
          </span>
        </a>

        {/* Zone 2: Clean single-line text navigation links */}
        <nav
          aria-label="Primary navigation"
          className="hidden items-center gap-7 md:flex"
        >
          {NAV_LINKS.map((link) => {
            const active = currentRoute === link.route;
            return (
              <a
                key={link.route}
                href={link.route}
                onClick={(e) => {
                  e.preventDefault();
                  handleNav(link.route);
                }}
                aria-current={active ? 'page' : undefined}
                className={`whitespace-nowrap shrink-0 border-b-2 py-1 text-xs font-medium tracking-wider uppercase transition-colors duration-150 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#00F0C8] ${
                  active
                    ? 'border-[#00F0C8] text-[#00F0C8]'
                    : 'border-transparent text-[#A3B8B5] hover:border-white/25 hover:text-white'
                }`}
              >
                {link.label}
              </a>
            );
          })}
        </nav>

        {/* Zone 3: Single primary action + mobile menu toggle */}
        <div className="flex shrink-0 items-center gap-3">
          <button
            type="button"
            onClick={() => handleNav('/analyze')}
            className="hidden whitespace-nowrap shrink-0 rounded-[2px] bg-[#00F0C8] px-4 py-2 text-xs font-semibold tracking-wider text-[#031411] uppercase transition-colors duration-150 hover:bg-[#3BF7D8] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#00F0C8] sm:inline-flex"
          >
            Analyze a message
          </button>

          <button
            type="button"
            onClick={() => setMobileOpen((prev) => !prev)}
            aria-expanded={mobileOpen}
            aria-controls="mobile-navigation-drawer"
            aria-label={mobileOpen ? 'Close navigation menu' : 'Open navigation menu'}
            className="inline-flex h-11 w-11 items-center justify-center rounded-[2px] border border-white/15 bg-[#071010] text-[#E2EFEA] transition-colors hover:border-[#00F0C8]/50 hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#00F0C8] md:hidden"
          >
            {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {mobileOpen && (
        <nav
          id="mobile-navigation-drawer"
          aria-label="Mobile navigation"
          className="border-t border-white/10 bg-[#060D0D] px-4 py-3 md:hidden"
        >
          <div className="flex flex-col gap-1">
            <a
              href="/"
              onClick={(e) => {
                e.preventDefault();
                handleNav('/');
              }}
              className={`flex min-h-11 items-center rounded-[2px] px-3 text-sm font-medium ${
                currentRoute === '/'
                  ? 'bg-[#0C1C1A] text-[#00F0C8]'
                  : 'text-[#B5C9C6] hover:bg-[#091413] hover:text-white'
              }`}
            >
              Home
            </a>
            {NAV_LINKS.map((link) => {
              const active = currentRoute === link.route;
              return (
                <a
                  key={link.route}
                  href={link.route}
                  onClick={(e) => {
                    e.preventDefault();
                    handleNav(link.route);
                  }}
                  aria-current={active ? 'page' : undefined}
                  className={`flex min-h-11 items-center rounded-[2px] px-3 text-sm font-medium ${
                    active
                      ? 'bg-[#0C1C1A] text-[#00F0C8]'
                      : 'text-[#B5C9C6] hover:bg-[#091413] hover:text-white'
                  }`}
                >
                  {link.label}
                </a>
              );
            })}
            <button
              type="button"
              onClick={() => handleNav('/analyze')}
              className="mt-2 flex min-h-11 w-full items-center justify-center rounded-[2px] bg-[#00F0C8] px-4 text-xs font-semibold tracking-wider text-[#031411] uppercase hover:bg-[#3BF7D8]"
            >
              Analyze a message
            </button>
          </div>
        </nav>
      )}
    </header>
  );
}

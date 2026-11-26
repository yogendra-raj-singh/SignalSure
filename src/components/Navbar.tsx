import { useState } from 'react';
import { LogIn, LogOut, Menu, X } from 'lucide-react';
import { BrandMark } from './BrandMark';
import { useFirebaseAuth } from './FirebaseProvider';

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
  const { user, authReady, authLoading, authError, signInWithGoogle, signOutUser, clearAuthError } =
    useFirebaseAuth();

  const handleNav = (route: AppRoute) => {
    setMobileOpen(false);
    onNavigate(route);
  };

  return (
    <header className="sticky top-0 z-40 border-b border-white/10 bg-[#030808]">
      <div className="mx-auto flex max-w-[1320px] items-center justify-between gap-4 px-4 py-3.5 sm:px-6 lg:px-8">
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
          className="hidden items-center gap-6 lg:flex"
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

        {/* Zone 3: Google Account + Primary CTA + mobile menu toggle */}
        <div className="flex shrink-0 items-center gap-2.5">
          {authReady && (
            user ? (
              <div className="hidden items-center gap-2 sm:inline-flex">
                <div className="flex items-center gap-2 rounded-[2px] border border-white/15 bg-[#070E0E] px-2.5 py-1.5 text-xs text-[#D7E8E5]">
                  {user.photoURL ? (
                    <img
                      src={user.photoURL}
                      alt=""
                      referrerPolicy="no-referrer"
                      className="h-5 w-5 rounded-[2px] object-cover"
                    />
                  ) : (
                    <span className="flex h-5 w-5 items-center justify-center rounded-[2px] bg-[#00F0C8]/20 font-mono text-[10px] font-semibold text-[#00F0C8]">
                      {(user.displayName || user.email || 'U').charAt(0).toUpperCase()}
                    </span>
                  )}
                  <span className="max-w-[120px] truncate font-medium text-white">
                    {user.displayName || user.email}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => void signOutUser()}
                  disabled={authLoading}
                  aria-label="Sign out of Google account"
                  className="inline-flex min-h-9 items-center gap-1.5 whitespace-nowrap rounded-[2px] border border-white/15 bg-[#070E0E] px-3 py-1.5 text-xs font-medium text-[#B6CCC8] transition-colors hover:border-[#00F0C8]/50 hover:text-white disabled:opacity-60"
                >
                  <LogOut className="h-3.5 w-3.5" aria-hidden="true" />
                  Sign out
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => void signInWithGoogle()}
                disabled={authLoading}
                className="hidden min-h-9 items-center gap-1.5 whitespace-nowrap rounded-[2px] border border-white/20 bg-[#070E0E] px-3.5 py-1.5 text-xs font-medium text-[#E2EFEA] transition-colors hover:border-[#00F0C8]/60 hover:text-[#00F0C8] disabled:opacity-60 sm:inline-flex"
              >
                <LogIn className="h-3.5 w-3.5 text-[#00F0C8]" aria-hidden="true" />
                {authLoading ? 'Signing in...' : 'Google Sign in'}
              </button>
            )
          )}

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
            className="inline-flex h-11 w-11 items-center justify-center rounded-[2px] border border-white/15 bg-[#071010] text-[#E2EFEA] transition-colors hover:border-[#00F0C8]/50 hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#00F0C8] lg:hidden"
          >
            {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {authError && (
        <div
          role="alert"
          className="border-t border-rose-500/30 bg-rose-950/35 px-4 py-2 text-xs text-rose-200 sm:px-6 lg:px-8"
        >
          <div className="mx-auto flex max-w-[1320px] items-center justify-between gap-4">
            <span>{authError}</span>
            <button
              type="button"
              onClick={clearAuthError}
              className="shrink-0 font-medium text-white underline-offset-2 hover:underline"
            >
              Dismiss
            </button>
          </div>
        </div>
      )}

      {mobileOpen && (
        <nav
          id="mobile-navigation-drawer"
          aria-label="Mobile navigation"
          className="border-t border-white/10 bg-[#060D0D] px-4 py-3 lg:hidden"
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

            {authReady && (
              user ? (
                <div className="mt-2 flex items-center justify-between gap-2 rounded-[2px] border border-white/10 bg-[#030808] px-3 py-2">
                  <span className="truncate text-xs text-[#D7E8E5]">
                    {user.displayName || user.email}
                  </span>
                  <button
                    type="button"
                    onClick={() => void signOutUser()}
                    className="inline-flex items-center gap-1 text-xs font-medium text-[#00F0C8]"
                  >
                    <LogOut className="h-3.5 w-3.5" aria-hidden="true" />
                    Sign out
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => void signInWithGoogle()}
                  disabled={authLoading}
                  className="mt-2 flex min-h-11 w-full items-center justify-center gap-2 rounded-[2px] border border-white/20 bg-[#070E0E] px-4 text-xs font-semibold tracking-wider text-white uppercase hover:border-[#00F0C8]"
                >
                  <LogIn className="h-4 w-4 text-[#00F0C8]" aria-hidden="true" />
                  Sign in with Google
                </button>
              )
            )}

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

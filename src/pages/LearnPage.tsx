import { useState } from 'react';
import { CheckSquare, Square, ArrowRight } from 'lucide-react';
import type { AppRoute } from '../components/Navbar';
import {
  GUIDE_CATEGORIES,
  SAFETY_GUIDES,
  type GuideCategory,
} from '../lib/learnGuides';

interface LearnPageProps {
  onNavigate: (route: AppRoute) => void;
}

export function LearnPage({ onNavigate }: LearnPageProps) {
  const [selectedCategory, setSelectedCategory] =
    useState<GuideCategory>('All Guides');
  const [checkedSteps, setCheckedSteps] = useState<Record<string, boolean>>({});

  const visibleGuides =
    selectedCategory === 'All Guides'
      ? SAFETY_GUIDES
      : SAFETY_GUIDES.filter((g) => g.category === selectedCategory);

  const toggleStep = (guideId: string, stepIdx: number) => {
    const key = `${guideId}:${stepIdx}`;
    setCheckedSteps((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  return (
    <div className="mx-auto max-w-[1320px] px-4 py-10 sm:px-6 lg:px-8 lg:py-14">
      <div className="flex flex-col gap-6 border-b border-white/10 pb-8 lg:flex-row lg:items-end lg:justify-between">
        <div className="max-w-2xl">
          <h1 className="font-cyber text-2xl font-normal tracking-wide text-white uppercase sm:text-4xl">
            Digital Safety Guides
          </h1>
          <p className="mt-2.5 text-sm leading-relaxed text-[#A3B8B5] sm:text-base">
            Practical, calm verification playbooks for common online scams in
            India. Check off steps as you review your own accounts.
          </p>
        </div>

        <button
          type="button"
          onClick={() => onNavigate('/analyze')}
          className="inline-flex min-h-10 items-center gap-2 self-start whitespace-nowrap rounded-[2px] border border-white/15 bg-[#070E0E] px-4 py-2 text-xs font-medium text-[#E2EFEA] transition-colors hover:border-[#00F0C8]/50 hover:text-[#00F0C8]"
        >
          Analyze a suspicious message
          <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
        </button>
      </div>

      {/* Category filter tabs */}
      <div
        role="tablist"
        aria-label="Filter safety guides by topic"
        className="mt-6 flex flex-wrap gap-2"
      >
        {GUIDE_CATEGORIES.map((category) => {
          const active = selectedCategory === category;
          return (
            <button
              key={category}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => setSelectedCategory(category)}
              className={`min-h-10 whitespace-nowrap rounded-[2px] border px-3.5 py-2 text-xs font-medium transition-colors ${
                active
                  ? 'border-[#00F0C8] bg-[#00F0C8] font-semibold text-[#031411]'
                  : 'border-white/10 bg-[#070E0E] text-[#A3B8B5] hover:border-white/25 hover:text-white'
              }`}
            >
              {category}
            </button>
          );
        })}
      </div>

      {/* Guides Grid */}
      <div className="mt-8 grid gap-6 lg:grid-cols-2">
        {visibleGuides.map((guide) => (
          <article
            key={guide.id}
            className="flex flex-col justify-between rounded-[2px] border border-white/10 bg-[#070E0E] p-6"
          >
            <div>
              <div className="flex items-center gap-2 text-xs text-[#7E9692]">
                <span className="font-medium text-[#00F0C8]">{guide.category}</span>
                <span aria-hidden="true">·</span>
                <span>{guide.readTime}</span>
              </div>

              <h2 className="mt-2.5 font-display text-xl font-semibold tracking-tight text-white">
                {guide.title}
              </h2>
              <p className="mt-2 text-sm leading-relaxed text-[#B6CCC8]">
                {guide.summary}
              </p>

              <div className="mt-4 rounded-[2px] border border-white/10 bg-[#040B0B] p-4">
                <h3 className="text-xs font-semibold text-[#E2EFEA]">
                  How the tactic operates
                </h3>
                <p className="mt-1.5 text-xs leading-relaxed text-[#8FA8A4] sm:text-sm">
                  {guide.howItWorks}
                </p>
              </div>

              <div className="mt-5">
                <h3 className="text-xs font-semibold text-amber-200">
                  Common warning signs
                </h3>
                <ul className="mt-2 space-y-1.5 text-xs leading-relaxed text-[#B6CCC8] sm:text-sm">
                  {guide.redFlags.map((flag, idx) => (
                    <li key={idx}>• {flag}</li>
                  ))}
                </ul>
              </div>

              <div className="mt-5">
                <h3 className="text-xs font-semibold text-white">
                  Practical verification checklist
                </h3>
                <ul className="mt-2 space-y-2">
                  {guide.checklist.map((step, idx) => {
                    const checked = Boolean(checkedSteps[`${guide.id}:${idx}`]);
                    return (
                      <li key={idx}>
                        <button
                          type="button"
                          onClick={() => toggleStep(guide.id, idx)}
                          aria-pressed={checked}
                          className="flex w-full items-start gap-2.5 rounded-[2px] border border-white/10 bg-[#030808] px-3 py-2 text-left text-xs leading-relaxed text-[#D7E8E5] transition-colors hover:border-[#00F0C8]/40 sm:text-sm"
                        >
                          {checked ? (
                            <CheckSquare
                              className="mt-0.5 h-4 w-4 shrink-0 text-[#00F0C8]"
                              aria-hidden="true"
                            />
                          ) : (
                            <Square
                              className="mt-0.5 h-4 w-4 shrink-0 text-[#5C736F]"
                              aria-hidden="true"
                            />
                          )}
                          <span className={checked ? 'text-[#6D8581] line-through' : ''}>
                            {step}
                          </span>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              </div>
            </div>

            <p className="mt-5 border-t border-white/10 pt-4 text-xs leading-relaxed text-[#8FA8A4]">
              <span className="font-medium text-[#E2EFEA]">Official escalation: </span>
              {guide.officialAction}
            </p>
          </article>
        ))}
      </div>
    </div>
  );
}

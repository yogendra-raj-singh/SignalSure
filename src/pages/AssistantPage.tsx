import { useEffect, useRef, useState } from 'react';
import { Bot, ExternalLink, Loader2, RotateCcw, Send } from 'lucide-react';
import {
  ASSISTANT_QUICK_TOPICS,
  getDemoAssistantReply,
} from '../lib/assistantKnowledge';
import type { AssistantMessage, ServerCapabilities } from '../lib/types';
import { sanitizeExternalUrl, sanitizeResearchSources } from '../lib/validation';

interface AssistantPageProps {
  capabilities: ServerCapabilities | null;
}

const INITIAL_ASSISTANT_MESSAGE: AssistantMessage = {
  id: 'welcome',
  role: 'assistant',
  content:
    'Ask any question about phishing links, UPI collect requests, bank KYC impersonation, fake Telegram jobs, or what to do immediately after clicking a suspicious link. Please never share passwords, OTPs, or UPI PINs here.',
  sourceMode: 'demo',
  timestamp: new Date().toISOString(),
};

export function AssistantPage({ capabilities }: AssistantPageProps) {
  const [messages, setMessages] = useState<AssistantMessage[]>([
    INITIAL_ASSISTANT_MESSAGE,
  ]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [botpressReady, setBotpressReady] = useState(false);
  const msgSeqRef = useRef(0);
  const sessionSeqRef = useRef(0);
  const abortControllerRef = useRef<AbortController | null>(null);

  useEffect(() => {
    return () => {
      abortControllerRef.current?.abort();
    };
  }, []);

  // Detect embedded Botpress Webchat v5.0 initialization from index.html
  useEffect(() => {
    const checkBotpress = () => {
      const bp = (window as unknown as { botpress?: { open?: () => void } }).botpress;
      if (bp) {
        setBotpressReady(true);
        return true;
      }
      return false;
    };

    if (checkBotpress()) return;

    let attempts = 0;
    const timer = window.setInterval(() => {
      attempts += 1;
      if (checkBotpress() || attempts >= 15) {
        window.clearInterval(timer);
      }
    }, 400);

    return () => window.clearInterval(timer);
  }, []);

  const handleOpenBotpress = () => {
    const bp = (window as unknown as { botpress?: { open?: () => void } }).botpress;
    if (bp && typeof bp.open === 'function') {
      bp.open();
    } else {
      setErrorMsg(
        'Botpress Webchat widget is still initializing or blocked by a browser extension. You can use the Safety Assistant chat on the left.'
      );
    }
  };

  const sendQuestion = async (questionText: string) => {
    const trimmed = questionText.trim();
    if (!trimmed || sending) return;

    const currentSession = sessionSeqRef.current;
    setErrorMsg(null);
    const userMsg: AssistantMessage = {
      id: `u-${++msgSeqRef.current}`,
      role: 'user',
      content: trimmed,
      timestamp: new Date().toISOString(),
    };

    const nextHistory = [...messages, userMsg];
    setMessages(nextHistory);
    setInput('');
    setSending(true);

    if (capabilities?.aiAnalyzerConfigured) {
      abortControllerRef.current?.abort();
      const controller = new AbortController();
      abortControllerRef.current = controller;

      try {
        const res = await fetch('/api/assistant', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          signal: controller.signal,
          body: JSON.stringify({
            message: trimmed,
            history: nextHistory.slice(-6).map((m) => ({
              role: m.role,
              content: m.content,
            })),
          }),
        });
        const data = (await res.json().catch(() => null)) as {
          answer?: unknown;
          suggestedActions?: unknown;
          researchSources?: unknown;
        } | null;

        if (currentSession !== sessionSeqRef.current) return;

        if (res.ok && typeof data?.answer === 'string') {
          setMessages((prev) => [
            ...prev,
            {
              id: `a-${++msgSeqRef.current}`,
              role: 'assistant',
              content: data.answer as string,
              suggestedActions: Array.isArray(data.suggestedActions)
                ? data.suggestedActions.filter((s): s is string => typeof s === 'string')
                : undefined,
              researchSources: sanitizeResearchSources(data.researchSources),
              sourceMode: 'live',
              timestamp: new Date().toISOString(),
            },
          ]);
          setSending(false);
          return;
        }
        setErrorMsg(
          'Live AI assistant could not respond; showing local demo safety guidance instead.'
        );
      } catch (err) {
        if (err instanceof DOMException && err.name === 'AbortError') {
          if (currentSession !== sessionSeqRef.current) {
            setSending(false);
          }
          return;
        }
        if (currentSession !== sessionSeqRef.current) return;
        setErrorMsg(
          'Network error reaching Live AI; showing local demo safety guidance instead.'
        );
      }
    }

    // Honest local demo assistant fallback
    await new Promise((r) => setTimeout(r, 120));
    if (currentSession !== sessionSeqRef.current) return;
    const reply = getDemoAssistantReply(trimmed);
    setMessages((prev) => [
      ...prev,
      {
        id: `a-${++msgSeqRef.current}`,
        role: 'assistant',
        content: reply.answer,
        suggestedActions: reply.suggestedActions,
        sourceMode: 'demo',
        timestamp: new Date().toISOString(),
      },
    ]);
    setSending(false);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim()) {
      setErrorMsg('Type a safety question or choose one of the quick topics.');
      return;
    }
    void sendQuestion(input);
  };

  const handleReset = () => {
    sessionSeqRef.current += 1;
    abortControllerRef.current?.abort();
    setSending(false);
    setMessages([INITIAL_ASSISTANT_MESSAGE]);
    setInput('');
    setErrorMsg(null);
  };

  return (
    <div className="mx-auto max-w-[1320px] px-4 py-10 sm:px-6 lg:px-8 lg:py-14">
      <div className="border-b border-white/10 pb-8">
        <h1 className="font-cyber text-2xl font-normal tracking-wide text-white uppercase sm:text-4xl">
          Safety Assistant
        </h1>
        <p className="mt-2.5 max-w-2xl text-sm leading-relaxed text-[#A3B8B5] sm:text-base">
          Get calm, actionable guidance on phishing, UPI collect traps, fake job
          offers, account security, and immediate post-click steps.
        </p>
      </div>

      <div className="mt-8 grid gap-8 lg:grid-cols-12 lg:items-start">
        {/* Main chat column */}
        <div className="flex flex-col rounded-[2px] border border-white/10 bg-[#070E0E] lg:col-span-8">
          <div className="flex items-center justify-between border-b border-white/10 px-5 py-3.5">
            <div className="flex items-center gap-2.5">
              <Bot className="h-4 w-4 text-[#00F0C8]" aria-hidden="true" />
              <span className="text-sm font-semibold text-white">
                {capabilities?.aiAnalyzerConfigured
                  ? 'Live Safety Assistant (Gemini)'
                  : 'Local Demo Safety Assistant'}
              </span>
            </div>
            <button
              type="button"
              onClick={handleReset}
              className="inline-flex min-h-9 items-center gap-1.5 rounded-[2px] border border-white/15 px-3 py-1 text-xs font-medium text-[#B6CCC8] hover:border-[#00F0C8]/50 hover:text-white"
            >
              <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />
              Reset chat
            </button>
          </div>

          {/* Messages */}
          <div
            aria-live="polite"
            className="max-h-[460px] min-h-[320px] space-y-4 overflow-y-auto p-5"
          >
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex flex-col ${
                  msg.role === 'user' ? 'items-end' : 'items-start'
                }`}
              >
                <div
                  className={`max-w-[88%] rounded-[2px] px-4 py-3 text-sm leading-relaxed ${
                    msg.role === 'user'
                      ? 'border border-[#00F0C8]/35 bg-[#00F0C8]/10 text-[#F1F7F6]'
                      : 'border border-white/10 bg-[#030808] text-[#D7E8E5]'
                  }`}
                >
                  {msg.role === 'assistant' && (
                    <p className="mb-1.5 text-[11px] font-medium text-[#7E9692]">
                      {msg.sourceMode === 'live'
                        ? 'AI-Assisted Response'
                        : 'Demo Knowledge Response'}
                    </p>
                  )}
                  <p>{msg.content}</p>
                  {msg.suggestedActions && msg.suggestedActions.length > 0 && (
                    <ul className="mt-3 space-y-1.5 border-t border-white/10 pt-2.5 text-xs text-[#B6CCC8]">
                      {msg.suggestedActions.map((act, idx) => (
                        <li key={idx}>• {act}</li>
                      ))}
                    </ul>
                  )}
                  {msg.researchSources && msg.researchSources.length > 0 && (
                    <div className="mt-3 border-t border-white/10 pt-2.5">
                      <p className="mb-1.5 text-[11px] font-medium text-[#7E9692]">
                        Verified sources:
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {msg.researchSources.map((src) => {
                          const safeHref = sanitizeExternalUrl(src.url);
                          if (!safeHref) return null;
                          return (
                            <a
                              key={safeHref}
                              href={safeHref}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 rounded-[2px] border border-white/10 bg-[#070E0E] px-2 py-1 text-[11px] text-[#00F0C8] hover:border-[#00F0C8]/50 hover:text-white"
                            >
                              {src.title}
                              <ExternalLink className="h-3 w-3" aria-hidden="true" />
                            </a>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ))}

            {sending && (
              <div className="flex items-center gap-2 text-xs text-[#8FA8A4]">
                <Loader2 className="h-4 w-4 animate-spin text-[#00F0C8]" aria-hidden="true" />
                Drafting guidance...
              </div>
            )}
          </div>

          {errorMsg && (
            <p role="alert" className="px-5 pb-2 text-xs text-amber-300">
              {errorMsg}
            </p>
          )}

          {/* Input bar */}
          <form
            onSubmit={handleSubmit}
            className="border-t border-white/10 p-4"
          >
            <label htmlFor="assistant-question-input" className="sr-only">
              Ask a digital safety question
            </label>
            <div className="flex flex-col gap-2.5 sm:flex-row">
              <input
                id="assistant-question-input"
                type="text"
                value={input}
                onChange={(e) => {
                  setInput(e.target.value);
                  if (errorMsg) setErrorMsg(null);
                }}
                placeholder="Ask about a suspicious UPI request, link, or account step..."
                className="min-h-11 flex-1 rounded-[2px] border border-white/15 bg-[#030808] px-3.5 py-2.5 text-sm text-white placeholder:text-[#5C736F] focus:border-[#00F0C8] focus:outline-none"
              />
              <button
                type="submit"
                disabled={sending}
                className="inline-flex min-h-11 items-center justify-center gap-2 whitespace-nowrap rounded-[2px] bg-[#00F0C8] px-5 py-2.5 text-xs font-semibold tracking-wider text-[#031411] uppercase transition-colors hover:bg-[#3BF7D8] disabled:opacity-60"
              >
                <Send className="h-4 w-4" aria-hidden="true" />
                Ask
              </button>
            </div>
          </form>
        </div>

        {/* Right column: Quick Topics + Botpress Webchat Integration Slot */}
        <div className="space-y-6 lg:col-span-4">
          <div className="rounded-[2px] border border-white/10 bg-[#070E0E] p-5">
            <h2 className="font-display text-sm font-semibold text-white">
              Common questions
            </h2>
            <div className="mt-3 space-y-2">
              {ASSISTANT_QUICK_TOPICS.map((topic) => (
                <button
                  key={topic.id}
                  type="button"
                  onClick={() => void sendQuestion(topic.prompt)}
                  className="w-full rounded-[2px] border border-white/10 bg-[#030808] px-3.5 py-2.5 text-left text-xs font-medium text-[#D7E8E5] transition-colors hover:border-[#00F0C8]/50 hover:text-white"
                >
                  {topic.label}
                </button>
              ))}
            </div>
          </div>

          {/* Botpress Integration Slot */}
          <section
            aria-label="Botpress webchat integration slot"
            data-testid="botpress-integration-slot"
            className="rounded-[2px] border border-white/10 bg-[#070E0E] p-5"
          >
            <div className="flex items-center justify-between gap-2">
              <h2 className="font-display text-sm font-semibold text-white">
                Botpress Webchat
              </h2>
              <span className="text-xs font-medium text-[#00F0C8]">
                {botpressReady ? 'Connected · v5.0' : 'Embedded · v5.0'}
              </span>
            </div>

            <div className="mt-3 space-y-3 text-xs leading-relaxed text-[#C5DAD6]">
              <p>
                Botpress Webchat v5.0 is active across SignalSure via the
                floating chat launcher in the bottom-right corner.
              </p>
              <button
                type="button"
                onClick={handleOpenBotpress}
                className="inline-flex min-h-10 w-full items-center justify-center rounded-[2px] border border-[#00F0C8]/45 bg-[#030808] px-4 py-2 text-xs font-semibold tracking-wider text-[#00F0C8] uppercase transition-colors hover:bg-[#00F0C8] hover:text-[#031411]"
              >
                Open Botpress Webchat
              </button>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}

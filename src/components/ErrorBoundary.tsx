import { Component, type ErrorInfo, type ReactNode } from 'react';
import { AlertTriangle, RotateCcw } from 'lucide-react';

interface ErrorBoundaryProps {
  children: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  message: string;
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = {
    hasError: false,
    message: '',
  };

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return {
      hasError: true,
      message: error.message || 'An unexpected application error occurred.',
    };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('SignalSure ErrorBoundary caught error:', error, info);
  }

  handleReset = () => {
    this.setState({ hasError: false, message: '' });
  };

  render() {
    if (!this.state.hasError) {
      return this.props.children;
    }

    let parsedDetails: { error?: string; operationType?: string; path?: string } | null = null;
    try {
      const candidate = JSON.parse(this.state.message);
      if (candidate && typeof candidate === 'object') {
        parsedDetails = candidate;
      }
    } catch {
      parsedDetails = null;
    }

    return (
      <div className="flex min-h-screen items-center justify-center bg-[#030808] px-4 text-[#F1F7F6]">
        <div className="w-full max-w-lg rounded-[2px] border border-rose-500/35 bg-[#070E0E] p-6">
          <div className="flex items-start gap-3">
            <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-rose-300" aria-hidden="true" />
            <div>
              <h1 className="font-cyber text-lg tracking-wide text-white uppercase">
                Database or Session Error
              </h1>
              <p className="mt-2 text-sm leading-relaxed text-[#C5DAD6]">
                {parsedDetails?.error
                  ? `Operation (${parsedDetails.operationType ?? 'unknown'} on ${
                      parsedDetails.path ?? 'database'
                    }) failed: ${parsedDetails.error}`
                  : this.state.message}
              </p>
              <div className="mt-5 flex flex-wrap gap-3">
                <button
                  type="button"
                  onClick={this.handleReset}
                  className="inline-flex min-h-10 items-center gap-2 rounded-[2px] bg-[#00F0C8] px-4 py-2 text-xs font-semibold tracking-wider text-[#031411] uppercase hover:bg-[#3BF7D8]"
                >
                  <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />
                  Try again
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }
}

import React, { Component, ErrorInfo, ReactNode } from 'react';
import { WinWhiteLogo } from './WinWhiteLogo';
import { RefreshCw, RotateCcw } from 'lucide-react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Unhandled Application Error caught by ErrorBoundary:', error, errorInfo);
  }

  private handleReload = () => {
    window.location.reload();
  };

  private handleReset = () => {
    try {
      sessionStorage.clear();
      window.location.href = window.location.origin + window.location.pathname;
    } catch {
      window.location.reload();
    }
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-[#F4FAFB] flex flex-col items-center justify-center p-4 font-sans text-[#202729]">
          <div className="w-full max-w-md bg-white rounded-2xl border border-[#DDE8EA] p-6 shadow-lg text-center space-y-5">
            <div className="flex justify-center">
              <WinWhiteLogo size={64} />
            </div>

            <div className="space-y-2">
              <h1 className="text-xl font-black text-[#202729] tracking-tight">
                WIN WHITE LAUNDRY
              </h1>
              <p className="text-sm font-semibold text-[#006D77]">
                Application Recovery
              </p>
              <p className="text-xs text-[#5A696D] leading-relaxed">
                The application encountered an unexpected display issue during load.
                You can reload the page or reset the session to restore normal operation.
              </p>
            </div>

            {this.state.error && (
              <div className="p-3 bg-[#FFF5F5] rounded-xl border border-[#FAD2D2] text-left">
                <p className="text-[11px] font-mono text-[#C53030] break-words">
                  {this.state.error.message || 'Unknown runtime error'}
                </p>
              </div>
            )}

            <div className="pt-2 flex flex-col gap-2.5">
              <button
                type="button"
                onClick={this.handleReload}
                className="w-full py-3 bg-[#006D77] hover:bg-[#00565E] text-white text-xs font-bold rounded-xl shadow-xs transition flex items-center justify-center gap-2 cursor-pointer touch-target"
              >
                <RefreshCw className="w-4 h-4" />
                Reload Application
              </button>
              <button
                type="button"
                onClick={this.handleReset}
                className="w-full py-2.5 bg-[#F4FAFB] hover:bg-[#DDE8EA] text-[#5A696D] text-xs font-semibold rounded-xl border border-[#DDE8EA] transition flex items-center justify-center gap-2 cursor-pointer touch-target"
              >
                <RotateCcw className="w-4 h-4" />
                Reset Session & Re-authenticate
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

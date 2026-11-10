import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface Props {
  children: ReactNode;
  fallbackTitle?: string;
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
    console.error('ErrorBoundary caught an error:', error, errorInfo);
  }

  public handleReset = () => {
    this.setState({ hasError: false, error: null });
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="p-6 bg-red-50/90 border border-red-200 rounded-2xl text-slate-800 font-ethiopic my-4 shadow-sm">
          <div className="flex items-start gap-4">
            <div className="p-3 bg-red-100 text-red-700 rounded-xl shrink-0">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <div className="space-y-2 flex-1">
              <h3 className="font-bold text-base text-red-900">
                {this.props.fallbackTitle || 'ገጹን በማሳየት ላይ ያልተጠበቀ ችግር አጋጥሟል'}
              </h3>
              <p className="text-xs text-red-700 leading-relaxed">
                ይህ ገጽ መረጃውን በማዘጋጀት ላይ ሳለ ችግር አጋጥሞታል። እባክዎ እንደገና ይሞክሩ ወይም ማጣሪያዎችን ይቀይሩ።
              </p>
              {this.state.error && (
                <p className="text-[11px] font-mono text-red-600 bg-red-100/50 p-2 rounded-lg max-w-xl truncate">
                  {this.state.error.message}
                </p>
              )}
              <div className="pt-2 flex items-center gap-2">
                <button
                  type="button"
                  onClick={this.handleReset}
                  className="px-4 py-2 bg-red-700 hover:bg-red-800 text-white font-bold text-xs rounded-xl flex items-center gap-2 transition shadow-sm"
                >
                  <RefreshCw className="w-3.5 h-3.5" /> እንደገና ሞክር
                </button>
                <button
                  type="button"
                  onClick={() => window.location.reload()}
                  className="px-4 py-2 bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 font-bold text-xs rounded-xl transition"
                >
                  ገጹን አድስ (Reload)
                </button>
              </div>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;

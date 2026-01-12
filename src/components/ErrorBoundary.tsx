import React, { Component, ReactNode } from 'react';
import { ErrorState } from '@/components/ui/error-state';
import { supabase } from '@/integrations/supabase/client';

interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo);
    void this.reportError(error, errorInfo);
  }

  private async reportError(error: Error, errorInfo: React.ErrorInfo) {
    try {
      // Prefer local session (não depende de rede)
      const { data: sessionData } = await supabase.auth.getSession();
      const userId = sessionData.session?.user?.id ?? null;
      if (!userId) return;

      const buId = typeof window !== 'undefined'
        ? localStorage.getItem('hub_current_bu_id')
        : null;

      await supabase.from('app_error_logs').insert({
        user_id: userId,
        bu_id: buId,
        module: 'frontend',
        action: 'error_boundary',
        error_code: 'REACT_ERROR_BOUNDARY',
        message: error.message || 'Unknown error',
        stack: error.stack ?? null,
        metadata: {
          componentStack: errorInfo.componentStack,
          pathname: typeof window !== 'undefined' ? window.location.pathname : null,
          search: typeof window !== 'undefined' ? window.location.search : null,
          href: typeof window !== 'undefined' ? window.location.href : null,
        },
      });
    } catch {
      // Never throw from error reporting
    }
  }

  handleRetry = () => {
    // The most common runtime failure in SPAs after tab switching / long inactivity
    // is a lazy-loaded chunk failing to load (stale deploy, network sleep, etc.).
    // A full reload is the safest recovery.
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4">
          <ErrorState
            title="Algo deu errado"
            description="Ocorreu um erro ao carregar esta página. Tente novamente."
            onRetry={this.handleRetry}
          />

          {this.state.error && (
            <details className="mt-6 w-full max-w-3xl rounded-lg border border-border bg-card p-4">
              <summary className="cursor-pointer text-sm font-medium">
                Detalhes técnicos
              </summary>
              <pre className="mt-3 text-xs whitespace-pre-wrap break-words text-muted-foreground">
{this.state.error.stack || this.state.error.message}
              </pre>
            </details>
          )}
        </div>
      );
    }

    return this.props.children;
  }
}

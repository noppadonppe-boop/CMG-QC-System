import { Component } from 'react';
import { RefreshCw, AlertTriangle } from 'lucide-react';

/**
 * Error Boundary — catches any render/lifecycle error and shows a readable
 * error panel instead of a blank white screen.
 *
 * Usage:
 *   <ErrorBoundary>
 *     <SomeComponent />
 *   </ErrorBoundary>
 */
export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, info: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, info) {
    console.error('[ErrorBoundary]', error, info);
    this.setState({ info });
  }

  handleReset() {
    this.setState({ hasError: false, error: null, info: null });
  }

  render() {
    if (!this.state.hasError) return this.props.children;

    const msg  = this.state.error?.message ?? String(this.state.error ?? 'Unknown error');
    const stack = this.state.info?.componentStack ?? '';

    return (
      <div className="flex items-center justify-center min-h-screen w-full bg-slate-900 p-6">
        <div className="w-full max-w-lg bg-slate-800 border border-red-500/30 rounded-2xl p-6 shadow-2xl">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 bg-red-500/10 rounded-xl flex items-center justify-center shrink-0">
              <AlertTriangle size={20} className="text-red-400" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-slate-100">เกิดข้อผิดพลาดในแอปพลิเคชัน</h2>
              <p className="text-[11px] text-slate-400 mt-0.5">Application Error — ดู Console สำหรับรายละเอียดเพิ่มเติม</p>
            </div>
          </div>

          <div className="bg-slate-900 rounded-xl p-3 mb-4 overflow-x-auto">
            <p className="text-red-400 text-xs font-mono break-all">{msg}</p>
            {stack && (
              <pre className="text-slate-500 text-[10px] font-mono mt-2 whitespace-pre-wrap break-all line-clamp-6">
                {stack.trim().split('\n').slice(0, 8).join('\n')}
              </pre>
            )}
          </div>

          <button
            onClick={() => this.handleReset()}
            className="w-full flex items-center justify-center gap-2 py-2.5 bg-orange-500 hover:bg-orange-600 rounded-xl text-sm font-semibold text-white transition-colors"
          >
            <RefreshCw size={14} />
            ลองอีกครั้ง
          </button>
        </div>
      </div>
    );
  }
}

import { Component } from 'react'

export class ErrorBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false, error: null }
  }
  static getDerivedStateFromError(error) {
    return { hasError: true, error }
  }
  componentDidCatch(error, info) {
    console.error('[ErrorBoundary]', error, info)
  }
  render() {
    if (this.state.hasError) {
      return (
        <section className="min-h-screen flex items-center justify-center bg-slate-950/95 px-4">
          <div className="max-w-md w-full">
            <h1 className="font-display text-xl font-semibold text-red-400">Something went wrong.</h1>
            <p className="mt-2 text-xs text-slate-400">{this.state.error?.message}</p>
            {this.state.error?.stack && (
              <details className="mt-3 rounded-lg border border-slate-800/70 bg-slate-900/70 p-2 text-[10px] text-slate-400">
                <summary className="cursor-pointer text-[10px] font-semibold text-slate-300">Stack Trace</summary>
                <pre className="mt-2 whitespace-pre-wrap leading-relaxed">{this.state.error.stack}</pre>
              </details>
            )}
            <button onClick={()=>window.location.reload()} className="mt-4 rounded-full bg-emerald-500 px-4 py-1.5 text-xs font-semibold text-slate-950 hover:bg-emerald-400 transition">Reload</button>
          </div>
        </section>
      )
    }
    return this.props.children
  }
}

export default ErrorBoundary

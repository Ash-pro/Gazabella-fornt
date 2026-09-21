import { Component, type ReactNode, type ErrorInfo } from 'react'

interface Props {
  children: ReactNode
}

interface State {
  hasError: boolean
  error: Error | null
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Gazabella ErrorBoundary caught an error:', error, errorInfo)
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex min-h-screen flex-col items-center justify-center p-6 text-center bg-[#FFF8F2]">
          <div className="size-16 rounded-full bg-rose-100 text-rose-800 grid place-items-center text-3xl mb-4 shadow-sm">
            ✨
          </div>
          <h2 className="text-xl font-black text-[#2A1A1F]">نعتذر منكِ، حدث خطأ مؤقت في العرض</h2>
          <p className="mt-2 text-sm text-[#735A63] max-w-md">
            نقوم بترتيب المنتجات والواجهات الآن. يمكنكِ النقر أدناه لتحديث الصفحة والمتابعة فوراً.
          </p>
          <button
            type="button"
            onClick={() => {
              this.setState({ hasError: false, error: null })
              window.location.reload()
            }}
            className="btn-primary mt-6 text-xs sm:text-sm shadow-md"
          >
            تحديث الصفحة والمتابعة
          </button>
        </div>
      )
    }

    return this.props.children
  }
}

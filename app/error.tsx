'use client'

import Link from 'next/link'
import { Logo } from '@/components/shared/logo'

// Route-segment boundary. Without it, any throw in a page, layout or Server
// Action reached the browser as Next's default blank "Application error", which
// named neither the cause nor a way out. INC-02 was undiagnosable for that
// reason. The digest below is the only handle an operator gets on a production
// failure, so it is shown rather than swallowed.
export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    // Always renders standalone: there is no nested error.tsx, so this replaces
    // the merchant and admin chrome as well as the page. It therefore owns the
    // whole viewport rather than sitting inside one.
    <div className="min-h-screen flex items-center justify-center px-6 py-16 bg-[#F5F5F7]">
      <div className="max-w-md w-full text-center">
        <div className="mb-8 flex justify-center">
          <Logo href="/dashboard" />
        </div>
        <h1 className="text-3xl text-gray-900 leading-tight mb-2">Algo salió mal.</h1>
        <p className="text-sm text-gray-500 mb-6">
          Ocurrió un error inesperado en esta página. Puedes intentar de nuevo. Si vuelve a
          pasar, comparte el código de abajo con el equipo de LABLLD.
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <button
            type="button"
            onClick={reset}
            className="h-12 px-6 bg-gray-900 text-white text-sm font-semibold rounded-full hover:bg-gray-800 active:scale-[0.98] transition-all"
          >
            Intentar de nuevo
          </button>
          <Link
            href="/dashboard"
            className="h-12 px-6 inline-flex items-center justify-center border border-gray-300 text-gray-700 text-sm font-semibold rounded-full hover:border-gray-400 transition-colors"
          >
            Volver al inicio
          </Link>
        </div>
        {error.digest && (
          <p className="mt-8 text-xs text-gray-400">
            Código del error:{' '}
            <span className="font-mono text-gray-500">{error.digest}</span>
          </p>
        )}
      </div>
    </div>
  )
}

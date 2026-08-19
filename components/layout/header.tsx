'use client'

import { useTransition } from 'react'
import { LogOut } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { logoutAction } from '@/app/(auth)/actions'

interface HeaderProps {
  userEmail?: string
}

export function Header({ userEmail }: HeaderProps) {
  const [isPending, startTransition] = useTransition()

  return (
    <header className="h-16 bg-white border-b border-gray-200 flex items-center justify-between px-4 lg:px-6 shrink-0">
      <div />
      <div className="flex items-center gap-2 lg:gap-3 min-w-0">
        {userEmail && (
          <span className="hidden sm:block text-sm text-muted-foreground truncate max-w-[200px]">{userEmail}</span>
        )}
        <Button
          variant="ghost"
          size="sm"
          disabled={isPending}
          onClick={() => startTransition(() => logoutAction())}
        >
          <LogOut className="h-4 w-4" />
          {isPending ? 'Saliendo...' : 'Cerrar sesión'}
        </Button>
      </div>
    </header>
  )
}

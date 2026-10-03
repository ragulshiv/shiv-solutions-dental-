'use client'

import { useEffect, useState } from 'react'
import { Download, Share, PlusSquare } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { BRAND } from '@/config/brand'

// Chrome's install event isn't in the DOM typings.
interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

/**
 * "Install app" button. Shows only when installing is possible:
 * - Android / desktop Chrome and Edge: opens the browser's own install prompt.
 * - iPhone / iPad Safari (no install prompt exists): shows the two-step
 *   "Share → Add to Home Screen" instructions.
 * Hidden once the app is running installed.
 */
export function InstallAppButton({ variant = 'icon' }: { variant?: 'icon' | 'full' }) {
  const [installEvent, setInstallEvent] = useState<BeforeInstallPromptEvent | null>(null)
  const [isIOS, setIsIOS] = useState(false)
  const [installed, setInstalled] = useState(true)
  const [showIOSHelp, setShowIOSHelp] = useState(false)

  useEffect(() => {
    const standalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      (navigator as Navigator & { standalone?: boolean }).standalone === true
    setInstalled(standalone)
    setIsIOS(/iphone|ipad|ipod/i.test(navigator.userAgent))

    const onPrompt = (e: Event) => {
      e.preventDefault()
      setInstallEvent(e as BeforeInstallPromptEvent)
    }
    const onInstalled = () => {
      setInstalled(true)
      setInstallEvent(null)
    }
    window.addEventListener('beforeinstallprompt', onPrompt)
    window.addEventListener('appinstalled', onInstalled)
    return () => {
      window.removeEventListener('beforeinstallprompt', onPrompt)
      window.removeEventListener('appinstalled', onInstalled)
    }
  }, [])

  if (installed || (!installEvent && !isIOS)) return null

  const handleClick = async () => {
    if (installEvent) {
      await installEvent.prompt()
      await installEvent.userChoice
      setInstallEvent(null)
    } else {
      setShowIOSHelp(true)
    }
  }

  return (
    <>
      {variant === 'icon' ? (
        <Button variant="ghost" size="icon" onClick={handleClick} title="Install app">
          <Download className="h-5 w-5" />
          <span className="sr-only">Install app</span>
        </Button>
      ) : (
        <Button variant="outline" className="w-full" onClick={handleClick}>
          <Download className="mr-2 h-4 w-4" />
          Install the {BRAND.name} app
        </Button>
      )}

      <Dialog open={showIOSHelp} onOpenChange={setShowIOSHelp}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Install on iPhone</DialogTitle>
            <DialogDescription>Two taps in Safari:</DialogDescription>
          </DialogHeader>
          <ol className="space-y-3 text-sm">
            <li className="flex items-center gap-3">
              <Share className="h-5 w-5 shrink-0 text-primary" />
              <span>
                Tap the <strong>Share</strong> button at the bottom of Safari.
              </span>
            </li>
            <li className="flex items-center gap-3">
              <PlusSquare className="h-5 w-5 shrink-0 text-primary" />
              <span>
                Choose <strong>Add to Home Screen</strong>, then <strong>Add</strong>.
              </span>
            </li>
          </ol>
        </DialogContent>
      </Dialog>
    </>
  )
}

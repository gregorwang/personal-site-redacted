import { useEffect, useState } from 'react'
import { useOutletContext, useFetcher } from 'react-router'
import { Link } from '~/components/common/LocaleLink'
import { LazyMotion, domAnimation, m } from 'framer-motion'
import { defineMessages, useIntl, type MessageDescriptor } from 'react-intl'
import type { AppOutletContext } from "~/types/remix";
import LanguageSwitcher from "~/components/ui/LanguageSwitcher";

const navMessages = defineMessages({
  cv: { defaultMessage: '个人简历', description: '顶部导航：简历页' },
  gallery: { defaultMessage: '影像记忆', description: '顶部导航：摄影页' },
  music: { defaultMessage: '音乐之旅', description: '顶部导航：音乐页' },
  game: { defaultMessage: '游戏世界', description: '顶部导航：游戏页' },
  anime: { defaultMessage: '动漫回忆', description: '顶部导航：动漫页' },
  updates: { defaultMessage: '日志更新', description: '顶部导航：更新日志页' },
  signIn: { defaultMessage: '登录', description: '顶部导航：登录按钮' },
  signOut: { defaultMessage: '退出', description: '顶部导航：桌面端退出按钮' },
  signOutFull: { defaultMessage: '退出登录', description: '移动端菜单：退出按钮' },
  signingOut: { defaultMessage: '退出中', description: '退出登录进行中' },
  mobileMenu: { defaultMessage: '移动端导航菜单', description: '移动端菜单的无障碍名称' },
  closeMenu: { defaultMessage: '关闭菜单', description: '移动端菜单遮罩的无障碍名称' },
})

const navigation: Array<{ key: string; label: MessageDescriptor | string; href: string }> = [
  { key: 'cv', label: navMessages.cv, href: '/cv' },
  { key: 'gallery', label: navMessages.gallery, href: '/gallery' },
  { key: 'music', label: navMessages.music, href: '/music' },
  { key: 'game', label: navMessages.game, href: '/game' },
  { key: 'chat', label: 'RAG-Nemesis', href: '/chat' },
  { key: 'anime', label: navMessages.anime, href: '/anime' },
  { key: 'updates', label: navMessages.updates, href: '/updates' },
]

export default function Example() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [hoveredNav, setHoveredNav] = useState<string | null>(null)
  const { session, openLoginDialog } = useOutletContext<AppOutletContext>()
  const fetcher = useFetcher()
  const intl = useIntl()
  const navLabel = (label: MessageDescriptor | string) => (typeof label === 'string' ? label : intl.formatMessage(label))

  const user = session?.user

  useEffect(() => {
    if (!mobileMenuOpen) return

    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault()
        setMobileMenuOpen(false)
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.body.style.overflow = previousOverflow
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [mobileMenuOpen])

  // Get user display name
  const getUserDisplayName = () => {
    if (!user) return null
    return user.name || user.email?.split('@')[0] || 'User'
  }

  const getUserInitial = () => {
    const displayName = getUserDisplayName()
    return displayName?.charAt(0).toUpperCase() || 'U'
  }

  const handleSignOut = () => {
    fetcher.submit(null, { method: 'post', action: '/auth/sign-out' })
  }

  return (
    <header className="bg-primary-50">
      <nav aria-label="Global" className="mx-auto flex max-w-[90rem] items-center justify-between px-6 py-4 lg:px-8">
        <div className="flex lg:hidden">
          <button
            type="button"
            onClick={() => setMobileMenuOpen(true)}
            className="ui-icon-button -m-2 h-11 w-11 text-primary-950/70 hover:bg-primary-100 hover:text-primary-950 active:scale-100"
          >
            <span className="sr-only">Open main menu</span>
            <span aria-hidden="true" className="h-6 w-6 text-2xl flex items-center justify-center">☰</span>
          </button>
        </div>
        <LazyMotion features={domAnimation}>
          <div className="hidden lg:flex lg:gap-2" onMouseLeave={() => setHoveredNav(null)}>
            {navigation.map((item) => (
              <Link
                key={item.key}
                to={item.href}
                className="ui-nav-link ui-nav-link--motion"
                onMouseEnter={() => setHoveredNav(item.key)}
                onFocus={() => setHoveredNav(item.key)}
                onBlur={() => setHoveredNav(null)}
              >
                {hoveredNav === item.key && (
                  <>
                    <m.span
                      layoutId="nav-motion-line"
                      className="ui-nav-motion-line"
                      transition={{ type: "spring", stiffness: 520, damping: 42, mass: 0.65 }}
                    />
                  </>
                )}
                <span className="relative z-10">{navLabel(item.label)}</span>
              </Link>
            ))}
          </div>
        </LazyMotion>
        <div className="hidden lg:flex lg:justify-end items-center gap-3">
          <LanguageSwitcher />
          {!user ? (
            <button
              type="button"
              data-auth-target="true"
              onClick={() => openLoginDialog()}
              className="ui-nav-link"
            >
              {intl.formatMessage(navMessages.signIn)} <span aria-hidden="true">&rarr;</span>
            </button>
          ) : (
            <div data-auth-target="true" className="flex items-center gap-1 rounded-full border border-primary-950/10 bg-white/72 p-1 shadow-sm shadow-primary-950/5 backdrop-blur-xl">
              <div className="flex min-w-0 items-center gap-2.5 py-1 pl-1.5 pr-2">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary-950 text-xs font-semibold text-white shadow-sm shadow-primary-950/12">
                  {getUserInitial()}
                </div>
                <div className="min-w-0">
                  <p className="max-w-36 truncate text-sm font-semibold leading-4 text-primary-950">
                    {getUserDisplayName()}
                  </p>
                  <p className="mt-0.5 text-[0.64rem] font-medium uppercase leading-3 tracking-[0.16em] text-primary-950/42">
                    signed in
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={handleSignOut}
                disabled={fetcher.state !== 'idle'}
                className="ui-button-ghost min-h-10 px-3 py-2 text-xs tracking-[0.08em] active:scale-[0.98] disabled:cursor-wait disabled:opacity-45"
              >
                {intl.formatMessage(fetcher.state !== 'idle' ? navMessages.signingOut : navMessages.signOut)}
              </button>
            </div>
          )}
        </div>
      </nav>
      {mobileMenuOpen ? (
        <div className="lg:hidden" role="dialog" aria-modal="true" aria-label={intl.formatMessage(navMessages.mobileMenu)} data-mobile-menu="">
          <button
            type="button"
            className="fixed inset-0 z-50 cursor-default bg-primary-950/10"
            onClick={() => setMobileMenuOpen(false)}
            aria-label={intl.formatMessage(navMessages.closeMenu)}
          />
          <div className="fixed inset-y-0 right-0 z-50 w-full animate-[mobile-menu-enter_420ms_cubic-bezier(0.16,1,0.3,1)] overflow-y-auto bg-primary-50 px-6 py-6 shadow-2xl shadow-primary-950/12 sm:max-w-sm sm:ring-1 sm:ring-primary-950/10">
              <div className="flex items-center justify-end">
                <button
                  type="button"
                  onClick={() => setMobileMenuOpen(false)}
                  className="ui-icon-button -m-2.5 h-11 w-11 text-primary-950/70 hover:bg-primary-100 hover:text-primary-950"
                >
                  <span className="sr-only">Close menu</span>
                  <span aria-hidden="true" className="h-6 w-6 text-2xl flex items-center justify-center">✕</span>
                </button>
              </div>
              <div className="mt-6 flow-root">
                <div className="-my-6 divide-y divide-primary-950/10">
                  <div className="space-y-2 py-6">
                    {navigation.map((item) => (
                      <Link
                        key={item.key}
                        to={item.href}
                        className="ui-nav-link -mx-3 flex w-full"
                        onClick={() => setMobileMenuOpen(false)}
                      >
                        {navLabel(item.label)}
                      </Link>
                    ))}
                  </div>
                  <div className="py-6">
                    <LanguageSwitcher className="mb-4" />
                    {!user ? (
                      <button
                        type="button"
                        data-auth-target="true"
                        className="ui-nav-link -mx-3 flex w-full justify-start"
                        onClick={() => {
                          setMobileMenuOpen(false)
                          openLoginDialog()
                        }}
                      >
                        {intl.formatMessage(navMessages.signIn)}
                      </button>
                    ) : (
                      <div className="space-y-2">
                        <div data-auth-target="true" className="flex items-center gap-3 rounded-2xl border border-primary-950/10 bg-white/76 px-3 py-3 shadow-sm shadow-primary-950/5">
                          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary-950 text-sm font-semibold text-white">
                            {getUserInitial()}
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-semibold text-primary-950">
                              {getUserDisplayName()}
                            </p>
                            <p className="mt-0.5 text-[0.64rem] font-medium uppercase tracking-[0.16em] text-primary-950/42">
                              signed in
                            </p>
                          </div>
                        </div>
                        <button
                          onClick={() => {
                            handleSignOut()
                            setMobileMenuOpen(false)
                          }}
                          disabled={fetcher.state !== 'idle'}
                          className="ui-nav-link -mx-3 flex w-full justify-start text-primary-950/62 disabled:cursor-wait disabled:opacity-50"
                        >
                          {intl.formatMessage(fetcher.state !== 'idle' ? navMessages.signingOut : navMessages.signOutFull)}
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
          </div>
          <style>{`
            @keyframes mobile-menu-enter {
              from {
                opacity: 0;
                transform: translateX(100%);
              }

              to {
                opacity: 1;
                transform: translateX(0);
              }
            }

            @media (prefers-reduced-motion: reduce) {
              [data-mobile-menu] [class*="mobile-menu-enter"] {
                animation: none;
              }
            }
          `}</style>
        </div>
      ) : null}
    </header>
  )
}

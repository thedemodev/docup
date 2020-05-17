import { h, FunctionComponent } from 'preact'
import { useEffect, useState } from 'preact/hooks'
import inView from 'element-in-view'
import { InstanceOptions } from '../docup'
import { Navbar } from './Navbar'
import { Sidebar } from './Sidebar'
import { Main } from './Main'
import { renderMarkdown, SidebarMenuItem } from '../markdown'
import { loadLanguages, scrollToHash, updateURLHash, throttle } from '../utils'

const handleScroll = throttle(() => {
  const headings = document.querySelectorAll('.content .heading')
  for (let i = 0; i < headings.length; i++) {
    const heading = headings[i]
    if (inView(heading)) {
      const id = heading.id
      if (id) {
        // Updating URL in browser address without adding it to history
        updateURLHash(`#${id}`, true)
      }
      break
    }
  }
}, 200)

export const App: FunctionComponent<{ options: InstanceOptions }> = ({
  options,
}) => {
  const navLinks = options.navLinks || []
  const [html, setHtml] = useState('')
  const [loadingState, setLoadingState] = useState<
    'loading' | 'success' | 'error'
  >('loading')
  const [menu, setMenu] = useState<SidebarMenuItem[]>([])
  const [showSidebar, setShowSidebar] = useState(false)

  const toggleSidebar = () => setShowSidebar(!showSidebar)

  useEffect(() => {
    Promise.all([
      fetch(`${options.root}${options.indexFile}`),
      options.highlightLanguages && loadLanguages(options.highlightLanguages),
    ])
      .then(([res]) => {
        return res.text()
      })
      .then((text) => {
        const { html, menu, fns } = renderMarkdown(text, {
          props: options.props,
        })
        setHtml(html)
        setMenu(menu)
        setLoadingState('success')
        setTimeout(() => {
          fns.forEach((fn) => fn())
          setTimeout(() => {
            if (location.hash) {
              scrollToHash(location.hash)
            }
          })
        })
      })
  }, [])

  useEffect(() => {
    document.body.style.overflow = showSidebar ? 'hidden' : 'auto'
  }, [showSidebar])

  // Scroll to element on click
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      let target = e.target as any
      if (target.closest) {
        target = target.closest('a')
        if (!target) {
          return
        }
      } else {
        while (target && target.tagName !== 'A') {
          target = target.parentNode
          if (!target) {
            return
          }
        }
      }
      const href = target.getAttribute('href')
      if (href && /^#.+/.test(href)) {
        e.preventDefault()
        updateURLHash(href, false)
        scrollToHash(href)
      }
    }
    window.addEventListener('click', handleClick)
    return () => window.removeEventListener('click', handleClick)
  }, [])

  // Update location.hash on scrolling
  useEffect(() => {
    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  return (
    <div>
      {showSidebar && (
        <div
          onClick={() => setShowSidebar(false)}
          class="sidebar_overlay fixed top-0 bottom-0 w-full bg-gray-200 bg-opacity-50"
        ></div>
      )}
      <Navbar
        toggleSidebar={toggleSidebar}
        title={options.title}
        navLinks={navLinks}
      />
      <Sidebar
        navLinks={navLinks}
        title={options.title}
        menu={menu}
        showSidebar={showSidebar}
      />
      <Main html={html} />
    </div>
  )
}

import { useRef, useState, useEffect, useCallback } from 'react'

export function useHorizontalScroll(autoScrollToBusiness = false) {
  const scrollRef = useRef<HTMLDivElement>(null)
  const contentRef = useRef<HTMLDivElement>(null)
  const [isScrolling, setIsScrolling] = useState(false)
  const [canScrollLeft, setCanScrollLeft] = useState(false)
  const [canScrollRight, setCanScrollRight] = useState(true)

  const updateScrollState = useCallback(() => {
    if (!scrollRef.current) return

    const { scrollLeft, scrollWidth, clientWidth } = scrollRef.current
    const maxScroll = scrollWidth - clientWidth

    setCanScrollLeft(scrollLeft > 5) // Add a small buffer
    setCanScrollRight(scrollLeft < maxScroll - 5)
  }, [])

  const handleScroll = useCallback(() => {
    if (!isScrolling) {
      updateScrollState()
    }
  }, [isScrolling, updateScrollState])

  const scrollTo = useCallback((direction: 'left' | 'right' | 'start' | 'business' | 'end') => {
    if (!scrollRef.current || !contentRef.current) return

    setIsScrolling(true)
    const scrollAmount = scrollRef.current.clientWidth * 0.8
    const contentWidth = contentRef.current.scrollWidth
    let targetScrollLeft = scrollRef.current.scrollLeft

    switch (direction) {
      case 'left':
        targetScrollLeft -= scrollAmount
        break
      case 'right':
        targetScrollLeft += scrollAmount
        break
      case 'start':
        targetScrollLeft = 0
        break
      case 'business':
        targetScrollLeft = contentWidth * 0.25 // A quarter of the way
        break
      case 'end':
        targetScrollLeft = scrollRef.current.scrollWidth - scrollRef.current.clientWidth
        break
    }

    scrollRef.current.scrollTo({
      left: targetScrollLeft,
      behavior: 'smooth'
    })

    setTimeout(() => setIsScrolling(false), 500) // Match typical smooth scroll duration
  }, [])

  useEffect(() => {
    const scrollElement = scrollRef.current
    if (!scrollElement) return

    scrollElement.addEventListener('scroll', handleScroll, { passive: true })
    updateScrollState()

    return () => {
      scrollElement.removeEventListener('scroll', handleScroll)
    }
  }, [handleScroll])

  useEffect(() => {
    const handleResize = () => updateScrollState()
    window.addEventListener('resize', handleResize)
    updateScrollState() // Initial check
    return () => window.removeEventListener('resize', handleResize)
  }, [updateScrollState])

  useEffect(() => {
    if (autoScrollToBusiness) {
      setTimeout(() => scrollTo('business'), 100)
    }
  }, [autoScrollToBusiness, scrollTo])

  return {
    scrollRef,
    contentRef,
    scrollTo,
    canScrollLeft,
    canScrollRight
  }
} 
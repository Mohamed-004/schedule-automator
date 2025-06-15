'use client'

import Link, { LinkProps } from 'next/link'
import { useLoading } from '@/contexts/loading-provider'
import { usePathname } from 'next/navigation'

interface CustomLinkProps extends LinkProps {
  children: React.ReactNode
  className?: string
}

export function CustomLink({ children, className, ...props }: CustomLinkProps) {
  const { setIsLoading } = useLoading()
  const pathname = usePathname()

  const handleClick = () => {
    if (props.href.toString() !== pathname) {
      setIsLoading(true)
    }
  }

  return (
    <Link {...props} onClick={handleClick} className={className}>
      {children}
    </Link>
  )
} 
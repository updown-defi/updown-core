/* eslint-disable @typescript-eslint/naming-convention */
/* eslint-disable jsx-a11y/anchor-is-valid */
import React, { ReactChild } from 'react'
import { Link } from 'react-router-dom'

interface PageLinkProps {
  to: string;
  children: ReactChild;
  className?: string;
  title: string;
}

const PageLink: React.FC<PageLinkProps> = ({
  to,
  children,
  className,
  title,
}) => {
  return (
    <Link className={className} title={title} to={to}>
      {children}
    </Link>
  )
}

export default PageLink

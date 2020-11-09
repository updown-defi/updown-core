/* eslint-disable max-len */
/* eslint-disable @typescript-eslint/naming-convention */
/* eslint-disable react/button-has-type */
import React, { ReactChild, ButtonHTMLAttributes } from 'react'
import classNames from 'classnames'

interface ButtonProps {
  children: ReactChild | ReactChild[] | string
  buttonBackground?:
    | 'bg-purple-700'
    | 'bg-green-600'
    | 'bg-red-600'
    | 'bg-primary'
    | 'bg-black'
    | 'bg-gray-200'
    | 'bg-theme-dark-gray'
  name: string
  onClick?: () => void
  padding?: string
  className?: string
  type: 'submit' | 'button' | 'reset'
  props?: ButtonHTMLAttributes<HTMLButtonElement>
  disabled?: boolean
  textColor?: String
}

const Button: React.FC<ButtonProps> = ({
  children,
  type,
  name,
  onClick,
  className,
  buttonBackground,
  props,
  padding = 'px-10 py-6',
  disabled,
  textColor = 'text-white'
}) => {
  const _className = classNames(
    'text-base font-semibold duration-200 inline-flex items-center justify-center transition-colors rounded-primary',
    padding,
    className,
    disabled
      ? 'text-gray-600 bg-gray-200'
      : classNames(textColor, buttonBackground)
  )

  return (
    <button
      type={type}
      name={name}
      onClick={onClick}
      {...props}
      className={_className}
      title={name}
      disabled={disabled}
    >
      {children}
    </button>
  )
}

export default Button

import { createPortal } from 'react-dom'

const DomPortal = ({ children }) => {
  let container
  if (typeof window !== 'undefined') {
    container = document.querySelector('#__next')
  }

  return container ? createPortal(children, container) : null
}

export default DomPortal

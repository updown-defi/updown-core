/* eslint-disable comma-dangle */
/* eslint-disable jsx-a11y/click-events-have-key-events */
/* eslint-disable jsx-a11y/no-static-element-interactions */
import React from 'react'
import classNames from 'classnames'
import styles from './Modal.module.css'

interface ModalProps {
  onModalClose: () => void
  children: any
  size: 'lg:w-1/4' | 'lg:w-2/5' | 'lg:w-1/2' | 'lg:w-11/12'
  showModal: boolean
}

const Modal: React.FC<ModalProps> = ({
  onModalClose,
  children,
  showModal,
  size
}) => {
  const modalContentClasses = classNames(
    styles['cr-modal-content'],
    showModal ? styles['cr-modal-show'] : styles['cr-modal-hide'],
    size
  )

  return (
    <>
      <section className={modalContentClasses}>
        <section>{children}</section>
      </section>

      <div
        className={styles['cr-modal-backdrop']}
        onClick={() => onModalClose()}
        style={{
          display: showModal ? 'flex' : 'none'
        }}
      />
    </>
  )
}

export default Modal

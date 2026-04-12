'use client'

import React, { createContext, useContext, useState, ReactNode } from 'react'

interface PasswordModalContextType {
  isOpen: boolean
  openModal: () => void
  closeModal: () => void
}

const PasswordModalContext = createContext<PasswordModalContextType | undefined>(undefined)

export function PasswordModalProvider({ children }: { children: ReactNode }) {
  const [isOpen, setIsOpen] = useState(false)

  const openModal = () => setIsOpen(true)
  const closeModal = () => setIsOpen(false)

  return (
    <PasswordModalContext.Provider value={{ isOpen, openModal, closeModal }}>
      {children}
    </PasswordModalContext.Provider>
  )
}

export function usePasswordModal() {
  const context = useContext(PasswordModalContext)
  if (context === undefined) {
    throw new Error('usePasswordModal must be used within a PasswordModalProvider')
  }
  return context
}

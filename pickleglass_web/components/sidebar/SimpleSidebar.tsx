'use client'

import { SidebarExpanded } from './SidebarExpanded'
import { SidebarCollapsed } from './SidebarCollapsed'

export function SimpleSidebar({ isOpen }: { isOpen: boolean }) {
  return isOpen ? <SidebarExpanded /> : <SidebarCollapsed />
}



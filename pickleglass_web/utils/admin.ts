import { doc, getDoc, setDoc, updateDoc } from 'firebase/firestore'
import { db as firestore } from './firebase'
import { useState, useEffect } from 'react'
import { useAuth } from '@/contexts/AuthContext'

export interface AdminRole {
  uid: string
  email: string
  role: 'admin' | 'super_admin'
  permissions: string[]
  createdAt: Date
  isActive: boolean
}

export interface AdminPermissions {
  canViewUsers: boolean
  canEditUsers: boolean
  canDeleteUsers: boolean
  canViewStats: boolean
  canExportData: boolean
  canManageSettings: boolean
}

const ADMIN_COLLECTION = 'admin_roles'

export class AdminService {
  // Vérifier si un utilisateur est admin
  static async isAdmin(uid: string): Promise<boolean> {
    try {
      const adminDoc = await getDoc(doc(firestore, ADMIN_COLLECTION, uid))
      if (!adminDoc.exists()) return false
      
      const adminData = adminDoc.data() as AdminRole
      return adminData.isActive && (adminData.role === 'admin' || adminData.role === 'super_admin')
    } catch (error) {
      console.error('Error checking admin status:', error)
      return false
    }
  }

  // Vérifier les permissions spécifiques
  static async hasPermission(uid: string, permission: keyof AdminPermissions): Promise<boolean> {
    try {
      const adminDoc = await getDoc(doc(firestore, ADMIN_COLLECTION, uid))
      if (!adminDoc.exists()) return false
      
      const adminData = adminDoc.data() as AdminRole
      return adminData.isActive && adminData.permissions.includes(permission)
    } catch (error) {
      console.error('Error checking permission:', error)
      return false
    }
  }

  // Récupérer le rôle admin complet
  static async getAdminRole(uid: string): Promise<AdminRole | null> {
    try {
      const adminDoc = await getDoc(doc(firestore, ADMIN_COLLECTION, uid))
      if (!adminDoc.exists()) return null
      
      return adminDoc.data() as AdminRole
    } catch (error) {
      console.error('Error getting admin role:', error)
      return null
    }
  }

  // Créer un nouvel admin (super_admin seulement)
  static async createAdmin(adminData: Omit<AdminRole, 'createdAt'>): Promise<void> {
    try {
      await setDoc(doc(firestore, ADMIN_COLLECTION, adminData.uid), {
        ...adminData,
        createdAt: new Date()
      })
    } catch (error) {
      console.error('Error creating admin:', error)
      throw error
    }
  }

  // Mettre à jour les permissions d'un admin
  static async updateAdminPermissions(uid: string, permissions: string[]): Promise<void> {
    try {
      await updateDoc(doc(firestore, ADMIN_COLLECTION, uid), {
        permissions,
        updatedAt: new Date()
      })
    } catch (error) {
      console.error('Error updating admin permissions:', error)
      throw error
    }
  }

  // Désactiver un admin
  static async deactivateAdmin(uid: string): Promise<void> {
    try {
      await updateDoc(doc(firestore, ADMIN_COLLECTION, uid), {
        isActive: false,
        updatedAt: new Date()
      })
    } catch (error) {
      console.error('Error deactivating admin:', error)
      throw error
    }
  }

  // Récupérer tous les admins (pour super_admin)
  static async getAllAdmins(): Promise<AdminRole[]> {
    try {
      // Cette fonction nécessiterait une règle de sécurité spéciale
      // ou être appelée depuis une Cloud Function
      throw new Error('Not implemented - requires Cloud Function')
    } catch (error) {
      console.error('Error getting all admins:', error)
      return []
    }
  }
}

// Hook React pour utiliser l'admin service
export const useAdmin = () => {
  const [isAdmin, setIsAdmin] = useState(false)
  const [adminRole, setAdminRole] = useState<AdminRole | null>(null)
  const [loading, setLoading] = useState(true)
  const { user } = useAuth()

  useEffect(() => {
    const checkAdminStatus = async () => {
      if (!user?.uid) {
        setIsAdmin(false)
        setAdminRole(null)
        setLoading(false)
        return
      }

      try {
        const adminStatus = await AdminService.isAdmin(user.uid)
        setIsAdmin(adminStatus)
        
        if (adminStatus) {
          const role = await AdminService.getAdminRole(user.uid)
          setAdminRole(role)
        }
      } catch (error) {
        console.error('Error checking admin status:', error)
        setIsAdmin(false)
      } finally {
        setLoading(false)
      }
    }

    checkAdminStatus()
  }, [user?.uid])

  return { isAdmin, adminRole, loading }
} 
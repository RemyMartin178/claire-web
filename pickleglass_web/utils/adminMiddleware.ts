// Middleware pour vérifier les permissions admin côté serveur
// À utiliser avec Cloud Functions ou API Routes

export interface AdminMiddlewareOptions {
  requireAdmin: boolean
  requiredPermissions?: string[]
  redirectOnFail?: boolean
}

export const createAdminMiddleware = (options: AdminMiddlewareOptions) => {
  return async (req: any, res: any, next: any) => {
    try {
      const { uid } = req.user // Supposé être défini par Firebase Auth middleware
      
      if (!uid) {
        return res.status(401).json({ error: 'Unauthorized' })
      }

      // Vérifier le statut admin dans Firestore
      const adminDoc = await getDoc(doc(firestore, 'admin_roles', uid))
      
      if (!adminDoc.exists()) {
        if (options.redirectOnFail) {
          return res.redirect('/accueil')
        }
        return res.status(403).json({ error: 'Access denied' })
      }

      const adminData = adminDoc.data()
      
      if (!adminData.isActive) {
        if (options.redirectOnFail) {
          return res.redirect('/accueil')
        }
        return res.status(403).json({ error: 'Admin account inactive' })
      }

      // Vérifier les permissions spécifiques
      if (options.requiredPermissions) {
        const hasAllPermissions = options.requiredPermissions.every(
          permission => adminData.permissions.includes(permission)
        )
        
        if (!hasAllPermissions) {
          if (options.redirectOnFail) {
            return res.redirect('/accueil')
          }
          return res.status(403).json({ error: 'Insufficient permissions' })
        }
      }

      // Ajouter les infos admin à la requête
      req.admin = {
        uid,
        role: adminData.role,
        permissions: adminData.permissions
      }

      next()
    } catch (error) {
      console.error('Admin middleware error:', error)
      return res.status(500).json({ error: 'Internal server error' })
    }
  }
} 
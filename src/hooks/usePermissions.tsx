// src/hooks/usePermissions.ts
import { useAuth } from '@/context/AuthContext';

type AdminRole = 'Super Admin' | 'Procurement Officer' | 'Evaluator' | 'Viewer';

interface Permissions {
  // Tender permissions
  canCreateTender: boolean;
  canEditTender: boolean;
  canDeleteTender: boolean;
  canPublishTender: boolean;
  
  // Supplier permissions
  canApproveSupplier: boolean;
  canDeleteSupplier: boolean;
  
  // Bid permissions
  canEvaluateBids: boolean;
  canAwardTender: boolean;
  
  // User permissions
  canManageUsers: boolean;
  
  // Report permissions
  canExportReports: boolean;
  
  // Settings permissions
  canManageSettings: boolean;
}

const rolePermissions: Record<AdminRole, Permissions> = {
  'Super Admin': {
    canCreateTender: true,
    canEditTender: true,
    canDeleteTender: true,
    canPublishTender: true,
    canApproveSupplier: true,
    canDeleteSupplier: true,
    canEvaluateBids: true,
    canAwardTender: true,
    canManageUsers: true,
    canExportReports: true,
    canManageSettings: true,
  },
  'Procurement Officer': {
    canCreateTender: true,
    canEditTender: true,
    canDeleteTender: false,
    canPublishTender: true,
    canApproveSupplier: true,
    canDeleteSupplier: false,
    canEvaluateBids: true,
    canAwardTender: true,
    canManageUsers: false,
    canExportReports: true,
    canManageSettings: false,
  },
  'Evaluator': {
    canCreateTender: false,
    canEditTender: false,
    canDeleteTender: false,
    canPublishTender: false,
    canApproveSupplier: false,
    canDeleteSupplier: false,
    canEvaluateBids: true,
    canAwardTender: false,
    canManageUsers: false,
    canExportReports: true,
    canManageSettings: false,
  },
  'Viewer': {
    canCreateTender: false,
    canEditTender: false,
    canDeleteTender: false,
    canPublishTender: false,
    canApproveSupplier: false,
    canDeleteSupplier: false,
    canEvaluateBids: false,
    canAwardTender: false,
    canManageUsers: false,
    canExportReports: false,
    canManageSettings: false,
  },
};

export function usePermissions() {
  const { user } = useAuth();
  const role = user?.role as AdminRole;
  
  // Default to Viewer permissions if role not recognized
  const permissions = rolePermissions[role] || rolePermissions['Viewer'];
  
  const hasPermission = (permission: keyof Permissions): boolean => {
    return permissions[permission] || false;
  };
  
  const isAtLeast = (requiredRole: AdminRole): boolean => {
    const roleLevel: Record<AdminRole, number> = {
      'Viewer': 1,
      'Evaluator': 2,
      'Procurement Officer': 3,
      'Super Admin': 4,
    };
    return roleLevel[role] >= roleLevel[requiredRole];
  };
  
  return {
    ...permissions,
    hasPermission,
    isAtLeast,
    role,
  };
}
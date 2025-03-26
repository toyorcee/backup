// Define role types
export enum UserRole {
  SUPER_ADMIN = "SUPER_ADMIN",
  ADMIN = "ADMIN",
  USER = "USER",
}

// Define permission types with clear categorization
export enum Permission {
  // ===== Admin Management (Super Admin Only) =====
  CREATE_ADMIN = "CREATE_ADMIN",
  EDIT_ADMIN = "EDIT_ADMIN",
  DELETE_ADMIN = "DELETE_ADMIN",
  VIEW_ALL_ADMINS = "VIEW_ALL_ADMINS",

  // ===== User Management (Admin & Super Admin) =====
  CREATE_USER = "CREATE_USER",
  EDIT_USER = "EDIT_USER",
  DELETE_USER = "DELETE_USER",
  VIEW_ALL_USERS = "VIEW_ALL_USERS",
  MANAGE_DEPARTMENT_USERS = "MANAGE_DEPARTMENT_USERS",

  // ===== Department Management =====
  CREATE_DEPARTMENT = "CREATE_DEPARTMENT",
  EDIT_DEPARTMENT = "EDIT_DEPARTMENT",
  DELETE_DEPARTMENT = "DELETE_DEPARTMENT",
  VIEW_ALL_DEPARTMENTS = "VIEW_ALL_DEPARTMENTS",

  // ===== Employee Lifecycle =====
  // Onboarding
  MANAGE_ONBOARDING = "MANAGE_ONBOARDING",
  VIEW_ONBOARDING = "VIEW_ONBOARDING",
  // Offboarding
  MANAGE_OFFBOARDING = "MANAGE_OFFBOARDING",
  VIEW_OFFBOARDING = "VIEW_OFFBOARDING",
  APPROVE_OFFBOARDING = "APPROVE_OFFBOARDING",

  // ===== Leave Management =====
  // Admin & Super Admin
  APPROVE_LEAVE = "APPROVE_LEAVE",
  VIEW_TEAM_LEAVE = "VIEW_TEAM_LEAVE",
  VIEW_ALL_LEAVE = "VIEW_ALL_LEAVE",
  // User Level
  REQUEST_LEAVE = "REQUEST_LEAVE",
  VIEW_OWN_LEAVE = "VIEW_OWN_LEAVE",
  CANCEL_OWN_LEAVE = "CANCEL_OWN_LEAVE",

  // ===== Payroll Management =====
  // Main Payroll Access
  VIEW_ALL_PAYROLL = "VIEW_ALL_PAYROLL",
  VIEW_DEPARTMENT_PAYROLL = "VIEW_DEPARTMENT_PAYROLL",
  VIEW_OWN_PAYSLIP = "VIEW_OWN_PAYSLIP",

  // Process Payroll
  CREATE_PAYROLL = "CREATE_PAYROLL",
  EDIT_PAYROLL = "EDIT_PAYROLL",
  DELETE_PAYROLL = "DELETE_PAYROLL",
  APPROVE_PAYROLL = "APPROVE_PAYROLL",
  GENERATE_PAYSLIP = "GENERATE_PAYSLIP",

  // Salary Structure
  MANAGE_SALARY_STRUCTURE = "MANAGE_SALARY_STRUCTURE",
  VIEW_SALARY_STRUCTURE = "VIEW_SALARY_STRUCTURE",
  EDIT_SALARY_STRUCTURE = "EDIT_SALARY_STRUCTURE",

  // Deductions
  MANAGE_DEDUCTIONS = "MANAGE_DEDUCTIONS",
  VIEW_DEDUCTIONS = "VIEW_DEDUCTIONS",
  EDIT_DEDUCTIONS = "EDIT_DEDUCTIONS",

  // Allowances
  MANAGE_ALLOWANCES = "MANAGE_ALLOWANCES",
  VIEW_ALLOWANCES = "VIEW_ALLOWANCES",
  EDIT_ALLOWANCES = "EDIT_ALLOWANCES",

  // Bonuses & Overtime
  MANAGE_BONUSES = "MANAGE_BONUSES",
  VIEW_BONUSES = "VIEW_BONUSES",
  EDIT_BONUSES = "EDIT_BONUSES",
  MANAGE_OVERTIME = "MANAGE_OVERTIME",

  // ===== Reports & Analytics =====
  VIEW_REPORTS = "VIEW_REPORTS",
  VIEW_AUDIT_LOGS = "VIEW_AUDIT_LOGS",
  VIEW_PAYROLL_REPORTS = "VIEW_PAYROLL_REPORTS",
  VIEW_EMPLOYEE_REPORTS = "VIEW_EMPLOYEE_REPORTS",
  VIEW_TAX_REPORTS = "VIEW_TAX_REPORTS",
  VIEW_PAYROLL_STATS = "VIEW_PAYROLL_STATS",

  // ===== System Settings =====
  MANAGE_SYSTEM = "MANAGE_SYSTEM",
  VIEW_SYSTEM_HEALTH = "VIEW_SYSTEM_HEALTH",
  MANAGE_COMPANY_PROFILE = "MANAGE_COMPANY_PROFILE",
  MANAGE_TAX_CONFIG = "MANAGE_TAX_CONFIG",
  MANAGE_COMPLIANCE = "MANAGE_COMPLIANCE",
  MANAGE_NOTIFICATIONS = "MANAGE_NOTIFICATIONS",
  MANAGE_INTEGRATIONS = "MANAGE_INTEGRATIONS",
  MANAGE_DOCUMENTS = "MANAGE_DOCUMENTS",

  // ===== Profile & Personal Info =====
  VIEW_PERSONAL_INFO = "VIEW_PERSONAL_INFO",
  EDIT_PERSONAL_INFO = "EDIT_PERSONAL_INFO",

<<<<<<< HEAD
  // ===== Disciplinary =====
  VIEW_DISCIPLINARY_RECORDS = "VIEW_DISCIPLINARY_RECORDS",
  MANAGE_DISCIPLINARY_ACTIONS = "MANAGE_DISCIPLINARY_ACTIONS",
=======
  //  ================================================= Feedback =================================================
  // Feedback
  MANAGE_FEEDBACK = "MANAGE_FEEDBACK",
  SUBMIT_FEEDBACK = "SUBMIT_FEEDBACK",
  APPROVE_FEEDBACK = "APPROVE_FEEDBACK",
>>>>>>> 57b374b1b0a961de56f44daa05cca8bc72acdc1a
}

export interface BankDetails {
  bankName: string;
  accountNumber: string;
  accountName: string;
}

export interface EmergencyContact {
  name: string;
  relationship: string;
  phone: string;
}

export interface User {
  id: string;
  employeeId: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  role: UserRole;
  permissions: Permission[];
  department?: string;
  position: string;
  gradeLevel: string;
  workLocation: string;
  dateJoined: Date;
  status: "active" | "inactive" | "suspended";
  emergencyContact: EmergencyContact;
  bankDetails: BankDetails;
  profileImage?: string;
  reportingTo?: {
    id: string;
    name: string;
    position: string;
  };
  isEmailVerified: boolean;
  lastLogin?: Date;
  createdAt: Date;
  updatedAt: Date;
  managedEmployeeIds?: string[];
}

import Notification from "../models/Notification.js";
import UserModel from "../models/User.js";
import { APPROVAL_LEVELS } from "../controllers/BaseApprovalController.js";
import PayrollModel from "../models/Payroll.js";

// Define notification types as constants
export const NOTIFICATION_TYPES = {
  PAYROLL_CREATED: "PAYROLL_CREATED",
  PAYROLL_SUBMITTED: "PAYROLL_SUBMITTED",
  PAYROLL_APPROVED: "PAYROLL_APPROVED",
  PAYROLL_REJECTED: "PAYROLL_REJECTED",
  PAYROLL_PAID: "PAYROLL_PAID",
  BANK_DETAILS_REQUIRED: "BANK_DETAILS_REQUIRED",
  DEPARTMENT_PAYROLL_APPROVED: "DEPARTMENT_PAYROLL_APPROVED",
  DEPARTMENT_PAYROLL_REJECTED: "DEPARTMENT_PAYROLL_REJECTED",
  DEPARTMENT_PAYROLL_REJECTION_STARTED: "DEPARTMENT_PAYROLL_REJECTION_STARTED",
  DEPARTMENT_PAYROLL_REJECTION_SUMMARY: "DEPARTMENT_PAYROLL_REJECTION_SUMMARY",
  PAYROLL_DRAFT_CREATED: "PAYROLL_DRAFT_CREATED",
  PAYROLL_DRAFT_UPDATED: "PAYROLL_DRAFT_UPDATED",
  PAYROLL_DRAFT_DELETED: "PAYROLL_DRAFT_DELETED",
  PAYROLL_DRAFT_SUBMITTED: "PAYROLL_DRAFT_SUBMITTED",
  PAYROLL_DRAFT_APPROVED: "PAYROLL_DRAFT_APPROVED",
  PAYROLL_DRAFT_REJECTED: "PAYROLL_DRAFT_REJECTED",
  PAYROLL_ERROR_VALIDATION: "PAYROLL_ERROR_VALIDATION",
  PAYROLL_ERROR_PROCESSING: "PAYROLL_ERROR_PROCESSING",
  PAYROLL_ERROR_SYSTEM_ERROR: "PAYROLL_ERROR_SYSTEM_ERROR",
  PAYROLL_COMPLETED: "PAYROLL_COMPLETED",
  BULK_PAYROLL_PROCESSED: "BULK_PAYROLL_PROCESSED",
  PAYMENT_FAILED: "PAYMENT_FAILED",
  PAYMENT_CANCELLED: "PAYMENT_CANCELLED",
  PAYMENT_ARCHIVED: "PAYMENT_ARCHIVED",

  // New notification types for more comprehensive coverage
  PAYROLL_PROCESSING_STARTED: "PAYROLL_PROCESSING_STARTED",
  PAYROLL_PROCESSING_COMPLETED: "PAYROLL_PROCESSING_COMPLETED",
  PAYROLL_PROCESSING_FAILED: "PAYROLL_PROCESSING_FAILED",
  PAYROLL_PROCESSING_WARNING: "PAYROLL_PROCESSING_WARNING",
  PAYROLL_PROCESSING_ERROR: "PAYROLL_PROCESSING_ERROR",
  PAYROLL_PROCESSING_SKIPPED: "PAYROLL_PROCESSING_SKIPPED",
  PAYROLL_PROCESSING_SUMMARY: "PAYROLL_PROCESSING_SUMMARY",

  // Department payroll specific notifications
  DEPARTMENT_PAYROLL_PROCESSING_STARTED:
    "DEPARTMENT_PAYROLL_PROCESSING_STARTED",
  DEPARTMENT_PAYROLL_PROCESSING_COMPLETED:
    "DEPARTMENT_PAYROLL_PROCESSING_COMPLETED",
  DEPARTMENT_PAYROLL_PROCESSING_FAILED: "DEPARTMENT_PAYROLL_PROCESSING_FAILED",
  DEPARTMENT_PAYROLL_PROCESSING_WARNING:
    "DEPARTMENT_PAYROLL_PROCESSING_WARNING",
  DEPARTMENT_PAYROLL_PROCESSING_ERROR: "DEPARTMENT_PAYROLL_PROCESSING_ERROR",
  DEPARTMENT_PAYROLL_PROCESSING_SKIPPED:
    "DEPARTMENT_PAYROLL_PROCESSING_SKIPPED",
  DEPARTMENT_PAYROLL_PROCESSING_SUMMARY:
    "DEPARTMENT_PAYROLL_PROCESSING_SUMMARY",

  // Multiple employee payroll specific notifications
  MULTIPLE_PAYROLL_PROCESSING_STARTED: "MULTIPLE_PAYROLL_PROCESSING_STARTED",
  MULTIPLE_PAYROLL_PROCESSING_COMPLETED:
    "MULTIPLE_PAYROLL_PROCESSING_COMPLETED",
  MULTIPLE_PAYROLL_PROCESSING_FAILED: "MULTIPLE_PAYROLL_PROCESSING_FAILED",
  MULTIPLE_PAYROLL_PROCESSING_WARNING: "MULTIPLE_PAYROLL_PROCESSING_WARNING",
  MULTIPLE_PAYROLL_PROCESSING_ERROR: "MULTIPLE_PAYROLL_PROCESSING_ERROR",
  MULTIPLE_PAYROLL_PROCESSING_SKIPPED: "MULTIPLE_PAYROLL_PROCESSING_SKIPPED",
  MULTIPLE_PAYROLL_PROCESSING_SUMMARY: "MULTIPLE_PAYROLL_PROCESSING_SUMMARY",

  // Error specific notifications
  PAYROLL_ERROR_NO_GRADE_LEVEL: "PAYROLL_ERROR_NO_GRADE_LEVEL",
  PAYROLL_ERROR_INCOMPLETE_BANK_DETAILS:
    "PAYROLL_ERROR_INCOMPLETE_BANK_DETAILS",
  PAYROLL_ERROR_DUPLICATE_PAYROLL: "PAYROLL_ERROR_DUPLICATE_PAYROLL",
  PAYROLL_ERROR_CALCULATION_FAILED: "PAYROLL_ERROR_CALCULATION_FAILED",
  PAYROLL_ERROR_PERMISSION_DENIED: "PAYROLL_ERROR_PERMISSION_DENIED",
};

// Message templates for different notification types
const notificationMessages = {
  [NOTIFICATION_TYPES.PAYROLL_CREATED]: (employee, payroll) =>
    `Payroll for ${employee.firstName} ${employee.lastName} (${payroll.month}/${payroll.year}) has been created`,
  [NOTIFICATION_TYPES.PAYROLL_SUBMITTED]: (employee, payroll) => {
    // Check if the employee is the one who submitted
    const isSubmitter =
      employee._id.toString() === payroll.approvalFlow?.submittedBy?.toString();

    if (isSubmitter) {
      return `You have submitted payroll for ${payroll.employee.firstName} ${payroll.employee.lastName} (${payroll.month}/${payroll.year}) and it is waiting for your approval as HR Manager`;
    } else {
      return `New payroll submission for ${employee.firstName} ${
        employee.lastName
      } (${employee.department?.name || "No Department"}) for ${
        payroll.month
      }/${payroll.year} requires your approval as HR Manager`;
    }
  },
  [NOTIFICATION_TYPES.PAYROLL_APPROVED]: (employee, payroll, remarks) => {
    const currentLevel = payroll.approvalFlow?.currentLevel;
    let nextLevel = "";

    if (currentLevel === APPROVAL_LEVELS.HR_MANAGER) {
      nextLevel = "Finance Director";
    } else if (currentLevel === APPROVAL_LEVELS.FINANCE_DIRECTOR) {
      nextLevel = "Super Admin";
    } else if (currentLevel === APPROVAL_LEVELS.DEPARTMENT_HEAD) {
      nextLevel = "HR Manager";
    }

    // Check if the employee is the one who approved
    const isApprover =
      employee._id.toString() === payroll.approvalFlow?.approvedBy?.toString();

    if (isApprover) {
      if (currentLevel === APPROVAL_LEVELS.HR_MANAGER) {
        return `Payroll for ${payroll.employee.firstName} ${
          payroll.employee.lastName
        } (${payroll.month}/${
          payroll.year
        }) has been successfully approved by you as HR Manager${
          remarks ? `: ${remarks}` : ""
        } and is now waiting for Finance Director approval`;
      } else if (currentLevel === APPROVAL_LEVELS.FINANCE_DIRECTOR) {
        return `Payroll for ${payroll.employee.firstName} ${
          payroll.employee.lastName
        } (${payroll.month}/${
          payroll.year
        }) has been successfully approved by you as Finance Director${
          remarks ? `: ${remarks}` : ""
        } and is now waiting for Super Admin approval`;
      } else if (currentLevel === APPROVAL_LEVELS.DEPARTMENT_HEAD) {
        return `Payroll for ${payroll.employee.firstName} ${
          payroll.employee.lastName
        } (${payroll.month}/${
          payroll.year
        }) has been successfully approved by you as Department Head${
          remarks ? `: ${remarks}` : ""
        } and is now waiting for HR Manager approval`;
      }
    }

    return `Payroll for ${payroll.employee.firstName} ${
      payroll.employee.lastName
    } (${payroll.month}/${payroll.year}) has been approved${
      remarks ? `: ${remarks}` : ""
    }${nextLevel ? ` and is waiting for ${nextLevel} approval` : ""}`;
  },
  [NOTIFICATION_TYPES.PAYROLL_REJECTED]: (employee, payroll, remarks) =>
    `Payroll for ${employee.firstName} ${employee.lastName} (${payroll.month}/${payroll.year}) has been rejected. Reason: ${remarks}`,
  [NOTIFICATION_TYPES.PAYROLL_PAID]: (employee, payroll) =>
    `Payroll for ${employee.firstName} ${employee.lastName} (${payroll.month}/${payroll.year}) has been processed for payment`,
  [NOTIFICATION_TYPES.BANK_DETAILS_REQUIRED]: (employee, payroll) =>
    `Bank details are required for ${employee.firstName} ${employee.lastName}'s payroll approval. Please update your bank details in your profile.`,
  [NOTIFICATION_TYPES.DEPARTMENT_PAYROLL_APPROVED]: (
    employee,
    payroll,
    remarks
  ) =>
    `All department payrolls for ${payroll.month}/${
      payroll.year
    } have been approved${remarks ? `: ${remarks}` : ""}`,
  [NOTIFICATION_TYPES.DEPARTMENT_PAYROLL_REJECTED]: (
    employee,
    payroll,
    remarks
  ) =>
    `Department payrolls for ${payroll.month}/${payroll.year} have been rejected. Reason: ${remarks}`,
  [NOTIFICATION_TYPES.DEPARTMENT_PAYROLL_REJECTION_STARTED]: (employee, data) =>
    `Started rejecting department payrolls for ${data.month}/${data.year}${
      data.remarks ? `: ${data.remarks}` : ""
    }`,
  [NOTIFICATION_TYPES.DEPARTMENT_PAYROLL_REJECTION_SUMMARY]: (employee, data) =>
    `Department payroll rejection summary for ${data.month}/${data.year}: ${data.rejected} rejected successfully, ${data.failed} failed. ${data.summary}`,
  [NOTIFICATION_TYPES.PAYROLL_DRAFT_CREATED]: (employee, payroll) =>
    `A draft payroll for ${employee.firstName} ${employee.lastName} (${payroll.month}/${payroll.year}) has been created for your review`,
  [NOTIFICATION_TYPES.BULK_PAYROLL_PROCESSED]: (employee, payroll) =>
    `Bulk payroll processing for ${payroll.month}/${payroll.year} has been completed`,
  [NOTIFICATION_TYPES.PAYMENT_FAILED]: (employee, payroll, notes) =>
    `Payment for ${employee.firstName} ${employee.lastName}'s payroll (${
      payroll.month
    }/${payroll.year}) has failed.${notes ? ` Reason: ${notes}` : ""}`,
  [NOTIFICATION_TYPES.PAYMENT_CANCELLED]: (employee, payroll, notes) =>
    `Payment for ${employee.firstName} ${employee.lastName}'s payroll (${
      payroll.month
    }/${payroll.year}) has been cancelled.${notes ? ` Reason: ${notes}` : ""}`,
  [NOTIFICATION_TYPES.PAYMENT_ARCHIVED]: (employee, payroll) =>
    `Payment record for ${employee.firstName} ${employee.lastName}'s payroll (${payroll.month}/${payroll.year}) has been archived`,
};

export class NotificationService {
  static async createNotification(
    recipientId,
    type,
    employee,
    payroll,
    remarks,
    options = {}
  ) {
    try {
      console.log("Creating notification with data:", {
        recipientId,
        type,
        employeeId: employee?._id,
        payrollId: payroll?._id,
        remarks,
        options,
      });

      // Get employee data if not provided
      let employeeData = employee;
      if (!employeeData && payroll?.employee) {
        employeeData = await UserModel.findById(payroll.employee);
      }

      // Get payroll data if not provided
      let payrollData = payroll;
      if (!payrollData && employeeData?.payrolls?.length > 0) {
        payrollData = await PayrollModel.findById(employeeData.payrolls[0]);
      }

      // Generate notification message
      let message = "";
      let title = "";

      // Get message template based on notification type
      const template = this.getMessageTemplate(type, {
        employee: employeeData,
        payroll: payrollData,
        currentLevel: payrollData?.approvalFlow?.currentLevel,
        nextLevel: payrollData?.approvalFlow?.nextLevel,
        remarks,
      });

      title = template.title;
      message = template.message;

      // Create notification
      const notification = new Notification({
        recipient: recipientId,
        type,
        title,
        message,
        data: {
          payrollId: payrollData?._id,
          month: payrollData?.month,
          year: payrollData?.year,
          status: payrollData?.status,
          remarks,
          employeeId: employeeData?._id,
          employeeName: employeeData
            ? `${employeeData.firstName} ${employeeData.lastName}`
            : "Unknown Employee",
          employeeEmail: employeeData?.email || "Unknown Email",
          employeeDepartment:
            employeeData?.department?.name || "Unknown Department",
          employeeDepartmentCode: employeeData?.department?.code || "Unknown",
          basicSalary: payrollData?.basicSalary || 0,
          totalAllowances: payrollData?.totalAllowances || 0,
          totalDeductions: payrollData?.totalDeductions || 0,
          netPay: payrollData?.netPay || 0,
          currentLevel: payrollData?.approvalFlow?.currentLevel,
          nextApprovalLevel: payrollData?.approvalFlow?.nextLevel,
          approvalHistory: payrollData?.approvalFlow?.history || [],
          actionButtons: this.getActionButtons(type, payrollData),
          statusColor: this.getStatusColor(payrollData?.status),
          statusIcon: this.getStatusIcon(payrollData?.status),
        },
        read: false,
      });

      console.log("Creating notification with data:", notification);
      const savedNotification = await notification.save();
      console.log("Created notification:", savedNotification._id);

      return savedNotification;
    } catch (error) {
      console.error("Error creating notification:", error);
      throw error;
    }
  }

  static async createPayrollNotification(
    payroll,
    type,
    admin,
    remarks = "",
    data = {}
  ) {
    try {
      console.log("Creating payroll notification:", {
        payrollId: payroll._id,
        type,
        adminId: admin._id,
        remarks,
      });

      // Get the employee from the payroll
      const employee = await UserModel.findById(payroll.employee);
      if (!employee) {
        console.error("Employee not found for payroll:", payroll._id);
        return null;
      }

      // Create notifications array to store all notifications
      const notifications = [];

      // 1. Notify the employee
      const employeeNotification = await this.createNotification(
        employee._id,
        type,
        employee,
        payroll,
        remarks,
        data
      );
      if (employeeNotification) {
        notifications.push(employeeNotification);
      }

      // 2. Notify the HR Manager
      const hrManager = await UserModel.findOne({
        department: employee.department,
        position: { $in: ["HR Manager", "Human Resources Manager"] },
      });

      if (hrManager && hrManager._id.toString() !== admin._id.toString()) {
        const hrManagerNotification = await this.createNotification(
          hrManager._id,
          type,
          employee,
          payroll,
          remarks,
          data
        );
        if (hrManagerNotification) {
          notifications.push(hrManagerNotification);
        }
      }

      // 3. Notify the Finance Director
      const financeDirector = await UserModel.findOne({
        position: { $in: ["Finance Director", "Chief Financial Officer"] },
      });

      if (
        financeDirector &&
        financeDirector._id.toString() !== admin._id.toString()
      ) {
        const financeDirectorNotification = await this.createNotification(
          financeDirector._id,
          type,
          employee,
          payroll,
          remarks,
          data
        );
        if (financeDirectorNotification) {
          notifications.push(financeDirectorNotification);
        }
      }

      // 4. Notify the Super Admin
      const superAdmin = await UserModel.findOne({
        position: "Super Admin",
      });

      if (superAdmin && superAdmin._id.toString() !== admin._id.toString()) {
        const superAdminNotification = await this.createNotification(
          superAdmin._id,
          type,
          employee,
          payroll,
          remarks,
          data
        );
        if (superAdminNotification) {
          notifications.push(superAdminNotification);
        }
      }

      // 5. Notify the creator/admin if they are different from the above
      const alreadyNotified = notifications.some(
        (n) => n.recipient.toString() === admin._id.toString()
      );

      if (!alreadyNotified) {
        const adminNotification = await this.createNotification(
          admin._id,
          type,
          employee,
          payroll,
          remarks,
          data
        );
        if (adminNotification) {
          notifications.push(adminNotification);
        }
      }

      return notifications;
    } catch (error) {
      console.error("Error creating payroll notification:", error);
      return null;
    }
  }

  static async createBatchPayrollNotifications(
    userIds,
    type,
    payroll,
    remarks = ""
  ) {
    console.log(
      `🔔 Creating batch payroll notifications: ${type} for ${userIds.length} users`
    );

    // Get all employees with their departments in one query
    const employees = await UserModel.find({ _id: { $in: userIds } })
      .populate("department", "name code")
      .lean();

    console.log(
      `👥 Found ${employees.length} employees for batch notifications`
    );

    // Create a map for quick lookup
    const employeeMap = {};
    employees.forEach((emp) => {
      employeeMap[emp._id.toString()] = emp;
    });

    const notifications = userIds.map((userId) => {
      const employee = employeeMap[userId.toString()];
      if (!employee) {
        console.warn(`⚠️ Employee not found for ID: ${userId}`);
        return this.createPayrollNotification(payroll, type, null, remarks);
      }

      console.log(
        `👤 Processing notification for: ${employee.firstName} ${employee.lastName} (${employee._id})`
      );
      console.log(
        `🏢 Department: ${employee.department?.name || "Not assigned"}`
      );

      return this.createPayrollNotification(payroll, type, null, remarks);
    });

    return await Promise.all(notifications);
  }

  // Helper function to get appropriate icon for notification type
  static getNotificationIcon(type) {
    if (type.includes("APPROVED")) return "check-circle";
    if (type.includes("REJECTED")) return "x-circle";
    if (type.includes("PENDING")) return "clock";
    if (type.includes("SUBMITTED")) return "send";
    if (type.includes("COMPLETED")) return "check-double";
    if (type.includes("PAID")) return "credit-card";
    return "bell";
  }

  // Helper function to get appropriate color for notification type
  static getNotificationColor(type) {
    if (type.includes("APPROVED")) return "success";
    if (type.includes("REJECTED")) return "danger";
    if (type.includes("PENDING")) return "warning";
    if (type.includes("SUBMITTED")) return "info";
    if (type.includes("COMPLETED")) return "success";
    if (type.includes("PAID")) return "primary";
    return "secondary";
  }

  // Helper function to get appropriate actions for notification type
  static getNotificationActions(type, payrollId) {
    const actions = [];

    if (type.includes("PENDING") || type.includes("SUBMITTED")) {
      actions.push({
        label: "View Details",
        action: "view",
        url: `/payroll/${payrollId}`,
        icon: "eye",
      });

      actions.push({
        label: "Approve",
        action: "approve",
        url: `/payroll/${payrollId}/approve`,
        icon: "check",
      });

      actions.push({
        label: "Reject",
        action: "reject",
        url: `/payroll/${payrollId}/reject`,
        icon: "x",
      });
    } else if (type.includes("APPROVED")) {
      actions.push({
        label: "View Details",
        action: "view",
        url: `/payroll/${payrollId}`,
        icon: "eye",
      });
    } else if (type.includes("REJECTED")) {
      actions.push({
        label: "View Details",
        action: "view",
        url: `/payroll/${payrollId}`,
        icon: "eye",
      });

      actions.push({
        label: "Edit",
        action: "edit",
        url: `/payroll/${payrollId}/edit`,
        icon: "edit",
      });
    } else if (type.includes("COMPLETED")) {
      actions.push({
        label: "View Details",
        action: "view",
        url: `/payroll/${payrollId}`,
        icon: "eye",
      });

      actions.push({
        label: "Download",
        action: "download",
        url: `/payroll/${payrollId}/download`,
        icon: "download",
      });
    }

    return actions;
  }

  static getActionButtons(type, payroll) {
    // Ensure type is a string before using includes
    const typeStr = String(type);

    if (typeStr.includes("PAYROLL_APPROVED")) {
      return [
        {
          label: "View Details",
          action: "view",
          color: "primary",
          icon: "eye",
        },
      ];
    }

    if (typeStr.includes("PAYROLL_REJECTED")) {
      return [
        {
          label: "View Details",
          action: "view",
          color: "danger",
          icon: "eye",
        },
      ];
    }

    if (typeStr.includes("PAYROLL_SUBMITTED")) {
      return [
        {
          label: "Review",
          action: "review",
          color: "primary",
          icon: "check-circle",
        },
      ];
    }

    if (typeStr.includes("PAYROLL_DRAFT_CREATED")) {
      return [
        {
          label: "View Draft",
          action: "view",
          color: "info",
          icon: "file-text",
        },
      ];
    }

    return [];
  }

  static getStatusColor(status) {
    switch (status?.toLowerCase()) {
      case "draft":
        return "gray";
      case "pending":
        return "yellow";
      case "approved":
        return "green";
      case "rejected":
        return "red";
      case "paid":
        return "blue";
      default:
        return "gray";
    }
  }

  static getStatusIcon(status) {
    switch (status?.toLowerCase()) {
      case "draft":
        return "file";
      case "pending":
        return "clock";
      case "approved":
        return "check";
      case "rejected":
        return "x";
      case "paid":
        return "money";
      default:
        return "file";
    }
  }

  static getMessageTemplate(type, data = {}) {
    const {
      employee,
      payroll,
      currentLevel,
      nextLevel,
      remarks,
      approvalLevel,
    } = data;
    console.log("🔍 getMessageTemplate called with:", {
      type,
      data,
      currentLevel,
      approvalLevel,
      dataCurrentLevel: data.currentLevel,
      dataApprovalLevel: data.approvalLevel,
      dataDataApprovalLevel: data.data?.approvalLevel,
    });

    const employeeName = employee
      ? `${employee.firstName} ${employee.lastName}`
      : "Unknown Employee";
    const payrollPeriod = payroll
      ? `${payroll.month}/${payroll.year}`
      : "Unknown Period";
    const netPay = payroll?.netPay
      ? `₦${payroll.netPay.toLocaleString()}`
      : "Unknown Amount";

    switch (type) {
      case NOTIFICATION_TYPES.PAYROLL_APPROVED:
        // Get approvalLevel from data.approvalLevel or data.data.approvalLevel
        const level =
          data.approvalLevel || (data.data && data.data.approvalLevel);
        console.log("🔍 PAYROLL_APPROVED level check:", {
          level,
          isHRManager: level === APPROVAL_LEVELS.HR_MANAGER,
          isFinanceDirector: level === APPROVAL_LEVELS.FINANCE_DIRECTOR,
        });

        if (level === APPROVAL_LEVELS.HR_MANAGER) {
          console.log("✅ Using HR Manager message template");
          return {
            title: "Payroll Approved",
            message: `Payroll for ${employeeName} (${payrollPeriod}) has been approved by you and is now pending the next approval.`,
          };
        } else if (level === APPROVAL_LEVELS.FINANCE_DIRECTOR) {
          console.log("✅ Using Finance Director message template");
          return {
            title: "Payroll Approved",
            message: `Payroll for ${employeeName} (${payrollPeriod}) has been approved by you and is now pending the next approval.`,
          };
        } else if (level === APPROVAL_LEVELS.DEPARTMENT_HEAD) {
          return {
            title: "Payroll Approved",
            message: `Payroll for ${employeeName} (${payrollPeriod}) has been approved by you and is now pending the next approval.`,
          };
        } else if (level === APPROVAL_LEVELS.SUPER_ADMIN) {
          return {
            title: "Payroll Approved",
            message: `Payroll for ${employeeName} (${payrollPeriod}) has been approved by you and is now pending the next approval.`,
          };
        } else {
          return {
            title: "Payroll Approved",
            message: `Payroll for ${employeeName} (${payrollPeriod}) has been approved by you and is now pending the next approval.`,
          };
        }
        break;
      case NOTIFICATION_TYPES.PAYROLL_SUBMITTED:
        return {
          title: "Payroll Submitted",
          message: `New payroll for ${employeeName} (${payrollPeriod}) has been submitted and is pending your approval.`,
        };
      case NOTIFICATION_TYPES.PAYROLL_DRAFT_CREATED:
        return {
          title: "Draft Payroll Created",
          message: `A draft payroll for ${employeeName} (${payrollPeriod}) has been created for your review.`,
        };
      case NOTIFICATION_TYPES.PAYROLL_REJECTED:
        return {
          title: "Payroll Rejected",
          message: `Payroll for ${employeeName} (${payrollPeriod}) has been rejected. Reason: ${
            remarks || "No reason provided"
          }`,
        };
      case NOTIFICATION_TYPES.PAYROLL_PAID:
        return {
          title: "Payroll Paid",
          message: `Payroll for ${employeeName} (${payrollPeriod}) has been processed for payment.`,
        };
      case NOTIFICATION_TYPES.BANK_DETAILS_REQUIRED:
        return {
          title: "Bank Details Required",
          message: `Bank details are required for ${employeeName}'s payroll approval. Please update your bank details in your profile.`,
        };
      case NOTIFICATION_TYPES.DEPARTMENT_PAYROLL_APPROVED:
        return {
          title: "Department Payroll Approved",
          message: `All department payrolls for ${payrollPeriod} have been approved${
            remarks ? `: ${remarks}` : ""
          }`,
        };
      case NOTIFICATION_TYPES.DEPARTMENT_PAYROLL_REJECTED:
        return {
          title: "Department Payroll Rejected",
          message: `Department payrolls for ${payrollPeriod} have been rejected. Reason: ${
            remarks || "No reason provided"
          }`,
        };
      case NOTIFICATION_TYPES.DEPARTMENT_PAYROLL_REJECTION_STARTED:
        return {
          title: "Department Payroll Rejection Started",
          message: `Started rejecting department payrolls for ${payrollPeriod}${
            remarks ? `: ${remarks}` : ""
          }`,
        };
      case NOTIFICATION_TYPES.DEPARTMENT_PAYROLL_REJECTION_SUMMARY:
        return {
          title: "Department Payroll Rejection Summary",
          message: `Department payroll rejection summary for ${payrollPeriod}: ${
            remarks || "No summary provided"
          }`,
        };
      case NOTIFICATION_TYPES.BULK_PAYROLL_PROCESSED:
        return {
          title: "Bulk Payroll Processed",
          message: `Bulk payroll processing for ${payrollPeriod} has been completed.`,
        };
      case NOTIFICATION_TYPES.PAYMENT_FAILED:
        return {
          title: "Payment Failed",
          message: `Payment for ${employeeName}'s payroll (${payrollPeriod}) has failed.${
            remarks ? ` Reason: ${remarks}` : ""
          }`,
        };
      case NOTIFICATION_TYPES.PAYMENT_CANCELLED:
        return {
          title: "Payment Cancelled",
          message: `Payment for ${employeeName}'s payroll (${payrollPeriod}) has been cancelled.${
            remarks ? ` Reason: ${remarks}` : ""
          }`,
        };
      case NOTIFICATION_TYPES.PAYMENT_ARCHIVED:
        return {
          title: "Payment Archived",
          message: `Payment record for ${employeeName}'s payroll (${payrollPeriod}) has been archived.`,
        };
      case NOTIFICATION_TYPES.PAYROLL_PROCESSING_STARTED:
        return {
          title: "Payroll Processing Started",
          message: `Payroll processing for ${employeeName} (${payrollPeriod}) has started.`,
        };
      case NOTIFICATION_TYPES.PAYROLL_PROCESSING_COMPLETED:
        return {
          title: "Payroll Processing Completed",
          message: `Payroll processing for ${employeeName} (${payrollPeriod}) has been completed.`,
        };
      case NOTIFICATION_TYPES.PAYROLL_PROCESSING_FAILED:
        return {
          title: "Payroll Processing Failed",
          message: `Payroll processing for ${employeeName} (${payrollPeriod}) has failed.${
            remarks ? ` Reason: ${remarks}` : ""
          }`,
        };
      case NOTIFICATION_TYPES.PAYROLL_PROCESSING_WARNING:
        return {
          title: "Payroll Processing Warning",
          message: `Warning during payroll processing for ${employeeName} (${payrollPeriod}).${
            remarks ? ` Details: ${remarks}` : ""
          }`,
        };
      case NOTIFICATION_TYPES.PAYROLL_PROCESSING_ERROR:
        return {
          title: "Payroll Processing Error",
          message: `Error during payroll processing for ${employeeName} (${payrollPeriod}).${
            remarks ? ` Details: ${remarks}` : ""
          }`,
        };
      case NOTIFICATION_TYPES.PAYROLL_PROCESSING_SKIPPED:
        return {
          title: "Payroll Processing Skipped",
          message: `Payroll processing for ${employeeName} (${payrollPeriod}) has been skipped.${
            remarks ? ` Reason: ${remarks}` : ""
          }`,
        };
      case NOTIFICATION_TYPES.PAYROLL_PROCESSING_SUMMARY:
        return {
          title: "Payroll Processing Summary",
          message: `Payroll processing summary for ${payrollPeriod}: ${
            remarks || "No summary provided"
          }`,
        };
      case NOTIFICATION_TYPES.DEPARTMENT_PAYROLL_PROCESSING_STARTED:
        return {
          title: "Department Payroll Processing Started",
          message: `Department payroll processing for ${payrollPeriod} has started.`,
        };
      case NOTIFICATION_TYPES.DEPARTMENT_PAYROLL_PROCESSING_COMPLETED:
        return {
          title: "Department Payroll Processing Completed",
          message: `Department payroll processing for ${payrollPeriod} has been completed.`,
        };
      case NOTIFICATION_TYPES.DEPARTMENT_PAYROLL_PROCESSING_FAILED:
        return {
          title: "Department Payroll Processing Failed",
          message: `Department payroll processing for ${payrollPeriod} has failed.${
            remarks ? ` Reason: ${remarks}` : ""
          }`,
        };
      case NOTIFICATION_TYPES.DEPARTMENT_PAYROLL_PROCESSING_WARNING:
        return {
          title: "Department Payroll Processing Warning",
          message: `Warning during department payroll processing for ${payrollPeriod}.${
            remarks ? ` Details: ${remarks}` : ""
          }`,
        };
      case NOTIFICATION_TYPES.DEPARTMENT_PAYROLL_PROCESSING_ERROR:
        return {
          title: "Department Payroll Processing Error",
          message: `Error during department payroll processing for ${payrollPeriod}.${
            remarks ? ` Details: ${remarks}` : ""
          }`,
        };
      case NOTIFICATION_TYPES.DEPARTMENT_PAYROLL_PROCESSING_SKIPPED:
        return {
          title: "Department Payroll Processing Skipped",
          message: `Department payroll processing for ${payrollPeriod} has been skipped.${
            remarks ? ` Reason: ${remarks}` : ""
          }`,
        };
      case NOTIFICATION_TYPES.DEPARTMENT_PAYROLL_PROCESSING_SUMMARY:
        return {
          title: "Department Payroll Processing Summary",
          message: `Department payroll processing summary for ${payrollPeriod}: ${
            remarks || "No summary provided"
          }`,
        };
      case NOTIFICATION_TYPES.MULTIPLE_PAYROLL_PROCESSING_STARTED:
        return {
          title: "Multiple Payroll Processing Started",
          message: `Multiple payroll processing for ${payrollPeriod} has started.`,
        };
      case NOTIFICATION_TYPES.MULTIPLE_PAYROLL_PROCESSING_COMPLETED:
        return {
          title: "Multiple Payroll Processing Completed",
          message: `Multiple payroll processing for ${payrollPeriod} has been completed.`,
        };
      case NOTIFICATION_TYPES.MULTIPLE_PAYROLL_PROCESSING_FAILED:
        return {
          title: "Multiple Payroll Processing Failed",
          message: `Multiple payroll processing for ${payrollPeriod} has failed.${
            remarks ? ` Reason: ${remarks}` : ""
          }`,
        };
      case NOTIFICATION_TYPES.MULTIPLE_PAYROLL_PROCESSING_WARNING:
        return {
          title: "Multiple Payroll Processing Warning",
          message: `Warning during multiple payroll processing for ${payrollPeriod}.${
            remarks ? ` Details: ${remarks}` : ""
          }`,
        };
      case NOTIFICATION_TYPES.MULTIPLE_PAYROLL_PROCESSING_ERROR:
        return {
          title: "Multiple Payroll Processing Error",
          message: `Error during multiple payroll processing for ${payrollPeriod}.${
            remarks ? ` Details: ${remarks}` : ""
          }`,
        };
      case NOTIFICATION_TYPES.MULTIPLE_PAYROLL_PROCESSING_SKIPPED:
        return {
          title: "Multiple Payroll Processing Skipped",
          message: `Multiple payroll processing for ${payrollPeriod} has been skipped.${
            remarks ? ` Reason: ${remarks}` : ""
          }`,
        };
      case NOTIFICATION_TYPES.MULTIPLE_PAYROLL_PROCESSING_SUMMARY:
        return {
          title: "Multiple Payroll Processing Summary",
          message: `Multiple payroll processing summary for ${payrollPeriod}: ${
            remarks || "No summary provided"
          }`,
        };
      case NOTIFICATION_TYPES.PAYROLL_ERROR_NO_GRADE_LEVEL:
        return {
          title: "Payroll Error: No Grade Level",
          message: `Error processing payroll for ${employeeName} (${payrollPeriod}): No grade level found.`,
        };
      case NOTIFICATION_TYPES.PAYROLL_ERROR_INCOMPLETE_BANK_DETAILS:
        return {
          title: "Payroll Error: Incomplete Bank Details",
          message: `Error processing payroll for ${employeeName} (${payrollPeriod}): Incomplete bank details.`,
        };
      case NOTIFICATION_TYPES.PAYROLL_ERROR_DUPLICATE_PAYROLL:
        return {
          title: "Payroll Error: Duplicate Payroll",
          message: `Error processing payroll for ${employeeName} (${payrollPeriod}): Duplicate payroll found.`,
        };
      case NOTIFICATION_TYPES.PAYROLL_ERROR_CALCULATION_FAILED:
        return {
          title: "Payroll Error: Calculation Failed",
          message: `Error processing payroll for ${employeeName} (${payrollPeriod}): Calculation failed.`,
        };
      case NOTIFICATION_TYPES.PAYROLL_ERROR_PERMISSION_DENIED:
        return {
          title: "Payroll Error: Permission Denied",
          message: `Error processing payroll for ${employeeName} (${payrollPeriod}): Permission denied.`,
        };
      case NOTIFICATION_TYPES.PAYROLL_ERROR_SYSTEM_ERROR:
        return {
          title: "Payroll Error: System Error",
          message: `Error processing payroll for ${employeeName} (${payrollPeriod}): System error.`,
        };
      case NOTIFICATION_TYPES.PAYROLL_COMPLETED:
        // For Super Admin self-notification
        if (data.approvalLevel === APPROVAL_LEVELS.SUPER_ADMIN) {
          return {
            title: "Payroll Fully Approved",
            message: `Payroll for ${employeeName} (${payrollPeriod}) has been fully approved by you as Super Admin.`,
          };
        }
        // For employee notification
        return {
          title: "Payroll Fully Approved",
          message: `Payroll for ${employeeName} (${payrollPeriod}) has been fully approved and is ready for processing.`,
        };
      default:
        // Fallback for any unknown notification type
        return {
          title: "Notification",
          message: remarks || "You have a new notification.",
        };
    }
  }
}

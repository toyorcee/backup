import { ApiError } from "../utils/errorHandler.js";
import PayrollModel from "../models/Payroll.js";
import UserModel from "../models/User.js";
import DepartmentModel from "../models/Department.js";
import BaseApprovalController, {
  APPROVAL_LEVELS,
  PAYROLL_STATUS,
} from "./BaseApprovalController.js";
import {
  NotificationService,
  NOTIFICATION_TYPES,
} from "../services/NotificationService.js";
import AuditService from "../services/AuditService.js";
import { AuditAction, AuditEntity } from "../models/Audit.js";

class ApprovalController {
  /**
   * Approve a payroll as Department Head
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @param {Function} next - Express next function
   */
  static async approveAsDepartmentHead(req, res, next) {
    try {
      const { id } = req.params;
      const admin = await UserModel.findById(req.user.id);

      if (!admin) {
        return res.status(404).json({
          success: false,
          message: "Admin not found",
        });
      }

      // Find the payroll
      const payroll = await PayrollModel.findById(id).populate("employee");

      if (!payroll) {
        return res.status(404).json({
          success: false,
          message: "Payroll not found",
        });
      }

      // Check if the payroll is in the correct status
      if (payroll.status !== PAYROLL_STATUS.PENDING) {
        return res.status(400).json({
          success: false,
          message: `Payroll is not in PENDING status. Current status: ${payroll.status}`,
        });
      }

      // Check if the payroll is at the correct approval level
      if (
        payroll.approvalFlow?.currentLevel !== APPROVAL_LEVELS.DEPARTMENT_HEAD
      ) {
        return res.status(400).json({
          success: false,
          message: `Payroll is not at DEPARTMENT_HEAD approval level. Current level: ${payroll.approvalFlow?.currentLevel}`,
        });
      }

      // Check if the admin is in the same department as the employee
      if (
        admin.department?.toString() !== payroll.employee.department?.toString()
      ) {
        return res.status(403).json({
          success: false,
          message:
            "You can only approve payrolls for employees in your department",
        });
      }

      // Check if the admin has the correct position
      const adminPosition = admin.position?.toLowerCase() || "";
      const isDepartmentHead = ["head", "director", "manager"].some((pos) =>
        adminPosition.includes(pos)
      );

      if (!isDepartmentHead) {
        return res.status(403).json({
          success: false,
          message: "You must be a department head to approve at this level",
        });
      }

      // Update the payroll approval flow
      const updatedPayroll =
        await BaseApprovalController.updatePayrollApprovalFlow(
          payroll,
          APPROVAL_LEVELS.DEPARTMENT_HEAD,
          admin,
          true
        );

      // Find the next approver (HR Manager)
      const nextApprover = await BaseApprovalController.findNextApprover(
        APPROVAL_LEVELS.DEPARTMENT_HEAD,
        updatedPayroll
      );

      // Create notification for the next approver
      if (nextApprover) {
        await BaseApprovalController.createApprovalNotification(
          nextApprover,
          updatedPayroll,
          APPROVAL_LEVELS.DEPARTMENT_HEAD
        );
      }

      return res.status(200).json({
        success: true,
        message: "Payroll approved successfully",
        data: {
          payroll: updatedPayroll,
          nextApprover: nextApprover
            ? {
                id: nextApprover._id,
                name: nextApprover.name,
                position: nextApprover.position,
              }
            : null,
        },
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Reject a payroll as Department Head
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @param {Function} next - Express next function
   */
  static async rejectAsDepartmentHead(req, res, next) {
    try {
      const { id } = req.params;
      const { reason } = req.body;
      const admin = await UserModel.findById(req.user.id);

      if (!admin) {
        return res.status(404).json({
          success: false,
          message: "Admin not found",
        });
      }

      // Find the payroll
      const payroll = await PayrollModel.findById(id).populate("employee");

      if (!payroll) {
        return res.status(404).json({
          success: false,
          message: "Payroll not found",
        });
      }

      // Check if the payroll is in the correct status
      if (payroll.status !== PAYROLL_STATUS.PENDING) {
        return res.status(400).json({
          success: false,
          message: `Payroll is not in PENDING status. Current status: ${payroll.status}`,
        });
      }

      // Check if the payroll is at the correct approval level
      if (
        payroll.approvalFlow?.currentLevel !== APPROVAL_LEVELS.DEPARTMENT_HEAD
      ) {
        return res.status(400).json({
          success: false,
          message: `Payroll is not at DEPARTMENT_HEAD approval level. Current level: ${payroll.approvalFlow?.currentLevel}`,
        });
      }

      // Check if the admin is in the same department as the employee
      if (
        admin.department?.toString() !== payroll.employee.department?.toString()
      ) {
        return res.status(403).json({
          success: false,
          message:
            "You can only reject payrolls for employees in your department",
        });
      }

      // Check if the admin has the correct position
      const adminPosition = admin.position?.toLowerCase() || "";
      const isDepartmentHead = ["head", "director", "manager"].some((pos) =>
        adminPosition.includes(pos)
      );

      if (!isDepartmentHead) {
        return res.status(403).json({
          success: false,
          message: "You must be a department head to reject at this level",
        });
      }

      // Update the payroll approval flow
      const updatedPayroll =
        await BaseApprovalController.updatePayrollApprovalFlow(
          payroll,
          APPROVAL_LEVELS.DEPARTMENT_HEAD,
          admin,
          false,
          reason
        );

      // Create notification for the employee
      await BaseApprovalController.createRejectionNotification(
        updatedPayroll,
        reason
      );

      return res.status(200).json({
        success: true,
        message: "Payroll rejected successfully",
        data: {
          payroll: updatedPayroll,
        },
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Approve a payroll as HR Manager
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @param {Function} next - Express next function
   */
  static async approveAsHRManager(req, res, next) {
    try {
      console.log(
        "🔍 Starting HR Manager approval process for payroll:",
        req.params.id
      );
      const { id } = req.params;
      const { remarks } = req.body;

      const admin = await UserModel.findById(req.user.id);

      if (!admin) {
        throw new ApiError(404, "Admin not found");
      }

      console.log("👤 Admin details:", {
        id: admin._id,
        name: `${admin.firstName} ${admin.lastName}`,
        position: admin.position,
        department: admin.department,
      });

      // Get the payroll
      const payroll = await PayrollModel.findById(id).populate("employee");

      if (!payroll) {
        throw new ApiError(404, "Payroll not found");
      }

      console.log("📊 Payroll details:", {
        id: payroll._id,
        employee: `${payroll.employee.firstName} ${payroll.employee.lastName}`,
        status: payroll.status,
        currentLevel: payroll.approvalFlow?.currentLevel,
      });

      // Check if the payroll is in the correct status
      if (payroll.status !== PAYROLL_STATUS.PENDING) {
        throw new ApiError(400, "Only pending payrolls can be approved");
      }

      // Check if the payroll is at the correct approval level
      if (payroll.approvalFlow?.currentLevel !== APPROVAL_LEVELS.HR_MANAGER) {
        throw new ApiError(
          400,
          `Payroll is not at HR_MANAGER approval level. Current level: ${payroll.approvalFlow?.currentLevel}`
        );
      }

      // Check if the admin is in the HR department
      const hrDepartment = await DepartmentModel.findOne({
        name: { $in: ["Human Resources", "HR"] },
        status: "active",
      });

      if (!hrDepartment) {
        throw new ApiError(500, "HR department not found");
      }

      if (admin.department?.toString() !== hrDepartment._id.toString()) {
        throw new ApiError(
          403,
          "You must be in the HR department to approve at this level"
        );
      }

      // Check if the admin has the correct position
      const adminPosition = admin.position?.toLowerCase() || "";
      const isHRManager = [
        "hr manager",
        "head of hr",
        "hr head",
        "head of human resources",
      ].some((pos) => adminPosition.includes(pos));

      if (!isHRManager) {
        throw new ApiError(
          403,
          "You must be an HR Manager to approve at this level"
        );
      }

      console.log("✅ All validation checks passed, proceeding with approval");

      // Update the payroll approval flow
      const updatedPayroll =
        await BaseApprovalController.updatePayrollApprovalFlow(
          payroll,
          APPROVAL_LEVELS.HR_MANAGER,
          admin,
          true,
          remarks
        );
      console.log("✅ Payroll approval flow updated successfully");

      // Find the next approver (Finance Director)
      const nextApprover = await BaseApprovalController.findNextApprover(
        APPROVAL_LEVELS.HR_MANAGER,
        updatedPayroll
      );
      console.log(
        "👥 Next approver details:",
        nextApprover
          ? {
              id: nextApprover._id,
              name: `${nextApprover.firstName} ${nextApprover.lastName}`,
              position: nextApprover.position,
            }
          : "No next approver found"
      );

      // Create notification for the next approver (Finance Director)
      if (nextApprover) {
        console.log("📬 Creating notification for Finance Director");
        await NotificationService.createNotification(
          nextApprover._id,
          NOTIFICATION_TYPES.PAYROLL_PENDING_APPROVAL,
          payroll.employee,
          updatedPayroll,
          remarks,
          {
            data: {
              currentLevel: APPROVAL_LEVELS.HR_MANAGER,
              nextLevel: APPROVAL_LEVELS.FINANCE_DIRECTOR,
              approvalLevel: APPROVAL_LEVELS.FINANCE_DIRECTOR,
            },
          }
        );
      }

      // Create self-notification for the HR Manager
      console.log("📬 Creating self-notification for HR Manager");
      await NotificationService.createNotification(
        admin._id,
        NOTIFICATION_TYPES.PAYROLL_APPROVED,
        updatedPayroll.employee,
        updatedPayroll,
        remarks ||
          "You have successfully approved this payroll and it is now pending Finance Director approval",
        {
          data: {
            approvalLevel: APPROVAL_LEVELS.HR_MANAGER,
          },
        }
      );

      console.log("🎉 HR Manager approval process completed successfully");

      // Set header to trigger client-side refresh
      res.set("X-Refresh-Audit-Logs", "true");
      res.set("X-Refresh-Payrolls", "true");
      console.log("✅ Set refresh headers");

      res.status(200).json({
        success: true,
        message: "Payroll approved successfully",
        data: {
          payroll: updatedPayroll,
          nextApprover: nextApprover
            ? {
                id: nextApprover._id,
                name: nextApprover.name,
                position: nextApprover.position,
              }
            : null,
        },
      });
    } catch (error) {
      console.error("❌ Error in HR Manager approval process:", error);
      next(error);
    }
  }

  /**
   * Reject a payroll as HR Manager
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @param {Function} next - Express next function
   */
  static async rejectAsHRManager(req, res, next) {
    try {
      console.log("🚫 Starting HR Manager rejection process:", {
        payrollId: req.params.id,
        adminId: req.user.id,
      });

      const { id } = req.params;
      const { reason } = req.body;
      console.log("📝 Rejection request:", { id, reason });

      const admin = await UserModel.findById(req.user.id).populate(
        "department"
      );
      console.log("👤 FULL ADMIN OBJECT:", JSON.stringify(admin, null, 2));

      if (!admin) {
        console.log("❌ Admin not found:", req.user.id);
        return res.status(404).json({
          success: false,
          message: "Admin not found",
        });
      }

      console.log("👤 Admin details:", {
        id: admin._id,
        name: `${admin.firstName} ${admin.lastName}`,
        position: admin.position,
        department: admin.department,
      });

      // Find the payroll
      const payroll = await PayrollModel.findById(id).populate("employee");

      if (!payroll) {
        console.log("❌ Payroll not found:", id);
        return res.status(404).json({
          success: false,
          message: "Payroll not found",
        });
      }

      console.log("📊 Payroll details before rejection:", {
        id: payroll._id,
        employee: `${payroll.employee.firstName} ${payroll.employee.lastName}`,
        status: payroll.status,
        currentLevel: payroll.approvalFlow?.currentLevel,
      });

      // Check if the payroll is in the correct status
      if (payroll.status !== PAYROLL_STATUS.PENDING) {
        console.log("❌ Invalid payroll status:", payroll.status);
        return res.status(400).json({
          success: false,
          message: `Payroll is not in PENDING status. Current status: ${payroll.status}`,
        });
      }

      // Check if the payroll is at the correct approval level
      if (payroll.approvalFlow?.currentLevel !== APPROVAL_LEVELS.HR_MANAGER) {
        console.log(
          "❌ Invalid approval level:",
          payroll.approvalFlow?.currentLevel
        );
        return res.status(400).json({
          success: false,
          message: `Payroll is not at HR_MANAGER approval level. Current level: ${payroll.approvalFlow?.currentLevel}`,
        });
      }

      // Check if the admin is in the HR department
      const hrDepartment = await DepartmentModel.findOne({
        name: { $in: ["Human Resources", "HR"] },
        status: "active",
      });

      if (!hrDepartment) {
        console.log("❌ HR department not found");
        return res.status(500).json({
          success: false,
          message: "HR department not found",
        });
      }

      if (admin.department?.toString() !== hrDepartment._id.toString()) {
        console.log("❌ Admin not in HR department:", {
          adminDept: admin.department,
          hrDept: hrDepartment._id,
        });
        return res.status(403).json({
          success: false,
          message: "You must be in the HR department to reject at this level",
        });
      }

      // Check if the admin has the correct position
      const adminPosition = admin.position?.toLowerCase() || "";
      const isHRManager = [
        "hr manager",
        "head of hr",
        "hr head",
        "head of human resources",
      ].some((pos) => adminPosition.includes(pos));

      if (!isHRManager) {
        console.log("❌ Admin not HR Manager:", adminPosition);
        return res.status(403).json({
          success: false,
          message: "You must be an HR Manager to reject at this level",
        });
      }

      console.log("✅ All validation checks passed, proceeding with rejection");

      // Update the payroll approval flow
      const updatedPayroll =
        await BaseApprovalController.updatePayrollApprovalFlow(
          payroll,
          APPROVAL_LEVELS.HR_MANAGER,
          admin,
          false,
          reason
        );

      console.log("📊 Payroll details after rejection:", {
        id: updatedPayroll._id,
        status: updatedPayroll.status,
        currentLevel: updatedPayroll.approvalFlow?.currentLevel,
      });

      // Find the department head
      const departmentHead = await UserModel.findOne({
        department: payroll.employee.department,
        position: {
          $in: [
            "Head of Department",
            "Department Head",
            "Head",
            "Director",
            "Manager",
          ],
        },
        status: "active",
      });

      console.log(
        "👥 Department Head found:",
        departmentHead
          ? {
              id: departmentHead._id,
              name: `${departmentHead.firstName} ${departmentHead.lastName}`,
              position: departmentHead.position,
            }
          : "Not found"
      );

      const notificationPromises = [];

      // Notify the department head about the rejection
      if (departmentHead) {
        console.log("📧 Creating notification for Department Head");
        notificationPromises.push(
          NotificationService.createNotification(
            departmentHead._id,
            NOTIFICATION_TYPES.PAYROLL_REJECTED,
            admin,
            updatedPayroll,
            `Payroll rejected by HR Manager: ${reason}`,
            {
              data: {
                approvalLevel: APPROVAL_LEVELS.HR_MANAGER,
                rejectionReason: reason,
              },
            }
          )
        );
      }

      // Notify the HR Manager (self-notification)
      console.log("📧 Creating self-notification for HR Manager");
      notificationPromises.push(
        NotificationService.createNotification(
          admin._id,
          NOTIFICATION_TYPES.PAYROLL_REJECTED,
          admin,
          updatedPayroll,
          `You have rejected this payroll: ${reason}`,
          {
            data: {
              approvalLevel: APPROVAL_LEVELS.HR_MANAGER,
              rejectionReason: reason,
            },
          }
        )
      );

      // Notify the employee
      console.log("📧 Creating notification for Employee");
      notificationPromises.push(
        NotificationService.createNotification(
          payroll.employee._id,
          NOTIFICATION_TYPES.PAYROLL_REJECTED,
          admin,
          updatedPayroll,
          `Your payroll has been rejected by HR Manager. Reason: ${reason}`,
          {
            data: {
              approvalLevel: APPROVAL_LEVELS.HR_MANAGER,
              rejectionReason: reason,
            },
          }
        )
      );

      await Promise.all(notificationPromises);
      console.log("✅ All notifications sent successfully");

      return res.status(200).json({
        success: true,
        message: "Payroll rejected successfully",
        data: {
          payroll: updatedPayroll,
        },
      });
    } catch (error) {
      console.error("❌ Error in HR Manager rejection process:", error);
      next(error);
    }
  }

  /**
   * Approve a payroll as Finance Director
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @param {Function} next - Express next function
   */
  static async approveAsFinanceDirector(req, res, next) {
    try {
      console.log("🔍 Starting Finance Director approval process");
      const { id } = req.params;
      const { remarks } = req.body;
      const admin = await UserModel.findById(req.user.id);

      if (!admin) {
        console.log("❌ Admin not found:", req.user.id);
        return res.status(404).json({
          success: false,
          message: "Admin not found",
        });
      }

      console.log("✅ Admin found:", admin.firstName, admin.lastName);

      // Find the payroll
      const payroll = await PayrollModel.findById(id).populate("employee");

      if (!payroll) {
        console.log("❌ Payroll not found:", id);
        return res.status(404).json({
          success: false,
          message: "Payroll not found",
        });
      }

      console.log("✅ Payroll found:", payroll._id);

      // Check if the payroll is in the correct status
      if (payroll.status !== PAYROLL_STATUS.PENDING) {
        console.log("❌ Payroll not in PENDING status:", payroll.status);
        return res.status(400).json({
          success: false,
          message: `Payroll is not in PENDING status. Current status: ${payroll.status}`,
        });
      }

      // Check if the payroll is at the correct approval level
      if (
        payroll.approvalFlow?.currentLevel !== APPROVAL_LEVELS.FINANCE_DIRECTOR
      ) {
        console.log(
          "❌ Payroll not at FINANCE_DIRECTOR level:",
          payroll.approvalFlow?.currentLevel
        );
        return res.status(400).json({
          success: false,
          message: `Payroll is not at FINANCE_DIRECTOR approval level. Current level: ${payroll.approvalFlow?.currentLevel}`,
        });
      }

      // Check if the admin is in the Finance department
      const financeDepartment = await DepartmentModel.findOne({
        name: { $in: ["Finance and Accounting", "Finance", "Financial"] },
        status: "active",
      });

      if (!financeDepartment) {
        console.log("❌ Finance department not found");
        return res.status(500).json({
          success: false,
          message: "Finance department not found",
        });
      }

      if (admin.department?.toString() !== financeDepartment._id.toString()) {
        console.log("❌ Admin not in Finance department:", admin.department);
        return res.status(403).json({
          success: false,
          message:
            "You must be in the Finance department to approve at this level",
        });
      }

      // Check if the admin has the correct position
      const adminPosition = admin.position || "";
      const adminRole = admin.role || "";

      // Exact position check - no string manipulation
      const isFinanceDirector = adminPosition === "Head of Finance";

      console.log("🔍 Position check details:", {
        originalPosition: admin.position,
        isFinanceDirector,
        adminRole,
        department: admin.department?.name,
      });

      if (!isFinanceDirector) {
        console.log("❌ Admin not a Finance Director:", {
          position: adminPosition,
          expectedPosition: "Head of Finance",
        });
        return res.status(403).json({
          success: false,
          message: "You must be a Finance Director to approve at this level",
        });
      }

      console.log("✅ Finance Director validation passed");

      // Update the payroll approval flow
      console.log("🔄 Updating payroll approval flow");
      const updatedPayroll =
        await BaseApprovalController.updatePayrollApprovalFlow(
          payroll,
          APPROVAL_LEVELS.FINANCE_DIRECTOR,
          admin,
          true,
          remarks
        );
      console.log("✅ Payroll approval flow updated");

      // Find the next approver (Super Admin)
      console.log("🔍 Finding next approver (Super Admin)");
      const nextApprover = await BaseApprovalController.findNextApprover(
        APPROVAL_LEVELS.FINANCE_DIRECTOR,
        updatedPayroll
      );
      console.log(
        "✅ Next approver found:",
        nextApprover ? nextApprover.firstName : "None"
      );

      // Create notification for the next approver (Super Admin)
      if (nextApprover) {
        console.log("📬 Creating notification for Super Admin");
        await NotificationService.createNotification(
          nextApprover._id,
          NOTIFICATION_TYPES.PAYROLL_PENDING_APPROVAL,
          updatedPayroll.employee,
          updatedPayroll,
          "New payroll pending your approval as Super Admin",
          {
            data: {
              currentLevel: APPROVAL_LEVELS.FINANCE_DIRECTOR,
              nextLevel: APPROVAL_LEVELS.SUPER_ADMIN,
              approvalLevel: APPROVAL_LEVELS.SUPER_ADMIN,
            },
          }
        );
        console.log("✅ Super Admin notification created");
      }

      // Create self-notification for the Finance Director
      console.log("📬 Creating self-notification for Finance Director");
      await NotificationService.createNotification(
        admin._id,
        NOTIFICATION_TYPES.PAYROLL_APPROVED,
        updatedPayroll.employee,
        updatedPayroll,
        remarks ||
          "You have approved this payroll and it is now pending Super Admin approval",
        {
          data: {
            approvalLevel: APPROVAL_LEVELS.FINANCE_DIRECTOR,
          },
        }
      );
      console.log("✅ Finance Director self-notification created");

      // Create audit log
      console.log("📝 Creating audit log");
      await AuditService.logAction(
        AuditAction.APPROVE,
        AuditEntity.PAYROLL,
        updatedPayroll._id,
        admin._id,
        {
          status: updatedPayroll.status,
          currentLevel: APPROVAL_LEVELS.FINANCE_DIRECTOR,
          nextLevel: APPROVAL_LEVELS.SUPER_ADMIN,
          approvalFlow: {
            currentLevel: APPROVAL_LEVELS.SUPER_ADMIN,
            history: updatedPayroll.approvalFlow.history,
          },
          employeeName: `${updatedPayroll.employee.firstName} ${updatedPayroll.employee.lastName}`,
          employeeId: updatedPayroll.employee._id,
          month: updatedPayroll.month,
          year: updatedPayroll.year,
          departmentId: updatedPayroll.department,
          remarks: remarks || "Approved by Finance Director",
          approvedAt: new Date(),
        }
      );
      console.log("✅ Audit log created");

      // Set header to trigger client-side refresh
      res.set("X-Refresh-Audit-Logs", "true");
      res.set("X-Refresh-Finance-Director", "true");
      console.log("✅ Set refresh headers");

      console.log(
        "🎉 Finance Director approval process completed successfully"
      );
      res.json({
        success: true,
        message: "Payroll approved by Finance Director",
        payroll: updatedPayroll,
      });
    } catch (error) {
      console.error("❌ Error in Finance Director approval process:", error);
      next(error);
    }
  }

  /**
   * Reject a payroll as Finance Director
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @param {Function} next - Express next function
   */
  static async rejectAsFinanceDirector(req, res, next) {
    try {
      const { payrollId } = req.params;
      const { remarks } = req.body;
      const adminId = req.user._id;

      console.log("🔍 Starting Finance Director rejection process:", {
        payrollId,
        adminId,
        remarks,
      });

      // Find admin user
      const admin = await UserModel.findById(adminId);
      if (!admin) {
        console.log("❌ Admin not found:", adminId);
        return res.status(404).json({
          success: false,
          message: "Admin not found",
        });
      }

      // Find payroll
      const payroll = await PayrollModel.findById(payrollId);
      if (!payroll) {
        console.log("❌ Payroll not found:", payrollId);
        return res.status(404).json({
          success: false,
          message: "Payroll not found",
        });
      }

      console.log("📊 Current payroll status:", {
        status: payroll.status,
        currentLevel: payroll.approvalFlow?.currentLevel,
      });

      // Check if payroll is in correct status
      if (payroll.status !== "PENDING") {
        console.log("❌ Invalid payroll status:", payroll.status);
        return res.status(400).json({
          success: false,
          message: "Payroll is not in pending status",
        });
      }

      // Check if admin is in Finance department
      const isFinanceDepartment = admin.department?.name
        ?.toLowerCase()
        .includes("finance");
      console.log("🏢 Department check:", {
        department: admin.department?.name,
        isFinanceDepartment,
      });

      // Check if admin has Finance Director position
      const adminPosition = admin.position || "";
      const adminRole = admin.role || "";

      // Exact position check - no string manipulation
      const isFinanceDirector = adminPosition === "Head of Finance";

      console.log("🔍 Position check details:", {
        originalPosition: admin.position,
        isFinanceDirector,
        adminRole,
        department: admin.department?.name,
      });

      if (!isFinanceDirector) {
        console.log("❌ Admin not a Finance Director:", {
          position: adminPosition,
          expectedPosition: "Head of Finance",
        });
        return res.status(403).json({
          success: false,
          message: "You must be a Finance Director to reject at this level",
        });
      }

      // Check if payroll is at Finance Director level
      if (payroll.approvalFlow?.currentLevel !== "FINANCE_DIRECTOR") {
        console.log(
          "❌ Invalid approval level:",
          payroll.approvalFlow?.currentLevel
        );
        return res.status(400).json({
          success: false,
          message: "Payroll is not at Finance Director level",
        });
      }

      // Update payroll approval flow
      payroll.approvalFlow.history.push({
        level: "FINANCE_DIRECTOR",
        status: "REJECTED",
        action: "REJECT",
        timestamp: new Date(),
        remarks,
        approver: {
          _id: admin._id,
          name: `${admin.firstName} ${admin.lastName}`,
          position: admin.position,
          department: admin.department?.name,
        },
      });

      payroll.status = "REJECTED";
      payroll.approvalFlow.currentLevel = null;
      await payroll.save();

      console.log("✅ Payroll rejected successfully");

      // Create notification for employee
      await this.createRejectionNotification(payroll, remarks);

      // Create notification for HR Manager
      const hrManager = await UserModel.findOne({
        position: { $regex: "hr manager", $options: "i" },
      });
      if (hrManager) {
        await NotificationService.createNotification({
          recipient: hrManager._id,
          type: "PAYROLL_REJECTED",
          title: "Payroll Rejected",
          message: `Payroll for ${payroll.employee.firstName} ${payroll.employee.lastName} has been rejected by Finance Director. Reason: ${remarks}`,
          data: {
            payrollId: payroll._id,
            employeeId: payroll.employee._id,
            rejectedBy: {
              _id: admin._id,
              name: `${admin.firstName} ${admin.lastName}`,
              position: admin.position,
            },
            remarks,
          },
        });
      }

      return res.status(200).json({
        success: true,
        message: "Payroll rejected successfully",
        data: {
          payroll,
          rejectedBy: {
            _id: admin._id,
            name: `${admin.firstName} ${admin.lastName}`,
            position: admin.position,
            department: admin.department?.name,
          },
        },
      });
    } catch (error) {
      console.error("❌ Error in rejectAsFinanceDirector:", error);
      return res.status(500).json({
        success: false,
        message: "Failed to reject payroll",
        error: error.message,
      });
    }
  }

  /**
   * Approve a payroll as Super Admin
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @param {Function} next - Express next function
   */
  static async approveAsSuperAdmin(req, res, next) {
    try {
      const { id } = req.params;
      const { remarks } = req.body;
      const admin = await UserModel.findById(req.user.id);

      console.log("Super Admin Approval - User Role:", admin.role);
      console.log("Super Admin Approval - User ID:", admin._id);
      console.log("Super Admin Approval - User Name:", admin.name);

      if (!admin) {
        return res.status(404).json({
          success: false,
          message: "Admin not found",
        });
      }

      // Find the payroll
      const payroll = await PayrollModel.findById(id).populate("employee");

      console.log("Super Admin Approval - Payroll ID:", id);
      console.log("Super Admin Approval - Payroll Status:", payroll?.status);
      console.log(
        "Super Admin Approval - Current Level:",
        payroll?.approvalFlow?.currentLevel
      );

      if (!payroll) {
        return res.status(404).json({
          success: false,
          message: "Payroll not found",
        });
      }

      // Check if the payroll is in the correct status
      if (payroll.status !== PAYROLL_STATUS.PENDING) {
        return res.status(400).json({
          success: false,
          message: `Payroll is not in PENDING status. Current status: ${payroll.status}`,
        });
      }

      // Check if the payroll is at the correct approval level
      if (payroll.approvalFlow?.currentLevel !== APPROVAL_LEVELS.SUPER_ADMIN) {
        return res.status(400).json({
          success: false,
          message: `Payroll is not at SUPER_ADMIN approval level. Current level: ${payroll.approvalFlow?.currentLevel}`,
        });
      }

      // Check if the admin is a Super Admin
      if (admin.role?.toLowerCase() !== "super_admin") {
        console.log("Super Admin Approval - Role Check Failed:", {
          expected: "super_admin",
          actual: admin.role,
        });
        return res.status(403).json({
          success: false,
          message: "You must be a Super Admin to approve at this level",
        });
      }

      // Update the payroll approval flow
      const updatedPayroll =
        await BaseApprovalController.updatePayrollApprovalFlow(
          payroll,
          APPROVAL_LEVELS.SUPER_ADMIN,
          admin,
          true
        );

      // Create notification for the employee using NotificationService
      await NotificationService.createPayrollNotification(
        updatedPayroll,
        NOTIFICATION_TYPES.PAYROLL_COMPLETED,
        admin,
        remarks ||
          "Your payroll has been fully approved and is ready for processing."
      );

      // Create notification for the Super Admin about their own action
      console.log("🔍 Creating Super Admin self-notification with options:", {
        currentLevel: APPROVAL_LEVELS.SUPER_ADMIN,
        employee: updatedPayroll.employee,
        payroll: updatedPayroll,
      });
      await NotificationService.createPayrollNotification(
        updatedPayroll,
        NOTIFICATION_TYPES.PAYROLL_COMPLETED,
        admin,
        remarks || "You approved this payroll as the final approver.",
        {
          data: {
            approvalLevel: APPROVAL_LEVELS.SUPER_ADMIN, // Hard-code as SUPER_ADMIN
          },
        }
      );

      return res.status(200).json({
        success: true,
        message: "Payroll approved successfully",
        data: {
          payroll: updatedPayroll,
        },
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Reject a payroll as Super Admin
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @param {Function} next - Express next function
   */
  static async rejectAsSuperAdmin(req, res, next) {
    try {
      const { id } = req.params;
      const { reason } = req.body;
      const admin = await UserModel.findById(req.user.id);

      if (!admin) {
        return res.status(404).json({
          success: false,
          message: "Admin not found",
        });
      }

      // Find the payroll
      const payroll = await PayrollModel.findById(id).populate("employee");

      if (!payroll) {
        return res.status(404).json({
          success: false,
          message: "Payroll not found",
        });
      }

      // Check if the payroll is in the correct status
      if (payroll.status !== PAYROLL_STATUS.PENDING) {
        return res.status(400).json({
          success: false,
          message: `Payroll is not in PENDING status. Current status: ${payroll.status}`,
        });
      }

      // Check if the payroll is at the correct approval level
      if (payroll.approvalFlow?.currentLevel !== APPROVAL_LEVELS.SUPER_ADMIN) {
        return res.status(400).json({
          success: false,
          message: `Payroll is not at SUPER_ADMIN approval level. Current level: ${payroll.approvalFlow?.currentLevel}`,
        });
      }

      // Check if the admin is a Super Admin
      if (admin.role !== "super_admin") {
        return res.status(403).json({
          success: false,
          message: "You must be a Super Admin to reject at this level",
        });
      }

      // Update the payroll approval flow
      const updatedPayroll =
        await BaseApprovalController.updatePayrollApprovalFlow(
          payroll,
          APPROVAL_LEVELS.SUPER_ADMIN,
          admin,
          false,
          reason
        );

      // Create notification for the employee
      await NotificationService.createPayrollNotification(
        updatedPayroll,
        NOTIFICATION_TYPES.PAYROLL_REJECTED,
        admin,
        reason || "Your payroll has been rejected by Super Admin"
      );

      // Create self-notification for the Super Admin
      await NotificationService.createPayrollNotification(
        updatedPayroll,
        NOTIFICATION_TYPES.PAYROLL_REJECTED,
        admin,
        `You rejected this payroll with reason: ${
          reason || "No reason provided"
        }`
      );

      return res.status(200).json({
        success: true,
        message: "Payroll rejected successfully",
        data: {
          payroll: updatedPayroll,
        },
      });
    } catch (error) {
      next(error);
    }
  }
}

export default ApprovalController;

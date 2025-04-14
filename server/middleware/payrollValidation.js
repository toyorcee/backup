import { ApiError } from "../utils/errorHandler.js";
import { Types } from "mongoose";
import { PAYROLL_STATUS, PayrollFrequency } from "../models/Payroll.js";
import mongoose from "mongoose";
import UserModel from "../models/User.js";
import SalaryGrade from "../models/SalaryStructure.js";
import { UserRole } from "../models/User.js";
import Payroll from "../models/Payroll.js";

// Keep this comprehensive validation for super admin payroll creation
export const validatePayrollCreate = (req, res, next) => {
  try {
    console.log("🔍 Validating payroll data:", req.body);
    const { employee, month, year, salaryGrade, frequency } = req.body;

    // Check required fields
    if (!employee || !month || !year || !salaryGrade) {
      throw new ApiError(400, "Missing required fields");
    }

    // Validate month (1-12)
    if (!Number.isInteger(month) || month < 1 || month > 12) {
      throw new ApiError(400, "Month must be between 1 and 12");
    }

    // Validate year (reasonable range: 1900-2100)
    if (!Number.isInteger(year) || year < 1900 || year > 2100) {
      throw new ApiError(400, `Year must be between 1900 and 2100`);
    }

    // Validate ObjectIds
    if (!mongoose.Types.ObjectId.isValid(employee)) {
      throw new ApiError(400, "Invalid employee ID");
    }

    if (!mongoose.Types.ObjectId.isValid(salaryGrade)) {
      throw new ApiError(400, "Invalid salary grade ID");
    }

    // Validate frequency if provided
    if (frequency && !Object.values(PayrollFrequency).includes(frequency)) {
      throw new ApiError(400, "Invalid payroll frequency");
    }

    // Validate that payroll isn't for past dates
    const currentDate = new Date();
    if (
      year < currentDate.getFullYear() ||
      (year === currentDate.getFullYear() && month < currentDate.getMonth() + 1)
    ) {
      throw new ApiError(400, "Cannot create payroll for past dates");
    }

    console.log("✅ Payroll validation passed");
    next();
  } catch (error) {
    console.error("❌ Payroll validation failed:", error);
    next(error);
  }
};

export const validatePayrollStatus = (req, res, next) => {
  const { status } = req.body;

  if (!status) {
    throw new ApiError(400, "Status is required");
  }

  if (!Object.values(PAYROLL_STATUS).includes(status)) {
    throw new ApiError(
      400,
      `Invalid payroll status. Must be one of: ${Object.values(
        PAYROLL_STATUS
      ).join(", ")}`
    );
  }

  next();
};

export const validatePayrollUpdate = (req, res, next) => {
  const { basicSalary, components } = req.body;

  if (basicSalary && basicSalary < 0) {
    throw new ApiError(400, "Basic salary cannot be negative");
  }

  if (components) {
    if (!Array.isArray(components)) {
      throw new ApiError(400, "Components must be an array");
    }

    components.forEach((component, index) => {
      if (
        !component.name ||
        !component.type ||
        !component.value ||
        !component.calculationMethod
      ) {
        throw new ApiError(
          400,
          `Component at index ${index} is missing required fields`
        );
      }

      if (!["allowance", "deduction"].includes(component.type)) {
        throw new ApiError(
          400,
          `Invalid component type at index ${index}. Must be 'allowance' or 'deduction'`
        );
      }

      if (!["fixed", "percentage"].includes(component.calculationMethod)) {
        throw new ApiError(
          400,
          `Invalid calculation method at index ${index}. Must be 'fixed' or 'percentage'`
        );
      }

      if (component.value < 0) {
        throw new ApiError(
          400,
          `Component value cannot be negative at index ${index}`
        );
      }
    });
  }

  next();
};

export const validateEmployeePayrollHistory = (req, res, next) => {
  try {
    const { employeeId } = req.params;

    if (!employeeId) {
      throw new ApiError(400, "Employee ID is required");
    }

    if (!Types.ObjectId.isValid(employeeId)) {
      throw new ApiError(400, "Invalid employee ID format");
    }

    next();
  } catch (error) {
    next(error);
  }
};

export const validatePayrollApproval = (req, res, next) => {
  try {
    const { id } = req.params;
    const { action = "APPROVE", remarks = "" } = req.body;

    // Validate payroll ID
    if (!mongoose.Types.ObjectId.isValid(id)) {
      throw new ApiError(400, "Invalid payroll ID format");
    }

    // Validate action if provided
    if (action && !["APPROVE", "REJECT"].includes(action)) {
      throw new ApiError(400, "Invalid action. Must be 'APPROVE' or 'REJECT'");
    }

    // Validate remarks if provided
    if (remarks !== undefined) {
      if (typeof remarks !== "string") {
        throw new ApiError(400, "Remarks must be a string");
      }
      if (remarks.length > 500) {
        throw new ApiError(400, "Remarks cannot exceed 500 characters");
      }
    }

    // Set default values in req.body
    req.body = {
      ...req.body,
      action: action || "APPROVE",
      remarks: remarks || "",
    };

    next();
  } catch (error) {
    next(error);
  }
};

export const validatePayrollRejection = (req, res, next) => {
  try {
    const { id } = req.params;
    const { remarks } = req.body;

    // Validate payroll ID
    if (!mongoose.Types.ObjectId.isValid(id)) {
      throw new ApiError(400, "Invalid payroll ID format");
    }

    // Remarks are required for rejection
    if (
      !remarks ||
      typeof remarks !== "string" ||
      remarks.trim().length === 0
    ) {
      throw new ApiError(400, "Remarks are required when rejecting a payroll");
    }

    if (remarks.length > 500) {
      throw new ApiError(400, "Remarks cannot exceed 500 characters");
    }

    next();
  } catch (error) {
    next(error);
  }
};

// Validation for bulk payroll processing (department-wide or all-departments)
export const validateBulkPayrollCreate = (req, res, next) => {
  try {
    console.log("🔍 Validating bulk payroll data:", req.body);
    const { month, year, frequency, departmentId } = req.body;

    // Check required fields
    if (!month || !year) {
      throw new ApiError(400, "Missing required fields: month and year");
    }

    // Validate month (1-12)
    if (!Number.isInteger(month) || month < 1 || month > 12) {
      throw new ApiError(400, "Month must be between 1 and 12");
    }

    // Validate year (reasonable range: 1900-2100)
    if (!Number.isInteger(year) || year < 1900 || year > 2100) {
      throw new ApiError(400, `Year must be between 1900 and 2100`);
    }

    // Validate frequency if provided
    if (frequency && !Object.values(PayrollFrequency).includes(frequency)) {
      throw new ApiError(400, "Invalid payroll frequency");
    }

    // Validate departmentId if provided (for department-wide processing)
    if (departmentId && !mongoose.Types.ObjectId.isValid(departmentId)) {
      throw new ApiError(400, "Invalid department ID");
    }

    // Validate that payroll isn't for past dates
    const currentDate = new Date();
    if (
      year < currentDate.getFullYear() ||
      (year === currentDate.getFullYear() && month < currentDate.getMonth() + 1)
    ) {
      throw new ApiError(400, "Cannot create payroll for past dates");
    }

    console.log("✅ Bulk payroll validation passed");
    next();
  } catch (error) {
    next(error);
  }
};

export const validateSuperAdminSingleEmployeePayroll = (req, res, next) => {
  try {
    console.log(
      "🔍 Validating super admin single employee payroll data:",
      req.body
    );
    const { employeeId, departmentId, month, year, frequency } = req.body;

    // Check required fields
    if (!employeeId || !departmentId || !month || !year) {
      throw new ApiError(400, "Missing required fields");
    }

    // Validate month (1-12)
    if (!Number.isInteger(month) || month < 1 || month > 12) {
      throw new ApiError(400, "Month must be between 1 and 12");
    }

    // Validate year (reasonable range: 1900-2100)
    if (!Number.isInteger(year) || year < 1900 || year > 2100) {
      throw new ApiError(400, `Year must be between 1900 and 2100`);
    }

    // Validate ObjectIds
    if (!mongoose.Types.ObjectId.isValid(employeeId)) {
      throw new ApiError(400, "Invalid employee ID");
    }

    if (!mongoose.Types.ObjectId.isValid(departmentId)) {
      throw new ApiError(400, "Invalid department ID");
    }

    // Validate frequency if provided
    if (frequency && !Object.values(PayrollFrequency).includes(frequency)) {
      throw new ApiError(400, "Invalid payroll frequency");
    }

    console.log("✅ Super admin single employee payroll validation passed");
    next();
  } catch (error) {
    next(error);
  }
};

export const validateSuperAdminMultipleEmployeesPayroll = async (
  req,
  res,
  next
) => {
  try {
    console.log("🔍 Validating super admin multiple payroll data:", req.body);
    const {
      departmentId,
      month,
      year,
      frequency = PayrollFrequency.MONTHLY,
    } = req.body;

    // Validate required fields
    if (!departmentId || !month || !year) {
      throw new ApiError(400, "Department ID, month, and year are required");
    }

    // Validate month (1-12)
    const monthNum = parseInt(month);
    if (isNaN(monthNum) || monthNum < 1 || monthNum > 12) {
      throw new ApiError(400, "Month must be between 1 and 12");
    }

    // Validate year (1900-2100)
    const yearNum = parseInt(year);
    if (isNaN(yearNum) || yearNum < 1900 || yearNum > 2100) {
      throw new ApiError(400, "Invalid year");
    }

    // Validate department ID format
    if (!Types.ObjectId.isValid(departmentId)) {
      throw new ApiError(400, "Invalid department ID format");
    }

    console.log("✅ Super admin multiple payroll validation passed");
    next();
  } catch (error) {
    console.error("❌ Super admin multiple payroll validation failed:", error);
    next(error);
  }
};

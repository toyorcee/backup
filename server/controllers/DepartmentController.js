import {
  DepartmentService,
  DepartmentStatus,
} from "../services/departmentService.js";
import { handleError } from "../utils/errorHandler.js";

export class DepartmentController {
  // Get all departments with pagination and filters
  static async getAllDepartments(req, res) {
    try {
      const {
        page = 1,
        limit = 10,
        search,
        status,
        startDate,
        endDate,
      } = req.query;
      const filter = {
        ...(search && { search }),
        ...(status && { status }),
        ...(startDate && { startDate }),
        ...(endDate && { endDate }),
      };

      const departments = await DepartmentService.getAllDepartments(
        parseInt(page),
        parseInt(limit),
        filter
      );

      res.status(200).json({
        success: true,
        data: departments.data,
        pagination: departments.pagination,
      });
    } catch (error) {
      const { statusCode, message } = handleError(error);
      res.status(statusCode).json({ success: false, message });
    }
  }

  // Get department by ID with full details
  static async getDepartmentById(req, res) {
    try {
      const { id } = req.params;
      console.log("🔍 Fetching department by ID:", id);

      const department = await DepartmentService.getDepartmentById(id);

      console.log("✅ Department found:", {
        id: department._id,
        name: department.name,
        code: department.code,
        headOfDepartment: department.headOfDepartment,
        description: department.description,
      });

      res.status(200).json({
        success: true,
        data: department,
      });
    } catch (error) {
      console.error("❌ Error in getDepartmentById:", error);
      const { statusCode, message } = handleError(error);
      res.status(statusCode).json({ success: false, message });
    }
  }

  // Create department with validation
  static async createDepartment(req, res) {
    try {
      const departmentData = {
        ...req.body,
        createdBy: req.user.id,
        updatedBy: req.user.id,
      };

      const department = await DepartmentService.createDepartment(
        departmentData
      );

      res.status(201).json({
        success: true,
        message: "Department created successfully",
        data: department,
      });
    } catch (error) {
      const { statusCode, message } = handleError(error);
      res.status(statusCode).json({ success: false, message });
    }
  }

  // Update department with partial updates support
  static async updateDepartment(req, res) {
    try {
      const { id } = req.params;

      // First get the existing department
      const existingDepartment = await DepartmentService.getDepartmentById(id);

      const updateData = {
        ...req.body,
        updatedBy: req.user.id,
        status: existingDepartment.status,
      };

      let department = await DepartmentService.updateDepartment(id, updateData);

      // Explicitly populate both fields
      department = await department.populate([
        {
          path: "headOfDepartment",
          select: "firstName lastName email fullName",
        },
        {
          path: "updatedBy",
          select: "firstName lastName email",
        },
      ]);

      // Now we should have the populated data
      res.status(200).json({
        success: true,
        message: "Department updated successfully",
        data: department,
        lastUpdatedBy: {
          id: req.user.id,
          name: `${req.user.firstName} ${req.user.lastName}`,
          email: req.user.email,
        },
      });
    } catch (error) {
      console.error("❌ Department Update Error:", error);
      const { statusCode, message } = handleError(error);
      res
        .status(statusCode)
        .json({ success: false, message, details: error.message });
    }
  }

  // Soft delete department
  static async deleteDepartment(req, res) {
    try {
      const { id } = req.params;
      await DepartmentService.deleteDepartment(id);

      res.status(200).json({
        success: true,
        message: "Department deleted successfully",
      });
    } catch (error) {
      const { statusCode, message } = handleError(error);
      res.status(statusCode).json({ success: false, message });
    }
  }

  // Get department employees with pagination
  static async getDepartmentEmployees(req, res) {
    try {
      const { departmentId } = req.params;
      const { page = 1, limit = 10, status, role } = req.query;

      const result = await DepartmentService.getDepartmentEmployees(
        departmentId,
        {
          page: parseInt(page),
          limit: parseInt(limit),
          status,
          role,
        }
      );

      res.status(200).json({
        success: true,
        data: result.data,
        pagination: result.pagination,
      });
    } catch (error) {
      const { statusCode, message } = handleError(error);
      res.status(statusCode).json({ success: false, message });
    }
  }

  // Get department statistics with date range
  static async getDepartmentChartStats(req, res) {
    try {
      const { startDate, endDate } = req.query;
      const stats = await DepartmentService.getDepartmentChartStats({
        startDate,
        endDate,
        user: req.user,
      });

      res.status(200).json({
        success: true,
        data: stats,
      });
    } catch (error) {
      const { statusCode, message } = handleError(error);
      res.status(statusCode).json({ success: false, message });
    }
  }

  // Get admin department stats with filters
  static async getAdminDepartmentStats(req, res) {
    try {
      const { departmentId } = req.params;
      const { startDate, endDate } = req.query;

      const stats = await DepartmentService.getAdminDepartmentStats(
        departmentId,
        { startDate, endDate }
      );

      res.status(200).json({
        success: true,
        data: stats,
      });
    } catch (error) {
      const { statusCode, message } = handleError(error);
      res.status(statusCode).json({ success: false, message });
    }
  }

  // Get user department stats
  static async getUserStats(req, res) {
    try {
      const { userId } = req.params;
      const stats = await DepartmentService.getUserStats(userId);

      res.status(200).json({
        success: true,
        data: stats,
      });
    } catch (error) {
      const { statusCode, message } = handleError(error);
      res.status(statusCode).json({ success: false, message });
    }
  }
}

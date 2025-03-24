import axios from "axios";
import { toast } from "react-toastify";
import type {
  IPayroll,
  PayrollPeriod,
  PayrollCalculationRequest,
  IPayrollCalculationResult,
  ISalaryGrade,
  PayrollData,
  PayrollStats,
} from "../types/payroll";

const BASE_URL = "/api/super-admin";

export const payrollService = {
  // Calculate Payroll
  calculatePayroll: async (
    data: PayrollCalculationRequest
  ): Promise<IPayrollCalculationResult> => {
    try {
      console.log("🧮 Calculating payroll with data:", data);
      const response = await axios.post(`${BASE_URL}/payroll`, data);

      if (!response.data.success) {
        throw new Error(response.data.message || "Failed to calculate payroll");
      }

      console.log("✅ Payroll calculation result:", response.data);
      return response.data.data;
    } catch (error: any) {
      console.error("❌ Error calculating payroll:", error);
      toast.error(
        error.response?.data?.message || "Failed to calculate payroll"
      );
      throw error;
    }
  },

  // Get Salary Grades
  getSalaryGrades: async (): Promise<ISalaryGrade[]> => {
    try {
      console.log("🔄 Fetching salary grades...");
      const response = await axios.get(`${BASE_URL}/salary-grades`);

      if (!response.data.success) {
        throw new Error(
          response.data.message || "Failed to fetch salary grades"
        );
      }

      console.log("✅ Salary grades fetched:", response.data);
      return response.data.data;
    } catch (error: any) {
      console.error("❌ Error fetching salary grades:", error);
      toast.error(
        error.response?.data?.message || "Failed to fetch salary grades"
      );
      throw error;
    }
  },

  // Get Single Salary Grade
  getSalaryGrade: async (id: string): Promise<ISalaryGrade> => {
    try {
      console.log("🔄 Fetching salary grade:", id);
      const response = await axios.get(`${BASE_URL}/salary-grades/${id}`);

      if (!response.data.success) {
        throw new Error(
          response.data.message || "Failed to fetch salary grade"
        );
      }

      return response.data.data;
    } catch (error: any) {
      console.error("❌ Error fetching salary grade:", error);
      toast.error(
        error.response?.data?.message || "Failed to fetch salary grade"
      );
      throw error;
    }
  },

  // Get Payroll Periods with proper error handling
  getPayrollPeriods: async (): Promise<PayrollPeriod[]> => {
    try {
      console.log("🔄 Fetching payroll periods...");
      const response = await axios.get(`${BASE_URL}/payroll/periods`);

      if (!response.data.success) {
        throw new Error("Failed to fetch payroll periods");
      }

      // Extract the data array from the response
      const periodsData = response.data.data;
      console.log("Payroll periods response:", periodsData);
      return periodsData;
    } catch (error) {
      console.error("Error fetching payroll periods:", error);
      throw new Error(
        error instanceof Error
          ? error.message
          : "Failed to fetch payroll periods"
      );
    }
  },

  // Process Payroll
  processPayroll: async (
    data: PayrollCalculationRequest
  ): Promise<IPayroll> => {
    try {
      console.log("🔄 Processing payroll...", data);
      const response = await axios.post(`${BASE_URL}/payroll/process`, data);

      if (!response.data.success) {
        throw new Error(response.data.message || "Failed to process payroll");
      }

      console.log("✅ Payroll processed:", response.data);
      return response.data.data;
    } catch (error: any) {
      console.error("❌ Error processing payroll:", error);
      toast.error(error.response?.data?.message || "Failed to process payroll");
      throw error;
    }
  },

  // Delete payroll
  deletePayroll: async (id: string): Promise<void> => {
    try {
      console.log("🗑️ Deleting payroll:", id);
      const response = await axios.delete(`${BASE_URL}/payroll/${id}`);

      if (!response.data.success) {
        throw new Error(response.data.message || "Failed to delete payroll");
      }

      toast.success("Payroll deleted successfully");
    } catch (error: any) {
      console.error("❌ Error deleting payroll:", error);
      toast.error(error.response?.data?.message || "Failed to delete payroll");
      throw error;
    }
  },

  // Get Payroll Statistics with proper error handling
  getPayrollStats: async (): Promise<PayrollStats> => {
    try {
      console.log("📊 Fetching payroll statistics...");
      const response = await axios.get(`${BASE_URL}/payroll/stats`);

      if (!response.data.success) {
        throw new Error("Failed to fetch payroll stats");
      }

      // Extract the data from the response
      const statsData = response.data.data;
      console.log("Payroll stats response:", statsData);
      return statsData;
    } catch (error) {
      console.error("Error fetching payroll stats:", error);
      throw new Error(
        error instanceof Error ? error.message : "Failed to fetch payroll stats"
      );
    }
  },

  // Get Individual Payroll by ID
  getPayrollById: async (id: string): Promise<PayrollData> => {
    try {
      console.log("🔄 Fetching payroll details:", id);
      const response = await axios.get(`${BASE_URL}/payroll/${id}`);

      if (!response.data.success) {
        throw new Error(
          response.data.message || "Failed to fetch payroll details"
        );
      }

      console.log("✅ Payroll details fetched:", response.data.data);
      return response.data.data;
    } catch (error: any) {
      console.error("❌ Error fetching payroll details:", error);
      toast.error(
        error.response?.data?.message || "Failed to fetch payroll details"
      );
      throw error;
    }
  },

  // Create new payroll
  createPayroll: async (
    data: PayrollCalculationRequest
  ): Promise<IPayrollCalculationResult> => {
    try {
      console.log("📝 Creating payroll with data:", data);
      const response = await axios.post(`${BASE_URL}/payroll`, data);

      if (!response.data.success) {
        throw new Error(response.data.message || "Failed to create payroll");
      }

      console.log("✅ Payroll created:", response.data.data);
      toast.success("Payroll created successfully");
      return response.data.data;
    } catch (error: any) {
      console.error("❌ Error creating payroll:", error);
      toast.error(error.response?.data?.message || "Failed to create payroll");
      throw error;
    }
  },

  // Add new method to fetch employee payroll history
  getEmployeePayrollHistory: async (
    employeeId: string
  ): Promise<PayrollData[]> => {
    try {
      const response = await axios.get(
        `${BASE_URL}/payroll/employee/${employeeId}/history`
      );
      if (!response.data.success) {
        throw new Error("Failed to fetch employee payroll history");
      }
      return response.data.data;
    } catch (error) {
      console.error("Error fetching employee payroll history:", error);
      throw error;
    }
  },
};

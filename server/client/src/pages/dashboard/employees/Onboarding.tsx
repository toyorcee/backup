import { useState, useRef, useEffect, useCallback } from "react";
import { useInView } from "framer-motion";
import { motion } from "framer-motion";
import {
  FaUserPlus,
  FaUser,
  FaUsers,
  FaBuildingColumns,
  FaTrash,
  FaUserMinus,
} from "react-icons/fa6";
import { FaTimes, FaSpinner } from "react-icons/fa";
import { toast } from "react-toastify";
import { employeeService } from "../../../services/employeeService";
import { Dialog } from "@headlessui/react";
import { DepartmentModal } from "../../../components/departments/DepartmentModal";
import { DepartmentBasic } from "../../../services/employeeService";
import { Department } from "../../../types/department";
import { useAuth } from "../../../context/AuthContext";
import { UserRole, User } from "../../../types/auth";
import {
  CreateEmployeeData,
  Employee,
  Task,
  OnboardingEmployee,
} from "../../../types/employee";
import { Pagination } from "@mui/material";
import { Grid } from "@mui/material";
import CreateAdminModal from "../../../components/modals/CreateAdminModal";

// Modify the custom hook to properly handle the User type
const useOnboardingData = () => {
  const [departments, setDepartments] = useState<DepartmentBasic[]>([]);
  const [onboardingEmployees, setOnboardingEmployees] = useState<
    OnboardingEmployee[]
  >([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { user } = useAuth() as { user: User | null };

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    try {
      // Fetch departments first
      const deps = await employeeService.getDepartments();
      setDepartments(deps);

      // Then fetch employees based on user role
      const emps = await employeeService.getOnboardingEmployees();

      // Filter employees if user is not a super admin and has department restriction
      const filteredEmps =
        user?.role !== UserRole.SUPER_ADMIN && user?.department
          ? emps.filter((emp) => emp.department === user.department)
          : emps;

      setOnboardingEmployees(filteredEmps);
    } catch (error: any) {
      console.error("Error fetching data:", error);
      setError(error.message || "Failed to load data");
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  return {
    departments,
    setDepartments,
    onboardingEmployees,
    setOnboardingEmployees,
    isLoading,
    error,
    fetchData,
    user,
  };
};

export default function Onboarding() {
  // Move ALL hooks to the top, before any conditional returns
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showAdminModal, setShowAdminModal] = useState(false);
  const [showDepartmentModal, setShowDepartmentModal] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [filterStatus, setFilterStatus] = useState("all");
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    position: "",
    gradeLevel: "",
    workLocation: "",
    dateJoined: new Date().toISOString().split("T")[0],
    department: "",
  });

  const {
    departments,
    setDepartments,
    onboardingEmployees,
    setOnboardingEmployees,
    isLoading,
    error,
    fetchData,
    user,
  } = useOnboardingData();

  const [page, setPage] = useState(1);
  const [itemsPerPage] = useState(6);

  // All useEffect hooks
  useEffect(() => {
    const timer = setTimeout(() => {
      fetchData();
    }, 100);
    return () => clearTimeout(timer);
  }, [fetchData]);

  useEffect(() => {
    const refreshInterval = setInterval(async () => {
      try {
        const response = await employeeService.getOnboardingEmployees();
        setOnboardingEmployees(response);
      } catch (error) {
        console.error("Error refreshing employees:", error);
      }
    }, 5 * 60 * 1000);

    return () => clearInterval(refreshInterval);
  }, []);

  // Define all your handler functions here
  const getFilteredEmployees = () => {
    console.log("🔍 Filtering employees:", {
      total: onboardingEmployees.length,
      filterStatus,
      currentFilter:
        filterStatus === "all"
          ? onboardingEmployees
          : onboardingEmployees.filter((emp) => emp.status === filterStatus),
    });

    if (filterStatus === "all") return onboardingEmployees;
    return onboardingEmployees.filter(
      (employee) => employee.status === filterStatus
    );
  };

  const handleCreateEmployee = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsCreating(true);

    try {
      // Validate department selection
      if (!formData.department && user?.role === UserRole.SUPER_ADMIN) {
        toast.error("Please select a department");
        setIsCreating(false);
        return;
      }

      const selectedDept = departments.find(
        (d) => d.id === formData.department
      );

      // Ensure department is always a string
      const departmentValue =
        user?.role === UserRole.SUPER_ADMIN
          ? formData.department
          : user?.department ?? "";

      // Validate department value
      if (!departmentValue) {
        toast.error("Department is required");
        setIsCreating(false);
        return;
      }

      const employeeData: CreateEmployeeData = {
        firstName: formData.firstName,
        lastName: formData.lastName,
        email: formData.email,
        phone: formData.phone,
        position: formData.position,
        gradeLevel: formData.gradeLevel,
        workLocation: formData.workLocation,
        dateJoined: new Date(formData.dateJoined),
        department: departmentValue,
      };

      const response = await employeeService.createEmployee(employeeData);

      // Ensure all required fields have fallback values
      const newEmployee: OnboardingEmployee = {
        id: response.id || Math.random().toString(36).substr(2, 9),
        firstName: response.firstName || formData.firstName || "",
        lastName: response.lastName || formData.lastName || "",
        email: response.email || formData.email || "",
        phone: response.phone || formData.phone || "",
        position: response.position || formData.position || "",
        department: selectedDept?.name || "Unassigned",
        gradeLevel:
          response.gradeLevel || formData.gradeLevel || "Not specified",
        workLocation:
          response.workLocation || formData.workLocation || "Not specified",
        progress: 0,
        startDate: formData.dateJoined || new Date().toISOString(),
        supervisor: "Not Assigned",
        status: "not_started",
        tasks: [
          { name: "documentation_review", completed: false },
          { name: "system_access_setup", completed: false },
          { name: "training_completion", completed: false },
          { name: "department_orientation", completed: false },
        ],
      };

      // Add console.log to debug the new employee object
      console.log("New employee data:", newEmployee);

      setOnboardingEmployees((prev) => [newEmployee, ...prev]);
      setShowCreateModal(false);

      // Reset form
      setFormData({
        firstName: "",
        lastName: "",
        email: "",
        phone: "",
        position: "",
        gradeLevel: "",
        workLocation: "",
        dateJoined: new Date().toISOString().split("T")[0],
        department: "",
      });

      toast.success("Employee invitation sent successfully");
    } catch (error: any) {
      console.error("Error creating employee:", error);
      toast.error(error.response?.data?.message || "Failed to create employee");
    } finally {
      setIsCreating(false);
    }
  };

  const handleDepartmentSave = async (department: Partial<Department>) => {
    try {
      if (department.id) {
        await employeeService.updateDepartment(department.id, {
          name: department.name || "",
          description: department.description,
        });
      } else {
        await employeeService.createDepartment({
          name: department.name || "",
          description: department.description,
        });
      }
      // Refresh departments
      const response = await employeeService.getDepartments();
      setDepartments(response);
      toast.success(
        department.id ? "Department updated!" : "Department created!"
      );
    } catch (error) {
      toast.error("Failed to save department");
      throw error;
    }
  };

  const handleDepartmentDelete = async (id: string) => {
    try {
      await employeeService.deleteDepartment(id);
      // Refresh departments
      const response = await employeeService.getDepartments();
      setDepartments(response as DepartmentBasic[]);
      toast.success("Department deleted successfully!");
    } catch (error) {
      toast.error("Failed to delete department");
      throw error;
    }
  };

  const handlePageChange = (
    event: React.ChangeEvent<unknown>,
    value: number
  ) => {
    setPage(value);
  };

  const handleDeleteEmployee = async (employeeId: string) => {
    try {
      await employeeService.deleteEmployee(employeeId);
      setOnboardingEmployees((prev) =>
        prev.filter((emp) => emp.id !== employeeId)
      );
      toast.success("Employee deleted successfully");
    } catch (error) {
      console.error("Error deleting employee:", error);
      toast.error("Failed to delete employee");
    }
  };

  const handleInitiateOffboarding = async (employeeId: string) => {
    try {
      console.log("🔄 Initiating offboarding for employee:", employeeId);

      // Simplified payload to match backend expectations
      const response = await employeeService.initiateOffboarding(employeeId);

      if (response.success) {
        // Remove from onboarding list
        setOnboardingEmployees((prev) =>
          prev.filter((emp) => emp.id !== employeeId)
        );
        toast.success("Employee offboarding initiated");
        fetchData(); // Refresh the list
      } else {
        throw new Error("Failed to initiate offboarding");
      }
    } catch (error) {
      console.error("❌ Error:", error);
      toast.error("Failed to initiate offboarding");
    }
  };

  // Now you can safely use conditional rendering
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <FaSpinner className="animate-spin text-4xl text-sky-500 mx-auto mb-4" />
          <p className="text-gray-600">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="bg-red-100 text-red-600 p-4 rounded-lg mb-4">
            <p className="font-medium">Error loading dashboard</p>
            <p className="text-sm">{error}</p>
          </div>
          <button
            onClick={fetchData}
            className="text-sky-500 hover:text-sky-600 font-medium"
          >
            Try again
          </button>
        </div>
      </div>
    );
  }

  // Now you can safely use user throughout your component
  const isSuperAdmin = user?.role === UserRole.SUPER_ADMIN;

  const startIndex = (page - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const displayedEmployees = getFilteredEmployees().slice(startIndex, endIndex);

  return (
    <div className="space-y-6 overflow-x-hidden">
      {/* Simplified top section with just the buttons */}
      <div className="flex items-center space-x-4">
        <button
          onClick={() => setShowCreateModal(true)}
          className="!bg-sky-500 hover:bg-sky-600 text-white px-4 py-2 rounded-lg flex items-center space-x-2 transition-colors duration-200"
        >
          <FaUserPlus className="text-lg" />
          <span>Create Employee</span>
        </button>

        <button
          onClick={() => setShowAdminModal(true)}
          className="!bg-indigo-500 hover:bg-indigo-600 text-white px-4 py-2 rounded-lg flex items-center space-x-2 transition-colors duration-200"
        >
          <FaUsers className="text-lg" />
          <span>Create Admin</span>
        </button>

        <button
          onClick={() => setShowDepartmentModal(true)}
          className="!bg-emerald-500 hover:bg-emerald-600 text-white px-4 py-2 rounded-lg flex items-center space-x-2 transition-colors duration-200"
        >
          <FaBuildingColumns className="text-lg" />
          <span>Manage Departments</span>
        </button>
      </div>

      {/* Filter and Cards Section */}
      <div className="bg-white rounded-lg shadow-lg overflow-hidden">
        <div className="p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-semibold text-gray-800">
              Onboarding Employees
            </h2>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="px-4 py-2 rounded-lg border border-gray-200 bg-white text-sm font-medium
                       text-gray-700 hover:border-sky-500 focus:outline-none focus:ring-2 
                       focus:ring-sky-500 focus:border-transparent transition-all duration-200"
            >
              <option value="all">All Stages</option>
              <option value="not_started">Not Started</option>
              <option value="contract_stage">Contract Stage</option>
              <option value="documentation_stage">Documentation Stage</option>
              <option value="it_setup_stage">IT Setup Stage</option>
              <option value="training_stage">Training Stage</option>
              <option value="completed">Completed</option>
            </select>
          </div>

          <Grid container spacing={3}>
            {displayedEmployees.map((employee) => (
              <Grid item xs={12} sm={6} lg={4} key={employee.id}>
                <div className="bg-white rounded-lg shadow p-6 relative">
                  <button
                    onClick={() => handleInitiateOffboarding(employee.id)}
                    className="absolute top-2 right-2 text-red-500 hover:text-red-700 p-1"
                    title="Initiate offboarding"
                  >
                    <FaUserMinus className="text-sm" />
                  </button>
                  <div className="flex items-center space-x-4">
                    <div className="h-12 w-12 bg-indigo-100 rounded-full flex items-center justify-center">
                      <span className="text-indigo-600 text-lg font-semibold">
                        {employee.firstName[0]}
                        {employee.lastName[0]}
                      </span>
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900 truncate">
                        {`${employee.firstName} ${employee.lastName}`.length >
                        17
                          ? `${employee.firstName} ${employee.lastName}`.slice(
                              0,
                              17
                            ) + "..."
                          : `${employee.firstName} ${employee.lastName}`}
                      </h3>
                      <p className="text-sm text-gray-500 truncate">
                        {employee.position.length > 25
                          ? employee.position.slice(0, 25) + "..."
                          : employee.position}
                      </p>
                    </div>
                  </div>
                  <div className="mt-4 space-y-2">
                    <p className="text-sm text-gray-600">
                      <span className="font-medium">Department:</span>{" "}
                      {employee.department}
                    </p>
                    <p className="text-sm text-gray-600">
                      <span className="font-medium">Start Date:</span>{" "}
                      {new Date(employee.startDate).toLocaleDateString()}
                    </p>
                    <div className="mt-2">
                      <div className="h-2 bg-gray-200 rounded">
                        <div
                          className="h-2 bg-indigo-600 rounded"
                          style={{ width: `${employee.progress || 0}%` }}
                        />
                      </div>
                      <p className="text-xs text-gray-500 mt-1">
                        Onboarding Progress: {employee.progress || 0}%
                      </p>
                    </div>
                  </div>
                </div>
              </Grid>
            ))}
          </Grid>

          <div className="mt-6 flex justify-center">
            <Pagination
              count={Math.ceil(getFilteredEmployees().length / itemsPerPage)}
              page={page}
              onChange={handlePageChange}
              color="primary"
              size="large"
            />
          </div>
        </div>
      </div>

      {/* Modals */}
      {showCreateModal && (
        <Dialog
          open={showCreateModal}
          onClose={() => setShowCreateModal(false)}
          className="relative z-50"
        >
          <div className="fixed inset-0 bg-black/30" aria-hidden="true" />

          <div className="fixed inset-0 flex items-center justify-center p-4">
            <Dialog.Panel className="mx-auto max-w-2xl w-full rounded-xl bg-white p-6 shadow-xl">
              <div className="flex justify-between items-center mb-6">
                <Dialog.Title className="text-xl font-semibold text-gray-900">
                  Create New Employee
                </Dialog.Title>
                <button
                  onClick={() => setShowCreateModal(false)}
                  className="text-gray-500 hover:text-gray-700"
                >
                  <FaTimes />
                </button>
              </div>

              <form onSubmit={handleCreateEmployee} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      First Name
                    </label>
                    <input
                      type="text"
                      required
                      className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2"
                      value={formData.firstName}
                      onChange={(e) =>
                        setFormData((prev) => ({
                          ...prev,
                          firstName: e.target.value,
                        }))
                      }
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      Last Name
                    </label>
                    <input
                      type="text"
                      required
                      className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2"
                      value={formData.lastName}
                      onChange={(e) =>
                        setFormData((prev) => ({
                          ...prev,
                          lastName: e.target.value,
                        }))
                      }
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      Email
                    </label>
                    <input
                      type="email"
                      required
                      className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2"
                      value={formData.email}
                      onChange={(e) =>
                        setFormData((prev) => ({
                          ...prev,
                          email: e.target.value,
                        }))
                      }
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      Phone
                    </label>
                    <input
                      type="tel"
                      required
                      className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2"
                      value={formData.phone}
                      onChange={(e) =>
                        setFormData((prev) => ({
                          ...prev,
                          phone: e.target.value,
                        }))
                      }
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      Position
                    </label>
                    <input
                      type="text"
                      required
                      className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2"
                      value={formData.position}
                      onChange={(e) =>
                        setFormData((prev) => ({
                          ...prev,
                          position: e.target.value,
                        }))
                      }
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      Grade Level
                    </label>
                    <input
                      type="text"
                      required
                      className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2"
                      value={formData.gradeLevel}
                      onChange={(e) =>
                        setFormData((prev) => ({
                          ...prev,
                          gradeLevel: e.target.value,
                        }))
                      }
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      Work Location
                    </label>
                    <input
                      type="text"
                      required
                      className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2"
                      value={formData.workLocation}
                      onChange={(e) =>
                        setFormData((prev) => ({
                          ...prev,
                          workLocation: e.target.value,
                        }))
                      }
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      Date Joined
                    </label>
                    <input
                      type="date"
                      required
                      className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2"
                      value={formData.dateJoined}
                      onChange={(e) =>
                        setFormData((prev) => ({
                          ...prev,
                          dateJoined: e.target.value,
                        }))
                      }
                    />
                  </div>

                  <div className="col-span-2">
                    <label className="block text-sm font-medium text-gray-700">
                      Department
                    </label>
                    <select
                      required
                      className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2"
                      value={formData.department}
                      onChange={(e) =>
                        setFormData((prev) => ({
                          ...prev,
                          department: e.target.value,
                        }))
                      }
                    >
                      <option value="">Select Department</option>
                      {departments.map((dept) => (
                        <option key={dept.id} value={dept.id}>
                          {dept.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="mt-6 flex justify-end space-x-3">
                  <button
                    type="button"
                    onClick={() => setShowCreateModal(false)}
                    className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
                    disabled={isCreating}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isCreating}
                    className="inline-flex items-center px-4 py-2 text-sm font-medium text-white !bg-green-600 rounded-md hover:bg-green-700 disabled:bg-green-400 disabled:cursor-not-allowed"
                  >
                    {isCreating ? (
                      <>
                        <FaSpinner className="animate-spin mr-2" />
                        Creating...
                      </>
                    ) : (
                      "Create Employee"
                    )}
                  </button>
                </div>
              </form>
            </Dialog.Panel>
          </div>
        </Dialog>
      )}

      {showAdminModal && (
        <CreateAdminModal
          isOpen={showAdminModal}
          onClose={() => setShowAdminModal(false)}
          departments={departments.map((dept) => dept.name)}
        />
      )}

      <DepartmentModal
        isOpen={showDepartmentModal}
        onClose={() => setShowDepartmentModal(false)}
        onSave={handleDepartmentSave}
        onDelete={handleDepartmentDelete}
        departments={departments}
        isLoading={isLoading}
      />
    </div>
  );
}

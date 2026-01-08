/**
 * Mock Data for IT Equipment Management System
 * 
 * This file contains realistic mock data for testing and development.
 * The data respects all foreign key relationships and constraints.
 */

export interface MockData {
  regions: Array<{ name: string; code?: string }>;
  countries: Array<{ name: string; regionName: string }>;
  plants: Array<{ name: string; countryName: string }>;
  departments: Array<{ name: string; plantName: string }>;
  areas: Array<{ name: string; departmentName: string }>;
  subAreas: Array<{ name: string; areaName: string; building?: string; x?: number; y?: number }>;
  types: Array<{ type_name: string; change_interval?: number; expiry_interval?: number }>;
  productLines: Array<{ name: string; typeName: string }>;
  models: Array<{ name: string; productLineName: string }>;
  vendors: Array<{ name: string }>;
  suppliers: Array<{ name: string; email?: string; phone_number?: string; address?: string; representative_name?: string; sap_vendor_no?: string; website?: string }>;
  writeOffReasons: Array<{ reason: string }>;
  inventoryPeriods: Array<{ inventory_nr: string; start_date: string; end_date: string; comment?: string }>;
  employees: Array<{ employee_no: string; user_id: string; first_name: string; last_name: string; name: string; email?: string; mobile_phone?: string; department?: string; location?: string; region?: string; employee_type?: string }>;
  equipment: Array<{ service_tag: string; modelName?: string; vendorName?: string; supplierName?: string; cerf?: number; purchase_date: string; warranty_expiry_date: string; teamviewer?: number; ip?: string; mac_addresses?: string; is_personal?: boolean }>;
  equipmentLogs: Array<{ service_tag: string; assigned_to?: string; subAreaName?: string; inventory_nr?: string; comment?: string; is_written_off?: string }>;
}

export const mockData: MockData = {
  // Location Hierarchy
  regions: [
    { name: "Europe", code: "EU" },
    { name: "North America", code: "NA" },
    { name: "Asia Pacific", code: "APAC" },
  ],

  countries: [
    { name: "Estonia", regionName: "Europe" },
    { name: "Germany", regionName: "Europe" },
    { name: "United Kingdom", regionName: "Europe" },
    { name: "United States", regionName: "North America" },
    { name: "Canada", regionName: "North America" },
    { name: "China", regionName: "Asia Pacific" },
    { name: "Japan", regionName: "Asia Pacific" },
  ],

  plants: [
    { name: "Tallinn Plant", countryName: "Estonia" },
    { name: "Berlin Plant", countryName: "Germany" },
    { name: "London Plant", countryName: "United Kingdom" },
    { name: "New York Plant", countryName: "United States" },
    { name: "Toronto Plant", countryName: "Canada" },
    { name: "Shanghai Plant", countryName: "China" },
    { name: "Tokyo Plant", countryName: "Japan" },
  ],

  departments: [
    { name: "IT Department", plantName: "Tallinn Plant" },
    { name: "Production", plantName: "Tallinn Plant" },
    { name: "Quality Assurance", plantName: "Tallinn Plant" },
    { name: "IT Department", plantName: "Berlin Plant" },
    { name: "Engineering", plantName: "Berlin Plant" },
    { name: "IT Department", plantName: "London Plant" },
    { name: "Finance", plantName: "London Plant" },
    { name: "IT Department", plantName: "New York Plant" },
    { name: "Sales", plantName: "New York Plant" },
    { name: "IT Department", plantName: "Toronto Plant" },
  ],

  areas: [
    { name: "Server Room", departmentName: "IT Department" },
    { name: "Office Floor 1", departmentName: "IT Department" },
    { name: "Office Floor 2", departmentName: "IT Department" },
    { name: "Production Line A", departmentName: "Production" },
    { name: "Production Line B", departmentName: "Production" },
    { name: "QA Lab", departmentName: "Quality Assurance" },
    { name: "Engineering Lab", departmentName: "Engineering" },
    { name: "Sales Office", departmentName: "Sales" },
  ],

  subAreas: [
    { name: "Main Server Rack", areaName: "Server Room", building: "Building A", x: 10.5, y: 20.3 },
    { name: "Backup Server Rack", areaName: "Server Room", building: "Building A", x: 10.5, y: 25.3 },
    { name: "Desk Area 1-10", areaName: "Office Floor 1", building: "Building A", x: 15.0, y: 30.0 },
    { name: "Desk Area 11-20", areaName: "Office Floor 1", building: "Building A", x: 20.0, y: 30.0 },
    { name: "Desk Area 21-30", areaName: "Office Floor 2", building: "Building A", x: 15.0, y: 35.0 },
    { name: "Conference Room A", areaName: "Office Floor 2", building: "Building A", x: 25.0, y: 35.0 },
    { name: "Workstation 1", areaName: "Production Line A", building: "Building B", x: 50.0, y: 10.0 },
    { name: "Workstation 2", areaName: "Production Line A", building: "Building B", x: 55.0, y: 10.0 },
    { name: "Testing Station", areaName: "QA Lab", building: "Building C", x: 30.0, y: 40.0 },
  ],

  // Equipment Types and Hierarchy
  types: [
    { type_name: "Laptop", change_interval: 36, expiry_interval: 5 },
    { type_name: "Desktop", change_interval: 48, expiry_interval: 7 },
    { type_name: "Monitor", change_interval: 60, expiry_interval: 10 },
    { type_name: "Printer", change_interval: 24, expiry_interval: 5 },
    { type_name: "Server", change_interval: 60, expiry_interval: 7 },
    { type_name: "Tablet", change_interval: 24, expiry_interval: 3 },
    { type_name: "Mobile Phone", change_interval: 24, expiry_interval: 2 },
  ],

  productLines: [
    { name: "Latitude", typeName: "Laptop" },
    { name: "XPS", typeName: "Laptop" },
    { name: "OptiPlex", typeName: "Desktop" },
    { name: "Precision", typeName: "Desktop" },
    { name: "UltraSharp", typeName: "Monitor" },
    { name: "P-Series", typeName: "Monitor" },
    { name: "LaserJet", typeName: "Printer" },
    { name: "OfficeJet", typeName: "Printer" },
    { name: "PowerEdge", typeName: "Server" },
    { name: "iPad", typeName: "Tablet" },
    { name: "Galaxy Tab", typeName: "Tablet" },
    { name: "iPhone", typeName: "Mobile Phone" },
    { name: "Galaxy", typeName: "Mobile Phone" },
  ],

  models: [
    { name: "Latitude 5520", productLineName: "Latitude" },
    { name: "Latitude 7420", productLineName: "Latitude" },
    { name: "Latitude 7530", productLineName: "Latitude" },
    { name: "XPS 13", productLineName: "XPS" },
    { name: "XPS 15", productLineName: "XPS" },
    { name: "OptiPlex 7090", productLineName: "OptiPlex" },
    { name: "OptiPlex 7010", productLineName: "OptiPlex" },
    { name: "Precision 3560", productLineName: "Precision" },
    { name: "UltraSharp U2720Q", productLineName: "UltraSharp" },
    { name: "UltraSharp U2421E", productLineName: "UltraSharp" },
    { name: "P2723DE", productLineName: "P-Series" },
    { name: "LaserJet Pro M404dn", productLineName: "LaserJet" },
    { name: "OfficeJet Pro 9015e", productLineName: "OfficeJet" },
    { name: "PowerEdge R740", productLineName: "PowerEdge" },
    { name: "PowerEdge R640", productLineName: "PowerEdge" },
    { name: "iPad Pro 12.9", productLineName: "iPad" },
    { name: "Galaxy Tab S8", productLineName: "Galaxy Tab" },
    { name: "iPhone 14 Pro", productLineName: "iPhone" },
    { name: "Galaxy S23", productLineName: "Galaxy" },
  ],

  vendors: [
    { name: "Dell" },
    { name: "HP" },
    { name: "Lenovo" },
    { name: "Apple" },
    { name: "Samsung" },
    { name: "Microsoft" },
    { name: "ASUS" },
  ],

  suppliers: [
    { 
      name: "TechSupply Co.", 
      email: "orders@techsupply.com", 
      phone_number: "+1-555-0100",
      address: "123 Tech Street, San Francisco, CA 94105",
      representative_name: "John Smith",
      sap_vendor_no: "100001",
      website: "https://www.techsupply.com"
    },
    { 
      name: "Global IT Solutions", 
      email: "sales@globalit.com", 
      phone_number: "+1-555-0200",
      address: "456 Business Ave, New York, NY 10001",
      representative_name: "Jane Doe",
      sap_vendor_no: "100002",
      website: "https://www.globalit.com"
    },
    { 
      name: "Enterprise Equipment Ltd", 
      email: "info@enterpriseeq.com", 
      phone_number: "+44-20-1234-5678",
      address: "789 Corporate Road, London, UK",
      representative_name: "Robert Johnson",
      sap_vendor_no: "200001"
    },
  ],

  writeOffReasons: [
    { reason: "End of Life" },
    { reason: "Damaged Beyond Repair" },
    { reason: "Obsolete Technology" },
    { reason: "Lost or Stolen" },
    { reason: "Sold to Employee" },
    { reason: "Recycled" },
  ],

  inventoryPeriods: [
    { 
      inventory_nr: "INV-2024-Q1", 
      start_date: "2024-01-01", 
      end_date: "2024-03-31",
      comment: "Q1 2024 Inventory Cycle"
    },
    { 
      inventory_nr: "INV-2024-Q2", 
      start_date: "2024-04-01", 
      end_date: "2024-06-30",
      comment: "Q2 2024 Inventory Cycle"
    },
    { 
      inventory_nr: "INV-2024-Q3", 
      start_date: "2024-07-01", 
      end_date: "2024-09-30",
      comment: "Q3 2024 Inventory Cycle"
    },
  ],

  employees: [
    { employee_no: "EMP001", user_id: "jsmith", first_name: "John", last_name: "Smith", name: "John Smith", email: "john.smith@example.com", mobile_phone: "+1-555-0101", department: "IT", location: "Tallinn", region: "Europe", employee_type: "Full-time" },
    { employee_no: "EMP002", user_id: "mjohnson", first_name: "Mary", last_name: "Johnson", name: "Mary Johnson", email: "mary.johnson@example.com", mobile_phone: "+1-555-0102", department: "IT", location: "Tallinn", region: "Europe", employee_type: "Full-time" },
    { employee_no: "EMP003", user_id: "dwilliams", first_name: "David", last_name: "Williams", name: "David Williams", email: "david.williams@example.com", mobile_phone: "+1-555-0103", department: "IT", location: "Berlin", region: "Europe", employee_type: "Full-time" },
    { employee_no: "EMP004", user_id: "sbrown", first_name: "Sarah", last_name: "Brown", name: "Sarah Brown", email: "sarah.brown@example.com", mobile_phone: "+1-555-0104", department: "Production", location: "Tallinn", region: "Europe", employee_type: "Full-time" },
    { employee_no: "EMP005", user_id: "mjones", first_name: "Michael", last_name: "Jones", name: "Michael Jones", email: "michael.jones@example.com", mobile_phone: "+1-555-0105", department: "IT", location: "New York", region: "North America", employee_type: "Full-time" },
  ],

  equipment: [
    { service_tag: "DL-001", modelName: "Latitude 5520", vendorName: "Dell", supplierName: "TechSupply Co.", cerf: 100001, purchase_date: "2023-01-15", warranty_expiry_date: "2026-01-15", teamviewer: 123456789, ip: "192.168.1.100", mac_addresses: "00:1B:44:11:3A:B7", is_personal: false },
    { service_tag: "DL-002", modelName: "Latitude 7420", vendorName: "Dell", supplierName: "TechSupply Co.", cerf: 100002, purchase_date: "2023-02-20", warranty_expiry_date: "2026-02-20", teamviewer: 123456790, ip: "192.168.1.101", mac_addresses: "00:1B:44:11:3A:B8", is_personal: false },
    { service_tag: "DL-003", modelName: "XPS 13", vendorName: "Dell", supplierName: "Global IT Solutions", cerf: 100003, purchase_date: "2023-03-10", warranty_expiry_date: "2026-03-10", teamviewer: 123456791, ip: "192.168.1.102", mac_addresses: "00:1B:44:11:3A:B9", is_personal: false },
    { service_tag: "HP-001", modelName: "LaserJet Pro M404dn", vendorName: "HP", supplierName: "TechSupply Co.", cerf: 100004, purchase_date: "2022-11-05", warranty_expiry_date: "2025-11-05", ip: "192.168.1.200", is_personal: false },
    { service_tag: "HP-002", modelName: "OfficeJet Pro 9015e", vendorName: "HP", supplierName: "Global IT Solutions", cerf: 100005, purchase_date: "2023-05-12", warranty_expiry_date: "2026-05-12", ip: "192.168.1.201", is_personal: false },
    { service_tag: "DL-004", modelName: "OptiPlex 7090", vendorName: "Dell", supplierName: "Enterprise Equipment Ltd", cerf: 100006, purchase_date: "2023-06-01", warranty_expiry_date: "2026-06-01", ip: "192.168.1.103", mac_addresses: "00:1B:44:11:3A:BA", is_personal: false },
    { service_tag: "DL-005", modelName: "UltraSharp U2720Q", vendorName: "Dell", supplierName: "TechSupply Co.", cerf: 100007, purchase_date: "2023-07-15", warranty_expiry_date: "2028-07-15", is_personal: false },
    { service_tag: "DL-006", modelName: "PowerEdge R740", vendorName: "Dell", supplierName: "Global IT Solutions", cerf: 100008, purchase_date: "2022-09-20", warranty_expiry_date: "2025-09-20", ip: "192.168.1.10", mac_addresses: "00:1B:44:11:3A:BB,00:1B:44:11:3A:BC", is_personal: false },
    { service_tag: "AP-001", modelName: "iPad Pro 12.9", vendorName: "Apple", supplierName: "TechSupply Co.", cerf: 100009, purchase_date: "2023-08-10", warranty_expiry_date: "2024-08-10", is_personal: false },
    { service_tag: "AP-002", modelName: "iPhone 14 Pro", vendorName: "Apple", supplierName: "Global IT Solutions", cerf: 100010, purchase_date: "2023-09-05", warranty_expiry_date: "2024-09-05", is_personal: false },
    { service_tag: "SM-001", modelName: "Galaxy S23", vendorName: "Samsung", supplierName: "TechSupply Co.", cerf: 100011, purchase_date: "2023-10-01", warranty_expiry_date: "2024-10-01", is_personal: false },
    { service_tag: "DL-007", modelName: "Latitude 7530", vendorName: "Dell", supplierName: "Enterprise Equipment Ltd", cerf: 100012, purchase_date: "2023-11-15", warranty_expiry_date: "2026-11-15", teamviewer: 123456792, ip: "192.168.1.104", mac_addresses: "00:1B:44:11:3A:BD", is_personal: false },
  ],

  equipmentLogs: [
    { service_tag: "DL-001", assigned_to: "EMP001", subAreaName: "Desk Area 1-10", inventory_nr: "INV-2024-Q1", comment: "Assigned to IT team member" },
    { service_tag: "DL-002", assigned_to: "EMP002", subAreaName: "Desk Area 1-10", inventory_nr: "INV-2024-Q1", comment: "Development laptop" },
    { service_tag: "DL-003", assigned_to: "EMP003", subAreaName: "Desk Area 11-20", inventory_nr: "INV-2024-Q1", comment: "Manager's laptop" },
    { service_tag: "HP-001", subAreaName: "Desk Area 1-10", inventory_nr: "INV-2024-Q1", comment: "Shared printer for IT department" },
    { service_tag: "HP-002", subAreaName: "Desk Area 11-20", inventory_nr: "INV-2024-Q1", comment: "Office printer" },
    { service_tag: "DL-004", assigned_to: "EMP004", subAreaName: "Workstation 1", inventory_nr: "INV-2024-Q1", comment: "Production workstation" },
    { service_tag: "DL-005", assigned_to: "EMP001", subAreaName: "Desk Area 1-10", inventory_nr: "INV-2024-Q1", comment: "External monitor" },
    { service_tag: "DL-006", subAreaName: "Main Server Rack", inventory_nr: "INV-2024-Q1", comment: "Production server" },
    { service_tag: "AP-001", assigned_to: "EMP005", subAreaName: "Desk Area 21-30", inventory_nr: "INV-2024-Q1", comment: "Tablet for field work" },
    { service_tag: "AP-002", assigned_to: "EMP001", subAreaName: "Desk Area 1-10", inventory_nr: "INV-2024-Q1", comment: "Mobile device" },
    { service_tag: "SM-001", assigned_to: "EMP002", subAreaName: "Desk Area 1-10", inventory_nr: "INV-2024-Q1", comment: "Mobile device" },
    { service_tag: "DL-007", assigned_to: "EMP003", subAreaName: "Desk Area 11-20", inventory_nr: "INV-2024-Q2", comment: "New laptop assignment" },
  ],
};

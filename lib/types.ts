/**
 * Shared TypeScript types for AbhyasMitra Premium
 */

export interface Product {
  id: string;
  title: string;
  subject: string;
  branch: string;
  semester: number;
  description: string;
  coverUrl: string;
  storagePath: string; // private path in Firebase Storage (never exposed to client)
  price: number; // in INR
  pageCount?: number;
  published: boolean;
  createdAt: string; // ISO date string
}

export interface Purchase {
  id: string;
  userId: string;
  productId: string;
  orderId: string;
  paymentId: string;
  amount: number; // in INR
  purchasedAt: string; // ISO date string
  status: "pending" | "completed" | "failed";
  userEmail: string;
}

export interface RazorpayOrder {
  id: string;
  amount: number;
  currency: string;
  receipt: string;
}

export interface AdminUser {
  uid: string;
  email: string;
  isAdmin: boolean;
}

// Subjects for SPPU engineering context
export const ENGINEERING_SUBJECTS = [
  "Engineering Mathematics",
  "Data Structures",
  "Algorithms",
  "Database Management Systems",
  "Operating Systems",
  "Computer Networks",
  "Software Engineering",
  "Machine Learning",
  "Artificial Intelligence",
  "Web Technology",
  "Compiler Design",
  "Theory of Computation",
  "Computer Organization",
  "Object Oriented Programming",
  "Digital Electronics",
  "Microprocessors",
  "Signal Processing",
  "Electromagnetics",
  "Thermodynamics",
  "Fluid Mechanics",
  "Strength of Materials",
  "Engineering Drawing",
  "Applied Physics",
  "Applied Chemistry",
] as const;

export const BRANCHES = [
  "Computer Engineering",
  "Information Technology",
  "Electronics & Telecommunication",
  "Mechanical Engineering",
  "Civil Engineering",
  "Electrical Engineering",
  "Instrumentation Engineering",
] as const;

export const SEMESTERS = [1, 2, 3, 4, 5, 6, 7, 8] as const;

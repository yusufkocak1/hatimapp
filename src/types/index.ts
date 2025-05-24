import { Timestamp } from "firebase/firestore";

export interface CustomUser extends Omit<User, 'delete' | 'toJSON'> {
  id: string;
}

export interface User {
  id: string;
  displayName: string;
  email: string;
  photoURL?: string;
  createdAt: Date;
  teams: string[];
}

export interface Team {
  id: string;
  name: string;
  adminId: string;
  members: string[];
  pendingMembers: string[];
  createdAt: Date;
}

export interface Hatim {
  id: string;
  teamId: string;
  name: string;
  startDate: Timestamp;
  endDate?: Timestamp;
  status: 'active' | 'completed';
  pageAssignments: Record<string, PageAssignment>;
  createdAt: Timestamp;
  totalPages?: number;
  completedPages?: number;
}

export interface PageAssignment {
  userId: string;
  pages: number[];
  completedPages: number[];
}

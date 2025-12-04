// Display-specific types

export interface ClassStats {
  className: string;
  totalStudents: number;
  averageScore: number;
  progressPercentage: number;
  completionRate: number;
}

export interface StudentListItem {
  id: string;
  login: string;
  firstName: string | null;
  lastName: string | null;
  fullName: string | null;
  class: string | null;
  lastActivity: string | null;
}

export interface LessonActivity {
  lessonId: string;
  lessonName: string;
  activeStudents: number;
  totalStudents: number;
  submissions: {
    studentId: string;
    studentName: string;
    status: 'pending' | 'passed' | 'failed';
    submittedAt: string;
  }[];
}

export interface AuthorStats {
  authorId: string;
  authorName: string;
  levelCount: number;
  averageRating: number;
  totalPlays: number;
}

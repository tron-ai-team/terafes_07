export interface UserProfile {
  id: string | number;
  name: string;
  email: string;
  displayName?: string;
  role?: string;
  avatarUrl?: string;
  jlptLevel?: 'N1' | 'N2' | 'N3' | 'N4' | 'N5';
  targetRole?: string;
  primaryLanguages?: string[];
  isAuthenticated: boolean;
  authProviders?: string[];
  cvFileName?: string;
  cvFileSize?: number;
  cvUploadedAt?: string;
  cvParsedData?: {
    skills: string[];
    experienceYears: number;
    education: string;
    certifications: string[];
  };
}

export interface AuthState {
  user: UserProfile | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
}

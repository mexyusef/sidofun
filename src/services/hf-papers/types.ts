export type HfPapersBackend = 'api' | 'cli';

export interface HfPaperAuthorUser {
  username?: string;
  fullname?: string;
  avatarUrl?: string;
  isPro?: boolean;
  orgs?: Array<{ name?: string; fullname?: string }>;
}

export interface HfPaperAuthor {
  name: string;
  hidden?: boolean;
  status?: string;
  statusLastChangedAt?: string;
  user?: HfPaperAuthorUser;
}

export interface HfPaperSummary {
  id: string;
  title: string;
  summary?: string;
  authors: string[];
  authorDetails: HfPaperAuthor[];
  publishedAt?: string;
  submittedAt?: string;
  submittedBy?: string;
  submittedByDetails?: HfPaperAuthorUser;
  upvotes?: number;
  comments?: number;
  aiSummary?: string;
  aiKeywords?: string[];
  organization?: string;
  organizationDetails?: {
    name?: string;
    fullname?: string;
    avatarUrl?: string;
  };
  githubRepo?: string;
  githubStars?: number;
  projectPage?: string;
  paperUrl: string;
  arxivUrl: string;
}

export interface HfPaperInfoResult extends HfPaperSummary {
  discussionId?: string;
  source?: string;
  raw?: Record<string, unknown>;
}

export interface HfPapersStatus {
  available: boolean;
  defaultBackend: HfPapersBackend | null;
  cli: {
    available: boolean;
    path?: string;
    version?: string;
    notes: string[];
  };
  pythonApi: {
    available: boolean;
    pythonPath?: string;
    packageVersion?: string;
    methods: string[];
    notes: string[];
  };
  notes: string[];
}

export interface HfPapersDoctorResult {
  ok: boolean;
  backend: HfPapersBackend | null;
  status: HfPapersStatus;
  checks: Array<{
    name: string;
    ok: boolean;
    details?: string;
  }>;
}

export interface HfPapersSearchOptions {
  query: string;
  limit?: number;
  backend?: HfPapersBackend | 'auto';
  token?: string;
  includeRaw?: boolean;
  timeoutMs?: number;
}

export interface HfPapersSearchResult {
  query: string;
  backend: HfPapersBackend;
  count: number;
  papers: HfPaperSummary[];
}

export interface HfPapersInfoOptions {
  paperId: string;
  backend?: HfPapersBackend | 'auto';
  token?: string;
  includeRaw?: boolean;
  timeoutMs?: number;
}

export interface HfPapersReadOptions {
  paperId: string;
  backend?: HfPapersBackend | 'auto';
  token?: string;
  savePath?: string;
  timeoutMs?: number;
}

export interface HfPapersReadResult {
  id: string;
  backend: HfPapersBackend;
  markdown: string;
  charCount: number;
  wordCount: number;
  paperUrl: string;
  arxivUrl: string;
  savedTo?: string;
}

export interface HfPapersListDailyOptions {
  date?: string;
  week?: string;
  month?: string;
  submitter?: string;
  sort?: 'publishedAt' | 'trending';
  limit?: number;
  backend?: HfPapersBackend | 'auto';
  token?: string;
  includeRaw?: boolean;
  timeoutMs?: number;
}

export interface HfPapersListDailyResult {
  backend: HfPapersBackend;
  count: number;
  filters: {
    date?: string;
    week?: string;
    month?: string;
    submitter?: string;
    sort?: 'publishedAt' | 'trending';
    limit?: number;
  };
  papers: HfPaperSummary[];
}

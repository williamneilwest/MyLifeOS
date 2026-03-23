import { apiClient } from './apiClient';

export type BuildStatus = 'Draft' | 'Generated' | 'Applying' | 'Applied' | 'Failed' | 'Reverted';

export interface AIBuild {
  id: string;
  idea: string;
  feature_name: string;
  summary: string;
  codex_prompt: string;
  risk_level: 'Low' | 'Medium' | 'High';
  files_affected: string[];
  rollback_plan: string;
  status: BuildStatus;
  created_at: string | null;
  updated_at: string | null;
  apply_requested_at: string | null;
  applied_at: string | null;
  reverted_at: string | null;
  pre_change_commit_hash: string | null;
  post_change_commit_hash: string | null;
  generation_model: string | null;
  generation_raw_response: string | null;
  apply_log: string | null;
  error_message: string | null;
}

interface GenerateResponse {
  build?: {
    id?: string;
    codexPrompt?: string;
    risk?: string;
    filesAffected?: string[];
    rollbackPlan?: string;
  };
  success?: boolean;
}

interface BuildListResponse {
  builds: AIBuild[];
}

interface BuildResponse {
  build: AIBuild;
}

interface ApplyResponse {
  success: boolean;
  commit_hash?: string;
  build?: AIBuild;
}

export interface RuntimeBuildInput {
  codexPrompt: string;
  filesAffected: string[];
  rollbackPlan: string;
}

export interface RuntimeApplyResponse {
  success: boolean;
  filesApplied: string[];
  commandResults: Array<{
    command: string;
    stdout: string;
    stderr: string;
    returnCode: number;
  }>;
  message: string;
}

interface BuilderStatusResponse {
  git: {
    branch: string;
    commit: string;
    dirty: 'yes' | 'no';
  };
  latest_build: AIBuild | null;
}

export const aiBuilderService = {
  generate: async (idea: string): Promise<GenerateResponse> => {
    const response = await fetch('/api/ai-builder/generate', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ idea }),
    });

    const json = (await response.json()) as GenerateResponse;
    return json;
  },
  list: () => apiClient.get<BuildListResponse>('/ai-builder/builds'),
  getById: (id: string) => apiClient.get<BuildResponse>(`/ai-builder/builds/${id}`),
  apply: (id: string) => apiClient.post<ApplyResponse>(`/ai-builder/builds/${id}/apply`, {}),
  applyRuntime: (build: RuntimeBuildInput) => apiClient.post<RuntimeApplyResponse>('/ai-builder/apply', { build }),
  revert: (id: string) => apiClient.post<BuildResponse>(`/ai-builder/builds/${id}/revert`, {}),
  status: () => apiClient.get<BuilderStatusResponse>('/ai-builder/status'),
};

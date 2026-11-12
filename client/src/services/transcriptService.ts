import api from './api';
import { StudentMultiYearHistoryResponse } from '../types/report.types';

export interface OfficialTranscriptPublicationInfo {
  status: 'NOT_PREPARED' | 'PREPARED' | 'PUBLISHED';
  versionNumber?: number | null;
  targetVersionNumber?: number | null;
  isDraft?: boolean;
  isHistorical?: boolean;
  preparedAt: string | null;
  preparedById: string | null;
  preparedByName: string | null;
  publishedAt: string | null;
  publishedById: string | null;
  publishedByName: string | null;
  notes: string | null;
}

export interface ActiveTranscriptDraft {
  preparedAt: string;
  preparedById: string | null;
  preparedByName: string;
  targetVersionNumber: number;
  notes?: string | null;
  snapshot: any;
}

export interface AvailableTranscriptVersion {
  versionNumber: number;
  publishedAt: string;
  publishedByName: string;
  notes?: string | null;
  id: string;
}

export interface OfficialTranscriptDocument extends StudentMultiYearHistoryResponse {
  publication: OfficialTranscriptPublicationInfo;
  activeDraft?: ActiveTranscriptDraft | null;
  availableVersions?: AvailableTranscriptVersion[];
  publicationHistory: Array<{
    id: string;
    action: string;
    createdAt: string;
    adminName: string;
    status: string;
    versionNumber?: number | null;
    notes?: string;
    snapshot?: any;
    actionLabel?: string;
  }>;
}

export const transcriptService = {
  /**
   * Retrieves the Official Transcript document (latest published version, with draft metadata)
   * Access: ADMIN, SUPER_ADMIN, MANAGEMENT
   */
  getOfficialTranscript: async (studentId: string): Promise<OfficialTranscriptDocument> => {
    const res = await api.get(`/transcripts/student/${studentId}`);
    return res.data.data;
  },

  /**
   * Retrieves the active working draft separately
   * Access: ADMIN, SUPER_ADMIN, MANAGEMENT
   */
  getTranscriptDraft: async (studentId: string): Promise<OfficialTranscriptDocument> => {
    const res = await api.get(`/transcripts/student/${studentId}/draft`);
    return res.data.data;
  },

  /**
   * Retrieves a specific historical published transcript version (e.g. Version 1, Version 2)
   * Access: ADMIN, SUPER_ADMIN, MANAGEMENT
   */
  getTranscriptVersion: async (
    studentId: string,
    versionNumber: number
  ): Promise<OfficialTranscriptDocument> => {
    const res = await api.get(`/transcripts/student/${studentId}/version/${versionNumber}`);
    return res.data.data;
  },

  /**
   * Step 1 of Workflow: Admin prepares a new transcript draft for review
   * Access: ADMIN, SUPER_ADMIN
   */
  prepareOfficialTranscript: async (
    studentId: string,
    notes?: string
  ): Promise<OfficialTranscriptDocument> => {
    const res = await api.post(`/transcripts/student/${studentId}/prepare`, { notes });
    return res.data.data;
  },

  /**
   * Step 3 of Workflow: Admin publishes the transcript draft as a new sequential version
   * Access: ADMIN, SUPER_ADMIN
   */
  publishOfficialTranscript: async (
    studentId: string,
    notes?: string
  ): Promise<OfficialTranscriptDocument> => {
    const res = await api.post(`/transcripts/student/${studentId}/publish`, { notes });
    return res.data.data;
  },

  /**
   * Discards the active working draft safely
   * Access: ADMIN, SUPER_ADMIN
   */
  discardTranscriptDraft: async (
    studentId: string,
    reason?: string
  ): Promise<OfficialTranscriptDocument> => {
    const res = await api.post(`/transcripts/student/${studentId}/draft/discard`, { reason });
    return res.data.data;
  },

  /**
   * Retrieves the publication and preparation audit history
   * Access: ADMIN, SUPER_ADMIN, MANAGEMENT
   */
  getPublicationHistory: async (studentId: string) => {
    const res = await api.get(`/transcripts/student/${studentId}/history`);
    return res.data.data;
  },
};

export default transcriptService;

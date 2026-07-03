import { RootState } from '@/store';

export const selectSummary = (state: RootState) => state.summary;
export const selectSummaryContent = (state: RootState) => state.summary.content;
export const selectSummaryIsStreaming = (state: RootState) => state.summary.isStreaming;
export const selectSummaryError = (state: RootState) => state.summary.error;
export const selectSummaryTaskId = (state: RootState) => state.summary.taskId;

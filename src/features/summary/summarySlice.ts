import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { SummaryState } from '@/types/task';

const initialState: SummaryState = {
  taskId: null,
  content: '',
  isStreaming: false,
  error: null,
};

const summarySlice = createSlice({
  name: 'summary',
  initialState,
  reducers: {
    startStream(state, action: PayloadAction<string>) {
      state.taskId = action.payload;
      state.content = '';
      state.isStreaming = true;
      state.error = null;
    },
    appendChunk(state, action: PayloadAction<string>) {
      state.content += action.payload;
    },
    completeStream(state) {
      state.isStreaming = false;
    },
    setStreamError(state, action: PayloadAction<string>) {
      state.isStreaming = false;
      state.error = action.payload;
    },
    clearSummary(state) {
      state.taskId = null;
      state.content = '';
      state.isStreaming = false;
      state.error = null;
    },
  },
});

export const {
  startStream,
  appendChunk,
  completeStream,
  setStreamError,
  clearSummary,
} = summarySlice.actions;

export default summarySlice.reducer;

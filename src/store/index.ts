import { configureStore } from '@reduxjs/toolkit';
import taskReducer from '@/features/tasks/taskSlice';
import summaryReducer from '@/features/summary/summarySlice';

export const store = configureStore({
  reducer: {
    tasks: taskReducer,
    summary: summaryReducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        // AbortController is non-serializable; ignore in summary slice
        ignoredPaths: ['summary.abortController'],
      },
    }),
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;

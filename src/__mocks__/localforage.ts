// Mock for localforage — avoids IndexedDB in test environment
const store: Record<string, unknown> = {};

const localforage = {
  createInstance: () => localforage,
  getItem: jest.fn((key: string) => Promise.resolve(store[key] ?? null)),
  setItem: jest.fn((key: string, value: unknown) => {
    store[key] = value;
    return Promise.resolve(value);
  }),
  removeItem: jest.fn((key: string) => {
    delete store[key];
    return Promise.resolve();
  }),
  clear: jest.fn(() => {
    Object.keys(store).forEach((k) => delete store[k]);
    return Promise.resolve();
  }),
};

export default localforage;

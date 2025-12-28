
// --- Mock Firebase Engine (Persistence via LocalStorage) ---

const MOCK_STORAGE_KEY = 'inventory_master_db';

// Initial Mock Data
const INITIAL_DATA: any = {
  users: {
    'mock-admin-123': {
      full_name: 'System Admin',
      email: 'admin@example.com',
      role: 'admin',
      status: 'active',
      created_at: new Date().toISOString()
    }
  },
  locations: {
    'loc-1': { name: 'Main Warehouse', address: '123 Logistics Way', type: 'Warehouse', status: 'active' },
    'loc-2': { name: 'Downtown Office', address: '456 Business Ave', type: 'Office', status: 'active' }
  },
  items: {},
  inventory: {},
  uoms: {
    'uom-1': { name: 'Piece', abbreviation: 'pc' },
    'uom-2': { name: 'Box', abbreviation: 'bx' }
  },
  categories: {
    'cat-1': { name: 'Electronics', subcategories: ['Laptops', 'Phones'], sort_order: 1 }
  }
};

const getDB = () => {
  const stored = localStorage.getItem(MOCK_STORAGE_KEY);
  return stored ? JSON.parse(stored) : INITIAL_DATA;
};

const saveDB = (data: any) => {
  localStorage.setItem(MOCK_STORAGE_KEY, JSON.stringify(data));
};

// Mock Auth
export const auth = {
  get currentUser() {
    return JSON.parse(localStorage.getItem('mock_auth_user') || 'null');
  }
} as any;

// Fix: Added password parameter to satisfy 3-argument calls in Login and User management
export const signInWithEmailAndPassword = async (authObj: any, email: string, password?: string) => {
  const dbData = getDB();
  const userEntry = Object.entries(dbData.users).find(([_, u]: any) => u.email === email);
  
  // For demo purposes, we'll allow any password for admin@example.com
  if (userEntry) {
    const [uid, user]: any = userEntry;
    const authUser = { uid, email: user.email };
    localStorage.setItem('mock_auth_user', JSON.stringify(authUser));
    // We reload to simulate the redirection behavior of Firebase Auth state change
    window.location.href = '/'; 
    return { user: authUser };
  }
  
  throw { code: 'auth/invalid-credential', message: "Invalid credentials" };
};

// Fix: Added authObj parameter to satisfy calls passing the auth instance
export const signOut = async (authObj?: any) => {
  localStorage.removeItem('mock_auth_user');
  window.location.href = '#/login';
  window.location.reload();
};

// Fix: Added password parameter to satisfy 3-argument calls
export const createUserWithEmailAndPassword = async (authObj: any, email: string, password?: string) => {
  const uid = 'user-' + Math.random().toString(36).substr(2, 9);
  return { user: { uid, email } };
};

export const onAuthStateChanged = (authObj: any, callback: any) => {
  const checkAuth = () => {
    const user = JSON.parse(localStorage.getItem('mock_auth_user') || 'null');
    callback(user);
  };
  
  // Initial check
  checkAuth();
  
  // Simulate an unsubscriber
  return () => {};
};

// Mock Firestore
export const db = {} as any;

export const collection = (dbObj: any, path: string) => path;
export const doc = (dbObj: any, path: string, id: string) => ({ path, id });

export const getDocs = async (collectionPath: string) => {
  const data = getDB();
  const docs = Object.entries(data[collectionPath] || {}).map(([id, val]: any) => ({
    id,
    data: () => val,
    ...val
  }));
  return { docs };
};

export const getDoc = async (docRef: any) => {
  const data = getDB();
  const docData = data[docRef.path]?.[docRef.id];
  return {
    exists: () => !!docData,
    data: () => docData,
    id: docRef.id,
    ...docData
  };
};

export const addDoc = async (collectionPath: string, docData: any) => {
  const data = getDB();
  const id = Math.random().toString(36).substr(2, 9);
  if (!data[collectionPath]) data[collectionPath] = {};
  data[collectionPath][id] = docData;
  saveDB(data);
  return { id };
};

export const setDoc = async (docRef: any, docData: any) => {
  const data = getDB();
  if (!data[docRef.path]) data[docRef.path] = {};
  data[docRef.path][docRef.id] = docData;
  saveDB(data);
};

export const updateDoc = async (docRef: any, docData: any) => {
  const data = getDB();
  if (data[docRef.path]?.[docRef.id]) {
    data[docRef.path][docRef.id] = { ...data[docRef.path][docRef.id], ...docData };
    saveDB(data);
  }
};

export const deleteDoc = async (docRef: any) => {
  const data = getDB();
  if (data[docRef.path]) {
    delete data[docRef.path][docRef.id];
    saveDB(data);
  }
};

// Fix: Updated signatures to accept parameters used by standard Firebase modular SDK calls
export const initializeApp = (config?: any, name?: string) => ({});
export const deleteApp = (app?: any) => ({});
export const getFirestore = (app?: any) => ({});
export const getAuth = (app?: any) => auth;
export const GoogleAuthProvider = class {};
export const googleProvider = new GoogleAuthProvider();

export const firebaseConfig = { apiKey: "mock-key" };
export default {};

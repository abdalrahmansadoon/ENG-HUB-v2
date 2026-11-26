const env = import.meta.env;

export interface FirebaseConfig { apiKey: string; authDomain: string; projectId: string; appId: string }

// إعدادات الويب العامة لمشروع ENG HUB (نفسها المستخدمة في النسخة القديمة). ليست أسراراً:
// الحماية في قواعد Firestore. يمكن تغييرها بمتغيرات VITE_*.
const firebase: FirebaseConfig = {
  apiKey: env.VITE_FIREBASE_API_KEY || 'AIzaSyDWrjLwgj8r5JPWfzbOIAx76MF7ydCLOB8',
  authDomain: env.VITE_FIREBASE_AUTH_DOMAIN || 'eng-hub-5c30a.firebaseapp.com',
  projectId: env.VITE_FIREBASE_PROJECT_ID || 'eng-hub-5c30a',
  appId: env.VITE_FIREBASE_APP_ID || '1:366947709379:web:747b0aba2d08056b734d76',
};

/** VITE_DEMO=true يشغل الموقع ببيانات أمثلة دون أي اتصال بـ Firebase. */
export const firebaseConfig = env.VITE_DEMO === 'true' ? null : firebase;

export const cloudinary = {
  cloudName: env.VITE_CLOUDINARY_CLOUD_NAME || 'bkryyc0o',
  preset: env.VITE_CLOUDINARY_UPLOAD_PRESET || 'eng_hub_unsigned',
};

const env = import.meta.env;

export interface FirebaseConfig { apiKey: string; authDomain: string; projectId: string; appId: string }

const firebase: FirebaseConfig = {
  apiKey: env.VITE_FIREBASE_API_KEY ?? '',
  authDomain: env.VITE_FIREBASE_AUTH_DOMAIN ?? '',
  projectId: env.VITE_FIREBASE_PROJECT_ID ?? '',
  appId: env.VITE_FIREBASE_APP_ID ?? '',
};
const filled = Object.values(firebase).filter(Boolean).length;

export const firebaseConfig = filled === 4 ? firebase : null;
/** إعداد ناقص: نعرض خطأ واضحاً بدل التحول بصمت إلى الوضع التجريبي. */
export const partialConfig = filled > 0 && filled < 4;
export const cloudinary = {
  cloudName: env.VITE_CLOUDINARY_CLOUD_NAME ?? '',
  preset: env.VITE_CLOUDINARY_UPLOAD_PRESET ?? '',
};

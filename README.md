# ENG HUB

منصة دراسة لطلاب هندسة القاهرة: مهام يومية، مواد ومحتوى، شات، واختبارات. واجهة عربية وإنجليزية، فاتحة وداكنة، تبدأ من الهاتف.

React + TypeScript + Vite، مع Firebase (الدخول وقاعدة البيانات) وCloudinary (الملفات)، والنشر على GitHub Pages.

## التشغيل المحلي

يتطلب Node.js 24.

```bash
npm install
npm run dev
```

دون إعداد Firebase يعمل الموقع في **الوضع التجريبي**: دخول كمشرف أو طالب، وبيانات أمثلة تُحفظ في المتصفح فقط.

## ربط Firebase (مشروع جديد)

1. من [Firebase Console](https://console.firebase.google.com) أنشئ مشروعاً، ثم أضف **Web app** وانسخ `apiKey` و`authDomain` و`projectId` و`appId`.
2. من **Authentication > Sign-in method** فعّل **Email/Password** و**Google**.
3. من **Authentication > Settings > Authorized domains** أضف `abdalrahmansadoon.github.io`.
4. من **Firestore Database** أنشئ قاعدة بيانات في وضع الإنتاج.
5. من تبويب **Rules** الصق محتوى ملف [`firestore.rules`](firestore.rules) ثم **Publish**.
6. سجّل في الموقع بحسابك، ثم من Firestore أنشئ مجموعة `admins` وفيها مستند **معرّفه بريدك** (بأحرف صغيرة كما يظهر في Authentication) وبه حقل `active` من نوع boolean وقيمته `true`.
7. الحساب المسجل بالبريد وكلمة المرور يجب أن يؤكد بريده قبل أن يصبح مشرفاً، ثم يخرج ويدخل من جديد. حساب Google مؤكد تلقائياً.
8. بصفتك مشرفاً: افتح **المواد** واضغط **إضافة مواد إعدادي ترم أول السبع**.

لا حاجة إلى فهارس مركبة ولا Storage ولا Cloud Functions.

## النشر على GitHub Pages

1. **Settings > Pages > Source:** اختر **GitHub Actions**.
2. **Settings > Secrets and variables > Actions > Variables** أضف:

| المتغير | القيمة |
|---|---|
| `VITE_FIREBASE_API_KEY` | `apiKey` |
| `VITE_FIREBASE_AUTH_DOMAIN` | `authDomain` |
| `VITE_FIREBASE_PROJECT_ID` | `projectId` |
| `VITE_FIREBASE_APP_ID` | `appId` |
| `VITE_CLOUDINARY_CLOUD_NAME` | اسم السحابة (في مشروعك القديم: `bkryyc0o`) |
| `VITE_CLOUDINARY_UPLOAD_PRESET` | preset من نوع Unsigned (في مشروعك القديم: `eng_hub_unsigned`) |

3. من **Actions** شغّل **Deploy to GitHub Pages**، أو ادفع أي تعديل إلى `main`.

للتشغيل المحلي مع Firebase انسخ `.env.example` إلى `.env.local` واملأه.

## حدود هذه النسخة

- أي شخص يعرف الرابط يستطيع إنشاء حساب ورؤية المحتوى والشات وأسماء الأعضاء. لا توجد موافقة على الأعضاء بعد.
- إشعارات المهام تصل ما دام الموقع مفتوحاً فقط. الإشعارات والموقع مغلق تحتاج إلى خادم.
- الاختبار بمحاولة واحدة ويمكن للمشرف السماح بإعادتها. لا يوجد تعديل للأسئلة بعد الإنشاء.
- روابط Cloudinary عامة لمن يملكها، فلا ترفع ملفات خاصة. اضبط الصيغ والحجم داخل الـ preset.
- قواعد Firestore لم تُختبر على محاكي Firebase بعد.

## بنية الشيفرة

| المسار | المحتوى |
|---|---|
| `src/data` | واجهة البيانات وتنفيذاها: Firestore والتجريبي |
| `src/features` | صفحة لكل ميزة |
| `src/features/subjects/VideoPlayer.tsx` | مشغل الفيديو، معزول لتستبدله بمشغلك |
| `src/ui` | المكونات المشتركة |
| `src/styles/app.css` | كل التنسيق في ملف واحد |

```bash
npm test          # اختبارات المنطق
npm run build     # فحص الأنواع والبناء
```

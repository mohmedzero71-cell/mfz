# mfz

ملف README تم إنشاؤه تلقائياً.

== تعليمات بعد النشر ==

1) صفحة GitHub Pages ستظهر على:
   https://mohmedzero71-cell.github.io/mfz
   — قد تحتاج بضع دقائق بعد رفع الملفات لبدء التفعيل.

2) الخطوة التالية المهمة: ربط المشروع بـ Firebase
   - أنشئ مشروع Firebase (إن لم يكن موجودًا) وادخل إلى Settings -> Your apps -> Add app -> Web
   - انسخ كائن `firebaseConfig` والصقه في ملف `app.js` مكان الحقول المؤقتة (YOUR_API_KEY...)

3) إنشاء مستند إغلاق التصويت في Firestore:
   - اذهب إلى Firestore -> Collections -> Add collection -> name: config
   - Add document -> Document ID: election
   - Add field: closeTime (type: Timestamp) value: 2026-07-03T15:00:00Z

4) قواعد الأمان: انسخ محتوى `firebase.rules` إلى Firestore Rules ثم انشرها.

5) بعد وضع firebaseConfig في app.js وتحديث الملف في المستودع، ستكون الصفحة جاهزة للتصويت.


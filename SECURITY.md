# Security notes / ملاحظات الأمان

This document lists **manual steps in the Supabase dashboard**. They are not applied by this pull request. Do not put secrets in git.

يسرد هذا الملف **خطوات يدوية في لوحة تحكم Supabase**. هذا الطلب لا يطبّقها تلقائياً. لا تضع أسرار أو مفاتيح في Git.

---

## English

1. **Site URL and reset redirect**
   - Open the Supabase project → **Authentication** → **URL Configuration**.
   - Set **Site URL** to `https://nexus-global-franchise.vercel.app`.
   - Add this **Redirect URL**: `https://nexus-global-franchise.vercel.app/reset-password`.
   - Keep any existing confirmation redirect such as `https://nexus-global-franchise.vercel.app/login` if email confirmation is enabled.

2. **Minimum password length**
   - In **Authentication** → **Providers** (Email) or password settings, raise the minimum password length to **at least 10 characters**.
   - The app now also requires letters and numbers on signup, reset, and change-password forms. Existing accounts can still sign in with their current password, then change it in **Account**.

3. **Leaked-password protection**
   - Enable **HaveIBeenPwned / leaked password protection** so new and changed passwords that appeared in known breaches are rejected.

4. **Multi-factor authentication (MFA)**
   - Enable MFA (TOTP) in **Authentication** settings.
   - Ask administrators to enroll MFA after it is enabled. Phase 3 adds an in-app TOTP enrollment/verify UI at `/account`. If an admin has MFA enrolled, `/admin` requires AAL2.

5. **Auth rate limits and CAPTCHA**
   - Review **Authentication** rate limits for sign-in, sign-up, and password recovery.
   - Enable CAPTCHA (for example hCaptcha or Cloudflare Turnstile) on auth forms in the Supabase dashboard if available on your plan.

6. **Admin RPC security**
   - In the SQL Editor, inspect `is_nexus_admin` and `nexus_admin_list_users`.
   - Confirm each function is `SECURITY DEFINER`.
   - Confirm each function checks the caller (for example `auth.uid()` against an admin list) before returning data.
   - Revoke execute from `anon` (and from `public` if it is granted). Grant execute only to `authenticated`, or a tighter role if you use one.
   - Example check:
     ```sql
     select n.nspname, p.proname, p.prosecdef,
            pg_get_functiondef(p.oid)
     from pg_proc p
     join pg_namespace n on n.oid = p.pronamespace
     where p.proname in ('is_nexus_admin', 'nexus_admin_list_users');
     ```

7. **After a password change**
   - Update the saved password in Google Password Manager.
   - Change the same password on any other site where it was reused.
   - In Supabase **Authentication** → **Users**, sign the user out of other sessions if that option is available.

The application now uses cookie-based sessions (`@supabase/ssr`) and middleware that sends unauthenticated visitors away from `/dashboard`, `/admin`, and `/account`. Keep the Vercel env var **names** as `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY`.

---

## العربية

1. **رابط الموقع وإعادة التوجيه لإعادة التعيين**
   - افتح مشروع Supabase ← **Authentication** ← **URL Configuration**.
   - ضع **Site URL** على `https://nexus-global-franchise.vercel.app`.
   - أضف **Redirect URL**: `https://nexus-global-franchise.vercel.app/reset-password`.
   - أبقِ رابط تأكيد البريد مثل `https://nexus-global-franchise.vercel.app/login` إذا كان تأكيد البريد مفعّلاً.

2. **الحد الأدنى لطول كلمة المرور**
   - في إعدادات البريد/كلمة المرور ارفع الحد الأدنى إلى **10 أحرف على الأقل**.
   - التطبيق يطلب الآن حروفاً وأرقاماً عند إنشاء الحساب وإعادة التعيين وتغيير الكلمة. الحسابات الحالية تستطيع تسجيل الدخول بكلمتها الحالية ثم تغييرها من صفحة الحساب.

3. **حماية كلمات المرور المسربة**
   - فعّل حماية كلمات المرور المسربة (HaveIBeenPwned) حتى تُرفض الكلمات التي ظهرت في تسريبات معروفة.

4. **المصادقة الثنائية (MFA)**
   - فعّل MFA (TOTP) من إعدادات المصادقة.
   - اطلب من المشرفين تفعيلها بعد تشغيلها. المرحلة 3 تضيف واجهة تسجيل/تحقق TOTP في `/account`. إذا كان المشرف قد فعّل MFA، تتطلب `/admin` مستوى AAL2.

5. **حدود المعدل وCAPTCHA**
   - راجع حدود معدل تسجيل الدخول والتسجيل واستعادة الكلمة.
   - فعّل CAPTCHA على نماذج المصادقة إن كان متاحاً في خطتك.

6. **أمان دوال المشرف**
   - في محرر SQL افحص الدالتين `is_nexus_admin` و `nexus_admin_list_users`.
   - تأكد أنهما `SECURITY DEFINER`.
   - تأكد أن كل دالة تتحقق من هوية المستدعي قبل إرجاع البيانات.
   - اسحب صلاحية التنفيذ من `anon` (ومن `public` إن وُجدت)، واتركها لـ `authenticated` فقط أو لدور أضيق.
   - مثال للفحص:
     ```sql
     select n.nspname, p.proname, p.prosecdef,
            pg_get_functiondef(p.oid)
     from pg_proc p
     join pg_namespace n on n.oid = p.pronamespace
     where p.proname in ('is_nexus_admin', 'nexus_admin_list_users');
     ```

7. **بعد تغيير كلمة المرور**
   - حدّث الكلمة المحفوظة في مدير كلمات مرور قوقل.
   - غيّرها في أي موقع آخر استخدمت فيه نفس الكلمة.
   - من مستخدمي Supabase، أنهِ الجلسات الأخرى إن توفّر الخيار.

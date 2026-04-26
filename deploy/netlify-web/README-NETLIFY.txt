TURKA Arsa Analiz — iOS / Safari (Netlify) paketi
================================================

Bu klasör APK veya mobile/ ile karışmaz. Android derlemesi: yine mobile/ kullanın.

GitHub’a ne yüklenir?
---------------------
• Tum repo (onerilen): index.html, boundaries/, deploy/netlify-web/ vb.
  Netlify’da “Base directory” = deploy/netlify-web

• Sadece bu paketi taşıyorsanız: sync’i kendi bilgisayarınızda çalıştırıp üretilen
  dosyaları da commit etmeniz gerekir (önerilmez). Monorepo + aşağıdaki Netlify
  ayarı daha temizdir.

Bu klasörde Git’te KALAN dosyalar
---------------------------------
• netlify.toml
• scripts/sync-from-parent.mjs
• README-NETLIFY.txt
• .gitignore

Netlify ayarları
----------------
1. Site → Add from Git → GitHub repo
2. Base directory: deploy/netlify-web
3. Build command: (netlify.toml içindeki gibi) node scripts/sync-from-parent.mjs
4. Publish directory: . (nokta)
5. Deploy: her push’ta repo kökündeki index.html kopyalanır → Netlify index.html güncel kalır

Firebase
--------
Authentication → Authorized domains → siteniz.netlify.app ekleyin.

iPhone
------
Safari’de siteyi açın → Paylaş → Ana Ekrana Ekle.

Yerel test (isteğe bağlı)
-------------------------
Repo kökünden:
  cd deploy/netlify-web
  node scripts/sync-from-parent.mjs
Sonra bir http sunucusu ile bu klasörü servis edin.

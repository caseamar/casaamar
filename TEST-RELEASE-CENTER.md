# Test Release Center

Release: v2026.07.24.80
Worker: 13.1-platform-status-timestamps

## 1. Klargør udgivelse
1. Lav mindst én lokal ændring.
2. Gå til Mission Control → Udgivelsescenter.
3. Klik **Saml filer til GitHub**.
4. Kontrollér:
   - udgivelses-id vises
   - platformversion vises
   - indholdsversion vises
   - præcist antal filer vises
   - alle filnavne listes
   - baseline GitHub-commit vises
5. Kontrollér at den downloadede mappe indeholder præcis samme antal filer.

## 2. Ingen GitHub-upload
1. Vent mindst to minutter uden upload.
2. Kontrollér beskeden om, at GitHub endnu ikke er opdateret.
3. Vælg **Jeg er i gang – vent videre**.
4. Gentag uden upload.
5. Efter to påmindelser skal platformen antage, at uploaden er udskudt, uden at slette arbejdet.

## 3. GitHub og Cloudflare
1. Upload præcis det viste antal filer til GitHub og commit.
2. Kontrollér at Mission Control opdager et commit, der er nyere end baseline.
3. Status skal skifte til Cloudflare/opdaterer.
4. Når `content-release.json` med forventet content_version er live:
   - status bliver Live
   - workspace nulstilles
   - ændringsopgaven forsvinder
   - udgivelseskvitteringen bevares
   - platformversionen, som lavede udgivelsen, fremgår

## 4. Sen upload
1. Sæt en udgivelse på pause med **Jeg gør det senere**.
2. Upload senere.
3. Åbn Mission Control igen eller klik **Kontrollér status nu**.
4. Platformen skal stadig kunne opdage og bekræfte udgivelsen.

# Upload Manager – hurtig test

Release: v2026.07.24.67
Worker: 11.7-upload-manager-runtime-fix

1. Upload alle filer fra releasen til GitHub og vent på Cloudflare deployment.
2. Åbn `/asset-studio.html` og lav `Ctrl + F5`.
3. Bekræft teksten:
   `Uploadfeltet er klar · Klik og drag-and-drop er aktiveret.`
4. Klik i det stiplede uploadfelt.
   - Windows-filvælgeren skal åbne.
5. Annullér filvælgeren.
6. Træk ét JPG- eller PNG-billede ind i feltet.
   - Feltet skal blive grønt under drag.
   - Billedet skal vises som thumbnail i uploadkøen.
7. Klik **Ryd valgte filer**.
8. Vælg billedet igen og klik **Upload og behandl billeder**.
9. Kontrollér:
   - uploadlog vises
   - filen lander i `images/library`
   - Asset Object oprettes
   - AI-analyse starter
   - relation scan følger efter

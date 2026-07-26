# Test automatisk platformopdatering

Release: v2026.07.24.75
Worker: 12.5-auto-platform-refresh

## Test 1 – siden åbnes efter deployment
1. Hav Mission Control åbent på den tidligere version.
2. Upload denne release til GitHub og vent på grøn Cloudflare-deployment.
3. Lad Mission Control-fanen stå åben.
4. Senest 30 sekunder efter deployment skal platformen:
   - opdage `v2026.07.24.75`
   - vise en kort besked om den nye version
   - genindlæse siden automatisk
   - vise `v2026.07.24.75` uden F5

## Test 2 – fanen er i baggrunden
1. Hav Mission Control åbent.
2. Gå til en anden browserfane.
3. Deploy en nyere testversion.
4. Gå tilbage til Mission Control.
5. Platformen skal straks kontrollere versionen og genindlæse automatisk.

## Test 3 – almindelig genindlæsning
1. Tryk F5 på Mission Control.
2. Den aktuelle version skal vises med det samme.
3. Faneskift må ikke være nødvendigt.

## Test 4 – offentlig hjemmeside
Gentag test 1 og 2 på den offentlige hjemmeside.

## Sikkerhed
- Autosavede ændringer ligger i localStorage og overlever genindlæsningen.
- Automatisk genindlæsning foretages kun, når platformversionen faktisk ændres.
- Der vises kun én opdateringsbesked pr. registreret versionsskift.

# Casa Amar – opdatering uden nye billeder

Denne opdatering genbruger udelukkende de billeder, der allerede blev uploadet med Casa Amar v2.

## Der skal ikke uploades billeder

Mappen `images` i GitHub skal ikke ændres.

## Filer der skal erstattes

I roden af:

`caseamar/casaamar`

skal du erstatte:

- `index.html`
- `style.css`
- `script.js`

## Hvad opdateringen gør

- langsomt billedskift i hero
- billedskift ved stueetagen
- billedskift på patioen
- billedskift på tagterrassen
- galleri med klik-for-stort-billede
- samme eksisterende v2-billedfiler genbruges

## Commit-besked

`Add dynamic galleries using existing Casa Amar images`

## Cloudflare-kontrol

1. Cloudflare → `Workers & Pages` → `casaamarv2` → `Deployments`
2. Vent på grøn status
3. Åbn `https://casaamarv2.pages.dev`
4. Tryk `Ctrl + F5`

## Rollback

Gendan de tre filer fra commit'et før:

`Add dynamic galleries using existing Casa Amar images`

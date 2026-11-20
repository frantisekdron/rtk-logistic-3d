# Model areálu a reference

Aktualizace 20. 11. 2026.

## Podoba areálu

Model vychází z fotografií původního webu RTK, zachovaných v `puvodni/img/header-motiv5.jpg` a `header-motiv1.jpg`. Přejaté charakteristické prvky: dvě sedlové střechy, světlé opláštění, modré lemování a vrata, souvislý horní pás oken, nízká boční křídla a zeleň před fasádou. Rozměry, vnitřní regály, dopravní trasy a animované děje jsou stylizací; model není geodetickým ani provozním digitálním dvojčetem.

## Partneři

Pás referencí po aktualizaci podle RTK zahrnuje BAUHAUS, OBI, HORNBACH, Globus, baumax a UNI HOBBY. Zdroje použitých log jsou v souboru `partner-logos.md`.

## Provoz a úpravy

GitHub Pages publikuje kořen větve `main`. Model automaticky přehrává příjezd, nakládku a odjezd. Kliknutí na zelený kamion nebo jeho bublinu přiblíží rampu a zahájí nakládku. Po druhém kliknutí kamion odjede. Stejný postup funguje klávesnicí a bez WebGL. Pohyb vozidel i pracovníků se počítá v každém snímku. Záložní vykreslování bez WebGL používá nasvícené pozadí skladu a dopočítává pohybující se části stejného 3D modelu. Při zapnutém omezení pohybu se scéna sama nehýbe a mezi fázemi přechází ihned.

Kontrola logiky: `node tests/operations.mjs`. Ručně spustitelný GitHub workflow kontroluje publikovaný web v desktopovém, mobilním a záložním režimu.

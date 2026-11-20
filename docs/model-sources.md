# Model areálu a reference

Aktualizace 20. 11. 2026.

## Podoba areálu

Model vychází z fotografií původního webu RTK, zachovaných v `puvodni/img/header-motiv5.jpg` a `header-motiv1.jpg`. Přejaté charakteristické prvky: dvě sedlové střechy, světlé opláštění, modré lemování a vrata, souvislý horní pás oken, nízká boční křídla a zeleň před fasádou. Rozměry, vnitřní regály, dopravní trasy a animované děje jsou stylizací; model není geodetickým ani provozním digitálním dvojčetem.

## Partneři

BAUHAUS, OBI, Baumax, Hornbach, Globus a Tesco jsou výslovně uvedeny v původní stránce RTK „Servis DIY“, zachované v `puvodni/servis-diy.html` (oddíl DIY). Pás používá originální SVG loga z oficiálních českých webů partnerů, viz `partner-logos.md`. Historický seznam sám nepotvrzuje trvání všech smluv k dnešnímu dni.

## Provoz a úpravy

GitHub Pages publikuje kořen větve `main`. Model automaticky přehrává příjezd, nakládku a odjezd. Kliknutí na žlutý kamion nebo jeho bublinu přiblíží rampu a zahájí nakládku. Po druhém kliknutí kamion odjede. Stejný postup funguje klávesnicí a bez WebGL. Záložní animace používá 168 předrenderovaných snímků téhož modelu. Při zapnutém omezení pohybu se scéna sama nehýbe a mezi fázemi přechází ihned.

Kontrola logiky: `node tests/operations.mjs`. Ručně spustitelný GitHub workflow kontroluje publikovaný web v desktopovém, mobilním a záložním režimu.

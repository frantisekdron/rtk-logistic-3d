# Model areálu a reference

Aktualizace 20. 11. 2026.

## Podoba areálu

Model vychází z fotografií původního webu RTK, zachovaných v `puvodni/img/header-motiv5.jpg` a `header-motiv1.jpg`. Přejaté charakteristické prvky: dvě sedlové střechy, světlé opláštění, modré lemování a vrata, souvislý horní pás oken, nízká boční křídla a zeleň před fasádou. Rozměry, vnitřní regály, dopravní trasy a animované děje jsou stylizací; model není geodetickým ani provozním digitálním dvojčetem.

## Partneři

BAUHAUS, OBI, Baumax, Hornbach, Globus a Tesco jsou výslovně uvedeny v původní stránce RTK „Servis DIY“, zachované v `puvodni/servis-diy.html` (oddíl DIY). Značky v novém pásu jsou vysázené jako text; nejde o oficiální logotypové soubory. Historický seznam sám nepotvrzuje trvání všech smluv k dnešnímu dni.

## Provoz a úpravy

GitHub Pages publikuje kořen větve `main`. Aktivní zdroje jsou `scene/model.js` a `scene/scene.js` (ES moduly); starý `rtk-3d.js` již stránka nenačítá. Běží 42sekundový ilustrační cyklus. Fáze lze zvolit ručně, pohyb pozastavit, střechu skrýt, model otáčet a zvětšit. Systémové omezení pohybu se respektuje při načtení; výslovné zvolení fáze animaci spustí. Bez WebGL se zobrazí skutečná fotografie areálu a ovládání 3D je vypnuté.

Kontrola logiky: `node tests/operations.mjs`. Ručně spustitelný GitHub workflow kontroluje publikovaný web v desktopovém, mobilním a záložním režimu.

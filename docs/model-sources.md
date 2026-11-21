# Model areálu a reference

Aktualizace 20. 11. 2026.

## Podoba areálu

Model vychází z fotografií původního webu RTK, zachovaných v `puvodni/img/header-motiv5.jpg` a `header-motiv1.jpg`. Přejaté charakteristické prvky: dvě sedlové střechy, světlé opláštění, modré lemování a vrata, souvislý horní pás oken, nízká boční křídla a zeleň před fasádou. Rozměry, vnitřní regály, dopravní trasy a animované děje jsou stylizací; model není geodetickým ani provozním digitálním dvojčetem.

## Partneři

Pás referencí po aktualizaci podle RTK zahrnuje BAUHAUS, OBI, HORNBACH, Globus, baumax a UNI HOBBY. Zdroje použitých log jsou v souboru `partner-logos.md`.

## Provoz a úpravy

GitHub Pages publikuje kořen větve `main`. Areál je vytvořený v `scene/model.js`. Úvodní film v `scene/film/` obsahuje 630 snímků (21 sekund, 30 sn./s). Přehrává se přímo v prohlížeči, včetně animované obrazové alternativy při zakázaném videu nebo JavaScriptu. V interaktivním režimu kliknutí na kamion přihlásí nakládku. U rampy do odjezdu běží samostatná smyčka pracovníků a okolní dopravy. Systémové omezení pohybu nabídne tlačítko pro výslovné spuštění. Přímý přehrávač je na `scene/film/provoz.mp4`.

Kontrola logiky modelu: `node tests/operations.mjs`. Ručně spustitelný GitHub workflow porovnává snímky zveřejněné stránky v Chromu i WebKitu a ověřuje nakládku, odjezd, přístupnost a záložní přehrávání.

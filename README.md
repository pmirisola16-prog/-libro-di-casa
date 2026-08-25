# Libro di Casa — guida completa

Segui questi passaggi in ordine. In totale ci vogliono circa 30-40 minuti, una volta sola.

---

## PARTE 1 — Crea il database condiviso (Firebase, gratis)

1. Vai su https://console.firebase.google.com e accedi con un account Google
2. Clicca **Aggiungi progetto**, dagli un nome (es. `libro-di-casa`), continua fino a fine creazione
3. Nel menu a sinistra vai su **Build → Firestore Database** → **Crea database**
4. Scegli **Avvia in modalità di test** (i dati saranno leggibili/scrivibili senza login per 30 giorni — va bene per uso privato tra voi due; dopo i 30 giorni si può rinnovare la regola in 1 minuto, spiegato sotto)
5. Torna alla home del progetto, clicca l'icona **`</>`** (Aggiungi app Web), dai un nome (es. `libro-casa-web`), **non** serve Firebase Hosting
6. Copia l'oggetto `firebaseConfig` che ti mostra — servirà tra poco

### Rinnovare le regole (dopo i 30 giorni, o subito per sicurezza)
Vai su **Firestore Database → Regole** e incolla:
```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /ledger/{doc} {
      allow read, write: if true;
    }
  }
}
```
Clicca **Pubblica**. (Nota: questo lascia il database aperto a chi conosce l'URL del progetto — sufficiente per un uso privato in famiglia; non condividere il link del sito pubblicamente.)

---

## PARTE 2 — Inserisci le chiavi Firebase nel progetto

1. Apri il file `firebase-config.js` con un editor di testo (anche TextEdit va bene)
2. Sostituisci i valori `INSERISCI_...` con quelli copiati dalla console Firebase
3. Salva il file

---

## PARTE 3 — Metti il sito online (GitHub Pages, gratis)

1. Crea un account su https://github.com se non lo hai già
2. Vai su https://github.com/new, chiama il repository `libro-di-casa`, impostalo **Public** (necessario per GitHub Pages gratuito), crea
3. Apri il **Terminale** sul Mac:

```bash
cd ~/Desktop/gestionale-pwa
git init
git add .
git commit -m "primo commit"
git branch -M main
git remote add origin https://github.com/TUONOME/libro-di-casa.git
git push -u origin main
```

4. Su GitHub, vai su **Settings → Pages**
5. In **Source** scegli **Deploy from a branch**, branch `main`, cartella `/ (root)` → **Save**
6. Dopo 1-2 minuti il sito sarà live su:
   `https://TUONOME.github.io/libro-di-casa/`

Apri quel link dal telefono: dovrebbe funzionare e i dati essere condivisi tra te e Marianna in tempo reale.

---

## PARTE 4 — Genera il file .apk (PWABuilder)

1. Vai su https://www.pwabuilder.com
2. Incolla l'URL del tuo sito (`https://TUONOME.github.io/libro-di-casa/`) e clicca **Start**
3. PWABuilder analizza il sito (verifica manifest, service worker, icone — sono già tutti pronti in questo progetto)
4. Clicca **Package for stores** → scegli **Android**
5. Lascia le impostazioni di default (o personalizza nome pacchetto, es. `com.pietromarianna.librodicasa`)
6. Scarica il pacchetto generato: conterrà un file **.apk** (o **.aab**) pronto da installare

## PARTE 5 — Installa l'apk sul telefono

1. Trasferisci il file `.apk` sul telefono Android (email, Drive, cavo USB)
2. Aprilo dal telefono: Android chiederà di autorizzare "Installa da fonti sconosciute" — è normale per un apk non scaricato dal Play Store, si può abilitare da Impostazioni al volo
3. Installa: comparirà l'icona **Libro di Casa** come una vera app

*Nota: iPhone non supporta l'installazione di apk (non è un sistema Android). Su iPhone la via è: apri il sito da Safari → Condividi → "Aggiungi a schermata Home" — il risultato visivo è identico a un'app installata.*

---

## Aggiornare l'app in futuro

Se in futuro vuoi modificare qualcosa (nuova categoria, nuovo conto, ecc.), modifica i file e rilancia:
```bash
git add .
git commit -m "aggiornamento"
git push
```
GitHub Pages si aggiorna automaticamente in 1-2 minuti. Se hai già generato l'apk, il sito si aggiorna comunque (l'apk è solo un "involucro" che apre il sito web).

# bubble-rooms-card — design spec

## Problema

`motion_rooms_card.yaml` genera le card stanza con `custom:auto-entities` +
`filter.template`. Il template Jinja ricostruisce l'intero array di card ad
ogni valutazione (periodica, non solo al click), quindi Lovelace distrugge e
ricrea i nodi DOM di ogni `bubble-card`/`ha-card` a ogni giro. Per ~30-40ms il
nodo nuovo mostra lo stile di default di Home Assistant (bordo scuro 3px)
prima che lo stile custom (via `card_mod`/`styles`) venga applicato — un
flash visibile sulle card con background opaco (misurato via browser:
sequenza NEW_NODE → `border: 0px none rgb(26,29,46)` → `border: 3px solid
rgb(26,29,46)` → stile finale, in una finestra di ~40ms, ripetuta ogni
5-6s indipendentemente dai click).

## Obiettivo

Un custom Lovelace card, `bubble-rooms-card`, che riproduce lo stesso
risultato visivo (una card per stanza con sensore movimento, sub-button per
luci/tapparelle, palette e transizioni identiche a oggi, ordinamento per
stato-poi-recenza) senza mai distruggere/ricreare i nodi `bubble-card` a ogni
aggiornamento di stato.

## Architettura

- Custom element `bubble-rooms-card`, registrato come `custom:bubble-rooms-card`.
- File singolo, vanilla JS (nessun build step: niente TypeScript/webpack, un
  file caricabile direttamente come risorsa Lovelace).
- Dipendenza runtime: solo `bubble-card` (>= 3.2.3). Nessuna dipendenza da
  `card_mod` — lo styling viene passato direttamente nel campo nativo
  `styles` della config di `bubble-card`.

### Repo (HACS)

```
bubble-rooms-card/
  hacs.json
  README.md
  dist/bubble-rooms-card.js   # file caricato da HACS/Lovelace
  src/bubble-rooms-card.js    # sorgente, identico a dist/ (no build step)
```

Repo pubblico su GitHub, account `portbusy`, nome `bubble-rooms-card`,
installabile in HACS come "custom repository" (categoria: Lovelace).

## Configurazione

```yaml
type: custom:bubble-rooms-card
label: gruppo_movimento_stanza        # default
name_strip_prefix: "Sensori movimento "
exclude_entities:                     # sostituisce i `reject('match', ...)` hardcoded oggi
  - light.luci_sala
  - cover.tapparella_camera_sx
```

Colori/transizioni (miele per luci accese, ardesia per tapparelle, 0.45s /
180s) restano hardcoded come default nel componente — stessa palette di
oggi, non esposta a config in questa v1 (YAGNI: nessuno l'ha chiesta).

## Data flow

**Al primo `set hass(hass)`:**
1. Risolvo le entità con il label configurato leggendo `hass.entities` /
   `hass.areas` (equivalente JS di `label_entities()` / `area_entities()` di
   Jinja).
2. Per ogni entità motion, creo **una sola volta** un'istanza reale
   `<bubble-card>` via `(await loadCardHelpers()).createCardElement(config)`,
   la tengo in una `Map(entity_id → elemento)`, e la appendo dentro un
   contenitore interno `display: grid`.

**Ad ogni `set hass(hass)` successivo:**
1. Ricalcolo lo stesso set di stanze (di norma invariato).
2. Per ogni stanza già presente in `Map`: aggiorno solo `el.hass = hass` e
   `el.setConfig(nuovaConfig)` sull'istanza **persistente** — bubble-card fa
   il proprio re-render incrementale, senza distruggere `ha-card`. Questo
   elimina il FOUC.
3. Calcolo l'ordine (stato `on` prima, poi `last_changed` decrescente) e lo
   scrivo come `style.order` sul wrapper della card — CSS Grid la riordina
   visivamente senza mai toccare il DOM.
4. Se una stanza compare/sparisce (sensore con label aggiunto/rimosso — raro)
   creo/rimuovo l'elemento corrispondente in `Map`.

Ogni config passata al child `bubble-card` include lo stesso campo `styles`
di oggi (stessa stringa CSS, stessi colori/transizioni/sub_button), tradotto
1:1 da Jinja a JS.

## Error handling

- Nessuna entità trovata per il label configurato → messaggio inline
  "Nessuna stanza trovata per label `<label>`" invece di card vuota.
- `bubble-card` non registrato/non installato → `createCardElement` in
  try/catch, messaggio inline "richiede bubble-card, installalo da HACS".

## Testing

Nessun framework di test automatico (card Lovelace singola, non ha senso un
test runner dedicato). Verifica manuale: caricare il file come risorsa sulla
dashboard di test, cliccare luci/tapparelle in tutte le stanze, confermare
via browser devtools (stessa tecnica di misura usata in fase di debug) che
non ci sia più flash e che l'ordinamento (attivo prima, poi recenza) resti
corretto.

## Compatibilità verificata

- Bubble Card v3.2.3 (ultima stabile): nessuna breaking change nella config
  API (`styles`, `sub_button`) rilevante per questo componente.
- Home Assistant 2026.7: unica breaking change frontend riguarda dimensioni
  `ha-button`/`ha-slider` (non usati qui) e regole di rigenerazione delle
  *strategies* (non applicabile, non è una strategy). `hass.entities`,
  `hass.areas`, `loadCardHelpers`/`createCardElement` restano stabili.

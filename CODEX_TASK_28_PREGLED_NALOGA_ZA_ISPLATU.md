# CODEX_TASK_28_PREGLED_NALOGA_ZA_ISPLATU

## Cilj

Implementirati desktop ekran "Pregled naloga za isplatu" prema dokumentu `CODEX_FULL_PREGLED_NALOGA_ZA_ISPLATU.md`, uz minimalan patch i bez promene postojece poslovne logike.

## Obuhvat

- Aktivna navigacija: "Nalozi za isplatu".
- KPI kartice za ukupan broj, cekanje isplate, isplacene, odbijene, ponistene i naloge u obradi.
- Filteri: period, pretraga, blagajna, valuta, status.
- Tabela naloga sa selekcijom reda.
- Desni panel: detalji naloga, tok naloga, povezani dokumenti i akcije.
- Akcije koriste postojece backend tokove: izdavanje, odbijanje, izvrsenje isplate.

## Pravila

- Ne menjati ekran "Novi nalog za isplatu".
- Ne menjati strukturu baze.
- Ne uklanjati postojece funkcije ni event handlere.
- Ako podatak ne postoji u backend rezultatu, prikazati dostupno i obeleziti kao nedostupno/TODO u UI ili kodu.

## Kontrola

- Ekran se otvara bez JavaScript gresaka.
- Filteri menjaju listu.
- Klik na red menja desni panel.
- Odbijanje trazi razlog.
- Oznacavanje kao isplacen trazi potvrdu.
- Vec isplacen nalog ne moze ponovo da se oznaci kao isplacen.
- Postojeci ekrani Smene, Presek stanja i Novi nalog za isplatu ostaju dostupni.

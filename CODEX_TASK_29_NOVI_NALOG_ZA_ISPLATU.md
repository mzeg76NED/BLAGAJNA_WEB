# CODEX_TASK_29_NOVI_NALOG_ZA_ISPLATU

## Cilj

Implementirati ekran "NOVI NALOG ZA ISPLATU" prema dokumentu `CODEX_FULL_NOVI_NALOG_ZA_ISPLATU.md`, uz minimalan patch i bez promene poslovne logike izvrsenja isplate.

## Pravila

- Nalog za isplatu ne menja stanje blagajne.
- Stanje se menja tek kada blagajnik izvrsi nalog kroz postojeci workflow.
- Ekran "Pregled naloga za isplatu" se menja samo toliko da dugme "+ Novi nalog za isplatu" otvara novi ekran.
- Prilozi su lokalno/mock stanje dok se ne povezu sa dokument upload backendom.

## Implementacija

- Dodati novu desktop sekciju `d-section-nalog-novi`.
- Dodati formu: osnovni podaci, podaci za isplatu, napomena, prilozi, aktivnosti.
- Dodati desni panel: sazetak, status/tok, pravila, akcije.
- `Sacuvaj nacrt` koristi `apiCreateDirectPaymentOrder`.
- `Izdaj nalog` kreira nacrt ako nije kreiran, zatim koristi `apiIssuePaymentOrder`.
- `Ponisti` vraca na pregled uz potvrdu ako ima promena.

## Kontrola

- Otvaranje ekrana bez JS greske.
- Light i dark mode citljivi.
- Validacije obaveznih polja rade.
- Sazetak se azurira pri promeni forme.
- Prilozi se mogu dodati/ukloniti lokalno.
- Pregled naloga, Smene i Presek stanja ostaju dostupni.

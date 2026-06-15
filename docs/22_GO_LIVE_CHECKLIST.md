# Go-Live Checklist

## System Setup

- [ ] Google Sheet baza je kreirana
- [ ] `initializeDatabase()` je izvršen
- [ ] `ENVIRONMENT` je podešen na `PILOT`
- [ ] `DEBUG_MODE` je `false`
- [ ] `validateSystemSetup()` je pokrenut
- [ ] `validateNoDangerousDefaults()` nema blokirajuće greške

## Users And Roles

- [ ] Svi pilot korisnici su stvarni Google Workspace nalozi
- [ ] Postoji najmanje jedan aktivan `ADMIN`
- [ ] Postoji najmanje jedan aktivan `CASHIER`
- [ ] Placeholder korisnici nisu aktivni
- [ ] Role su proverene sa finansijama i upravom

## Cashboxes And Currencies

- [ ] Pilot blagajna je kreirana
- [ ] Pilot blagajna je aktivna
- [ ] RSD valuta postoji i aktivna je
- [ ] EUR valuta je aktivna samo ako se koristi u pilotu

## Documents

- [ ] Drive folder za dokumente postoji
- [ ] Upload dokumenta je testiran na desktopu
- [ ] Upload dokumenta je testiran na mobilnom telefonu
- [ ] Dokumenti su povezani sa poslovnim entitetima

## Permissions

- [ ] REQUESTER ne može da odobrava zahtev
- [ ] CASHIER ne može da kreira direktan nalog
- [ ] VIEWER ne može da menja podatke
- [ ] ADMIN ili FINANCE mogu da naprave backup
- [ ] Neovlašćen korisnik ne može da napravi backup

## Workflows

- [ ] Kreiranje zahteva radi
- [ ] Odobravanje zahteva radi
- [ ] Kreiranje naloga iz zahteva radi
- [ ] Izdavanje naloga radi
- [ ] Slanje naloga blagajni kreira pending `CASH_OUTFLOW/SUBMITTED`
- [ ] Izvršenje pending ISPLATA zapisa menja `CASH_OUTFLOW` u `POSTED`
- [ ] Upload dokumenta radi
- [ ] Otvaranje i zatvaranje smene radi
- [ ] Dnevni zaključak radi

## Reports

- [ ] Dashboard se otvara
- [ ] Report stanja blagajne radi
- [ ] Report nedostajućih dokumenata radi
- [ ] Print prikazi se otvaraju
- [ ] Browser `Save as PDF` je testiran

## Backup

- [ ] Backup pre pilota je napravljen
- [ ] Backup URL je sačuvan
- [ ] CSV export jednog sheeta je testiran
- [ ] Dnevna backup odgovornost je dodeljena

## Training

- [ ] Korisnici su dobili `docs/20_USER_SOP.md`
- [ ] Blagajnik zna razliku između zahteva, naloga i isplate
- [ ] Finansije znaju proceduru razlika i korekcija
- [ ] Administrator zna rollback plan

## Known Limitations

- [ ] `docs/14_KNOWN_LIMITATIONS.md` je pregledan
- [ ] `docs/23_KNOWN_ISSUES_REGISTER.md` je otvoren za pilot
- [ ] Kritična ograničenja su prihvaćena pre pilota

## Approval To Start Pilot

- [ ] Administrator odobrio tehničku spremnost
- [ ] Finansije odobrile poslovnu spremnost
- [ ] Direktor ili ovlašćeno lice odobrilo početak pilota

# CODEX_TASK_17_CASH_COUNT_AND_SHIFT_OPENING

## Cilj

Dodati kontrolisan popis blagajne po apoenima i početak smene sa potvrdom početnog stanja.

Ovo je novi poslovni blok i ne sme se uvoditi tako da pokvari direktnu uplatu, direktnu isplatu, storno i postojeću blagajničku knjigu.

## Poslovna pravila

1. Direktna uplata i direktna isplata ostaju standardni blagajnički događaji.
2. Zahtev i nalog ostaju dodatni kontrolni workflow za odobravanje isplata.
3. STORNO se u prikazu blagajničke knjige prikazuje u istoj koloni kao stavka koja se stornira, ali sa suprotnim predznakom.
4. Stanje blagajne se računa iz događaja, ali poslednji važeći popis/presek može biti nova obračunska osnova.
5. Popis se unosi po valutama, apoenima i količinama.
6. Čekovi se unose kao broj čekova i ukupna vrednost čekova po valuti.
7. Početak smene prikazuje prethodni kraj/popisan saldo i traži potvrdu ili novi popis.
8. Zatvorena smena i zaključan dnevni zaključak ostaju nepromenljivi.

## Podaci koje treba dodati

Razmotriti novu tabelu:

```text
CASH_COUNTS
```

Minimalna polja:

```text
count_id
created_at
created_by
count_type
cashbox_id
shift_id
currency
counted_cash_total
check_count
check_total
calculated_balance_before
difference
denominations_json
note
status
posted_by
posted_at
updated_at
```

`count_type`:

```text
SHIFT_OPENING
CASHBOX_COUNT
SHIFT_CLOSING
DAILY_CLOSING_COUNT
```

## UI zahtevi

1. Dodati akciju `PRESEK BLAGAJNE - POPIS`.
2. Forma mora prikazati valutu, apoene, količine i automatski total.
3. Dodati unos broja čekova i ukupnog iznosa čekova.
4. Početak smene mora prikazati prethodni kraj/presek i tražiti potvrdu.
5. Mobilni prikaz mora imati velika polja i dugmad pogodna za rad na telefonu.

## Backend zahtevi

1. Dodati helper za definisanje apoena po valuti.
2. Dodati validaciju pozitivnih količina i iznosa.
3. Dodati audit log za svaki popis.
4. Dodati obračun stanja od poslednjeg usvojenog popisa.
5. Ne menjati istorijske cash event zapise.

## Testovi

1. Otvori smenu i potvrdi prethodni saldo.
2. Otvori smenu i unesi novi popis.
3. Uradi direktnu uplatu posle popisa.
4. Uradi direktnu isplatu posle popisa.
5. Uradi storno posle popisa.
6. Proveri da saldo knjige odgovara poslednjem popisu plus događaji posle popisa.
7. Zatvori smenu i proveri da se smena više ne može menjati.

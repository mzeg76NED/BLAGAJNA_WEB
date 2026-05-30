# CODEX_TASK_18_CASHBOOK_AND_SHIFT_WORKFLOW_CLEANUP

## Cilj

Ispraviti blagajničku knjigu, mobilni skrol, filtere, total red i tok rada sa smenom bez kvarenja funkcija koje već rade.

Ovaj task je stabilizacioni i UX task. Ne uvoditi nove velike poslovne module dok se postojeći operativni tok ne dovede u upotrebljivo stanje.

## Stroga pravila

1. Ne pokvariti direktnu uplatu.
2. Ne pokvariti direktnu isplatu.
3. Ne pokvariti storno.
4. Ne pokvariti štampu blagajničkog lista.
5. Ne pokvariti postojeći obračun stanja blagajne.
6. Ne menjati poslovni princip da se stanje računa iz događaja.
7. Ne brisati postojeće zapise.
8. Ne uvoditi slobodan ručni unos stanja kao zamenu za događaje.
9. Ne menjati workflow Zahtev -> Odobrenje -> Nalog -> Isplata osim ako je izričito navedeno u drugom tasku.
10. Svaka izmena mora biti mala, proverljiva i reverzibilna.

## Kontekst problema

Nakon prethodnih UI izmena pojavili su se problemi:

1. Filteri `Korisnik` i `Smena` u blagajničkoj knjizi su tekstualna polja i korisniku nisu jasni.
2. Totali uplata i isplata nisu pravilno postavljeni iznad kolona.
3. Na mobilnom prikazu je previše informacija u vrhu liste.
4. Mobilna lista se pri skrolovanju podvlači ispod info/kontrolnih elemenata.
5. Dugmad `UPLATA` i `ISPLATA` se vide i kada korisnik nije na tabu `Knjiga`.
6. Veličina fontova na mobilnoj aplikaciji nije ujednačena kroz sve tekstove, labele i kontrole.
7. Workflow smene nije dovoljno jasan: korisnik prvo mora da ima aktivnu smenu da bi radio.
8. Potrebno je jasno definisati događaje koji se dešavaju u toku smene.

## Desktop blagajnička knjiga

### Filter korisnika

Zameniti tekst polje za korisnika pravim filterom:

```text
Svi korisnici
Trenutni korisnik
Lista korisnika iz USERS
```

Prikaz u dropdownu mora biti razumljiv:

```text
Ime i prezime - email - uloga
```

Vrednost filtera može ostati email ili user_id, ali korisnik ne sme da vidi apstraktan ID kao primarnu informaciju.

### Filter smene

Zameniti tekst polje za smenu pravim filterom:

```text
Sve smene
Aktivna smena
Moje smene
Lista smena iz SHIFTS
```

Prikaz u dropdownu mora biti razumljiv:

```text
Otvorio: Ime/email - datum/vreme otvaranja - status
```

Ne prikazivati samo `shift_id` kao korisnički izbor.

### Total red iznad tabele

Ukloniti postojeći neporavnati summary strip.

Total treba da bude tabelarni red iznad podataka, poravnat po kolonama:

```text
Rb. | Datum | Opis / Primalac | Ukupno uplata | Ukupno isplata | Stanje
```

Pravila:

1. Total uplata mora stajati tačno iznad kolone `Uplata`.
2. Total isplata mora stajati tačno iznad kolone `Isplata`.
3. Saldo mora stajati tačno iznad kolone `Stanje`.
4. Stil može biti isti kao raniji `total-row`, ali red mora biti gore.
5. Ne prikazivati isti total i gore i dole.

### Sticky ponašanje

Na desktopu:

1. Filteri ostaju vidljivi dok se skroluje tabela.
2. Header tabele ostaje vidljiv.
3. Total red ostaje vidljiv uz header.
4. Redovi tabele ne smeju vizuelno da se podvlače ispod filtera na način koji deluje pokvareno.

## Mobilna blagajnička knjiga

### Ukloniti višak iz glavnog prikaza

Sa glavnog mobilnog prikaza knjige ukloniti:

1. tekst sa brojem stavki,
2. tekst sa korisnikom,
3. tekst sa aktivnom smenom,
4. filter korisnika,
5. filter smene,
6. neporavnati prikaz ukupnih uplata/isplata.

Glavni mobilni prikaz mora biti:

1. stanje blagajne,
2. datum/vreme,
3. izbor valute,
4. lista poslednjih kretanja,
5. donja akcijska dugmad kada je aktivan tab `Knjiga`.

### Pregled prometa

Dodati posebno dugme, npr:

```text
Pregled prometa
```

Dugme otvara bottom sheet ili panel sa:

1. ukupno uplata,
2. ukupno isplata,
3. saldo,
4. broj stavki,
5. valuta,
6. period,
7. eventualno aktivna smena.

Ovaj pregled ne sme zauzimati stalni prostor iznad liste.

### Mobilni skrol

Popraviti skrol prema snimku ekrana:

1. Lista transakcija ne sme da prolazi ispod kontrola tako da se tekst vidi kroz njih.
2. Header aplikacije ostaje stabilan.
3. Ako se koriste sticky elementi, moraju imati čvrstu pozadinu i pravilne `z-index` vrednosti.
4. Izbegavati gomilanje sticky blokova iznad liste.
5. Donja navigacija i donja akcijska dugmad ne smeju da prekrivaju poslednje stavke liste.

### Donja akcijska dugmad

Dugmad `UPLATA` i `ISPLATA` prikazivati samo kada je aktivan tab:

```text
Knjiga
```

Kada je aktivan tab:

```text
Nalozi
Smena
Zaključak
```

ta dugmad se sakrivaju.

Kasnije na tim tabovima mogu postojati druga specifična dugmad.

## Mobilna tipografija

Veličina fonta mora biti ujednačena kroz celu mobilnu aplikaciju.

Kada se menja mobile scale, obavezno obuhvatiti:

1. header stanje,
2. datum/vreme,
3. chip kontrole,
4. liste,
5. opise transakcija,
6. iznose,
7. labele,
8. inpute,
9. select elemente,
10. textarea elemente,
11. bottom sheet,
12. dialoge,
13. dugmad,
14. detalje transakcije,
15. poruke sistema.

Na pregledu blagajničkog lista:

1. smanjiti font sadržaja za 10%,
2. povećati font i dodirnu površinu kontrola za akcije.

## Workflow smene

### Osnovni tok

Korisnik ulazi u aplikaciju.

Sistem proverava:

```text
Da li postoji aktivna smena za blagajnu?
```

Ako ne postoji aktivna smena:

1. korisnik prvo mora da otvori smenu,
2. direktna uplata i direktna isplata nisu dostupne,
3. ekran mora jasno da kaže da smena mora biti otvorena.

Ako postoji aktivna smena:

1. ako ju je otvorio trenutni korisnik, može da radi direktnu uplatu i isplatu,
2. ako ju je otvorio drugi korisnik, trenutni korisnik ne može direktno da knjiži,
3. drugi korisnici mogu da rade preko zahteva.

Ovo važi i za desktop i za mobile.

### Aktivna smena

Može postojati samo jedna aktivna smena za blagajnu.

Zatvarati se može samo trenutno aktivna smena.

Korisnik ne sme ručno unositi `shift_id`.

Sistem sam zna aktivnu smenu.

## Događaji u toku smene

U toku smene mogu postojati sledeći događaji:

```text
Otvaranje smene
Zatvaranje smene
Uplata
Isplata
Storniranje
Presek blagajne
Zatvaranje blagajne
```

UI mora pratiti ovaj operativni model.

Korisnik ne treba da razmišlja o internim tabelama ili ID vrednostima.

## Redosled implementacije

Raditi sledećim redom:

1. Popraviti desktop filtere za korisnika i smenu.
2. Popraviti desktop total red iznad tabele.
3. Popraviti sticky ponašanje desktop tabele.
4. Očistiti mobilni prikaz knjige od viška elemenata.
5. Dodati mobilni `Pregled prometa`.
6. Popraviti mobilni skrol iznad liste i ispod donjih dugmadi.
7. Prikazivati `UPLATA` i `ISPLATA` samo na tabu `Knjiga`.
8. Standardizovati mobile scale za sve tekstove, labele i kontrole.
9. Doraditi pregled blagajničkog lista: sadržaj -10%, kontrole veće.
10. Uvesti jasan početni workflow smene na desktopu.
11. Uvesti isti workflow smene na mobile.
12. Proveriti da postojeće funkcije i dalje rade.
13. Deploy na Google Apps Script.
14. Test na desktop i mobile linku.
15. Tek nakon potvrđene lokalne provere uraditi commit i push.

## Obavezni testovi pre završetka

### Desktop

1. Otvoriti desktop aplikaciju.
2. Proveriti da se blagajnička knjiga učitava.
3. Proveriti filter korisnika iz dropdowna.
4. Proveriti filter smene iz dropdowna.
5. Proveriti da total uplata stoji iznad kolone `Uplata`.
6. Proveriti da total isplata stoji iznad kolone `Isplata`.
7. Proveriti da saldo stoji iznad kolone `Stanje`.
8. Proveriti skrol tabele.
9. Uraditi direktnu uplatu.
10. Uraditi direktnu isplatu.
11. Uraditi storno.
12. Otvoriti blagajnički list.
13. Proveriti da štampa i dalje radi.

### Mobile

1. Otvoriti mobile aplikaciju.
2. Proveriti da nema viška filtera i tekstova iznad liste.
3. Proveriti da lista ne prolazi ispod kontrola na ružan način.
4. Proveriti da `UPLATA` i `ISPLATA` postoje samo na tabu `Knjiga`.
5. Prebaciti se na `Nalozi`, `Smena`, `Zaključak` i proveriti da se ta dugmad sakriju.
6. Otvoriti `Pregled prometa`.
7. Proveriti ukupno uplate, ukupno isplate i saldo.
8. Uraditi uplatu.
9. Uraditi isplatu.
10. Proveriti da stavka ne nestaje posle optimističkog prikaza.
11. Otvoriti detalj transakcije.
12. Otvoriti blagajnički list.
13. Proveriti čitljivost fontova.

### Smena

1. Ako nema aktivne smene, aplikacija mora tražiti otvaranje smene.
2. Otvoriti smenu.
3. Proveriti da tek tada postaju dostupne direktne uplate/isplate.
4. Proveriti da drugi korisnik ne može direktno knjižiti u tuđu aktivnu smenu.
5. Zatvoriti aktivnu smenu bez ručnog unosa ID smene.

## Kriterijum završetka

Task je završen tek kada:

1. desktop knjiga radi pregledno,
2. mobile knjiga nema problematičan skrol,
3. direktna uplata/isplata rade kao pre,
4. storno radi kao pre,
5. blagajnički list se i dalje otvara i štampa,
6. workflow smene je razumljiv korisniku,
7. korisnik ne mora da zna interne ID-jeve,
8. deploy je urađen,
9. test linkovi su dostavljeni korisniku.

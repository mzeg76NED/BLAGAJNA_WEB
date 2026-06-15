# User SOP

## Osnovno pravilo sistema

Zahtev nije isplata. Nalog nije isplata. Isplata nastaje tek kada blagajnik izvrši nalog i sistem napravi blagajnički događaj.

Stanje blagajne se ne unosi ručno. Sistem ga računa iz proknjiženih blagajničkih događaja.

## Kako se podnosi zahtev za isplatu

1. Otvoriti aplikaciju.
2. Izabrati `Novi zahtev za isplatu`.
3. Uneti primaoca, iznos, valutu i svrhu.
4. Po potrebi dodati opis i rok.
5. Sačuvati zahtev.
6. Poslati zahtev na odobrenje.

## Kako se odobrava zahtev

1. Otvoriti listu zahteva za odobrenje.
2. Proveriti primaoca, iznos, valutu i svrhu.
3. Odobriti samo ispravan zahtev.
4. Ako zahtev nije ispravan, odbiti ga uz razlog.

## Kako se pravi nalog za isplatu

1. Otvoriti odobren zahtev.
2. Kreirati nalog iz odobrenog zahteva.
3. Proveriti blagajnu, valutu, iznos i primaoca.
4. Izdati nalog kada je spreman za blagajnika.

## Kako blagajnik izvršava nalog

1. Otvoriti `Nalozi za isplatu`.
2. Izabrati nalog u statusu `WAITING_PAYMENT`.
3. Proveriti primaoca, iznos, valutu i svrhu.
4. Poslati nalog blagajni kao pending ISPLATA zapis ako vec nije poslat.
5. Blagajnik izvršava pending ISPLATA zapis samo ako je nalog validan.
6. Tek tada pending `CASH_OUTFLOW` postaje `POSTED` i menja stanje blagajne.

## Kako se dodaje dokument

1. Otvoriti sekciju za dokumenta.
2. Izabrati tip entiteta.
3. Uneti ID entiteta.
4. Izabrati fajl.
5. Dodati napomenu ako je potrebno.
6. Sačuvati dokument.

## Kako se otvara smena

1. Blagajnik bira `Primopredaja smene` ili odgovarajuću desktop sekciju.
2. Unosi ID blagajne.
3. Otvara smenu.
4. Sistem beleži početno izračunato stanje.

## Kako se predaje ili zatvara smena

1. Otvoriti aktivnu smenu.
2. Uraditi presek stanja.
3. Uneti fizičko stanje po valutama.
4. Za primopredaju uneti korisnika koji prima smenu.
5. Za zatvaranje potvrditi fizičko stanje.
6. Ako postoji razlika, upisati napomenu.

## Kako se radi dnevni zaključak

1. Proveriti da nema otvorenih smena za blagajnu.
2. Pripremiti dnevni zaključak za datum, blagajnu i valutu.
3. Uporediti izračunato i fizičko stanje.
4. Kreirati dnevni zaključak.
5. Sistem zaključava uključene cash evente.

## Šta raditi kad postoji razlika

1. Ne menjati stare cash evente direktno.
2. Zabeležiti razliku u napomeni.
3. Obavestiti finansije ili nadređenog.
4. Korekciju raditi samo kroz odobreni storno ili korektivni događaj.

## Šta raditi kad je greška

1. Ne brisati redove iz Google Sheet baze.
2. Ne menjati zaključane događaje.
3. Prijaviti grešku administratoru.
4. Sačuvati ID zapisa i opis problema.

## Šta korisnik ne sme da radi

1. Ne sme direktno menjati Google Sheet bazu.
2. Ne sme isplaćivati samo na osnovu zahteva.
3. Ne sme isplaćivati otkazan ili neizdat nalog.
4. Ne sme ručno upisivati stanje blagajne kao slobodnu vrednost.
5. Ne sme brisati poslovne zapise.

# Lokale E-mail Setup met Mailpit & Laravel

Deze handleiding legt uit hoe je Mailpit installeert en instelt. Daarmee vang je lokaal de e-mails op die Laravel verstuurt, zoals registratie-, verificatie- en resetmails. Je hebt er geen echte e-mailprovider of inloggegevens voor nodig.

---

## 1. Mailpit installeren

### Windows

Open een Windows Terminal (PowerShell of CMD) en voer dit uit:

```bash
winget install axllent.mailpit
```

**Optioneel (handmatige download):**
Gebruik je geen winget? Download dan het zip-bestand via [Mailpit Releases](https://github.com/axllent/mailpit/releases), pak het uit en start `mailpit.exe`.

### Linux

**Optie A: installatiescript (aanbevolen, werkt op de meeste distributies)**

```bash
sudo sh < <(curl -sL https://raw.githubusercontent.com/axllent/mailpit/develop/install.sh)
```

Het script zet `mailpit` in `/usr/local/bin`.

**Optie B: Homebrew (als je dat gebruikt)**

```bash
brew install mailpit
```

**Optie C: Docker**

```bash
docker run -d --name mailpit -p 8025:8025 -p 1025:1025 axllent/mailpit
```

> Met Docker hoef je stap 2 niet te doen, want de container draait al op de achtergrond. Stoppen doe je met `docker stop mailpit` en opnieuw starten met `docker start mailpit`.

Controleer of de installatie gelukt is:

```bash
mailpit version
```

---

## ⚠️ Belangrijk: herstart VS Code na de installatie

Sluit **VS Code helemaal af** en open het opnieuw. Doe dit ook met andere open terminals.

**Waarom?** Bij de installatie wordt Mailpit aan je `PATH` toegevoegd. Terminals die al openstonden, ook de ingebouwde terminal van VS Code, kennen die nieuwe `PATH` nog niet. Zonder herstart krijg je een foutmelding zoals:

- Windows: `'mailpit' is not recognized as an internal or external command`
- Linux: `mailpit: command not found`

> Alleen een nieuw terminaltabblad openen in VS Code is vaak niet genoeg. Herstart de hele applicatie.

---

## 2. Mailpit starten

Start Mailpit in een terminalvenster. Dat werkt hetzelfde op Windows en Linux:

```bash
mailpit
```

Mailpit draait nu lokaal op twee poorten:

| Onderdeel   | Adres                 | Doel                                  |
| ----------- | --------------------- | ------------------------------------- |
| SMTP-server | `127.0.0.1:1025`      | Laravel stuurt de mails hiernaartoe   |
| Web UI      | http://localhost:8025 | Hier bekijk je de inbox in je browser |

> **Let op:** laat dit terminalvenster openstaan zolang je lokaal ontwikkelt of test.

**Optioneel (Linux): Mailpit op de achtergrond laten draaien**

```bash
nohup mailpit > /dev/null 2>&1 &
```

Stoppen doe je met `pkill mailpit`.

---

## 3. Laravel `.env` instellen

Open het `.env`-bestand in de hoofdmap van je Laravel-project en stel de mailvariabelen zo in:

```env
MAIL_MAILER=smtp
MAIL_SCHEME=null
MAIL_HOST=127.0.0.1
MAIL_PORT=1025
MAIL_USERNAME=null
MAIL_PASSWORD=null
MAIL_ENCRYPTION=null
MAIL_FROM_ADDRESS="noreply@tribelink.local"
MAIL_FROM_NAME="${APP_NAME}"
```

> **Gebruik je Laravel Sail of draait Laravel zelf in Docker?** Zet dan `MAIL_HOST=mailpit` in plaats van `127.0.0.1`. Dat is de naam van de Mailpit-service of -container. Sail heeft standaard al een `mailpit`-service.

---

## 4. Cache legen

Leeg de cache, zodat Laravel de nieuwe `.env`-instellingen inleest:

```bash
php artisan config:clear
```

---

## 5. Testen via Laravel Tinker

Open een **nieuw** terminalvenster in je Laravel-projectmap. Mailpit moet in het andere venster blijven draaien.

```bash
php artisan tinker
```

Verstuur een testbericht:

```php
Mail::raw('Dit is een testmail via Mailpit', function ($message) {
    $message->to('test@student.hu.nl')->subject('Lokale Mailpit Test');
});
```

Geeft Tinker `=> null` terug zonder foutmeldingen? Dan is de mail verstuurd.

---

## 6. Mails bekijken

Open je browser en ga naar:

**http://localhost:8025**

Hier komen alle verstuurde e-mails meteen binnen. Je ziet de headers, de HTML-versie, de platte tekst en eventuele bijlagen.

---

## Problemen oplossen

| Probleem                                        | Oplossing                                                    |
| ----------------------------------------------- | ------------------------------------------------------------ |
| `mailpit: command not found` / `not recognized` | Herstart VS Code en je terminals (zie hierboven).            |
| `Connection refused` in Tinker                  | Controleer of Mailpit draait en of `MAIL_PORT=1025` klopt.   |
| Wijzigingen in `.env` werken niet               | Voer `php artisan config:clear` opnieuw uit.                 |
| Poort 1025 of 8025 is al in gebruik (Linux)     | Kijk met `sudo lsof -i :1025` welk proces de poort gebruikt. |

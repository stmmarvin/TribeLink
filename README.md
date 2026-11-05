# TribeLink

**TribeLink** is een social connections platform om studenten van HBO Open-ICT bij elkaar te brengen. Gebruikers kunnen elkaar hier eenvoudig leren kennen door middel van chat, lobby, of QR-code poster.

## Setup development

Volg deze stappen om je development omgeving op te zetten.

1. Clone de repository en `cd` ernaartoe
2. Controleer of je PHP hebt geïnstalleerd: `php -v` (repo opgezet met versie `8.5.11`)
3. Controleer of je PHP Composer hebt geïnstalleerd: `composer --version` (repo opgezet met versie `2.7.7`)
4. Controleer of je NPM hebt geïnstalleerd: `npm -v` (repo opgezet met versie `12.1.0`)
5. Controleer of je SQLite3 hebt geïnstalleerd (repo opgezet met versie `3.53.4`)
6. Installeer de Composer dependencies: `composer install`
7. Installeer de NPM dependencies: `npm install`
8. Maak je environment bestand aan: `cp .env.example .env`, en genereer je app key: `php artisan key:generate`
9. Voer alle database-migraties uit: `php artisan migrate`
10. Start je development server met `composer run dev`
11. Nu kun je deze URL openen in je browser: `http://127.0.0.1:8000`
12. Happy coding!

Registratie vereist een unieke gebruikersnaam, een `@student.hu.nl`-mailadres
en een wachtwoord van minimaal 12 tekens met kleine letters, hoofdletters,
cijfers en symbolen. Wachtwoorden worden door Laravel gehashed opgeslagen.

> Lukt het niet? Vraag Bart om hulp.

## Deployment

Zie [DEPLOY.md](./DEPLOY.md).

## Contributing (git branch policy)

Als je een nieuwe functie gaat maken, maak dan een nieuwe branch aan op de `dev` branch, bijvoorbeeld `feature/login-frontend` of `feature/profile-page-frontend`. Als je klaar bent met de functie, push dan je commits, en maak een _merge request_ aan naar de `dev` branch.

Als er geen conflicts zijn en iemand anders je code heeft reviewed, wordt de branch gemerged naar de `dev` branch.

Zodra alles goed getest is, wordt `dev` gemerged naar `main` en gedeployed naar productie.

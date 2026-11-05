# Profiel delen – overdracht voor de backend

De frontend van twee pagina's is af. Ze laten nu nog nep- of lege gegevens zien. Jij maakt de backend, dan werkt alles echt.

| Pagina                | Link                    | Figma | Bestand                                  |
| --------------------- | ----------------------- | ----- | ---------------------------------------- |
| Profiel delen         | `/profile/share?user=5` | 3.3   | `resources/js/pages/profile/share.tsx`   |
| Profiel van een ander | `/profile/5`            | 3.4   | `resources/js/pages/profile/partner.tsx` |

## Het idee in het kort

Jij en Sanne hebben elkaar ontmoet. Jij kiest met zes schakelaars wat Sanne van jouw profiel mag zien, en Sanne doet hetzelfde voor jou. Dat is per persoon: wat jij met Sanne deelt, ziet Tom niet.

Delen jullie allebei alles (6 van 6)? Dan zijn jullie **vrienden**.

## Woordenlijst

| Woord                 | Betekenis                                                                                                                               |
| --------------------- | --------------------------------------------------------------------------------------------------------------------------------------- |
| **partner**           | De ander. De persoon met wie je deelt of van wie je het profiel bekijkt.                                                                |
| **mine**              | Wat **ik** met de partner deel: zes keer aan of uit.                                                                                    |
| **theirs**            | Wat de **partner** met mij deelt: zes keer aan of uit.                                                                                  |
| **de zes onderdelen** | `avatar` (profielfoto), `banner`, `bio`, `fun_fact` (leuk weetje), `real_name` (echte naam), `contact` (contactgegevens).               |
| **status**            | `saved` = bewaard, nog niet ontmoet. `partial` = deels zichtbaar, een deel is gedeeld. `friend` = vrienden, alles over en weer gedeeld. |
| **deels zichtbaar**   | Je ziet alleen wat de ander deelt. De rest staat als grijs vakje "… – nog niet gedeeld".                                                |
| **contactgegevens**   | E-mail, telefoon en socials (bijv. Instagram) om buiten TribeLink contact te hebben.                                                    |
| **AVG**               | De privacywet. Kort: alleen delen waar iemand zelf "ja" op zegt, en alleen met wie hij kiest.                                           |

## Wat de frontend al doet

- Zes schakelaars met een teller "Jij hebt 4 van 6 gedeeld – de ander 2 van 6".
- **Contactgegevens** kun je pas aanzetten als de andere 5 aan staan.
- Bij het aanzetten van contactgegevens vraagt een venster eerst om toestemming.
- Zet je een ander onderdeel uit, dan gaan de contactgegevens ook uit.
- Op de profielpagina (3.4) zie je alleen wat de ander deelt.
- In **Profiel bewerken** staan drie nieuwe velden: `contact_email`, `contact_phone` en `contact_socials`. Ze zitten in hetzelfde formulier als naam en bio.

Nu nog nep: zonder backend leest de pagina naam en status uit de link (`?username=test&status=friend`). Dat is alleen om te testen. Haal het niet weg, het wordt vanzelf genegeerd zodra jij `partner` meestuurt.

## Wat jij moet bouwen

### 1. Database

- Een tabel voor delen, bijvoorbeeld `profile_shares`:
    - kolommen: `user_id` (wie deelt), `partner_id` (met wie), `avatar`, `banner`, `bio`, `fun_fact`, `real_name`, `contact` (allemaal boolean, standaard `false`), timestamps.
    - Eén rij per richting: ik → Sanne en Sanne → ik zijn twee rijen.
- Op `users` nieuwe kolommen (allemaal optioneel): `contact_email`, `contact_phone`, `contact_socials`.
- `banner`, `fun_fact` en een avatar-URL bestaan nog niet op `users`. `bio` bestaat al.

### 2. Routes vervangen

In `routes/web.php` staan nu twee tijdelijke regels:

```php
Route::inertia('profile/share', 'profile/share')->name('profile.share');
Route::inertia('profile/{user}', 'profile/partner')->whereNumber('user')->name('profile.partner');
```

Vervang ze door controllers. De namen en links moeten hetzelfde blijven.

### 3. Wat de pagina's willen ontvangen (props)

De types staan in `resources/js/types/sharing.ts`. Voorbeeld:

```php
return Inertia::render('profile/share', [   // of 'profile/partner'
    'partner' => [
        'id' => (string) $partner->id,
        'username' => $partner->username,
        'avatarUrl' => null,              // alleen als partner 'avatar' deelt
        'status' => 'partial',            // 'saved' | 'partial' | 'friend'
    ],
    'mine'   => ['avatar' => true, 'banner' => true, 'bio' => true, 'fun_fact' => true, 'real_name' => false, 'contact' => false],
    'theirs' => ['avatar' => true, 'banner' => false, 'bio' => true, 'fun_fact' => false, 'real_name' => false, 'contact' => false],
    'partnerProfile' => [                 // alleen wat gedeeld is, de rest null
        'bannerUrl' => null,
        'bio' => 'Tekst',
        'funFact' => null,
        'realName' => null,
    ],
    'partnerContact' => null,             // alleen als partner 'contact' deelt
    'saveUrl' => route('profile.share.update', $partner), // alleen voor profile/share
]);
```

- `mine` heeft de pagina 3.4 niet nodig, alleen 3.3.
- Zonder `saveUrl` slaat de pagina niets op.

### 4. Opslaan

- Maak een `PATCH`-route, bijvoorbeeld `profile/share/{user}`, en geef die als `saveUrl` mee.
- De pagina stuurt bij elke klik alle zes waardes mee: `{ avatar: true, banner: false, ... }`.
- Controleer op de server:
    - `contact` mag alleen `true` zijn als de andere vijf ook `true` zijn.
    - Je kunt niet met jezelf delen.
    - Alleen delen met iemand die je echt hebt ontmoet of bewaard.
- Delen jullie allebei 6 van 6? Maak dan de vriendschap aan (zie `FriendshipController`).

### 5. Profiel bewerken

`Settings\ProfileUpdateRequest` moet `contact_email` (e-mail), `contact_phone` en `contact_socials` (tekst, optioneel) valideren en opslaan.

## Privacy: belangrijk

1. **Stuur nooit iets mee dat niet gedeeld is.** De frontend verbergt het wel, maar alles wat in de props zit kan iemand in de browser terugvinden. Is iets niet gedeeld, stuur dan `null`.
2. **Vertrouw de link niet.** `?status=friend` in de URL is alleen voor testen. Bepaal status en rechten altijd zelf in de controller.
3. **Contactgegevens nooit via `auth.user` naar anderen.** Alleen de eigenaar ziet zijn eigen contactgegevens. Anderen krijgen ze alleen via `partnerContact`.
4. **Intrekken moet direct werken.** Zet iemand iets uit, dan ziet de ander het bij de volgende keer laden niet meer.

## Testen

1. `composer run dev` en inloggen.
2. Ga naar `/profile/share?user=2`: schakelaars aan en uit, pagina verversen. Blijft het staan? Dan werkt het opslaan.
3. Log in als gebruiker 2 en ga naar `/profile/1`: zie je alleen wat gebruiker 1 deelt?
4. Zet bij gebruiker 1 "Bio" uit. Ziet gebruiker 2 bij Bio nu het grijze vakje?

Vragen over de frontend? Vraag Marvin.

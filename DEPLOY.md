# Deployment

Om TribeLink te deployen heb ik (Bart) een Ansible configuratie gemaakt.
Ansible is een tool waarmee je automatisch en op een reproduceerbare manier server kan instellen.

Het werkt als volgt:

```txt
Jouw laptop
    |
    | (Ansible configureert en deployt...)
    V
De server
```

Je hoeft Ansible dus niet op de server te installeren, alleen je laptop.

## Vereisten

Er moet aan de volgende vereisten voldaan worden om de deploy te laten werken:

1. Je hebt Ansible op je laptop geïnstalleerd;
2. Je hebt het project ge-cloned op je laptop;
3. Je kunt de server vanaf je laptop bereiken (oftewel, vanaf HU-netwerk);
4. De domeinnaam wijst correct naar de server (DNS);
5. Je hebt het kluis-wachtwoord om de Ansible Vault te ontgrendelen.

## Resultaat

Als alles goed gaat, zou de server er als volgt uit moeten gaan zien:

- Getest op `Ubuntu Server 26.04.1 LTS`.
- Alle dependencies geïnstalleerd.
- Certificaat geïnstalleerd voor `tribelink.sytes.net`.
- nginx levert de website, Laravel de backend, en React als frontend.
- De app is bereikbaar op [tribelink.sytes.net](https://tribelink.sytes.net/).

## Deploy uitvoeren

Om de deploy uit te voeren, kun je de volgende command gebruiken:

```sh
./ansible-deploy.sh
```

Je zult de Vault wachtwoord moeten invoeren (zodat Ansible het server wachtwoord kan lezen).
Vervolgens zal Ansible de playbook uitvoeren en alles opzetten.

> Lukt het niet? Vraag Bart om hulp.

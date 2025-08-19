# CalyClub

Een Node.js project met Firebase integratie.

## Installatie

1. Installeer de dependencies:
```bash
npm install
```

2. Maak een `.env` bestand aan in de root van het project met de volgende variabelen:
```
FIREBASE_API_KEY=your_api_key
FIREBASE_AUTH_DOMAIN=your_auth_domain
FIREBASE_PROJECT_ID=your_project_id
FIREBASE_STORAGE_BUCKET=your_storage_bucket
FIREBASE_MESSAGING_SENDER_ID=your_messaging_sender_id
FIREBASE_APP_ID=your_app_id
```

Vervang de waarden met je eigen Firebase configuratie.

## Gebruik

Start de development server:
```bash
npm run dev
```

Start de productie server:
```bash
npm start
```

De server draait standaard op poort 3000.

## Project Structuur

- `index.js` - Hoofdbestand met server configuratie
- `.env` - Omgevingsvariabelen (niet in git)
- `package.json` - Project configuratie en dependencies 
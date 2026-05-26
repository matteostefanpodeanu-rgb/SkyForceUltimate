# 🚀 SkyForce Ultimate

Bot ufficiale della chain **SkyForce Ultimate** — gestisce i resoconti settimanali di tutti i server della chain.

---

## ✨ Funzionalità

| Comando | Chi può usarlo | Descrizione |
|---|---|---|
| `/aggiungi-server` | Admin | Aggiunge un server e il suo owner alla chain |
| `/rimuovi-server` | Admin | Rimuove un server dalla chain |
| `/lista-server` | Admin | Mostra tutti i server e la configurazione |
| `/setup-canale` | Admin | Imposta il canale resoconti e il canale reminder |
| `/resoconto` | Owner associato | Compila il resoconto settimanale |
| ⏰ Reminder | Automatico | Ogni domenica alle 10:00 e 17:00 (ora italiana) |

---

## 🛠️ Installazione Locale

### 1. Prerequisiti
- [Node.js 18+](https://nodejs.org)
- Un bot Discord (vedi sotto)

### 2. Crea il Bot su Discord
1. Vai su [discord.com/developers/applications](https://discord.com/developers/applications)
2. Clicca **"New Application"** → nome: `SkyForce Ultimate`
3. Vai su **"Bot"** → **"Reset Token"** → copia il token
4. Abilita **Server Members Intent** e **Message Content Intent**
5. Vai su **OAuth2 → URL Generator**:
   - Spunta: `bot` + `applications.commands`
   - Permessi: `Send Messages`, `Embed Links`, `Use Slash Commands`, `Read Message History`
   - Copia il link e aggiungilo al tuo server

### 3. Recupera gli ID necessari
- **Client ID**: Discord Developer Portal → General Information → Application ID
- **Guild ID**: Tasto destro sul server Discord → "Copia ID server" (abilita Developer Mode in Impostazioni → Avanzate)

### 4. Configura il progetto
```bash
# Clona/scarica il progetto
cd skyforce-bot

# Installa dipendenze
npm install
```

> Le variabili d'ambiente (`DISCORD_TOKEN`, `CLIENT_ID`, `GUILD_ID`) vanno inserite **direttamente su Render** nella sezione Environment Variables — nessun file `.env` necessario.

### 5. Deploy dei comandi e avvio
```bash
# Prima: registra i comandi slash su Discord
npm run deploy

# Poi: avvia il bot
npm start
```

---

## ☁️ Deploy su Render

### 1. Prepara GitHub
```bash
git init
git add .
git commit -m "Initial commit — SkyForce Ultimate Bot"
git branch -M main
git remote add origin https://github.com/TUO_USERNAME/skyforce-bot.git
git push -u origin main
```

### 2. Configura Render
1. Vai su [render.com](https://render.com) e crea un account
2. **New → Web Service**
3. Connetti il tuo repository GitHub
4. Configura:
   - **Environment**: `Node`
   - **Build Command**: `npm install`
   - **Start Command**: `npm start`
5. Vai su **Environment Variables** e aggiungi:
   - `DISCORD_TOKEN` = il tuo token
   - `CLIENT_ID` = il tuo client ID
   - `GUILD_ID` = il tuo guild ID
6. Clicca **Create Web Service**

> ⚠️ **Importante**: Con il piano gratuito di Render il servizio va in sleep dopo 15 min di inattività. Per un bot Discord, considera il piano **Starter ($7/mese)** o usa un ping service come [UptimeRobot](https://uptimerobot.com) per tenerlo sveglio.

---

## 📋 Come Usare il Bot

### Setup iniziale (una volta sola)
```
/setup-canale tipo:Canale Resoconti canale:#resoconti
/setup-canale tipo:Canale Reminder canale:#annunci
/aggiungi-server nome:NomeServer owner:@OwnerUtente id_server:123456789
```

### Ogni domenica
Gli owner ricevono un reminder automatico e usano `/resoconto` per compilare.

---

## 🔧 Struttura Progetto

```
skyforce-bot/
├── src/
│   ├── commands/
│   │   ├── aggiungi-server.js
│   │   ├── rimuovi-server.js
│   │   ├── lista-server.js
│   │   ├── setup-canale.js
│   │   └── resoconto.js
│   ├── events/
│   │   ├── ready.js
│   │   └── interactionCreate.js
│   ├── utils/
│   │   ├── database.js
│   │   └── scheduler.js
│   ├── index.js
│   └── deploy-commands.js
├── data/
│   └── db.json          # Database locale (non committare su Git)
├── .env.example
├── .gitignore
├── package.json
└── README.md
```

---

Made with ❤️ for **SkyForce Ultimate Chain**

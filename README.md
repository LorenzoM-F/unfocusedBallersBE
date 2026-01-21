# unfocusedBallers
Footy Tourney Platform

## Deploying with PM2 (EC2)
1. Build the project:
   - `npm run build`
2. Start the app with PM2:
   - `pm2 start ecosystem.config.cjs`
3. Save the process list:
   - `pm2 save`
4. Enable startup script on reboot:
   - `pm2 startup`

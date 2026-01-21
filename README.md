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

## Nginx + Certbot (api.unfocusedballers.co.za)
1. Install Nginx and Certbot:
   - `sudo apt-get update`
   - `sudo apt-get install -y nginx certbot python3-certbot-nginx`
2. Create a server block:
   - `sudo nano /etc/nginx/sites-available/api.unfocusedballers.co.za`
   - Example config:
```nginx
server {
  listen 80;
  server_name api.unfocusedballers.co.za;

  location / {
    proxy_pass http://127.0.0.1:3000;
    proxy_http_version 1.1;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
  }
}
```
3. Enable the site and reload Nginx:
   - `sudo ln -s /etc/nginx/sites-available/api.unfocusedballers.co.za /etc/nginx/sites-enabled/`
   - `sudo nginx -t`
   - `sudo systemctl reload nginx`
4. Issue SSL certificate:
   - `sudo certbot --nginx -d api.unfocusedballers.co.za`
5. Verify auto-renew:
   - `sudo certbot renew --dry-run`

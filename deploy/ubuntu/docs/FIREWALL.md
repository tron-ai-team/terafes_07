# Firewall plan

Do not apply these rules on the Windows development machine. Apply them on the Ubuntu hosts after the addresses are real.

## Core node

Allow:

- SSH from an admin network only
- HTTP 80 from the Cloudflare tunnel connector, or only from localhost when cloudflared runs on the same host

Deny from the public internet:

- 3306 MySQL
- 5672 RabbitMQ
- 9000 and 9001 MinIO
- 8080 Spring, because Nginx is the public entry
- 11434, 8091, and 50021

Example shape, using the core LAN address only as documentation:

```bash
sudo ufw default deny incoming
sudo ufw default allow outgoing
sudo ufw allow OpenSSH
sudo ufw allow 80/tcp
sudo ufw deny 3306/tcp
sudo ufw deny 5672/tcp
sudo ufw deny 9000/tcp
sudo ufw deny 9001/tcp
sudo ufw deny 8080/tcp
```

If cloudflared runs on the core node and Nginx listens only on `127.0.0.1:80`, port 80 does not need to be public.

## AI node

Allow the AI ports only from the core node LAN address.

```bash
sudo ufw default deny incoming
sudo ufw allow OpenSSH
sudo ufw allow from 192.168.x.10 to any port 11434 proto tcp
sudo ufw allow from 192.168.x.10 to any port 8091 proto tcp
sudo ufw allow from 192.168.x.10 to any port 50021 proto tcp
```

Replace `192.168.x.10` with the real core address before running any command.

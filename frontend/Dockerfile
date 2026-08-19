# --- Build of the React frontend ---
FROM node:20-alpine AS builder

WORKDIR /app

# Get the API base URL from build arguments and set it as an environment variable
ARG VITE_API_BASE_URL
ENV VITE_API_BASE_URL=$VITE_API_BASE_URL

COPY package*.json ./
RUN npm install

COPY . .
RUN npm run build

# Nginx server
FROM nginx:alpine

# copy the build output to replace the default nginx contents.
COPY --from=builder /app/dist /usr/share/nginx/html

# Configuration of the Nginx server to serve the React app and handle client-side routing
RUN echo 'server { \
    listen 80; \
    \
    # Compression Gzip globale \
    gzip on; \
    gzip_types text/plain text/css application/json application/javascript text/xml application/xml; \
    gzip_min_length 1000; \
    \
    location / { \
        root /usr/share/nginx/html; \
        index index.html index.htm; \
        try_files $uri $uri/ /index.html; \
    } \
    \
    location /api/ { \
        proxy_pass http://AXECOM_AI_backend:8000; \
        proxy_set_header Host $host; \
        proxy_set_header X-Real-IP $remote_addr; \
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for; \
        proxy_set_header X-Forwarded-Proto $scheme; \
        \
        # Optimisation des tampons (evite l-ecriture disque dans proxy_temp) \
        proxy_buffering on; \
        proxy_buffer_size 128k; \
        proxy_buffers 4 256k; \
        proxy_busy_buffers_size 256k; \
        proxy_max_temp_file_size 0; \
    } \
}' > /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
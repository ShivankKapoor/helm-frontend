# Use the official Nginx image as base
FROM nginx:alpine

# Remove default nginx website
RUN rm -rf /usr/share/nginx/html/*

# Copy the Angular build output to nginx html directory
COPY dist/helm-frontend/browser/ /usr/share/nginx/html/

# Create nginx configuration for Angular SPA
RUN echo 'server { \
    listen 80; \
    server_name localhost; \
    root /usr/share/nginx/html; \
    index index.html; \
    \
    # Handle Angular routing \
    location / { \
        try_files $uri $uri/ /index.html; \
    } \
    \
    # Enable gzip compression \
    gzip on; \
    gzip_types \
        text/plain \
        text/css \
        text/js \
        text/xml \
        text/javascript \
        application/javascript \
        application/xml+rss \
        application/json; \
    \
    # Cache static assets \
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg)$ { \
        expires 1y; \
        add_header Cache-Control "public, immutable"; \
    } \
}' > /etc/nginx/conf.d/default.conf

# Expose port 80
EXPOSE 80

# Start nginx
CMD ["nginx", "-g", "daemon off;"]
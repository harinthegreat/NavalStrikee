# Use official PHP image
FROM php:8.2-cli

# Install required PHP extensions & composer dependencies
RUN apt-get update && apt-get install -y libssl-dev pkg-config git unzip

# Install Composer
COPY --from=composer:latest /usr/bin/composer /usr/bin/composer

# Set working dir
WORKDIR /app

# Copy project files
COPY . .

# Install PHP dependencies
RUN composer install --no-interaction --prefer-dist

# Expose Render port (Render sets $PORT)
EXPOSE 10000

# Start Ratchet WebSocket server
CMD php server.php

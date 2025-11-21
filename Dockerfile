# PHP CLI for WebSocket server (Apache not needed)
FROM php:8.2-cli

# Install dependencies
RUN apt-get update \
    && apt-get install -y git unzip libzip-dev \
    && docker-php-ext-install zip

# Set working directory
WORKDIR /var/www/html

# Copy composer files
COPY composer.json composer.lock* ./

# Install Composer
RUN curl -sS https://getcomposer.org/installer | php \
    -- --install-dir=/usr/local/bin --filename=composer

# Install dependencies (Ratchet, PSR-4 autoload)
RUN composer install --no-dev --optimize-autoloader

# Copy ALL project files
COPY src/ ./src/
COPY server.php ./server.php
COPY public/ ./public/

# Permissions (safe)
RUN chown -R www-data:www-data /var/www/html

# Expose WebSocket port
EXPOSE 8080

# Run websocket server
CMD ["php", "server.php"]

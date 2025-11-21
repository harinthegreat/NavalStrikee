# Use official PHP CLI image (WEBSOCKET DOES NOT WORK WITH APACHE)
FROM php:8.2-cli

# Install needed OS packages + zip extension for Composer
RUN apt-get update \
    && apt-get install -y unzip git libzip-dev \
    && docker-php-ext-install zip

# Set work directory
WORKDIR /var/www/html

# Copy composer files first for layer caching
COPY composer.json composer.lock* ./

# Install Composer globally
RUN curl -sS https://getcomposer.org/installer | php \
  -- --install-dir=/usr/local/bin --filename=composer

# Install PHP dependencies (Ratchet)
RUN composer install --no-dev --optimize-autoloader

# Copy your source code
COPY src/ /var/www/html/

# Expose the WebSocket port
EXPOSE 8080

# Start the WebSocket server
CMD ["php", "server.php"]

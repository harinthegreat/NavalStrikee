# ============================================
#      NavalStrikee – PHP WebSocket Backend
# ============================================

# Base PHP image
FROM php:8.2-cli

# Update system packages
RUN apt-get update

# Set working directory
WORKDIR /var/www/html

# Copy backend files
COPY src/ /var/www/html/

# Fix file permissions
RUN chown -R www-data:www-data /var/www/html

# Expose websocket port
EXPOSE 8080

# Start the WebSocket server
CMD ["php", "server.php"]

<?php
/**
 * index.php - Main Entry Point and Router
 * 
 * This file serves as the entry point for the Battleship game application.
 * It handles HTTP requests and routes them to appropriate static files.
 * 
 * Features:
 * - Serves static files (HTML, CSS, JS)
 * - Sets proper cache control headers
 * - Handles 404 errors for missing files
 * - Routes root requests to index.html
 */

// Set cache control headers to prevent browser caching
// This ensures users always get the latest version of the game
header('Cache-Control: no-cache, no-store, must-revalidate');
header('Pragma: no-cache');
header('Expires: 0');

// Get the requested URI path
$requestUri = $_SERVER['REQUEST_URI'];

// Get the base directory path (where this file is located)
$publicPath = __DIR__;

// Handle root path or index.html requests
if ($requestUri === '/' || $requestUri === '/index.html') {
    // Serve the main HTML file
    include $publicPath . '/index.html';
} 
// Handle static file requests (CSS, JS, HTML)
elseif (preg_match('/\.(css|js|html)$/', $requestUri)) {
    // Build full file path by combining base path with requested URI
    $filePath = $publicPath . $requestUri;
    
    // Check if file exists
    if (file_exists($filePath)) {
        // Get file extension to determine MIME type
        $ext = pathinfo($filePath, PATHINFO_EXTENSION);
        
        // Map file extensions to MIME types
        $mimeTypes = [
            'css' => 'text/css',                    // CSS stylesheets
            'js' => 'application/javascript',        // JavaScript files
            'html' => 'text/html'                    // HTML files
        ];
        
        // Set appropriate Content-Type header
        // Use 'text/plain' as fallback if extension not recognized
        header('Content-Type: ' . ($mimeTypes[$ext] ?? 'text/plain'));
        
        // Output file contents directly to browser
        readfile($filePath);
    } else {
        // File not found - return 404 error
        http_response_code(404);
        echo '404 Not Found';
    }
} 
// Default: serve index.html for any other requests
else {
    // Fallback to main HTML file for unknown routes
    include $publicPath . '/index.html';
}

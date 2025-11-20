<?php
header('Cache-Control: no-cache, no-store, must-revalidate');
header('Pragma: no-cache');
header('Expires: 0');

$requestUri = $_SERVER['REQUEST_URI'];
$publicPath = __DIR__;

if ($requestUri === '/' || $requestUri === '/index.html') {
    include $publicPath . '/index.html';
} elseif (preg_match('/\.(css|js|html)$/', $requestUri)) {
    $filePath = $publicPath . $requestUri;
    if (file_exists($filePath)) {
        $ext = pathinfo($filePath, PATHINFO_EXTENSION);
        $mimeTypes = [
            'css' => 'text/css',
            'js' => 'application/javascript',
            'html' => 'text/html'
        ];
        header('Content-Type: ' . ($mimeTypes[$ext] ?? 'text/plain'));
        readfile($filePath);
    } else {
        http_response_code(404);
        echo '404 Not Found';
    }
} else {
    include $publicPath . '/index.html';
}

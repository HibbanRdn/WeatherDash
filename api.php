<?php
/**
 * Weather API Handler & Session Storage
 * Fitur:
 * 1. Proxy ke WeatherAPI.com
 * 2. Load API Key dari .env (Tanpa Composer)
 * 3. Session Storage untuk Favorit
 * 4. 5-Day Forecast
 */

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST');
header('Access-Control-Allow-Headers: Content-Type');

// --- 1. FUNGSI LOAD ENV MANUAL ---
// Membaca file .env baris per baris dan menyimpannya ke environment server
function loadEnv($path) {
    if (!file_exists($path)) {
        return false;
    }
    
    $lines = file($path, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES);
    foreach ($lines as $line) {
        // Lewati komentar
        if (strpos(trim($line), '#') === 0) {
            continue;
        }
        
        // Parse format KEY=VALUE
        if (strpos($line, '=') !== false) {
            list($name, $value) = explode('=', $line, 2);
            $name = trim($name);
            $value = trim($value);
            
            putenv(sprintf('%s=%s', $name, $value));
            $_ENV[$name] = $value;
        }
    }
}

// Jalankan load .env dari folder yang sama
loadEnv(__DIR__ . '/.env');

// --- 2. KONFIGURASI API ---
// Ambil Key dari Environment Variable
$apiKey = getenv('WEATHER_API_KEY');

// Validasi jika Key tidak ditemukan
if (!$apiKey) {
    http_response_code(500);
    die(json_encode([
        'error' => [
            'message' => 'Server Error: API Key not configured. Please check .env file.'
        ]
    ]));
}

define('API_KEY', $apiKey); 
define('BASE_URL', 'http://api.weatherapi.com/v1');

// --- 3. FUNGSI REQUEST ---
function makeRequest($endpoint, $params = []) {
    $params['key'] = API_KEY;
    $params['lang'] = 'id'; 

    $url = BASE_URL . $endpoint . '?' . http_build_query($params);
    
    $ch = curl_init();
    curl_setopt($ch, CURLOPT_URL, $url);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_FOLLOWLOCATION, true);
    curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false);
    curl_setopt($ch, CURLOPT_TIMEOUT, 30);
    
    $response = curl_exec($ch);
    $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);
    
    if ($httpCode === 200) {
        return json_decode($response, true);
    }
    
    return [
        'error' => true,
        'http_code' => $httpCode, 
        'message' => 'Gagal menghubungi WeatherAPI'
    ];
}

// --- 4. ROUTING ACTION ---
$action = isset($_GET['action']) ? $_GET['action'] : '';

switch($action) {
    case 'search':
        // Pencarian Kota
        $query = isset($_GET['q']) ? $_GET['q'] : '';
        if (strlen($query) < 3) {
            echo json_encode([]); 
        } else {
            $data = makeRequest('/search.json', ['q' => $query]);
            echo json_encode($data);
        }
        break;
        
    case 'weather':
        // Data Cuaca Utama
        $cityId = isset($_GET['id']) ? $_GET['id'] : '';
        if (empty($cityId)) {
            http_response_code(400);
            echo json_encode(['error' => ['message' => 'Parameter id tidak boleh kosong']]);
            break;
        }
        
        // UPDATE: 'days' diubah menjadi 5 sesuai permintaan
        $data = makeRequest('/forecast.json', [
            'q' => $cityId,
            'days' => 6, 
            'aqi' => 'no',
            'alerts' => 'no'
        ]);
        
        if (isset($data['error'])) {
            http_response_code(404);
            echo json_encode($data);
        } else {
            echo json_encode($data);
        }
        break;
        
    case 'favorites':
        // Manajemen Favorit (Session Based)
        if (session_status() === PHP_SESSION_NONE) {
            session_start();
        }
        
        if ($_SERVER['REQUEST_METHOD'] === 'POST') {
            // Simpan data dari Frontend ke Session
            $input = json_decode(file_get_contents('php://input'), true);
            
            $favorites = (isset($input['favorites']) && is_array($input['favorites'])) 
                         ? $input['favorites'] 
                         : [];
            
            $_SESSION['favorite_cities'] = $favorites;
            
            echo json_encode([
                'status' => 'success',
                'message' => 'Favorites synced',
                'data' => $favorites
            ]);
        } else {
            // Ambil data dari Session ke Frontend
            $favorites = isset($_SESSION['favorite_cities']) ? $_SESSION['favorite_cities'] : [];
            echo json_encode([
                'status' => 'success',
                'data' => $favorites
            ]);
        }
        break;
        
    case 'info':
        echo json_encode([
            'status' => 'success',
            'name' => 'Weather Dashboard API',
            'security' => 'Env Loaded',
            'provider' => 'WeatherAPI.com'
        ]);
        break;
        
    default:
        http_response_code(400);
        echo json_encode([
            'status' => 'error',
            'message' => 'Action tidak valid'
        ]);
}
?>
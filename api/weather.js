export default async function handler(req, res) {
    // Konfigurasi CORS (Agar bisa diakses dari domain frontend manapun)
    res.setHeader('Access-Control-Allow-Credentials', true);
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
    res.setHeader(
        'Access-Control-Allow-Headers',
        'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
    );

    // Tangani request OPTIONS (Pre-flight check browser)
    if (req.method === 'OPTIONS') {
        res.status(200).end();
        return;
    }

    // Ambil API Key dari Environment Variable Vercel
    const API_KEY = process.env.WEATHER_API_KEY;
    const BASE_URL = 'http://api.weatherapi.com/v1';

    // Validasi API Key Server
    if (!API_KEY) {
        return res.status(500).json({ 
            error: { 
                message: 'Server Error: API Key belum dikonfigurasi di Environment Variable Vercel.' 
            } 
        });
    }

    // Ambil parameter dari URL (?action=...&q=...)
    const { action, q, id } = req.query;

    try {
        let endpoint = '';
        // Parameter default sesuai logika api.php (lang=id)
        let params = `key=${API_KEY}&lang=id`; 

        // Logika Routing (mirip dengan switch case di api.php)
        if (action === 'search') {
            // Validasi input pencarian (minimal 3 karakter)
            if (!q || q.length < 3) {
                return res.status(200).json([]);
            }
            endpoint = '/search.json';
            params += `&q=${encodeURIComponent(q)}`;

        } else if (action === 'weather') {
            // Validasi ID kota
            if (!id) {
                return res.status(400).json({ error: { message: 'Parameter id tidak boleh kosong' } });
            }
            endpoint = '/forecast.json';
            // Sesuai konfigurasi di api.php: days=6, aqi=no, alerts=no
            params += `&q=${encodeURIComponent(id)}&days=6&aqi=no&alerts=no`;

        } else {
            // Action tidak dikenal
            return res.status(400).json({ 
                status: 'error', 
                message: 'Action tidak valid' 
            });
        }

        // Lakukan request ke WeatherAPI.com
        const response = await fetch(`${BASE_URL}${endpoint}?${params}`);
        const data = await response.json();

        // Jika WeatherAPI mengembalikan error (misal API Key limit habis atau lokasi invalid)
        if (!response.ok) {
            return res.status(response.status).json(data);
        }

        // Kirim hasil sukses ke frontend
        return res.status(200).json(data);

    } catch (error) {
        console.error('Weather Function Error:', error);
        return res.status(500).json({ 
            error: { 
                message: 'Gagal menghubungi layanan cuaca', 
                details: error.message 
            } 
        });
    }
}
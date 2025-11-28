// --- ICONS (SVG Strings) ---
const icons = {
    moon: `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="icon-sm"><path stroke-linecap="round" stroke-linejoin="round" d="M21.752 15.002A9.718 9.718 0 0118 15.75c-5.385 0-9.75-4.365-9.75-9.75 0-1.33.266-2.597.748-3.752A9.753 9.753 0 003 11.25C3 16.635 7.365 21 12.75 21a9.753 9.753 0 009.002-5.998z" /></svg>`,
    sun: `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="icon-sm"><path stroke-linecap="round" stroke-linejoin="round" d="M12 3v2.25m6.364.386l-1.591 1.591M21 12h-2.25m-.386 6.364l-1.591-1.591M12 18.75V21m-4.773-4.227l-1.591 1.591M5.25 12H3m4.227-4.773L5.636 5.636M15.75 12a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0z" /></svg>`,
    starOutline: `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-8 h-8"><path stroke-linecap="round" stroke-linejoin="round" d="M11.48 3.499a.562.562 0 011.04 0l2.125 5.111a.563.563 0 00.475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 00-.182.557l1.285 5.385a.562.562 0 01-.84.61l-4.725-2.885a.563.563 0 00-.586 0L6.982 20.54a.562.562 0 01-.84-.61l1.285-5.386a.562.562 0 00-.182-.557l-4.204-3.602a.563.563 0 01.321-.988l5.518-.442a.563.563 0 00.475-.345L11.48 3.5z" /></svg>`,
    starSolid: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" class="w-8 h-8 text-yellow-400 drop-shadow-md"><path fill-rule="evenodd" d="M10.788 3.21c.448-1.077 1.976-1.077 2.424 0l2.082 5.007 5.404.433c1.164.093 1.636 1.545.749 2.305l-4.117 3.527 1.257 5.273c.271 1.136-.964 2.033-1.96 1.425L12 18.354 7.373 21.18c-.996.608-2.231-.29-1.96-1.425l1.257-5.273-4.117-3.527c-.887-.76-.415-2.212.749-2.305l5.404-.433 2.082-5.006z" clip-rule="evenodd" /></svg>`,
    rain: `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-4 h-4 text-blue-300"><path stroke-linecap="round" stroke-linejoin="round" d="M2.25 15a4.5 4.5 0 004.5 4.5H18a3.75 3.75 0 001.332-7.257 3 3 0 00-3.758-3.848 5.25 5.25 0 00-10.233 2.33A4.502 4.502 0 002.25 15z" /><path stroke-linecap="round" stroke-linejoin="round" d="M10.5 19.5v2.25M13.5 19.5v2.25M7.5 19.5v2.25M16.5 19.5v2.25" /></svg>`
};

// [PERUBAHAN 1] Mengarah ke Vercel Serverless Function, bukan PHP
const BASE_URL = '/api/weather'; 

let currentCityId = null;
let currentCityName = null;
let isDarkMode = false;
let isCelsius = true;
let updateInterval = null;
let searchTimeout = null;
let lastWeatherData = null;
let favoriteCities = [];

document.addEventListener('DOMContentLoaded', function() {
    loadFavoriteCities();
    loadSavedSettings();
    initAutoLocation();
});

// [PERUBAHAN 2] Load Favorit dari LocalStorage (Client Side Only)
function loadFavoriteCities() {
    try {
        const saved = localStorage.getItem('favoriteCities');
        if (saved) {
            favoriteCities = JSON.parse(saved);
        }
    } catch (error) {
        console.error('Gagal memuat favorit local:', error);
        favoriteCities = [];
    }
    renderFavoritesUI();
}

// [PERUBAHAN 3] Simpan Favorit ke LocalStorage (Client Side Only)
function syncFavorites() {
    try {
        localStorage.setItem('favoriteCities', JSON.stringify(favoriteCities));
        renderFavoritesUI();
        updateFavoriteButton(); 
    } catch (error) {
        console.error('Gagal menyimpan favorit:', error);
        showError('Gagal menyimpan favorit');
    }
}

function renderFavoritesUI() {
    const container = document.getElementById('favoriteCities');
    if (favoriteCities.length === 0) {
        container.innerHTML = '<span class="text-xs opacity-50 italic">Belum ada lokasi tersimpan.</span>';
        return;
    }

    let html = '<span class="text-xs font-semibold uppercase tracking-wider opacity-60 mr-2">Tersimpan:</span>';
    favoriteCities.forEach(city => {
        // Encode parameter agar aman jika nama kota mengandung karakter khusus
        html += `
            <button onclick="selectCity('${city.name}', '${city.name}')" 
                class="px-3 py-1 bg-white/20 hover:bg-white/30 border border-white/10 rounded-full text-xs font-semibold transition flex items-center gap-1 group">
                ${city.name}
                <span onclick="event.stopPropagation(); deleteFavorite('${city.name}')" class="hidden group-hover:inline-block hover:text-red-400 ml-1">×</span>
            </button>
        `;
    });
    container.innerHTML = html;
}

function toggleFavorite() {
    if (!currentCityId) return;
    const index = favoriteCities.findIndex(f => f.name === currentCityName);
    
    if (index > -1) {
        favoriteCities.splice(index, 1);
    } else {
        favoriteCities.push({ name: currentCityName, id: currentCityId });
    }
    syncFavorites(); // Panggil fungsi sync lokal yang baru
}

function deleteFavorite(cityName) {
    favoriteCities = favoriteCities.filter(c => c.name !== cityName);
    syncFavorites();
}

function updateFavoriteButton() {
    const btn = document.getElementById('favoriteBtn');
    const isFavorite = favoriteCities.some(f => f.name === currentCityName);
    btn.innerHTML = isFavorite ? icons.starSolid : icons.starOutline;
}

// --- GEOLOCATION LOGIC ---
function initAutoLocation() {
    const lastCity = localStorage.getItem('lastCity');
    if (lastCity) {
        selectCity(lastCity, lastCity);
        return;
    }
    if (navigator.geolocation) {
        showLoading();
        navigator.geolocation.getCurrentPosition(
            (position) => {
                const lat = position.coords.latitude;
                const lon = position.coords.longitude;
                selectCity(`${lat},${lon}`, "Mendeteksi Lokasi...");
            },
            (error) => {
                console.warn("Geolocation error:", error);
                hideLoading();
                selectCity('Jakarta', 'Jakarta');
            }
        );
    } else {
        selectCity('Jakarta', 'Jakarta');
    }
}

// --- SEARCH LOC ---
function searchCity(query) {
    const suggestionsDiv = document.getElementById('suggestions');
    if (!query || query.length < 3) {
        suggestionsDiv.classList.add('hidden');
        return;
    }
    clearTimeout(searchTimeout);
    searchTimeout = setTimeout(async () => {
        try {
            // Fetch ke API Serverless baru
            const response = await fetch(`${BASE_URL}?action=search&q=${query}`);
            const cities = await response.json();
            if (!cities || cities.length === 0) {
                suggestionsDiv.classList.add('hidden');
                return;
            }
            let html = '';
            cities.forEach(city => {
                html += `
                    <div class="suggestion-item p-4 border-b border-gray-100 dark:border-gray-700 last:border-b-0 cursor-pointer hover:bg-blue-50 dark:hover:bg-slate-800 transition flex justify-between items-center group" 
                         onclick="selectCity('${city.name}', '${city.name}')">
                        <div>
                            <p class="font-bold text-gray-800 dark:text-gray-200 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition">${city.name}</p>
                            <p class="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">${city.region}, ${city.country}</p>
                        </div>
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" class="w-5 h-5 text-gray-300 group-hover:text-blue-500 transition">
                            <path fill-rule="evenodd" d="M3 10a.75.75 0 01.75-.75h10.638L10.23 5.29a.75.75 0 111.04-1.08l5.5 5.25a.75.75 0 010 1.08l-5.5 5.25a.75.75 0 11-1.04-1.08l4.158-3.96H3.75A.75.75 0 013 10z" clip-rule="evenodd" />
                        </svg>
                    </div>
                `;
            });
            suggestionsDiv.innerHTML = html;
            suggestionsDiv.classList.remove('hidden');
        } catch (error) { console.error(error); }
    }, 500);
}

function handleSearchEnter(event) {
    if (event.key === 'Enter') {
        const query = event.target.value;
        if(query.length >= 3) selectCity(query, query);
    }
}

function selectCity(cityId, cityName) {
    currentCityId = cityId;
    currentCityName = cityName;
    document.getElementById('suggestions').classList.add('hidden');
    document.getElementById('searchInput').value = cityName;
    loadWeatherData(cityId);
    updateFavoriteButton();
    if (updateInterval) clearInterval(updateInterval);
    updateInterval = setInterval(() => loadWeatherData(cityId), 5 * 60 * 1000);
}

// --- CUACA ---
async function loadWeatherData(cityId) {
    try {
        showLoading();
        hideError();
        // Fetch ke API Serverless baru
        const response = await fetch(`${BASE_URL}?action=weather&id=${cityId}`);
        const data = await response.json();
        if (data.error) throw new Error(data.error.message || 'Lokasi tidak ditemukan');
        lastWeatherData = data;
        displayWeather(data);
        hideLoading();
        const container = document.getElementById('currentWeather');
        container.classList.remove('hidden');
        void container.offsetWidth; 
        container.classList.add('fade-in');
    } catch (error) {
        console.error('Error:', error);
        hideLoading();
        showError(error.message);
    }
}

function displayWeather(data) {
    const current = data.current;
    const location = data.location;
    const forecast = data.forecast.forecastday;

    currentCityName = location.name;
    currentCityId = location.name; 
    document.getElementById('searchInput').value = location.name;
    localStorage.setItem('lastCity', location.name);
    updateFavoriteButton(); 

    document.getElementById('cityName').textContent = location.name;
    document.getElementById('regionName').textContent = `${location.region}, ${location.country}`;
    document.getElementById('timestamp').textContent = `Diperbarui: ${current.last_updated}`;
    document.getElementById('weatherIcon').src = 'https:' + current.condition.icon;
    document.getElementById('weatherDesc').textContent = current.condition.text;
    document.getElementById('humidity').textContent = current.humidity + '%';
    document.getElementById('windSpeed').textContent = current.wind_kph + ' km/h';

    const today = forecast[0].day;
    updateValuesByUnit(current, today);

    let forecastHtml = '';
    forecast.forEach((day) => {
        const date = new Date(day.date);
        const dayName = date.toLocaleDateString('id-ID', { weekday: 'long' });
        const shortDate = date.toLocaleDateString('id-ID', { day: 'numeric', month: 'short' });
        const avgTemp = isCelsius ? day.day.avgtemp_c : day.day.avgtemp_f;
        const unit = isCelsius ? '°C' : '°F';

        forecastHtml += `
            <div class="weather-card bg-white/5 border border-white/10 p-6 rounded-xl text-center hover:bg-white/10 transition duration-300">
                <p class="font-bold text-lg mb-1">${dayName}</p>
                <p class="text-xs uppercase tracking-wider opacity-60 mb-4">${shortDate}</p>
                <div class="flex justify-center items-center gap-4 mb-4">
                    <img src="https:${day.day.condition.icon}" alt="Cuaca" class="w-16 h-16 filter drop-shadow">
                    <div class="text-left">
                        <p class="text-3xl font-bold">${Math.round(avgTemp)}<span class="text-lg opacity-60">${unit}</span></p>
                    </div>
                </div>
                <p class="text-sm font-medium opacity-80 mb-3 truncate">${day.day.condition.text}</p>
                <div class="flex justify-center items-center gap-1 text-xs font-semibold bg-white/10 py-1.5 rounded-lg text-blue-700 dark:text-blue-100">
                    ${icons.rain}
                    <span>${day.day.daily_chance_of_rain}% Hujan</span>
                </div>
            </div>
        `;
    });
    document.getElementById('forecast').innerHTML = forecastHtml;
}

function updateValuesByUnit(current, today) {
    if (isCelsius) {
        document.getElementById('temperature').textContent = Math.round(current.temp_c) + '°';
        document.getElementById('tempMin').textContent = Math.round(today.mintemp_c) + '°';
        document.getElementById('tempMax').textContent = Math.round(today.maxtemp_c) + '°';
    } else {
        document.getElementById('temperature').textContent = Math.round(current.temp_f) + '°';
        document.getElementById('tempMin').textContent = Math.round(today.mintemp_f) + '°';
        document.getElementById('tempMax').textContent = Math.round(today.maxtemp_f) + '°';
    }
}

function toggleUnit() {
    isCelsius = !isCelsius;
    const btn = document.getElementById('unitBtn');
    btn.innerHTML = isCelsius 
        ? `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="icon-sm"><path stroke-linecap="round" stroke-linejoin="round" d="M12 3v2.25m6.364.386l-1.591 1.591M21 12h-2.25m-.386 6.364l-1.591-1.591M12 18.75V21m-4.773-4.227l-1.591 1.591M5.25 12H3m4.227-4.773L5.636 5.636M15.75 12a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0z" /></svg><span>°C</span>` 
        : `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="icon-sm"><path stroke-linecap="round" stroke-linejoin="round" d="M12 3v2.25m6.364.386l-1.591 1.591M21 12h-2.25m-.386 6.364l-1.591-1.591M12 18.75V21m-4.773-4.227l-1.591 1.591M5.25 12H3m4.227-4.773L5.636 5.636M15.75 12a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0z" /></svg><span>°F</span>`;
    localStorage.setItem('tempUnit', isCelsius ? 'celsius' : 'fahrenheit');
    if (lastWeatherData) displayWeather(lastWeatherData);
}

function toggleTheme() {
    isDarkMode = !isDarkMode;
    const body = document.body;
    const themeBtn = document.getElementById('themeBtn');
    if (isDarkMode) {
        body.classList.remove('light-mode');
        body.classList.add('dark-mode');
        themeBtn.innerHTML = `${icons.sun} <span>Light</span>`;
    } else {
        body.classList.remove('dark-mode');
        body.classList.add('light-mode');
        themeBtn.innerHTML = `${icons.moon} <span>Dark</span>`;
    }
    localStorage.setItem('theme', isDarkMode ? 'dark' : 'light');
}

function loadSavedSettings() {
    const savedTheme = localStorage.getItem('theme');
    const themeBtn = document.getElementById('themeBtn');
    if (savedTheme === 'dark') {
        isDarkMode = true;
        document.body.classList.remove('light-mode');
        document.body.classList.add('dark-mode');
        themeBtn.innerHTML = `${icons.sun} <span>Light</span>`;
    } else {
        themeBtn.innerHTML = `${icons.moon} <span>Dark</span>`;
    }
    const savedUnit = localStorage.getItem('tempUnit');
    if (savedUnit === 'fahrenheit') toggleUnit(); 
}

function refreshWeather() { if (currentCityId) loadWeatherData(currentCityId); }
function showLoading() { document.getElementById('loadingIndicator').classList.remove('hidden'); document.getElementById('currentWeather').classList.add('hidden'); }
function hideLoading() { document.getElementById('loadingIndicator').classList.add('hidden'); }
function showError(message) { document.getElementById('errorText').textContent = message; document.getElementById('errorMessage').classList.remove('hidden'); setTimeout(() => hideError(), 5000); }
function hideError() { document.getElementById('errorMessage').classList.add('hidden'); }

document.addEventListener('click', function(event) {
    const searchInput = document.getElementById('searchInput');
    const suggestions = document.getElementById('suggestions');
    if (!searchInput.contains(event.target) && !suggestions.contains(event.target)) {
        suggestions.classList.add('hidden');
    }
});
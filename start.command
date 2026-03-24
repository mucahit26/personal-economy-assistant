#!/bin/bash
# ==========================================
# Finans Koçu — Tek Tıkla Başlat
# ==========================================
cd "$(dirname "$0")"

# Node.js kurulu mu kontrol et
if ! command -v node &> /dev/null; then
    echo "❌ Node.js bulunamadı!"
    echo "📥 https://nodejs.org adresinden kurulum yapın."
    echo ""
    echo "Alternatif: Python sunucusu ile başlatılıyor (proxy olmadan)..."
    PORT=8080
    if lsof -i :$PORT > /dev/null 2>&1; then
        PORT=8081
    fi
    sleep 1 && open "http://localhost:$PORT" &
    python3 -m http.server $PORT
    exit 0
fi

# node_modules yoksa yükle
if [ ! -d "node_modules" ]; then
    echo "📦 Bağımlılıklar yükleniyor..."
    npm install
    echo ""
fi

PORT=3000

# Portu kontrol et
if lsof -i :$PORT > /dev/null 2>&1; then
    echo "⚠️  Port $PORT zaten kullanılıyor, 3001 deneniyor..."
    PORT=3001
fi

echo "🏦 Finans Koçu başlatılıyor..."
echo "📡 http://localhost:$PORT adresinde açılacak"
echo "🔌 Proxy aktif — CORS sorunu yok"
echo ""
echo "Kapatmak için bu pencereyi kapatın veya Ctrl+C basın"
echo "=================================================="

# Tarayıcıda aç
sleep 2 && open "http://localhost:$PORT" &

# Node.js sunucuyu başlat
PORT=$PORT node server.js

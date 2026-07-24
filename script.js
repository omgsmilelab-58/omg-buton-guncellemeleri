const { shell, ipcRenderer } = require('electron');

// =========================================================================
// YÖNETİCİ AYARI: KONFİGÜRASYON URL'Sİ
// Bu linki kendi sunucunuzdaki bir config.json adresi ile değiştirebilirsiniz.
// Örneğin: const CONFIG_URL = 'https://sirketiniz.com/api/omg-config.json';
// Şimdilik test amaçlı yerel klasördeki config.json dosyasını okuyoruz.
const CONFIG_URL = 'config.json';
// =========================================================================

document.addEventListener('DOMContentLoaded', async () => {
    const buttonsContainer = document.querySelector('.buttons');
    const mainButton = document.querySelector('.main-button');

    // 1. Ayarları Uzaktan Çek
    let config = { buttons: [] };
    try {
        const response = await fetch(CONFIG_URL);
        if (!response.ok) throw new Error('Network response was not ok');
        config = await response.json();
    } catch (error) {
        console.error('Yapılandırma dosyası çekilemedi:', error);
        alert("Bağlantı ayarları okunamadı. Lütfen internet bağlantınızı veya config.json dosyasını kontrol edin.");
        return;
    }

    const buttonsData = config.buttons || [];
    const radius = 100; // Butonların merkezden uzaklığı (açılma mesafesi)

    // 2. Butonları Dinamik Olarak Çiz ve Matematiksel Olarak Dağıt
    buttonsData.forEach((btnData, index) => {
        // Toplam buton sayısına göre açıyı (360 derece / N) hesapla
        // -Math.PI / 2 ekleyerek (yukarıdan - 12 yönünden) başlamasını sağlıyoruz
        const angle = (index * (2 * Math.PI) / buttonsData.length) - (Math.PI / 2);

        // Sinüs ve Kosinüs ile X ve Y kordinatlarını bul (Hover olunca gidilecek yer)
        const hoverX = Math.round(Math.cos(angle) * radius);
        const hoverY = Math.round(Math.sin(angle) * radius);

        // A elementi oluştur
        const a = document.createElement('a');
        a.href = "#";
        a.className = "button";
        
        // CSS Değişkenlerini (Renkler ve Hover kordinatları) JavaScript ile enjekte et
        // Tıklanan rengin biraz koyu/açık tonu için aynı rengi kullanıyoruz şimdilik (tek renk degrade)
        a.style.setProperty('--grad1', btnData.color);
        a.style.setProperty('--grad2', btnData.color);
        a.style.setProperty('--hover-x', `${hoverX}px`);
        a.style.setProperty('--hover-y', `${hoverY}px`);

        // İkonu ekle
        const icon = document.createElement('span');
        icon.className = "material-symbols-rounded logoIcon";
        icon.textContent = btnData.icon || 'apps';
        a.appendChild(icon);

        // Tooltip (İsim) ekle
        const tooltip = document.createElement('span');
        tooltip.className = "tooltip";
        tooltip.textContent = btnData.name;
        
        // Tooltip yönünü belirle: Eğer buton ekranın alt yarısındaysa (hoverY > 20) tooltip aşağı baksın
        if (hoverY > 20) {
            // JS üzerinden tooltip yönünü dinamik kontrol edebiliriz
            // tooltip.style.top = "60px"; -> Hover sırasında tetiklenen style ile çakışabilir
            // O yüzden özel bir class ekleyelim
            tooltip.classList.add('tooltip-bottom');
        }
        a.appendChild(tooltip);

        // Tıklama olayını tanımla
        a.addEventListener('click', (e) => {
            e.preventDefault();
            if (btnData.url && btnData.url.trim() !== '') {
                let url = btnData.url.trim();
                if (!url.startsWith('http://') && !url.startsWith('https://')) {
                    url = 'https://' + url;
                }
                ipcRenderer.send('open-app-window', url);
            }
        });

        // DOM'a ekle (Ana butonun hemen üstüne yerleştir)
        buttonsContainer.insertBefore(a, mainButton);
    });

    // =========================================================================
    // Özel Sürükleme Mantığı (JS tabanlı daha güvenilir sürükleme)
    // =========================================================================
    let isDragging = false;
    let mouseOffset = { x: 0, y: 0 };

    mainButton.addEventListener('mousedown', (e) => {
        isDragging = true;
        // Mouse'un pencereye göre nerede tıklandığını kaydet
        mouseOffset.x = e.clientX;
        mouseOffset.y = e.clientY;
    });

    document.addEventListener('mousemove', (e) => {
        if (isDragging) {
            ipcRenderer.send('window-move', { 
                mouseX: mouseOffset.x, 
                mouseY: mouseOffset.y 
            });
        }
    });

    document.addEventListener('mouseup', () => {
        if (isDragging) {
            isDragging = false;
            ipcRenderer.send('window-drag-end');
        }
    });
});

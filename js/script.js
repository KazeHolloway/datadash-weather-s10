/* jshint esversion: 8 */

const API_KEY = "9be821f180bfc4b9363c7cf6da7326e8";
const VILLE_PAR_DEFAUT = "Brazzaville";

const loader = document.getElementById("loader");
const errorMessage = document.getElementById("error-message");
const weatherCard = document.getElementById("weather-card");
const cityName = document.getElementById("city-name");
const weatherIcon = document.getElementById("weather-icon");
const temperature = document.getElementById("temperature");
const description = document.getElementById("description");
const humidity = document.getElementById("humidity");
const scrollTopBtn = document.getElementById("scroll-top");

const modeToggle = document.getElementById("mode-toggle");
const paletteToggle = document.getElementById("palette-toggle");
const palettePanel = document.getElementById("palette-panel");
const paletteItems = document.querySelectorAll(".palette-item");

// recupere la meteo actuelle d'une ville via l'api openweathermap
async function obtenirMeteo(ville) {
    afficherLoader(true);
    errorMessage.hidden = true;
    weatherCard.hidden = true;

    try {
        const url = `https://api.openweathermap.org/data/2.5/weather?q=${ville}&appid=${API_KEY}&units=metric&lang=fr`;
        const reponse = await fetch(url);

        if (!reponse.ok) {
            throw new Error("ville introuvable");
        }

        const data = await reponse.json();
        afficherMeteo(data);
    } catch (erreur) {
        afficherErreur();
    } finally {
        afficherLoader(false);
    }
}

// affiche les donnees meteo recues dans la carte du dashboard
function afficherMeteo(data) {
    cityName.textContent = `${data.name}, ${data.sys.country}`;
    temperature.textContent = `${Math.round(data.main.temp)}°C`;
    description.textContent = data.weather[0].description;
    humidity.textContent = `${data.main.humidity}%`;

    const icone = data.weather[0].icon;
    weatherIcon.innerHTML = `<img src="https://openweathermap.org/img/wn/${icone}@2x.png" alt="${data.weather[0].description}">`;

    weatherCard.hidden = false;
}

// affiche un message d'erreur clair et sympathique en cas d'echec
function afficherErreur() {
    errorMessage.innerHTML = "<strong>Ville introuvable.</strong> <em>Vérifie l'orthographe et réessaie.</em>";
    errorMessage.hidden = false;
}

// bascule l'affichage du loader
function afficherLoader(afficher) {
    loader.hidden = !afficher;
}

// bascule entre le mode clair et le mode sombre, sauvegarde en local
function basculerMode() {
    const modeActuel = document.documentElement.getAttribute("data-mode");
    const nouveauMode = modeActuel === "dark" ? "light" : "dark";
    document.documentElement.setAttribute("data-mode", nouveauMode);
    localStorage.setItem("mode", nouveauMode);
}

// applique une palette de couleurs et la sauvegarde en local
function appliquerPalette(palette) {
    document.documentElement.setAttribute("data-palette", palette);
    localStorage.setItem("palette", palette);
    paletteItems.forEach(item => item.classList.toggle("active", item.dataset.palette === palette));
}

// initialise le mode et la palette sauvegardes, ou les valeurs par defaut au chargement
function initTheme() {
    const modeSauvegarde = localStorage.getItem("mode") || "dark";
    const paletteSauvegardee = localStorage.getItem("palette") || "ruby";
    document.documentElement.setAttribute("data-mode", modeSauvegarde);
    appliquerPalette(paletteSauvegardee);
}

// ouvre ou ferme le panneau de selection de palette
function basculerPanneauPalette() {
    const estOuvert = palettePanel.classList.toggle("open");
    paletteToggle.classList.toggle("open", estOuvert);
    paletteToggle.setAttribute("aria-expanded", estOuvert);
    palettePanel.setAttribute("aria-hidden", !estOuvert);
}

modeToggle.addEventListener("click", basculerMode);
paletteToggle.addEventListener("click", basculerPanneauPalette);

paletteItems.forEach(item => {
    item.addEventListener("click", () => appliquerPalette(item.dataset.palette));
});

// ferme le panneau de palette si un clic a lieu en dehors de celui-ci
document.addEventListener("click", (evenement) => {
    if (!palettePanel.classList.contains("open")) return;
    const clicDansPanneau = evenement.target.closest("#palette-panel");
    const clicSurToggle = evenement.target.closest("#palette-toggle");
    if (!clicDansPanneau && !clicSurToggle) {
        basculerPanneauPalette();
    }
});

// affiche ou cache le bouton remonter en haut selon le defilement
window.addEventListener("scroll", () => {
    scrollTopBtn.hidden = window.scrollY <= 400;
});

scrollTopBtn.addEventListener("click", () => {
    window.scrollTo({ top: 0, behavior: "smooth" });
});

initTheme();
obtenirMeteo(VILLE_PAR_DEFAUT);
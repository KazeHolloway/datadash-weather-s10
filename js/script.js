/* jshint esversion: 8 */

const API_KEY = "9be821f180bfc4b9363c7cf6da7326e8";
const VILLE_PAR_DEFAUT = "Brazzaville";
const HISTORIQUE_CLE = "datadash-historique";

const loader = document.getElementById("loader");
const errorMessage = document.getElementById("error-message");
const weatherCard = document.getElementById("weather-card");
const cityName = document.getElementById("city-name");
const dateJour = document.getElementById("date-jour");
const weatherIcon = document.getElementById("weather-icon");
const temperature = document.getElementById("temperature");
const description = document.getElementById("description");
const ressenti = document.getElementById("ressenti");
const humidity = document.getElementById("humidity");
const vent = document.getElementById("vent");
const pression = document.getElementById("pression");
const visibilite = document.getElementById("visibilite");
const leverSoleil = document.getElementById("lever-soleil");
const coucherSoleil = document.getElementById("coucher-soleil");
const majHeure = document.getElementById("maj-heure");
const previsionsListe = document.getElementById("previsions-liste");
const scrollTopBtn = document.getElementById("scroll-top");

const searchForm = document.getElementById("search-form");
const searchInput = document.getElementById("search-input");
const clearSearchBtn = document.getElementById("clear-search");
const quickCityButtons = document.querySelectorAll(".quick-city");
const historiqueSection = document.getElementById("historique-section");
const historiqueListe = document.getElementById("historique-liste");

const modeToggle = document.getElementById("mode-toggle");
const paletteToggle = document.getElementById("palette-toggle");
const palettePanel = document.getElementById("palette-panel");
const paletteItems = document.querySelectorAll(".palette-item");

// convertit un nom de ville en coordonnees gps via l'api de geocodage, plus fiable que la recherche par nom
// convertit un nom de ville en coordonnees gps via l'api de geocodage, plus fiable que la recherche par nom
async function obtenirMeteo(ville) {
    afficherLoader(true);
    errorMessage.hidden = true;
    weatherCard.hidden = true;

    try {
        const villeNettoyee = ville.trim();
        const urlGeocodage = `https://api.openweathermap.org/geo/1.0/direct?q=${encodeURIComponent(villeNettoyee)}&limit=5&appid=${API_KEY}`;
        const reponseGeocodage = await fetch(urlGeocodage);

        if (!reponseGeocodage.ok) {
            throw new Error("erreur geocodage");
        }

        const resultatsGeocodage = await reponseGeocodage.json();

        if (resultatsGeocodage.length === 0) {
            throw new Error("ville introuvable");
        }

        // privilegie une correspondance exacte avec la saisie plutot que le premier resultat, souvent un quartier ou une subdivision
        const correspondanceExacte = resultatsGeocodage.find(resultat => resultat.name.toLowerCase() === villeNettoyee.toLowerCase());
        const meilleurResultat = correspondanceExacte || resultatsGeocodage[0];
        const { lat, lon } = meilleurResultat;

        const [reponseMeteo, reponsePrevisions] = await Promise.all([
            fetch(`https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&appid=${API_KEY}&units=metric&lang=fr`),
            fetch(`https://api.openweathermap.org/data/2.5/forecast?lat=${lat}&lon=${lon}&appid=${API_KEY}&units=metric&lang=fr`)
        ]);

        if (!reponseMeteo.ok || !reponsePrevisions.ok) {
            throw new Error("meteo introuvable");
        }

        const data = await reponseMeteo.json();
        const dataPrevisions = await reponsePrevisions.json();

        afficherMeteo(data);
        afficherPrevisions(dataPrevisions);
        ajouterHistorique(data.name);
    } catch (erreur) {
        afficherErreur();
    } finally {
        afficherLoader(false);
    }
}

// affiche toutes les donnees meteo recues dans le tableau de bord
function afficherMeteo(data) {
    cityName.textContent = `${data.name}, ${data.sys.country}`;
    dateJour.textContent = formaterDate(data.timezone);
    temperature.textContent = `${Math.round(data.main.temp)}°C`;
    description.textContent = data.weather[0].description;
    ressenti.textContent = `Ressenti : ${Math.round(data.main.feels_like)}°C`;
    humidity.textContent = `${data.main.humidity} %`;
    vent.textContent = `${Math.round(data.wind.speed * 3.6)} km/h`;
    pression.textContent = `${data.main.pressure} hPa`;
    visibilite.textContent = `${(data.visibility / 1000).toFixed(1)} km`;
    leverSoleil.textContent = formaterHeure(data.sys.sunrise, data.timezone);
    coucherSoleil.textContent = formaterHeure(data.sys.sunset, data.timezone);

    const maintenant = new Date();
    const heuresLocales = String(maintenant.getHours()).padStart(2, "0");
    const minutesLocales = String(maintenant.getMinutes()).padStart(2, "0");
    majHeure.textContent = `Dernière actualisation à ${heuresLocales}:${minutesLocales}`;

    weatherIcon.innerHTML = obtenirIconeMeteo(data.weather[0].icon);

    weatherCard.hidden = false;
}

// conserve une seule entree par jour dans les 40 entrees 3h de l'api, celle la plus proche de midi local
function afficherPrevisions(dataPrevisions) {
    const joursCourts = ["dim.", "lun.", "mar.", "mer.", "jeu.", "ven.", "sam."];
    const parJour = {};

    dataPrevisions.list.forEach(entree => {
        const dateLocale = new Date((entree.dt + dataPrevisions.city.timezone) * 1000);
        const cle = dateLocale.getUTCDate();
        const ecartMidi = Math.abs(dateLocale.getUTCHours() - 12);

        if (!parJour[cle] || ecartMidi < parJour[cle].ecart) {
            parJour[cle] = { entree, ecart: ecartMidi, date: dateLocale };
        }
    });

    const joursRetenus = Object.values(parJour).slice(0, 5);

    previsionsListe.innerHTML = joursRetenus.map(({ entree, date }) => {
        const jour = joursCourts[date.getUTCDay()];
        const icone = obtenirIconeMeteo(entree.weather[0].icon, 0.6);
        const temp = Math.round(entree.main.temp);
        return `<div class="prevision-jour"><span class="prevision-label">${jour}</span><div class="weather-icon-small">${icone}</div><span class="prevision-temp">${temp}°C</span></div>`;
    }).join("");
}

// convertit un timestamp unix en heure lisible, ajustee au fuseau horaire de la ville
function formaterHeure(timestampUnix, decalageSecondes) {
    const date = new Date((timestampUnix + decalageSecondes) * 1000);
    const heures = String(date.getUTCHours()).padStart(2, "0");
    const minutes = String(date.getUTCMinutes()).padStart(2, "0");
    return `${heures}:${minutes}`;
}

// construit la date du jour lisible en francais, ajustee au fuseau horaire de la ville
function formaterDate(decalageSecondes) {
    const maintenant = new Date(Date.now() + decalageSecondes * 1000);
    const jours = ["dimanche", "lundi", "mardi", "mercredi", "jeudi", "vendredi", "samedi"];
    const mois = ["janvier", "février", "mars", "avril", "mai", "juin", "juillet", "août", "septembre", "octobre", "novembre", "décembre"];
    const jour = jours[maintenant.getUTCDay()];
    const numero = maintenant.getUTCDate();
    const moisNom = mois[maintenant.getUTCMonth()];
    return `${jour.charAt(0).toUpperCase()}${jour.slice(1)} ${numero} ${moisNom.charAt(0).toUpperCase()}${moisNom.slice(1)}`;
}

function svgSoleil(taille) {
    return `<svg class="piece-soleil" viewBox="0 0 24 24" width="${taille}" height="${taille}"><circle cx="12" cy="12" r="5" fill="#FFC107"></circle><g stroke="#FFC107" stroke-width="2" stroke-linecap="round"><line x1="12" y1="1" x2="12" y2="4"></line><line x1="12" y1="20" x2="12" y2="23"></line><line x1="1" y1="12" x2="4" y2="12"></line><line x1="20" y1="12" x2="23" y2="12"></line><line x1="4.2" y1="4.2" x2="6.3" y2="6.3"></line><line x1="17.7" y1="17.7" x2="19.8" y2="19.8"></line><line x1="4.2" y1="19.8" x2="6.3" y2="17.7"></line><line x1="17.7" y1="6.3" x2="19.8" y2="4.2"></line></g></svg>`;
}

function svgLune(taille) {
    return `<svg class="piece-lune" viewBox="0 0 24 24" width="${taille}" height="${taille}"><path d="M20 14.5A8.5 8.5 0 1 1 9.5 4a6.5 6.5 0 0 0 10.5 10.5z" fill="#FDE68A"></path></svg>`;
}

function svgNuage(taille, couleur) {
    return `<svg class="piece-nuage" viewBox="0 0 24 24" width="${taille}" height="${taille}"><path d="M18 18H6a4 4 0 0 1-.4-7.98 5 5 0 0 1 9.34-2.44A4.5 4.5 0 0 1 18 18z" fill="${couleur}" stroke="#94A3B8" stroke-width="0.6"></path></svg>`;
}

function svgPluie(taille) {
    return `<svg class="piece-pluie" viewBox="0 0 24 24" width="${taille}" height="${taille}"><g stroke="#4FC3F7" stroke-width="2" stroke-linecap="round"><line class="goutte" x1="8" y1="16" x2="7" y2="20"></line><line class="goutte" x1="12" y1="16" x2="11" y2="20"></line><line class="goutte" x1="16" y1="16" x2="15" y2="20"></line></g></svg>`;
}

function svgNeige(taille) {
    return `<svg class="piece-neige" viewBox="0 0 24 24" width="${taille}" height="${taille}"><g fill="#E0F2FE" stroke="#94A3B8" stroke-width="0.4"><circle class="flocon" cx="8" cy="18" r="1.4"></circle><circle class="flocon" cx="12" cy="19" r="1.4"></circle><circle class="flocon" cx="16" cy="18" r="1.4"></circle></g></svg>`;
}

function svgEclair(taille) {
    return `<svg class="piece-eclair" viewBox="0 0 24 24" width="${taille}" height="${taille}"><path d="M13 10V3L4 14h6v7l9-11h-6z" fill="#FFD600"></path></svg>`;
}

function svgBrouillard(taille) {
    return `<svg class="piece-brouillard" viewBox="0 0 24 24" width="${taille}" height="${taille}"><g stroke="#B0BEC5" stroke-width="2" stroke-linecap="round"><line class="brume" x1="3" y1="8" x2="21" y2="8"></line><line class="brume" x1="3" y1="13" x2="21" y2="13"></line><line class="brume" x1="3" y1="18" x2="21" y2="18"></line></g></svg>`;
}

// compose l'icone meteo, avec un parametre d'echelle pour reutiliser la meme logique en plus petit dans les previsions
function obtenirIconeMeteo(codeIcone, echelle = 1) {
    const estJour = codeIcone.endsWith("d");
    const prefixe = codeIcone.slice(0, 2);
    const astre = estJour ? svgSoleil(46 * echelle) : svgLune(42 * echelle);

    switch (prefixe) {
        case "01":
            return `<div class="icone-solo">${estJour ? svgSoleil(64 * echelle) : svgLune(58 * echelle)}</div>`;
        case "02":
            return `<div class="icone-combo"><div class="combo-astre">${astre}</div><div class="combo-nuage">${svgNuage(48 * echelle, "#F1F5F9")}</div></div>`;
        case "03":
        case "04":
            return `<div class="icone-combo"><div class="combo-astre combo-astre-discret">${astre}</div><div class="combo-nuage">${svgNuage(60 * echelle, "#E2E8F0")}</div></div>`;
        case "09":
        case "10":
            return `<div class="icone-combo"><div class="combo-nuage">${svgNuage(52 * echelle, "#CBD5E1")}</div><div class="combo-pluie">${svgPluie(50 * echelle)}</div></div>`;
        case "11":
            return `<div class="icone-combo"><div class="combo-nuage">${svgNuage(52 * echelle, "#94A3B8")}</div><div class="combo-eclair">${svgEclair(26 * echelle)}</div></div>`;
        case "13":
            return `<div class="icone-combo"><div class="combo-nuage">${svgNuage(52 * echelle, "#E2E8F0")}</div><div class="combo-pluie">${svgNeige(50 * echelle)}</div></div>`;
        case "50":
            return `<div class="icone-solo">${svgBrouillard(56 * echelle)}</div>`;
        default:
            return `<div class="icone-solo">${svgSoleil(64 * echelle)}</div>`;
    }
}

// affiche un message d'erreur clair et sympathique en cas d'echec
function afficherErreur() {
    errorMessage.innerHTML = "<strong>Ville introuvable.</strong> <em>Vérifie l'orthographe et réessaie.</em>";
    errorMessage.hidden = false;
}

function afficherLoader(afficher) {
    loader.hidden = !afficher;
}

function marquerVilleActive(boutonActif) {
    quickCityButtons.forEach(bouton => bouton.classList.toggle("active", bouton === boutonActif));
}

// ajoute une ville en tete de l'historique, sans doublon (insensible a la casse), limite a 5 entrees
function ajouterHistorique(ville) {
    let historique = JSON.parse(localStorage.getItem(HISTORIQUE_CLE)) || [];
    historique = historique.filter(v => v.toLowerCase() !== ville.toLowerCase());
    historique.unshift(ville);
    historique = historique.slice(0, 5);
    localStorage.setItem(HISTORIQUE_CLE, JSON.stringify(historique));
    afficherHistorique();
}

// affiche les tags de l'historique de recherche, cliquables pour relancer une recherche
function afficherHistorique() {
    const historique = JSON.parse(localStorage.getItem(HISTORIQUE_CLE)) || [];

    if (historique.length === 0) {
        historiqueSection.hidden = true;
        return;
    }

    historiqueSection.hidden = false;
    historiqueListe.innerHTML = historique.map(ville => `<button class="historique-tag" data-ville="${ville}">${ville}</button>`).join("");

    historiqueListe.querySelectorAll(".historique-tag").forEach(tag => {
        tag.addEventListener("click", () => {
            obtenirMeteo(tag.dataset.ville);
            marquerVilleActive(null);
        });
    });
}

searchInput.addEventListener("input", () => {
    clearSearchBtn.hidden = searchInput.value.length === 0;
});

clearSearchBtn.addEventListener("click", () => {
    searchInput.value = "";
    clearSearchBtn.hidden = true;
    searchInput.focus();
});

searchForm.addEventListener("submit", (evenement) => {
    evenement.preventDefault();
    const ville = searchInput.value.trim();
    if (ville === "") return;
    obtenirMeteo(ville);
    marquerVilleActive(null);
});

quickCityButtons.forEach(bouton => {
    bouton.addEventListener("click", () => {
        obtenirMeteo(bouton.dataset.ville);
        searchInput.value = "";
        clearSearchBtn.hidden = true;
        marquerVilleActive(bouton);
    });
});

function basculerMode() {
    const modeActuel = document.documentElement.getAttribute("data-mode");
    const nouveauMode = modeActuel === "dark" ? "light" : "dark";
    document.documentElement.setAttribute("data-mode", nouveauMode);
    localStorage.setItem("mode", nouveauMode);
}

function appliquerPalette(palette) {
    document.documentElement.setAttribute("data-palette", palette);
    localStorage.setItem("palette", palette);
    paletteItems.forEach(item => item.classList.toggle("active", item.dataset.palette === palette));
}

function initTheme() {
    const modeSauvegarde = localStorage.getItem("mode") || "dark";
    const paletteSauvegardee = localStorage.getItem("palette") || "ruby";
    document.documentElement.setAttribute("data-mode", modeSauvegarde);
    appliquerPalette(paletteSauvegardee);
}

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

document.addEventListener("click", (evenement) => {
    if (!palettePanel.classList.contains("open")) return;
    const clicDansPanneau = evenement.target.closest("#palette-panel");
    const clicSurToggle = evenement.target.closest("#palette-toggle");
    if (!clicDansPanneau && !clicSurToggle) {
        basculerPanneauPalette();
    }
});

window.addEventListener("scroll", () => {
    scrollTopBtn.hidden = window.scrollY <= 400;
});

scrollTopBtn.addEventListener("click", () => {
    window.scrollTo({ top: 0, behavior: "smooth" });
});

initTheme();
afficherHistorique();
obtenirMeteo(VILLE_PAR_DEFAUT);
document.querySelector(`.quick-city[data-ville="${VILLE_PAR_DEFAUT}"]`).classList.add("active");
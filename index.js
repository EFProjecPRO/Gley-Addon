const { addonBuilder, serveHTTP } = require("stremio-addon-sdk");
const fetch = require("node-fetch");

// URL ka movies.json na serveru
const MOVIES_URL = "https://efproject.pro/GleyPro/movie/movies.json"; // Zameni s tvojim URL-om

// Definisanje manifestacije dodatka
const manifest = {
    id: "com.efprojectpro.gleyaddon",
    version: "1.0.0",
    name: "Gley Addon",
    description: "Addon with manually added movies, cartoons, and series",
    resources: ["catalog", "stream"],
    types: ["movie", "series"],
    catalogs: [
        {
            type: "movie",
            id: "custom_movies",
            name: "Gley (Filmovi)"
        },
        {
            type: "movie",
            id: "custom_cartoons",
            name: "Gley (Crtani)"
        },
        {
            type: "series",
            id: "custom_series",
            name: "Gley (Serije)"
        }
    ],
    background: "https://i.postimg.cc/tgbg5QPW/wallpapers.jpg",
    logo: "https://i.postimg.cc/Dfp8KNk3/ic-stremio-logo.png"
};

// Kreiranje dodatka
const builder = new addonBuilder(manifest);

// Funkcija za kreiranje stream objekta (dodajemo magnet linkove)
const createStream = (streamUrl) => {
    if (streamUrl.includes("magnet:?xt=urn:btih:")) {
        return {
            title: "Watch via Gley Addon",
            url: streamUrl, // Ovo je magnet link koji će biti korišćen za preuzimanje putem torrent klijenta
        };
    } else if (streamUrl.includes("youtube.com") || streamUrl.includes("youtu.be")) {
        return {
            title: "Watch on YouTube",
            ytId: streamUrl.split("v=")[1] || streamUrl.split("/").pop(),
        };
    } else {
        return {
            title: "Watch Now",
            url: streamUrl, // Standardni URL za strimovanje
        };
    }
};

// Funkcija za učitavanje podataka o filmovima sa servera
const loadMovies = async () => {
    try {
        const response = await fetch(MOVIES_URL);
        const data = await response.json();
        return data;
    } catch (error) {
        console.error("Failed to load movies data:", error);
        return [];
    }
};

// Ruta za katalog
builder.defineCatalogHandler(async (args) => {
    console.log("CatalogHandler args:", args);

    const movies = await loadMovies(); // Učitavamo filmove sa servera

    if (args.type === "movie" && args.id === "custom_movies") {
        const movieMetas = movies
            .filter((m) => m.type === "movie" && !m.isCartoon)
            .map((m) => ({
                id: m.id,
                type: m.type,
                name: m.name,
                poster: m.poster,
                description: m.description,
            }));
        return { metas: movieMetas };
    }

    if (args.type === "movie" && args.id === "custom_cartoons") {
        const cartoonMetas = movies
            .filter((m) => m.type === "movie" && m.isCartoon)
            .map((m) => ({
                id: m.id,
                type: m.type,
                name: m.name,
                poster: m.poster,
                description: m.description,
            }));
        return { metas: cartoonMetas };
    }

    if (args.type === "series" && args.id === "custom_series") {
        const seriesMetas = movies
            .filter((m) => m.type === "series")
            .map((m) => ({
                id: m.id,
                type: m.type,
                name: m.name,
                poster: m.poster,
                description: m.description,
            }));
        return { metas: seriesMetas };
    }

    return { metas: [] };
});

// Ruta za strimove
builder.defineStreamHandler(async (args) => {
    console.log("StreamHandler args:", args);

    const movies = await loadMovies(); // Učitavamo filmove sa servera

    if (args.type === "movie") {
        const movie = movies.find((m) => m.id === args.id && m.type === "movie");
        console.log("Found movie:", movie);

        if (movie) {
            const stream = createStream(movie.stream);
            console.log("Generated stream object:", stream);

            return { streams: [stream] };
        }
    }

    if (args.type === "series") {
        const [seriesId, seasonNumber, episodeId] = args.id.split(":");
        const series = movies.find((m) => m.id === seriesId && m.type === "series");
        console.log("Found series:", series);

        if (series) {
            const season = series.seasons.find((s) => s.number === parseInt(seasonNumber));
            console.log("Found season:", season);

            if (season) {
                const episode = season.episodes.find((e) => e.id === episodeId);
                console.log("Found episode:", episode);

                if (episode) {
                    const stream = createStream(episode.stream);
                    console.log("Generated stream object for episode:", stream);

                    return { streams: [stream] };
                }
            }
        }
    }

    console.log("No streams found for args:", args);
    return { streams: [] };
});

// Pokretanje servera
serveHTTP(builder.getInterface(), { port: 7000 });
console.log("Addon running on http://localhost:7000");
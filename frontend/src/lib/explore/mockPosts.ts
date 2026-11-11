export interface ExplorePost {
  id: string;
  country: string;
  region: string;
  city: string;
  location: string;
  author: string;
  avatar: string;
  date: string;
  visibility: "everyone" | "friends";
  image?: string;
  caption: string;
  doodleSticker: string;
  likes: number;
  comments: number;
  isTextOnly?: boolean;
  coordinates: [number, number]; // [lng, lat]
}

export const MOCK_POSTS: ExplorePost[] = [
  // Japan - Tokyo
  {
    id: "post-jp-1",
    country: "JP",
    region: "JP-13",
    city: "Tokyo",
    location: "Shibuya Crossing, Tokyo",
    author: "Kenji Sato",
    avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&h=100&fit=crop",
    date: "2026-05-01",
    visibility: "everyone",
    image: "https://images.unsplash.com/photo-1503899036084-c55cdd92da26?w=600&h=420&fit=crop",
    caption: "Midnight umbrellas reflecting neon billboards during a soft spring drizzle. The pulse of Shibuya never slows.",
    doodleSticker: "",
    likes: 215,
    comments: 34,
    coordinates: [139.7006, 35.6595]
  },
  {
    id: "post-jp-2",
    country: "JP",
    region: "JP-13",
    city: "Tokyo",
    location: "Yanaka Ginza, Tokyo",
    author: "Elena Rostova",
    avatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&h=100&fit=crop",
    date: "2026-04-28",
    visibility: "friends",
    image: "https://images.unsplash.com/photo-1542051841857-5f90071e7989?w=600&h=420&fit=crop",
    caption: "Steamed sweet potato from an old wooden cart in Yanaka. Cat sleeping peacefully on the stone steps.",
    doodleSticker: "",
    likes: 98,
    comments: 12,
    coordinates: [139.7680, 35.7275]
  },
  {
    id: "post-jp-3",
    country: "JP",
    region: "JP-13",
    city: "Tokyo",
    location: "Tsukiji Outer Market, Tokyo",
    author: "Liam O'Connor",
    avatar: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=100&h=100&fit=crop",
    date: "2026-04-15",
    visibility: "everyone",
    caption: "Early morning tamagoyaki tasting. The master chef folded four layers in twenty seconds without breaking stride.",
    doodleSticker: "",
    likes: 72,
    comments: 8,
    isTextOnly: true,
    coordinates: [139.7707, 35.6654]
  },

  // Japan - Kyoto
  {
    id: "post-jp-4",
    country: "JP",
    region: "JP-26",
    city: "Kyoto",
    location: "Arashiyama Bamboo Grove, Kyoto",
    author: "Camille Laurent",
    avatar: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100&h=100&fit=crop",
    date: "2026-05-03",
    visibility: "everyone",
    image: "https://images.unsplash.com/photo-1493976040374-85c8e12f0c0e?w=600&h=420&fit=crop",
    caption: "Filtered emerald morning light through tall bamboo stalks. Hearing the wind hollow through the culms is pure calm.",
    doodleSticker: "",
    likes: 310,
    comments: 41,
    coordinates: [135.6713, 35.0166]
  },
  {
    id: "post-jp-5",
    country: "JP",
    region: "JP-26",
    city: "Kyoto",
    location: "Fushimi Inari Taisha, Kyoto",
    author: "Mateo Souza",
    avatar: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=100&h=100&fit=crop",
    date: "2026-04-22",
    visibility: "friends",
    image: "https://images.unsplash.com/photo-1528164344705-475426879c0d?w=600&h=420&fit=crop",
    caption: "Climbing thousands of vermilion torii gates at dusk. The mountain air turns crisp as twilight sets in.",
    doodleSticker: "",
    likes: 184,
    comments: 29,
    coordinates: [135.7727, 34.9671]
  },

  // United States - California
  {
    id: "post-us-1",
    country: "US",
    region: "US-CA",
    city: "San Francisco",
    location: "Golden Gate Overlook, San Francisco",
    author: "Sam Miller",
    avatar: "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100&h=100&fit=crop",
    date: "2026-04-12",
    visibility: "everyone",
    image: "https://images.unsplash.com/photo-1501594907352-04cda38ebc29?w=600&h=420&fit=crop",
    caption: "Watching Karl the Fog roll under the red suspension towers. Warm clam chowder sourdough bowl in hand.",
    doodleSticker: "",
    likes: 189,
    comments: 22,
    coordinates: [-122.4786, 37.8199]
  },
  {
    id: "post-us-2",
    country: "US",
    region: "US-CA",
    city: "Los Angeles",
    location: "Venice Beach Boardwalk, Los Angeles",
    author: "Amina Al-Mansoor",
    avatar: "https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=100&h=100&fit=crop",
    date: "2026-04-18",
    visibility: "friends",
    image: "https://images.unsplash.com/photo-1518495973542-4542c06a5843?w=600&h=420&fit=crop",
    caption: "Sunset roller-skates and guitar acoustics echoing against palm fronds.",
    doodleSticker: "",
    likes: 142,
    comments: 18,
    coordinates: [-118.4720, 33.9850]
  },

  // United States - New York
  {
    id: "post-us-3",
    country: "US",
    region: "US-NY",
    city: "New York City",
    location: "Brooklyn Bridge Promenade, NYC",
    author: "Lucas Vance",
    avatar: "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100&h=100&fit=crop",
    date: "2026-04-10",
    visibility: "everyone",
    image: "https://images.unsplash.com/photo-1534430480872-3498386e7856?w=600&h=420&fit=crop",
    caption: "Twilight stroll across the East River. Manhattan illuminated like a thousand small constellation dots.",
    doodleSticker: "",
    likes: 275,
    comments: 31,
    coordinates: [-73.9969, 40.7061]
  },

  // Indonesia - Bali
  {
    id: "post-id-1",
    country: "ID",
    region: "ID-BA",
    city: "Ubud",
    location: "Tegallalang Rice Terraces, Bali",
    author: "Freja Lind",
    avatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&h=100&fit=crop",
    date: "2026-04-05",
    visibility: "everyone",
    image: "https://images.unsplash.com/photo-1537996194471-e657df975ab4?w=600&h=420&fit=crop",
    caption: "Cascading green terraces in the early morning haze. The fragrance of incense and frangipani blossoms.",
    doodleSticker: "",
    likes: 245,
    comments: 38,
    coordinates: [115.2786, -8.4332]
  },
  {
    id: "post-id-2",
    country: "ID",
    region: "ID-BA",
    city: "Denpasar",
    location: "Sanur Beach Sunrise, Bali",
    author: "Kenji Sato",
    avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&h=100&fit=crop",
    date: "2026-03-30",
    visibility: "friends",
    image: "https://images.unsplash.com/photo-1518548419970-58e3b4079ab2?w=600&h=420&fit=crop",
    caption: "Traditional jukung outrigger canoes floating in glass-smooth water at dawn.",
    doodleSticker: "",
    likes: 112,
    comments: 14,
    coordinates: [115.2625, -8.6850]
  },

  // France - Île-de-France
  {
    id: "post-fr-1",
    country: "FR",
    region: "FR-IDF",
    city: "Paris",
    location: "Le Marais, Paris",
    author: "Camille Laurent",
    avatar: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100&h=100&fit=crop",
    date: "2026-04-20",
    visibility: "everyone",
    image: "https://images.unsplash.com/photo-1502602898657-3e91760cbb34?w=600&h=420&fit=crop",
    caption: "Bookstore crawl through Rue des Rosiers. Found 1920s architecture sketches and warm pistachio croissants.",
    doodleSticker: "",
    likes: 388,
    comments: 52,
    coordinates: [2.3622, 48.8575]
  },

  // Italy - Lazio
  {
    id: "post-it-1",
    country: "IT",
    region: "IT-62",
    city: "Rome",
    location: "Trastevere Cobblestones, Rome",
    author: "Mateo Souza",
    avatar: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=100&h=100&fit=crop",
    date: "2026-04-02",
    visibility: "everyone",
    image: "https://images.unsplash.com/photo-1552832230-c0197dd311b5?w=600&h=420&fit=crop",
    caption: "Cacio e pepe lunch on a sunny piazza, framed by ivy-covered ochre walls. Vespa scooters purring past.",
    doodleSticker: "",
    likes: 290,
    comments: 36,
    coordinates: [12.4700, 41.8890]
  },

  // Australia - New South Wales
  {
    id: "post-au-1",
    country: "AU",
    region: "AU-NSW",
    city: "Sydney",
    location: "Bondi to Bronte Coastal Walk, Sydney",
    author: "Liam O'Connor",
    avatar: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=100&h=100&fit=crop",
    date: "2026-05-04",
    visibility: "everyone",
    image: "https://images.unsplash.com/photo-1506973035872-a4ec16b8e8d9?w=600&h=420&fit=crop",
    caption: "Limestone cliffs carved by Pacific swells. Salty breeze and flat white coffee to finish the morning.",
    doodleSticker: "",
    likes: 195,
    comments: 24,
    coordinates: [151.2743, -33.8915]
  },

  // Brazil - Rio de Janeiro
  {
    id: "post-br-1",
    country: "BR",
    region: "BR-RJ",
    city: "Rio de Janeiro",
    location: "Ipanema Beach, Rio",
    author: "Mateo Souza",
    avatar: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=100&h=100&fit=crop",
    date: "2026-02-28",
    visibility: "everyone",
    image: "https://images.unsplash.com/photo-1483729558449-99ef09a8c325?w=600&h=420&fit=crop",
    caption: "Golden sunset dipping behind Dois Irmãos. Cold água de coco and gentle bossa nova rhythm in the air.",
    doodleSticker: "",
    likes: 220,
    comments: 31,
    coordinates: [-43.2045, -22.9868]
  },

  // Iceland - Reykjavik
  {
    id: "post-is-1",
    country: "IS",
    region: "IS",
    city: "Reykjavik",
    location: "Thingvellir National Park, Iceland",
    author: "Freja Lind",
    avatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&h=100&fit=crop",
    date: "2026-03-14",
    visibility: "friends",
    image: "https://images.unsplash.com/photo-1504893524553-b855bce32c67?w=600&h=420&fit=crop",
    caption: "Aurora borealis ribbons waving across the tectonic rift. Sub-zero stillness warmed by a hot thermos.",
    doodleSticker: "",
    likes: 340,
    comments: 48,
    coordinates: [-21.1290, 64.2559]
  },

  // Singapore
  {
    id: "post-sg-1",
    country: "SG",
    region: "SG",
    city: "Singapore",
    location: "Gardens by the Bay, Singapore",
    author: "Elena Rostova",
    avatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&h=100&fit=crop",
    date: "2026-04-25",
    visibility: "everyone",
    image: "https://images.unsplash.com/photo-1525625293386-3f8f99389edd?w=600&h=420&fit=crop",
    caption: "Supertrees twinkling in blue and gold during the evening garden rhapsody. Tropical breeze high in the canopy.",
    doodleSticker: "",
    likes: 260,
    comments: 30,
    coordinates: [103.8636, 1.2816]
  },

  // Fiji - Suva
  {
    id: "post-fj-1",
    country: "FJ",
    region: "FJ",
    city: "Suva",
    location: "Pacific Harbour, Fiji",
    author: "Sam Miller",
    avatar: "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100&h=100&fit=crop",
    date: "2026-03-20",
    visibility: "everyone",
    image: "https://images.unsplash.com/photo-1540206351-d6465b3ac5c1?w=600&h=420&fit=crop",
    caption: "Coral reef snorkeling along Beqa lagoon. Meeting the 180th meridian where each day begins first.",
    doodleSticker: "",
    likes: 175,
    comments: 19,
    coordinates: [178.4419, -18.1416]
  },

  // Vatican City
  {
    id: "post-va-1",
    country: "VA",
    region: "VA",
    city: "Vatican City",
    location: "St. Peter's Square, Vatican City",
    author: "Camille Laurent",
    avatar: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100&h=100&fit=crop",
    date: "2026-04-17",
    visibility: "everyone",
    image: "https://images.unsplash.com/photo-1568605117036-5fe5e7bab0b7?w=600&h=420&fit=crop",
    caption: "Bernini's colonnade sweeping around the piazza in quiet early sunlight. Marble steps cool to the touch.",
    doodleSticker: "",
    likes: 210,
    comments: 26,
    coordinates: [12.4563, 41.9022]
  }
];

export function getPostsByLocation(
  countryCode?: string,
  regionId?: string,
  visibilityFilter: "everyone" | "friends" = "everyone"
): ExplorePost[] {
  return MOCK_POSTS.filter((post) => {
    // Visibility filter: "everyone" shows all public posts, "friends" shows friends posts
    if (visibilityFilter === "friends" && post.visibility !== "friends") {
      return false;
    }
    if (countryCode && post.country !== countryCode) {
      return false;
    }
    if (regionId && post.region !== regionId) {
      return false;
    }
    return true;
  });
}

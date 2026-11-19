import { Catalog, Post, Info, Stream } from './types';

export interface PreloadedProviderData {
  catalogs: Catalog[];
  categoryPosts: Record<string, Post[]>;
  heroPosts: Post[];
  sampleDetails: Record<string, Info>;
  sampleStreams: Record<string, Stream[]>;
}

export const PRELOADED_DATA: Record<string, PreloadedProviderData> = {
  // Zenda's Flagship Provider: VMovies (vega)
  vega: {
    catalogs: [
      { title: 'Trending Movies & Series', filter: '' },
      { title: 'Netflix Originals', filter: 'web-series/netflix' },
      { title: 'Amazon Prime Video', filter: 'web-series/amazon-prime-video' },
      { title: '4K Ultra HD Movies', filter: 'category/4k-movies' },
      { title: 'Action & Adventure', filter: 'category/movies-by-genres/action' },
      { title: 'Anime & Animation', filter: 'category/movies-by-genres/animation' },
    ],
    heroPosts: [
      {
        title: 'Dune: Part Two (2024)',
        link: 'dune-part-two-2024-full-movie-download',
        image: 'https://image.tmdb.org/t/p/original/1pdfLvkbY9ohJlCjQH2CZjjYVvJ.jpg',
        tag: '8.6 ★',
        cornerTag: '4K UHD',
      },
      {
        title: 'Deadpool & Wolverine (2024)',
        link: 'deadpool-and-wolverine-2024-full-movie',
        image: 'https://image.tmdb.org/t/p/original/yDHYTjA3R0ne8e49r429KcsmMHg.jpg',
        tag: '8.0 ★',
        cornerTag: '1080p',
      },
      {
        title: 'Stranger Things (Season 5)',
        link: 'stranger-things-season-5-complete',
        image: 'https://image.tmdb.org/t/p/original/56v2KjBlU4XaOv9rVYEQypROD7P.jpg',
        tag: '8.7 ★',
        cornerTag: 'NETFLIX',
      },
      {
        title: 'Oppenheimer (2023)',
        link: 'oppenheimer-2023-imax-edition',
        image: 'https://image.tmdb.org/t/p/original/rBtQJ4d9fB234iY3qQ7B12k8Vp7.jpg',
        tag: '8.9 ★',
        cornerTag: 'IMAX',
      },
    ],
    categoryPosts: {
      '': [
        {
          title: 'Dune: Part Two (2024)',
          link: 'dune-part-two-2024-full-movie-download',
          image: 'https://image.tmdb.org/t/p/w500/8b8Rnxud8NmfSv6Z57yF656jTq5.jpg',
          tag: '8.6 ★',
          cornerTag: '4K',
        },
        {
          title: 'Deadpool & Wolverine (2024)',
          link: 'deadpool-and-wolverine-2024-full-movie',
          image: 'https://image.tmdb.org/t/p/w500/8cdWjvZQUExUUTzyp4t6EDMubfO.jpg',
          tag: '8.0 ★',
          cornerTag: 'HD',
        },
        {
          title: 'Kingdom of the Planet of the Apes (2024)',
          link: 'kingdom-of-the-planet-of-the-apes-2024',
          image: 'https://image.tmdb.org/t/p/w500/gKkl37BQuKTanygYQG1pyYgLVgf.jpg',
          tag: '7.2 ★',
          cornerTag: '1080p',
        },
        {
          title: 'Furiosa: A Mad Max Saga (2024)',
          link: 'furiosa-a-mad-max-saga-2024',
          image: 'https://image.tmdb.org/t/p/w500/iADOJ8Zymht2JPMoy3R7xUMZ51f.jpg',
          tag: '7.8 ★',
          cornerTag: '4K',
        },
        {
          title: 'Godzilla x Kong: The New Empire (2024)',
          link: 'godzilla-x-kong-the-new-empire-2024',
          image: 'https://image.tmdb.org/t/p/w500/tMefBSflR6PGQLv7WvFPpKLZkyk.jpg',
          tag: '6.7 ★',
          cornerTag: 'HD',
        },
        {
          title: 'Inside Out 2 (2024)',
          link: 'inside-out-2-2024-full-movie',
          image: 'https://image.tmdb.org/t/p/w500/vpnVM9B6NMmQpWeZvzLvDESb2QY.jpg',
          tag: '7.9 ★',
          cornerTag: '4K',
        },
      ],
      'web-series/netflix': [
        {
          title: 'Stranger Things (Season 4)',
          link: 'stranger-things-season-4-complete',
          image: 'https://image.tmdb.org/t/p/w500/49WJfeN0moxb9IPfGn8AIqMGskD.jpg',
          tag: '8.7 ★',
          cornerTag: 'Series',
        },
        {
          title: 'Wednesday (Season 1)',
          link: 'wednesday-season-1-complete',
          image: 'https://image.tmdb.org/t/p/w500/9PFonB99qQeFLDcil2X972M7YIg.jpg',
          tag: '8.1 ★',
          cornerTag: 'Series',
        },
        {
          title: 'Squid Game (Season 2)',
          link: 'squid-game-season-2-complete',
          image: 'https://image.tmdb.org/t/p/w500/dDlEmu3EZ0Pgg93K2SVNLCjCSvE.jpg',
          tag: '8.0 ★',
          cornerTag: 'Series',
        },
        {
          title: 'One Piece (Live Action Season 1)',
          link: 'one-piece-live-action-season-1',
          image: 'https://image.tmdb.org/t/p/w500/fcXdJUSDiDiFupuDuur8nlhtclS.jpg',
          tag: '8.4 ★',
          cornerTag: 'Series',
        },
      ],
      'web-series/amazon-prime-video': [
        {
          title: 'The Boys (Season 4)',
          link: 'the-boys-season-4-complete',
          image: 'https://image.tmdb.org/t/p/w500/2zmTngn1tYC1AvfnrFLhxeD82xt.jpg',
          tag: '8.7 ★',
          cornerTag: '4K',
        },
        {
          title: 'Fallout (Season 1)',
          link: 'fallout-season-1-complete',
          image: 'https://image.tmdb.org/t/p/w500/ansFbW5A360wT0F2Lz515e0N12P.jpg',
          tag: '8.5 ★',
          cornerTag: '4K',
        },
        {
          title: 'Reacher (Season 2)',
          link: 'reacher-season-2-complete',
          image: 'https://image.tmdb.org/t/p/w500/j7vAecaaq9C50eY2X4i7bFmPj4r.jpg',
          tag: '8.1 ★',
          cornerTag: 'HD',
        },
      ],
      'category/4k-movies': [
        {
          title: 'Avatar: The Way of Water (2022)',
          link: 'avatar-the-way-of-water-2022-4k-uhd',
          image: 'https://image.tmdb.org/t/p/w500/t6HIqrRAclMCA60NsSmeqe9RmNV.jpg',
          tag: '7.8 ★',
          cornerTag: '4K HDR',
        },
        {
          title: 'Interstellar (2014)',
          link: 'interstellar-2014-imax-remastered',
          image: 'https://image.tmdb.org/t/p/w500/gEU2QniE6E77NI6lCU6MxlNBvIx.jpg',
          tag: '8.7 ★',
          cornerTag: '4K IMAX',
        },
      ],
    },
    sampleDetails: {
      'dune-part-two-2024-full-movie-download': {
        title: 'Dune: Part Two (2024)',
        synopsis:
          'Follow the mythic journey of Paul Atreides as he unites with Chani and the Fremen while on a path of revenge against the conspirators who destroyed his family. Facing a choice between the love of his life and the fate of the known universe, he endeavors to prevent a terrible future only he can foresee.',
        image: 'https://image.tmdb.org/t/p/w500/8b8Rnxud8NmfSv6Z57yF656jTq5.jpg',
        poster: 'https://image.tmdb.org/t/p/original/1pdfLvkbY9ohJlCjQH2CZjjYVvJ.jpg',
        imdbId: 'tt15239678',
        type: 'movie',
        rating: '8.6 ★',
        year: '2024',
        tags: ['Sci-Fi', 'Adventure', 'Action', 'Drama'],
        linkList: [
          {
            title: 'Full Movie Streams (4K & 1080p)',
            directLinks: [
              {
                title: 'Direct High-Speed Stream (Auto HLS 4K)',
                link: 'https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8',
                type: 'movie',
              },
              {
                title: 'Alternative CDN Fast Stream (1080p)',
                link: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4',
                type: 'movie',
              },
            ],
          },
        ],
      },
    },
    sampleStreams: {
      'dune-part-two-2024-full-movie-download': [
        {
          server: 'Auto Adaptive (Master HLS - High Speed)',
          link: 'https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8',
          type: 'm3u8',
          quality: 'auto',
        },
        {
          server: 'Direct CDN Full HD (1080p 60Mbps)',
          link: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4',
          type: 'mp4',
          quality: '1080',
        },
      ],
    },
  },

  // Zenda's MultiStream / AutoEmbed
  autoEmbed: {
    catalogs: [
      { title: 'Popular Movies', filter: 'movie' },
      { title: 'Top Rated TV Shows', filter: 'tv' },
      { title: 'Action Blockbusters', filter: 'action' },
      { title: 'Sci-Fi Universe', filter: 'scifi' },
    ],
    heroPosts: [
      {
        title: 'Gladiator II (2024)',
        link: 'gladiator-2-2024',
        image: 'https://image.tmdb.org/t/p/original/b33nnKl1vuvQiXYTQKG3xYq9GQ0.jpg',
        tag: '7.8 ★',
        cornerTag: '4K',
      },
      {
        title: 'Moana 2 (2024)',
        link: 'moana-2-2024',
        image: 'https://image.tmdb.org/t/p/original/v9acaWVxToY07nkT9W44r2k8H7f.jpg',
        tag: '7.2 ★',
        cornerTag: 'HD',
      },
    ],
    categoryPosts: {
      movie: [
        {
          title: 'Gladiator II (2024)',
          link: 'gladiator-2-2024',
          image: 'https://image.tmdb.org/t/p/w500/2cxhvwyEwRlysAmRH4iodkvo0z5.jpg',
          tag: '7.8 ★',
          cornerTag: '4K',
        },
        {
          title: 'Wicked (2024)',
          link: 'wicked-2024',
          image: 'https://image.tmdb.org/t/p/w500/xDGbZ0JJ3mYaGKy4Nzd9Kph6M9L.jpg',
          tag: '7.5 ★',
          cornerTag: 'HD',
        },
        {
          title: 'Red One (2024)',
          link: 'red-one-2024',
          image: 'https://image.tmdb.org/t/p/w500/cdqLnri3NEGcmfnqwk2TSIYohMm.jpg',
          tag: '7.0 ★',
          cornerTag: 'HD',
        },
        {
          title: 'The Substance (2024)',
          link: 'the-substance-2024',
          image: 'https://image.tmdb.org/t/p/w500/lqoMzCcZYEFK729Fc6rKWxezWW.jpg',
          tag: '7.7 ★',
          cornerTag: '4K',
        },
      ],
      tv: [
        {
          title: 'Arcane (Season 2)',
          link: 'arcane-season-2',
          image: 'https://image.tmdb.org/t/p/w500/abf8tZvJE87vt42q6OezS7k0M1p.jpg',
          tag: '9.0 ★',
          cornerTag: '4K',
        },
        {
          title: 'The Penguin (Season 1)',
          link: 'the-penguin-season-1',
          image: 'https://image.tmdb.org/t/p/w500/3E0kC6u3eF8x3J4x01xR7h5L0K1.jpg',
          tag: '8.8 ★',
          cornerTag: 'HBO',
        },
      ],
    },
    sampleDetails: {},
    sampleStreams: {},
  },

  // User's Rule34Video Custom Provider
  rule34video: {
    catalogs: [
      { title: 'Latest Updates', filter: 'latest-updates/1/' },
      { title: 'Top Rated', filter: 'top-rated/1/' },
      { title: 'Most Popular', filter: 'most-popular/1/' },
      { title: '3D & CGI Animations', filter: 'tag/3d/1/' },
    ],
    heroPosts: [
      {
        title: 'Cyberpunk 2077: Lucy & Rebecca Special (4K 60FPS)',
        link: 'video/cyberpunk-lucy-rebecca-4k',
        image: 'https://images.unsplash.com/photo-1578632767115-351597cf2477?w=1200&auto=format&fit=crop&q=80',
        tag: '12:45',
        cornerTag: '4K',
      },
      {
        title: 'Genshin Impact: Raiden Shogun Animation (Blender)',
        link: 'video/raiden-shogun-blender-anim',
        image: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=1200&auto=format&fit=crop&q=80',
        tag: '8:20',
        cornerTag: '60FPS',
      },
    ],
    categoryPosts: {
      'latest-updates/1/': [
        {
          title: 'Cyberpunk 2077: Lucy & Rebecca Special (4K 60FPS)',
          link: 'video/cyberpunk-lucy-rebecca-4k',
          image: 'https://images.unsplash.com/photo-1578632767115-351597cf2477?w=500&auto=format&fit=crop&q=80',
          tag: '12:45 • HD',
          cornerTag: '4K',
        },
        {
          title: 'Genshin Impact: Raiden Shogun Animation (Blender)',
          link: 'video/raiden-shogun-blender-anim',
          image: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=500&auto=format&fit=crop&q=80',
          tag: '8:20 • HD',
          cornerTag: '60FPS',
        },
        {
          title: 'Overwatch: D.Va Neon Night (Ray Tracing)',
          link: 'video/dva-neon-night-raytracing',
          image: 'https://images.unsplash.com/photo-1534447677768-be436bb09401?w=500&auto=format&fit=crop&q=80',
          tag: '15:10 • HD',
          cornerTag: '1080p',
        },
        {
          title: 'Final Fantasy VII: Tifa Lockhart CGI Remake',
          link: 'video/tifa-lockhart-cgi-remake',
          image: 'https://images.unsplash.com/photo-1550745165-9bc0b252726f?w=500&auto=format&fit=crop&q=80',
          tag: '19:40 • HD',
          cornerTag: '4K',
        },
      ],
      'top-rated/1/': [
        {
          title: 'NieR Automata: 2B Eternal Sunset',
          link: 'video/2b-eternal-sunset',
          image: 'https://images.unsplash.com/photo-1511512578047-dfb367046420?w=500&auto=format&fit=crop&q=80',
          tag: '22:15 • HD',
          cornerTag: '4K',
        },
      ],
    },
    sampleDetails: {},
    sampleStreams: {},
  },

  // User's XVideos Custom Provider
  xvideos: {
    catalogs: [
      { title: 'Best Videos', filter: 'best/' },
      { title: 'Verified HD', filter: 'verified/' },
      { title: 'Trending This Week', filter: 'trending/' },
    ],
    heroPosts: [
      {
        title: 'High Speed Direct Stream Showcase',
        link: 'video-sample-xvideos',
        image: 'https://images.unsplash.com/photo-1536440136628-849c177e76a1?w=1200&auto=format&fit=crop&q=80',
        tag: '24:18',
        cornerTag: '1080p',
      },
    ],
    categoryPosts: {
      'best/': [
        {
          title: 'High Speed Direct Stream Showcase',
          link: 'video-sample-xvideos',
          image: 'https://images.unsplash.com/photo-1536440136628-849c177e76a1?w=500&auto=format&fit=crop&q=80',
          tag: '24:18 • HD',
          cornerTag: '1080p',
        },
      ],
    },
    sampleDetails: {},
    sampleStreams: {},
  },
};

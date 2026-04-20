<!DOCTYPE html>

<html class="dark" lang="en"><head>
<meta charset="utf-8"/>
<meta content="width=device-width, initial-scale=1.0" name="viewport"/>
<title>Let's Do It - Your Journey Starts Here</title>
<script src="https://cdn.tailwindcss.com?plugins=forms,container-queries"></script>
<link href="https://fonts.googleapis.com" rel="preconnect"/>
<link crossorigin="" href="https://fonts.gstatic.com" rel="preconnect"/>
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&amp;family=Manrope:wght@400;500;600;700&amp;family=Space+Grotesk:wght@400;500;600;700;800&amp;display=swap" rel="stylesheet"/>
<link href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&amp;display=swap" rel="stylesheet"/>
<link href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&amp;display=swap" rel="stylesheet"/>
<script id="tailwind-config">
        tailwind.config = {
            darkMode: "class",
            theme: {
                extend: {
                    "colors": {
                        "surface-tint": "#c6c6c7",
                        "on-primary": "#1a1c1c",
                        "on-tertiary": "#1b1c1c",
                        "on-tertiary-fixed-variant": "#e4e2e1",
                        "outline": "#919191",
                        "secondary-container": "#464747",
                        "error": "#ffb4ab",
                        "primary": "#ffffff",
                        "outline-variant": "#474747",
                        "tertiary-container": "#929090",
                        "inverse-on-surface": "#313030",
                        "on-primary-fixed-variant": "#e2e2e2",
                        "on-primary-fixed": "#ffffff",
                        "on-primary-container": "#000000",
                        "on-secondary-fixed-variant": "#3a3c3c",
                        "on-tertiary-container": "#000000",
                        "tertiary": "#e4e2e1",
                        "on-tertiary-fixed": "#ffffff",
                        "tertiary-fixed-dim": "#474747",
                        "surface": "#131313",
                        "surface-container-lowest": "#0e0e0e",
                        "on-secondary": "#1a1c1c",
                        "primary-fixed-dim": "#454747",
                        "primary-fixed": "#5d5f5f",
                        "surface-container-high": "#2a2a2a",
                        "on-secondary-fixed": "#1a1c1c",
                        "inverse-primary": "#5d5f5f",
                        "background": "#131313",
                        "surface-container": "#201f1f",
                        "on-secondary-container": "#e3e2e2",
                        "primary-container": "#d4d4d4",
                        "surface-container-highest": "#353534",
                        "tertiary-fixed": "#5f5e5e",
                        "secondary-fixed": "#c7c6c6",
                        "on-background": "#e5e2e1",
                        "surface-bright": "#3a3939",
                        "on-surface": "#e5e2e1",
                        "inverse-surface": "#e5e2e1",
                        "secondary-fixed-dim": "#ababab",
                        "surface-variant": "#353534",
                        "surface-container-low": "#1c1b1b",
                        "error-container": "#93000a",
                        "surface-dim": "#131313",
                        "secondary": "#c7c6c6",
                        "on-surface-variant": "#c6c6c6",
                        "on-error": "#690005",
                        "on-error-container": "#ffdad6"
                    },
                    "borderRadius": {
                        "DEFAULT": "0.125rem",
                        "lg": "0.25rem",
                        "xl": "0.5rem",
                        "full": "0.75rem"
                    },
                    "spacing": {},
                    "fontFamily": {
                        "headline": ["Space Grotesk", "sans-serif"],
                        "body": ["Manrope", "sans-serif"],
                        "label": ["Inter", "sans-serif"]
                    }
                },
            },
        }
    </script>
<style>
        body {
            background-color: theme('colors.surface');
            color: theme('colors.on-surface');
            font-family: theme('fontFamily.body');
        }
        .hero-gradient {
            background: radial-gradient(circle at 50% 0%, theme('colors.surface-container-high') 0%, transparent 70%);
        }
        .card-gradient {
            background: linear-gradient(145deg, theme('colors.surface-container-high') 0%, theme('colors.surface-container-low') 100%);
        }
    </style>
</head>
<body class="min-h-screen flex flex-col antialiased selection:bg-primary selection:text-on-primary">
<!-- Shared Component: TopNavBar -->
<header class="sticky top-0 z-50 w-full bg-[#131313]/80 backdrop-blur-md shadow-[0_32px_64px_-15px_rgba(229,226,225,0.04)]">
<div class="flex justify-between items-center w-full px-8 py-4 max-w-screen-2xl mx-auto">
<div class="flex items-center gap-12">
<a class="text-2xl font-bold tracking-tighter text-white font-['Space_Grotesk']" href="#">
                    LET'S DO IT
                </a>
<nav class="hidden md:flex gap-8">
<a class="text-white border-b-2 border-white pb-1 font-bold font-['Space_Grotesk'] tracking-tight hover:bg-[#2a2a2a] transition-all duration-300" href="#">Explore</a>
<a class="text-[#e5e2e1]/60 font-medium hover:text-white transition-colors font-['Space_Grotesk'] tracking-tight hover:bg-[#2a2a2a] duration-300" href="#">Opportunities</a>
<a class="text-[#e5e2e1]/60 font-medium hover:text-white transition-colors font-['Space_Grotesk'] tracking-tight hover:bg-[#2a2a2a] duration-300" href="#">Pathways</a>
<a class="text-[#e5e2e1]/60 font-medium hover:text-white transition-colors font-['Space_Grotesk'] tracking-tight hover:bg-[#2a2a2a] duration-300" href="#">About</a>
</nav>
</div>
<div class="flex items-center gap-6">
<button class="text-on-surface hover:text-primary transition-colors">
<span class="material-symbols-outlined text-2xl">search</span>
</button>
<button class="bg-primary text-on-primary font-headline font-semibold px-6 py-2.5 rounded-md hover:bg-primary-container transition-colors duration-300">
                    Get Started
                </button>
</div>
</div>
</header>
<main class="flex-grow">
<!-- Hero Section -->
<section class="relative pt-32 pb-40 px-8 flex flex-col items-center justify-center text-center overflow-hidden hero-gradient">
<div class="absolute top-0 left-0 w-full h-full pointer-events-none opacity-20">
<svg height="100%" width="100%" xmlns="http://www.w3.org/2000/svg">
<defs>
<pattern height="40" id="grid" patternunits="userSpaceOnUse" width="40">
<path class="text-outline-variant" d="M 40 0 L 0 0 0 40" fill="none" stroke="currentColor" stroke-width="0.5"></path>
</pattern>
</defs>
<rect fill="url(#grid)" height="100%" width="100%"></rect>
</svg>
</div>
<div class="relative z-10 max-w-4xl mx-auto">
<h1 class="font-headline text-5xl md:text-[5rem] leading-[1.1] font-bold tracking-tighter text-primary mb-8 drop-shadow-sm">
                    Your Journey<br/>Starts Here.
                </h1>
<p class="font-body text-xl md:text-2xl text-on-surface-variant max-w-2xl mx-auto mb-12 font-light">
                    Engineered precision for the next generation of technical talent. Discover roles that define the future.
                </p>
<!-- Search Bar -->
<div class="w-full max-w-2xl mx-auto bg-surface-container-low rounded-xl p-2 flex items-center shadow-[0_32px_64px_-15px_rgba(229,226,225,0.04)] focus-within:ring-2 focus-within:ring-outline-variant transition-all duration-300">
<span class="material-symbols-outlined text-outline ml-4 mr-3">search</span>
<input class="w-full bg-transparent border-none text-primary placeholder-outline font-body text-lg focus:ring-0 px-2 py-3" placeholder="Search roles, skills, or companies..." type="text"/>
<button class="bg-surface-container-highest text-primary font-label font-medium px-6 py-3 rounded-lg ml-2 hover:bg-surface-variant transition-colors flex items-center gap-2">
<span>Explore</span>
<span class="material-symbols-outlined text-sm">arrow_forward</span>
</button>
</div>
</div>
</section>
<!-- Featured Categories -->
<section class="py-24 px-8 bg-surface-container-low">
<div class="max-w-screen-2xl mx-auto">
<div class="flex flex-col md:flex-row justify-between items-end mb-16 gap-6">
<div>
<h2 class="font-headline text-3xl md:text-4xl font-bold tracking-tight text-primary mb-4">Discovery Nodes</h2>
<p class="font-body text-lg text-on-surface-variant">Navigate our primary structural sectors.</p>
</div>
<a class="font-label text-sm text-primary uppercase tracking-widest flex items-center gap-2 hover:opacity-70 transition-opacity" href="#">
                        View All Sectors
                        <span class="material-symbols-outlined text-base">east</span>
</a>
</div>
<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
<!-- Category Card 1 -->
<div class="bg-surface-container-high rounded-xl p-8 hover:bg-surface-container-highest transition-colors duration-300 group cursor-pointer relative overflow-hidden">
<div class="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
<span class="material-symbols-outlined text-6xl" style="font-variation-settings: 'FILL' 0;">terminal</span>
</div>
<div class="bg-surface-container p-4 rounded-lg inline-block mb-6 shadow-sm group-hover:scale-105 transition-transform">
<span class="material-symbols-outlined text-primary text-2xl">code</span>
</div>
<h3 class="font-headline text-xl font-semibold text-primary mb-2">Software Engineering</h3>
<p class="font-body text-sm text-outline mb-6">Backend, Frontend, Fullstack</p>
<div class="flex items-center justify-between text-on-surface-variant text-sm font-label">
<span>1,204 active nodes</span>
<span class="material-symbols-outlined opacity-0 group-hover:opacity-100 transform translate-x-[-10px] group-hover:translate-x-0 transition-all duration-300">arrow_forward</span>
</div>
</div>
<!-- Category Card 2 -->
<div class="bg-surface-container-high rounded-xl p-8 hover:bg-surface-container-highest transition-colors duration-300 group cursor-pointer relative overflow-hidden">
<div class="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
<span class="material-symbols-outlined text-6xl" style="font-variation-settings: 'FILL' 0;">database</span>
</div>
<div class="bg-surface-container p-4 rounded-lg inline-block mb-6 shadow-sm group-hover:scale-105 transition-transform">
<span class="material-symbols-outlined text-primary text-2xl">analytics</span>
</div>
<h3 class="font-headline text-xl font-semibold text-primary mb-2">Data Science</h3>
<p class="font-body text-sm text-outline mb-6">AI/ML, Analytics, Engineering</p>
<div class="flex items-center justify-between text-on-surface-variant text-sm font-label">
<span>843 active nodes</span>
<span class="material-symbols-outlined opacity-0 group-hover:opacity-100 transform translate-x-[-10px] group-hover:translate-x-0 transition-all duration-300">arrow_forward</span>
</div>
</div>
<!-- Category Card 3 -->
<div class="bg-surface-container-high rounded-xl p-8 hover:bg-surface-container-highest transition-colors duration-300 group cursor-pointer relative overflow-hidden">
<div class="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
<span class="material-symbols-outlined text-6xl" style="font-variation-settings: 'FILL' 0;">design_services</span>
</div>
<div class="bg-surface-container p-4 rounded-lg inline-block mb-6 shadow-sm group-hover:scale-105 transition-transform">
<span class="material-symbols-outlined text-primary text-2xl">architecture</span>
</div>
<h3 class="font-headline text-xl font-semibold text-primary mb-2">UI/UX Design</h3>
<p class="font-body text-sm text-outline mb-6">Product, Research, Visual</p>
<div class="flex items-center justify-between text-on-surface-variant text-sm font-label">
<span>512 active nodes</span>
<span class="material-symbols-outlined opacity-0 group-hover:opacity-100 transform translate-x-[-10px] group-hover:translate-x-0 transition-all duration-300">arrow_forward</span>
</div>
</div>
<!-- Category Card 4 -->
<div class="bg-surface-container-high rounded-xl p-8 hover:bg-surface-container-highest transition-colors duration-300 group cursor-pointer relative overflow-hidden">
<div class="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
<span class="material-symbols-outlined text-6xl" style="font-variation-settings: 'FILL' 0;">rocket_launch</span>
</div>
<div class="bg-surface-container p-4 rounded-lg inline-block mb-6 shadow-sm group-hover:scale-105 transition-transform">
<span class="material-symbols-outlined text-primary text-2xl">memory</span>
</div>
<h3 class="font-headline text-xl font-semibold text-primary mb-2">Hardware Eng</h3>
<p class="font-body text-sm text-outline mb-6">Robotics, Circuits, Systems</p>
<div class="flex items-center justify-between text-on-surface-variant text-sm font-label">
<span>289 active nodes</span>
<span class="material-symbols-outlined opacity-0 group-hover:opacity-100 transform translate-x-[-10px] group-hover:translate-x-0 transition-all duration-300">arrow_forward</span>
</div>
</div>
</div>
</div>
</section>
<!-- Curated Opportunities -->
<section class="py-32 px-8 bg-surface">
<div class="max-w-screen-2xl mx-auto">
<div class="flex flex-col md:flex-row justify-between items-end mb-16 gap-6 border-b border-surface-container-low pb-8">
<div class="w-full md:w-2/3">
<h2 class="font-headline text-4xl md:text-5xl font-bold tracking-tighter text-primary mb-4">Curated Opportunities</h2>
<p class="font-body text-lg text-on-surface-variant max-w-xl">High-fidelity signals from leading aerospace and clean-tech organizations.</p>
</div>
<div class="flex gap-4">
<button class="bg-surface-container-low text-on-surface px-6 py-3 rounded-lg font-label text-sm hover:bg-surface-container-high transition-colors">Filters</button>
</div>
</div>
<div class="space-y-6">
<!-- Job Listing 1 -->
<div class="bg-surface-container-lowest border border-outline-variant/15 p-8 rounded-xl hover:bg-surface-container-low transition-colors duration-300 flex flex-col lg:flex-row gap-8 items-start lg:items-center relative group">
<div class="absolute left-0 top-0 bottom-0 w-1 bg-primary opacity-0 group-hover:opacity-100 transition-opacity rounded-l-xl"></div>
<div class="bg-surface p-4 rounded-lg shadow-sm border border-outline-variant/20">
<img alt="Company Logo" class="w-12 h-12 rounded-md object-cover grayscale opacity-80" data-alt="abstract sleek minimalist tech company logo geometric shape deep space colors" src="https://lh3.googleusercontent.com/aida-public/AB6AXuD4V480Ihpw3YdcPz1jFriePthN6uxkmEv3NMKaEpKTMdSGUist4MyV7aVmIOd2_JT_QVRhkLmkbcgsJGK3ptBwY8GBDLrFbv1AhkAEXun61fsahclCygGkLq08rcApWmuuu3brAS0l1Yb6cR4BcHM6alB_lXL7m5AWLOicFh5O6nxmptwWXrA30dXh4FWcuFVKR7fDdeErFOY8j1azt4olNofEmsRGEMp4iNTLkC5TCcCmVqDRg5UoTErV8Ie9-sdIgg-aO4TO5BM"/>
</div>
<div class="flex-grow">
<div class="flex flex-wrap items-center gap-3 mb-2">
<h3 class="font-headline text-2xl font-bold text-primary">Flight Systems Engineer</h3>
<span class="bg-primary/10 text-primary font-label text-xs px-3 py-1 rounded-full uppercase tracking-widest font-semibold">New Signal</span>
</div>
<div class="flex flex-wrap items-center gap-6 font-body text-on-surface-variant text-sm">
<span class="flex items-center gap-1"><span class="material-symbols-outlined text-[18px]">domain</span> Stellaris Aerospace</span>
<span class="flex items-center gap-1"><span class="material-symbols-outlined text-[18px]">location_on</span> Seattle, WA (Hybrid)</span>
<span class="flex items-center gap-1"><span class="material-symbols-outlined text-[18px]">work</span> Entry Level</span>
</div>
</div>
<div class="flex flex-wrap lg:flex-col gap-2 min-w-[200px] lg:items-end">
<div class="flex gap-2">
<span class="bg-surface-container-high text-on-surface font-label text-xs px-3 py-1 rounded-md border border-outline-variant/30">C++</span>
<span class="bg-surface-container-high text-on-surface font-label text-xs px-3 py-1 rounded-md border border-outline-variant/30">Avionics</span>
</div>
<span class="font-label text-xs text-outline mt-2">Posted 2 hours ago</span>
</div>
<div class="ml-auto mt-4 lg:mt-0">
<button class="w-12 h-12 rounded-full border border-outline-variant/30 flex items-center justify-center text-on-surface hover:bg-primary hover:text-on-primary hover:border-primary transition-all duration-300">
<span class="material-symbols-outlined">arrow_forward</span>
</button>
</div>
</div>
<!-- Job Listing 2 -->
<div class="bg-surface-container-lowest border border-outline-variant/15 p-8 rounded-xl hover:bg-surface-container-low transition-colors duration-300 flex flex-col lg:flex-row gap-8 items-start lg:items-center relative group">
<div class="absolute left-0 top-0 bottom-0 w-1 bg-primary opacity-0 group-hover:opacity-100 transition-opacity rounded-l-xl"></div>
<div class="bg-surface p-4 rounded-lg shadow-sm border border-outline-variant/20">
<img alt="Company Logo" class="w-12 h-12 rounded-md object-cover grayscale opacity-80" data-alt="clean energy solar company logo minimalist sun ray abstract mark" src="https://lh3.googleusercontent.com/aida-public/AB6AXuC01UkN5hO6eVEbheYfUsJ7TzGCDdDKhAoPGTP39dRxYLNmLkS6394KN6GecvvACknO36BpcAbCxd-8SEPkJV8XOQoJHcjI_KClG9crYutluztdi5GKajt_WGCyNJGgUBlq_8zHZ3FcTxenPTbDEWE0RPxYCqQgnNLW4oMnlKxOcw4VtDpR9GsD3bKM3p1aXu0J2HpFO8xrc49LskT6EMO0QuQKh27y1PoozqWhEeFCX1TsdQ3yZWfAdSamTD4GsOedTtohj17r5ZI"/>
</div>
<div class="flex-grow">
<div class="flex flex-wrap items-center gap-3 mb-2">
<h3 class="font-headline text-2xl font-bold text-primary">Data Scientist, Grid Optimization</h3>
</div>
<div class="flex flex-wrap items-center gap-6 font-body text-on-surface-variant text-sm">
<span class="flex items-center gap-1"><span class="material-symbols-outlined text-[18px]">domain</span> Solstice Energy</span>
<span class="flex items-center gap-1"><span class="material-symbols-outlined text-[18px]">location_on</span> Austin, TX</span>
<span class="flex items-center gap-1"><span class="material-symbols-outlined text-[18px]">work</span> Junior</span>
</div>
</div>
<div class="flex flex-wrap lg:flex-col gap-2 min-w-[200px] lg:items-end">
<div class="flex gap-2">
<span class="bg-surface-container-high text-on-surface font-label text-xs px-3 py-1 rounded-md border border-outline-variant/30">Python</span>
<span class="bg-surface-container-high text-on-surface font-label text-xs px-3 py-1 rounded-md border border-outline-variant/30">Machine Learning</span>
</div>
<span class="font-label text-xs text-outline mt-2">Posted 1 day ago</span>
</div>
<div class="ml-auto mt-4 lg:mt-0">
<button class="w-12 h-12 rounded-full border border-outline-variant/30 flex items-center justify-center text-on-surface hover:bg-primary hover:text-on-primary hover:border-primary transition-all duration-300">
<span class="material-symbols-outlined">arrow_forward</span>
</button>
</div>
</div>
<!-- Job Listing 3 -->
<div class="bg-surface-container-lowest border border-outline-variant/15 p-8 rounded-xl hover:bg-surface-container-low transition-colors duration-300 flex flex-col lg:flex-row gap-8 items-start lg:items-center relative group">
<div class="absolute left-0 top-0 bottom-0 w-1 bg-primary opacity-0 group-hover:opacity-100 transition-opacity rounded-l-xl"></div>
<div class="bg-surface p-4 rounded-lg shadow-sm border border-outline-variant/20">
<img alt="Company Logo" class="w-12 h-12 rounded-md object-cover grayscale opacity-80" data-alt="modern tech geometric bold shape abstract logo blue tint" src="https://lh3.googleusercontent.com/aida-public/AB6AXuBHUoQB2o-avl_ZoPbmynSk5PPcExnTiAUoVXodGROVEJx6c6JqMnghYEnCBPieY0fwIfSZym3gQhj9mg_NbD9yl7CKMn8JQB81wuB_qIvkgJjys0YFCxhaCe71AsUMKEdvYxLQRRyYzGAfnKMJZFxcyKW9TKxSs5GIwd2ZFvTlDY-oCb10jXqvZFacIIeDabpXW50jsR6Krn83NAqkhvCYNbzAHCMivSJ5XLY2J_F9pDbzjuGao58UuiTLhWVXGAgUQ3OeewrQ1es"/>
</div>
<div class="flex-grow">
<div class="flex flex-wrap items-center gap-3 mb-2">
<h3 class="font-headline text-2xl font-bold text-primary">UI/UX Designer, Mission Control</h3>
</div>
<div class="flex flex-wrap items-center gap-6 font-body text-on-surface-variant text-sm">
<span class="flex items-center gap-1"><span class="material-symbols-outlined text-[18px]">domain</span> Orbit Systems</span>
<span class="flex items-center gap-1"><span class="material-symbols-outlined text-[18px]">location_on</span> Remote</span>
<span class="flex items-center gap-1"><span class="material-symbols-outlined text-[18px]">work</span> Entry Level</span>
</div>
</div>
<div class="flex flex-wrap lg:flex-col gap-2 min-w-[200px] lg:items-end">
<div class="flex gap-2">
<span class="bg-surface-container-high text-on-surface font-label text-xs px-3 py-1 rounded-md border border-outline-variant/30">Figma</span>
<span class="bg-surface-container-high text-on-surface font-label text-xs px-3 py-1 rounded-md border border-outline-variant/30">Design Systems</span>
</div>
<span class="font-label text-xs text-outline mt-2">Posted 3 days ago</span>
</div>
<div class="ml-auto mt-4 lg:mt-0">
<button class="w-12 h-12 rounded-full border border-outline-variant/30 flex items-center justify-center text-on-surface hover:bg-primary hover:text-on-primary hover:border-primary transition-all duration-300">
<span class="material-symbols-outlined">arrow_forward</span>
</button>
</div>
</div>
</div>
<div class="mt-12 text-center">
<button class="bg-surface-container border border-outline-variant/30 text-primary font-headline font-medium px-8 py-4 rounded-md hover:bg-surface-container-highest transition-colors duration-300 inline-flex items-center gap-2">
                        Load More Signals
                        <span class="material-symbols-outlined text-sm">expand_more</span>
</button>
</div>
</div>
</section>
</main>
<!-- Shared Component: Footer -->
<footer class="w-full py-12 mt-auto bg-[#0e0e0e]">
<div class="flex flex-col md:flex-row justify-between items-center px-12 max-w-screen-2xl mx-auto gap-8 border-t border-[#474747]/15 pt-8">
<div class="text-lg font-black text-white font-['Space_Grotesk']">
                LET'S DO IT
            </div>
<div class="flex flex-wrap justify-center gap-8 font-['Inter'] text-xs uppercase tracking-widest">
<a class="text-[#474747] hover:text-white transition-colors hover:opacity-70 transition-opacity" href="#">Privacy Protocol</a>
<a class="text-[#474747] hover:text-white transition-colors hover:opacity-70 transition-opacity" href="#">Service Terms</a>
<a class="text-[#474747] hover:text-white transition-colors hover:opacity-70 transition-opacity" href="#">Carrier Signal</a>
<a class="text-[#474747] hover:text-white transition-colors hover:opacity-70 transition-opacity" href="#">System Status</a>
</div>
<div class="font-['Inter'] text-xs uppercase tracking-widest text-[#474747]">
                © 2024 LET'S DO IT. ENGINEERED FOR EXPLORATION.
            </div>
</div>
</footer>
</body></html>
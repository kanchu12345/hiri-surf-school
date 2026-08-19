/**
 * Hiri Surf School - Interactive Functionality
 * Includes Real LKR Pricing, hirisurfschool.com contact details, WhatsApp redirection,
 * and Dynamic Auto-Updating Hiriketiya Swell Report (using Open-Meteo APIs)
 */

document.addEventListener('DOMContentLoaded', () => {
    // --- Configuration & Constants (Real LKR Pricing Confirmed by Kasun) ---
    const PRICING = {
        'group': { name: 'Group Surf Lesson', price: 5000, duration: '1 Hour 15 Mins' },
        'semi-private': { name: 'Semi-Private Lesson', price: 6000, duration: '1 Hour 15 Mins' },
        'private': { name: 'Private Surf Lesson', price: 8000, duration: '1 Hour 15 Mins' },
        'kids': { name: 'Kids Surf Lesson (Ages 5-12)', price: 6000, duration: '1 Hour' },
        'oneday': { name: '1-Day Surf Course (Double Session)', price: 13000, duration: '2.5 Hours Total' },
        'threeday': { name: '3-Day Surf Package', price: 21000, duration: '3 Days (1.25h/day)' },
        'fiveday': { name: '5-Day Surf Package', price: 30000, duration: '5 Days (1.25h/day)' }
    };

    // Load packages — start with defaults, Firestore will overwrite via listener
    let packagesData = PRICING;
    const _lsPkg = localStorage.getItem('hiri_surf_packages');
    if (_lsPkg) { try { const p = JSON.parse(_lsPkg); if (p && p['group']) packagesData = p; } catch(e){} }

    const DEFAULT_CALC_SETTINGS = {
        groupDiscountSize: 4,
        groupDiscountPercent: 10
    };
    let calcSettings = JSON.parse(localStorage.getItem('hiri_calc_settings'));
    if (!calcSettings || calcSettings.groupDiscountSize === undefined) {
        calcSettings = DEFAULT_CALC_SETTINGS;
    }

    // Default site text/links configuration
    const DEFAULT_SETTINGS = {
        heroTagline: "Hiriketiya Beach, Sri Lanka 🇱🇰",
        heroTitle: "Surf Lessons in <span>Hiriketiya, Sri Lanka</span>",
        heroSubtitle: "Safe, fun, and professional surf lessons led by Kasun & Team. Perfect for complete beginners, couples, kids, and all levels at Hiriketiya Beach.",
        heroBg: "images/20702.jpg.jpeg",
        trustBadge1: "⭐ 5.0 Rated on Google (350+ Reviews)",
        trustBadge2: "🏄‍♂️ 100% Board & Rashguard Included",
        trustBadge3: "🛡️ Ocean Safety & CPR Certified",
        trustBadge4: "📍 Direct Beach Location in Hiriketiya",
        aboutTag: "Welcome to Hiri Surf School",
        aboutTitle: "Learn to surf with local experienced coaches",
        aboutDesc: "Led by Kasun & Team with 7+ years of local surf coaching experience, we are a passionate local surf school on the sands of Hiriketiya Beach. We focus on safety, proper technique, and giving every customer a friendly and unforgettable experience.",
        contactWa: "+94 76 932 7173",
        contactWaClean: "94769327173",
        contactEmail: "hirisurfschool@gmail.com",
        meetingText: "Hiriketiya Beach, Sri Lanka",
        meetingLink: "https://maps.app.goo.gl/WQGCeh4apHywDrrx5",
        landmarkText: "Look for the Hiri Surf School sign near the western corner of the bay, right where the sand meets the palm trees. Our team is always on the beach wearing our official rashguards.",
        bookingNote: "We recommend booking in advance to secure your preferred lesson time, especially during busy days.",
        socialFb: "https://www.facebook.com/hirisurfschool/",
        socialInsta: "https://www.instagram.com/hiriketiya_hiri_surf_school/",
        socialTripAdvisor: "https://www.tripadvisor.com/Attraction_Review-g644046-d15081533-Reviews-Hiriketiya_Love_Hiri_Surf_School-Dikwella_Southern_Province.html",
        socialGoogle: "https://maps.app.goo.gl/WQGCeh4apHywDrrx5",
        footerHours: "Lessons run daily during daylight:<br>\n                       🌅 <strong>6:00 AM - 6:00 PM</strong><br>\n                       (Best morning & sunset surf sessions)",
        footerBrand: "Top-rated surf school on Hiriketiya Beach, Sri Lanka. Safe, friendly, and patient surf coaching led by Kasun & ISA-certified local team.",
        copyrightText: "© 2026 Hiri Surf School. All rights reserved. Hiriketiya Beach, Sri Lanka.",
        firebaseConfig: {
            apiKey: "AIzaSyAgWoQ_46LrTSbMXc-P25otiPUrR7TuRy0",
            authDomain: "surfing-7d050.firebaseapp.com",
            projectId: "surfing-7d050",
            storageBucket: "surfing-7d050.firebasestorage.app",
            messagingSenderId: "927769828599",
            appId: "1:927769828599:web:0cbc12d587994056db87f2",
            measurementId: "G-HDRHYRTQ84"
        }
    };

    let siteSettings = DEFAULT_SETTINGS;
    const _lsSettings = localStorage.getItem('hiri_site_settings');
    if (_lsSettings) { 
        try { 
            const s = JSON.parse(_lsSettings); 
            if (s && typeof s === 'object') {
                siteSettings = { ...DEFAULT_SETTINGS, ...s, firebaseConfig: DEFAULT_SETTINGS.firebaseConfig }; 
            }
        } catch(e){} 
    }

    // --- Firebase DB State ---
    let db = window.db || (window.firebase && window.firebase.apps && window.firebase.apps.length > 0 ? window.firebase.firestore() : null);
    let auth = window.auth || (window.firebase && window.firebase.auth ? window.firebase.auth() : null);
    let googleProvider = (window.firebase && window.firebase.auth) ? new window.firebase.auth.GoogleAuthProvider() : null;
    let currentUser = null;
    let firestoreReviews = [];

    if (!db && window.firebase) {
        try {
            const config = window.firebaseConfig || DEFAULT_SETTINGS.firebaseConfig;
            if (!window.firebase.apps || !window.firebase.apps.length) {
                window.firebase.initializeApp(config);
            }
            db = window.firebase.firestore();
            auth = window.firebase.auth();
            googleProvider = new window.firebase.auth.GoogleAuthProvider();
            window.db = db;
            window.auth = auth;
        } catch (err) {
            console.error("Firebase initialization failed:", err);
        }
    }

    // Default Instructors Database
    const DEFAULT_INSTRUCTORS = [
        {
            id: 1,
            name: "Kasun",
            role: "Founder & Head Surf Instructor",
            bio: "Founder of Hiri Surf School and a local Hiriketiya surf instructor, focused on friendly, safe and enjoyable surf lessons for beginners, families and surfers of different levels.",
            badges: "Founder & Head Instructor, Local Surf Coach",
            img: "images/instructor-1.jpg"
        },
        {
            id: 2,
            name: "15+ Local Surf Instructors",
            role: "Friendly Local Coaching Team",
            bio: "A friendly team of local instructors providing patient, safety-focused coaching for beginners, kids, couples and surfers of all levels.",
            badges: "Local Instructors, Patient & Friendly, All Levels",
            img: "images/20702.jpg.jpeg"
        }
    ];
    // Start with defaults — Firestore onSnapshot will overwrite with live data
    let instructorsData = DEFAULT_INSTRUCTORS;
    const _lsIns = localStorage.getItem('hiri_instructors');
    if (_lsIns) { try { const i = JSON.parse(_lsIns); if (Array.isArray(i) && i.length > 0 && i[0]?.name) instructorsData = i; } catch(e){} }

    // Default Reviews Database (Only genuine reviews, no placeholder sample reviews)
    const DEFAULT_REVIEWS = [];
    let reviewsData = [];
    const _lsRev = localStorage.getItem('hiri_reviews');
    if (_lsRev) {
        try {
            const r = JSON.parse(_lsRev);
            if (Array.isArray(r) && r.length > 0) {
                reviewsData = r.filter(rev => rev.name !== 'David Marshall' && rev.name !== 'Sarah Lindemann' && rev.name !== 'Mike & Emma' && rev.name !== 'Jessica R.' && rev.name !== 'Alex & Sophie');
            }
        } catch(e){}
    }

    // Default Gallery Database (Caption-less, image-only slider as requested)
    const DEFAULT_GALLERY = [
    {
        "img": "images/14137.jpg.jpeg"
    },
    {
        "img": "images/20657.jpg.jpeg"
    },
    {
        "img": "images/20661.jpg.jpeg"
    },
    {
        "img": "images/20681.jpg.jpeg"
    },
    {
        "img": "images/20684.jpg.jpeg"
    },
    {
        "img": "images/20687.jpg.jpeg"
    },
    {
        "img": "images/20693.jpg.jpeg"
    },
    {
        "img": "images/20694.jpg.jpeg"
    },
    {
        "img": "images/20700.jpg.jpeg"
    },
    {
        "img": "images/20702.jpg.jpeg"
    },
    {
        "img": "images/20703.jpg.jpeg"
    },
    {
        "img": "images/20706.jpg.jpeg"
    },
    {
        "img": "images/20707.jpg.jpeg"
    },
    {
        "img": "images/20713.jpg.jpeg"
    },
    {
        "img": "images/20726.jpg.jpeg"
    },
    {
        "img": "images/20727.jpg.jpeg"
    },
    {
        "img": "images/20728.jpg.jpeg"
    },
    {
        "img": "images/20755.jpg.jpeg"
    },
    {
        "img": "images/43328.jpg.jpeg"
    },
    {
        "img": "images/43346.jpg.jpeg"
    },
    {
        "img": "images/52832.jpg.jpeg"
    },
    {
        "img": "images/65965.jpg.jpeg"
    },
    {
        "img": "images/66791.jpg.jpeg"
    },
    {
        "img": "images/66935.jpg.jpeg"
    },
    {
        "img": "images/67728.jpg.jpeg"
    },
    {
        "img": "images/69527.jpg.jpeg"
    },
    {
        "img": "images/69528.jpg.jpeg"
    },
    {
        "img": "images/69534.jpg.jpeg"
    },
    {
        "img": "images/69535.jpg.jpeg"
    },
    {
        "img": "images/69537.jpg.jpeg"
    },
    {
        "img": "images/69538.jpg.jpeg"
    },
    {
        "img": "images/69539.jpg.jpeg"
    },
    {
        "img": "images/69542.jpg.jpeg"
    },
    {
        "img": "images/69543.jpg.jpeg"
    },
    {
        "img": "images/69544.jpg.jpeg"
    },
    {
        "img": "images/69545.jpg.jpeg"
    },
    {
        "img": "images/69546.jpg.jpeg"
    },
    {
        "img": "images/69547.jpg.jpeg"
    },
    {
        "img": "images/69550.jpg.jpeg"
    },
    {
        "img": "images/69552.jpg.jpeg"
    },
    {
        "img": "images/69554.jpg.jpeg"
    },
    {
        "img": "images/69557.jpg.jpeg"
    },
    {
        "img": "images/69558.jpg.jpeg"
    },
    {
        "img": "images/69559.jpg.jpeg"
    },
    {
        "img": "images/69561.jpg.jpeg"
    },
    {
        "img": "images/69564.jpg.jpeg"
    },
    {
        "img": "images/69566.jpg.jpeg"
    },
    {
        "img": "images/69567.jpg.jpeg"
    },
    {
        "img": "images/69569.jpg.jpeg"
    },
    {
        "img": "images/69570.jpg.jpeg"
    },
    {
        "img": "images/69571.jpg.jpeg"
    },
    {
        "img": "images/69572.jpg.jpeg"
    },
    {
        "img": "images/69573.jpg.jpeg"
    },
    {
        "img": "images/69575.jpg.jpeg"
    },
    {
        "img": "images/69576.jpg.jpeg"
    },
    {
        "img": "images/69577.jpg.jpeg"
    },
    {
        "img": "images/69581.jpg.jpeg"
    },
    {
        "img": "images/69604.jpg.jpeg"
    },
    {
        "img": "images/69606.jpg.jpeg"
    },
    {
        "img": "images/69632.jpg.jpeg"
    },
    {
        "img": "images/69633.jpg.jpeg"
    },
    {
        "img": "images/69638.jpg.jpeg"
    },
    {
        "img": "images/69639.jpg.jpeg"
    },
    {
        "img": "images/69655.jpg.jpeg"
    },
    {
        "img": "images/69678.jpg.jpeg"
    },
    {
        "img": "images/advanced-surf.jpg"
    },
    {
        "img": "images/beginner-surf.jpg"
    },
    {
        "img": "images/gallery-1.jpg"
    },
    {
        "img": "images/gallery-10.jpg"
    },
    {
        "img": "images/gallery-11.jpg"
    },
    {
        "img": "images/gallery-12.jpg"
    },
    {
        "img": "images/gallery-2.jpg"
    },
    {
        "img": "images/gallery-3.jpg"
    },
    {
        "img": "images/gallery-4.jpg"
    },
    {
        "img": "images/gallery-5.jpg"
    },
    {
        "img": "images/gallery-6.jpg"
    },
    {
        "img": "images/gallery-7.jpg"
    },
    {
        "img": "images/gallery-8.jpg"
    },
    {
        "img": "images/gallery-9.jpg"
    },
    {
        "img": "images/hero-bg.jpg"
    },
    {
        "img": "images/hiri.jpg"
    },
    {
        "img": "images/hiri2.jpg"
    },
    {
        "img": "images/instructor-1.jpg"
    },
    {
        "img": "images/instructor-2.jpg"
    },
    {
        "img": "images/instructor-3.jpg"
    },
    {
        "img": "images/intermediate-surf.jpg"
    },
    {
        "img": "images/private-surf.jpg"
    },
    {
        "img": "images/surf-guiding.jpg"
    },
    {
        "img": "images/surf-rentals.jpg"
    },
    {
        "img": "images/testimonial-1.jpg"
    },
    {
        "img": "images/testimonial-2.jpg"
    },
    {
        "img": "images/testimonial-3.jpg"
    }
];
    let galleryData = JSON.parse(localStorage.getItem('hiri_gallery'));
    if (!Array.isArray(galleryData) || galleryData.length < 20 || galleryData[0]?.title !== undefined) {
        galleryData = DEFAULT_GALLERY;
        localStorage.setItem('hiri_gallery', JSON.stringify(DEFAULT_GALLERY));
    }

    // Default FAQs Database
    const DEFAULT_FAQS = [
        { id: 1, question: "🏊‍♂️ Do I need to be a strong swimmer?", answer: "No, you don't need to be a professional swimmer. For beginner lessons, we stay in waist-deep water where you can easily stand. Our instructors stay right next to you at all times." },
        { id: 2, question: "🎒 What should I bring to the lesson?", answer: "Just bring your swimwear, a towel, and reef-safe sunscreen. We provide all the surf gear, including surfboards, high-quality leashes, and UV rashguards." },
        { id: 3, question: "📅 When is the best season to surf?", answer: "The peak season in Hiriketiya is from December to April, offering warm weather and great surfing weather. However, because of the bay's horseshoe shape, it gets surfable waves all year round!" },
        { id: 4, question: "🧒 Can kids join the surf lessons?", answer: "Absolutely! Surfing is fun for all ages. We offer specialized kids lessons (ages 5-12) with gentle one-on-one attention to ensure they stay 100% safe and comfortable." }
    ];
    let faqsData = JSON.parse(localStorage.getItem('hiri_faqs'));
    if (!Array.isArray(faqsData) || faqsData.length === 0 || !faqsData[0]?.question || (faqsData[2] && faqsData[2].answer && faqsData[2].answer.includes("offshore wind"))) {
        faqsData = DEFAULT_FAQS;
        localStorage.setItem('hiri_faqs', JSON.stringify(DEFAULT_FAQS));
    }

    // Default Bookings Database (8 realistic entries to prevent empty state)
    const DEFAULT_BOOKINGS = [
        { id: 1, name: "David Marshall", phone: "+44 7911 123456", email: "david.m@example.com", package: "Private Lesson (1.5 Hours)", date: "2026-08-16", size: 1, total: 8000, status: "confirmed" },
        { id: 2, name: "Sarah Lindemann", phone: "+49 170 1234567", email: "sarah.l@example.de", package: "Semi-Private Lesson (1.5 Hours)", date: "2026-08-17", size: 2, total: 12000, status: "confirmed" },
        { id: 3, name: "Mike & Emma", phone: "+61 412 345 678", email: "mike.emma@example.com.au", package: "Group Surf Lesson (2 Hours)", date: "2026-08-18", size: 2, total: 10000, status: "pending" },
        { id: 4, name: "Jessica R.", phone: "+1 416 555 0192", email: "jessica.r@example.ca", package: "Kids Private Surf Lesson", date: "2026-08-19", size: 1, total: 6000, status: "pending" },
        { id: 5, name: "Alex & Sophie", phone: "+31 6 12345678", email: "alex.sophie@example.nl", package: "5-Day Surf Course Package", date: "2026-08-20", size: 2, total: 90000, status: "confirmed" },
        { id: 6, name: "John Doe", phone: "+1 212 555 0143", email: "john.doe@example.com", package: "Private Lesson (1.5 Hours)", date: "2026-08-15", size: 1, total: 8000, status: "archived" },
        { id: 7, name: "Emily Watson", phone: "+44 7700 900077", email: "emily.w@example.co.uk", package: "3-Day Surf Course Package", date: "2026-08-21", size: 1, total: 22000, status: "confirmed" },
        { id: 8, name: "Lucas Silva", phone: "+55 11 91234-5678", email: "lucas.silva@example.com.br", package: "Group Surf Lesson (2 Hours)", date: "2026-08-22", size: 3, total: 15000, status: "pending" }
    ];
    let bookingsData = JSON.parse(localStorage.getItem('hiri_surf_bookings'));
    if (!Array.isArray(bookingsData) || bookingsData.length === 0 || !bookingsData[0]?.name) {
        localStorage.setItem('hiri_surf_bookings', JSON.stringify(DEFAULT_BOOKINGS));
    }

    // --- DOM Elements ---
    const navbar = document.getElementById('navbar');
    const hamburger = document.getElementById('hamburger');
    const mobileMenu = document.getElementById('mobileMenu');
    const mobileLinks = document.querySelectorAll('.mobile-menu-links a');
    
    const slider = document.getElementById('reviewsSlider');
    const slides = document.querySelectorAll('.review-slide');
    const prevBtn = document.getElementById('prevBtn');
    const nextBtn = document.getElementById('nextBtn');
    const dotsContainer = document.getElementById('sliderDots');
    
    const bookingForm = document.getElementById('bookingForm');
    const packageSelect = document.getElementById('surfPackage');
    const groupSizeInput = document.getElementById('groupSize');
    const calcPackageName = document.getElementById('calcPackageName');
    const calcRate = document.getElementById('calcRate');
    const calcQty = document.getElementById('calcQty');
    const calcSubtotal = document.getElementById('calcSubtotal');
    const calcDiscount = document.getElementById('calcDiscount');
    const calcTotal = document.getElementById('calcTotal');
    const toast = document.getElementById('toast');

    // --- 1. Hero Animated Auto-Changing Background Slideshow ---
    let heroSlideshowTimer = null;
    const initHeroSlideshow = () => {
        const container = document.getElementById('heroSlideshow');
        if (!container) return;
        const slides = container.querySelectorAll('.hero-slide');
        if (!slides || slides.length === 0) return;

        let currentHeroSlide = 0;
        slides.forEach((s, idx) => {
            if (idx === 0) s.classList.add('active');
            else s.classList.remove('active');
        });

        if (heroSlideshowTimer) clearInterval(heroSlideshowTimer);
        heroSlideshowTimer = setInterval(() => {
            const currentSlides = container.querySelectorAll('.hero-slide');
            if (currentSlides.length === 0) return;
            currentSlides[currentHeroSlide].classList.remove('active');
            currentHeroSlide = (currentHeroSlide + 1) % currentSlides.length;
            currentSlides[currentHeroSlide].classList.add('active');
        }, 4000);
    };
    initHeroSlideshow();

    // --- Sticky Navigation & Scroll-Spy on Scroll ---
    const handleScroll = () => {
        if (window.scrollY > 50) {
            navbar.classList.add('navbar-scrolled');
        } else {
            navbar.classList.remove('navbar-scrolled');
        }

        // Scroll Spy active highlighting
        const sections = document.querySelectorAll('section[id]');
        const scrollPosition = window.scrollY + 120; // offset for nav bar

        sections.forEach(section => {
            const top = section.offsetTop;
            const height = section.offsetHeight;
            const id = section.getAttribute('id');

            if (scrollPosition >= top && scrollPosition < top + height) {
                document.querySelectorAll('.nav-links a').forEach(a => {
                    a.classList.remove('active');
                    if (a.getAttribute('href') === `#${id}`) {
                        a.classList.add('active');
                    }
                });
                document.querySelectorAll('.mobile-menu-links a').forEach(a => {
                    a.classList.remove('active');
                    if (a.getAttribute('href') === `#${id}`) {
                        a.classList.add('active');
                    }
                });
            }
        });
    };
    window.addEventListener('scroll', handleScroll);
    handleScroll();

    // --- 2. Mobile Menu Toggle ---
    const toggleMobileMenu = () => {
        const isOpen = mobileMenu.classList.contains('open');
        if (isOpen) {
            mobileMenu.classList.remove('open');
            document.body.style.overflow = '';
            hamburger.querySelectorAll('span')[0].style.transform = 'none';
            hamburger.querySelectorAll('span')[1].style.opacity = '1';
            hamburger.querySelectorAll('span')[2].style.transform = 'none';
        } else {
            mobileMenu.classList.add('open');
            document.body.style.overflow = 'hidden';
            hamburger.querySelectorAll('span')[0].style.transform = 'translateY(9px) rotate(45deg)';
            hamburger.querySelectorAll('span')[1].style.opacity = '0';
            hamburger.querySelectorAll('span')[2].style.transform = 'translateY(-9px) rotate(-45deg)';
        }
    };
    hamburger.addEventListener('click', toggleMobileMenu);
    
    mobileLinks.forEach(link => {
        link.addEventListener('click', () => {
            if (mobileMenu.classList.contains('open')) {
                toggleMobileMenu();
            }
        });
    });

    // --- 3. Testimonial Reviews Slider Controller ---
    let reviewSliderTimer = null;
    let currentReviewSlide = 0;

    const initReviewsSlider = () => {
        const sliderEl = document.getElementById('reviewsSlider');
        const dotsEl = document.getElementById('sliderDots');
        const prevB = document.getElementById('prevBtn');
        const nextB = document.getElementById('nextBtn');
        if (!sliderEl) return;

        const slides = sliderEl.querySelectorAll('.review-slide');
        const count = slides.length;
        currentReviewSlide = 0;
        sliderEl.style.transform = 'translateX(0%)';

        if (dotsEl) {
            dotsEl.innerHTML = '';
            if (count > 1) {
                for (let i = 0; i < count; i++) {
                    const dot = document.createElement('button');
                    dot.classList.add('slider-dot');
                    if (i === 0) dot.classList.add('active');
                    dot.setAttribute('aria-label', `Go to review slide ${i + 1}`);
                    dot.onclick = () => {
                        currentReviewSlide = i;
                        updateReviewSlidePos();
                        restartReviewTimer();
                    };
                    dotsEl.appendChild(dot);
                }
            }
        }

        const updateReviewSlidePos = () => {
            if (count <= 1) return;
            sliderEl.style.transform = `translateX(-${currentReviewSlide * 100}%)`;
            if (dotsEl) {
                const dots = dotsEl.querySelectorAll('.slider-dot');
                dots.forEach((d, idx) => d.classList.toggle('active', idx === currentReviewSlide));
            }
        };

        const restartReviewTimer = () => {
            if (reviewSliderTimer) clearInterval(reviewSliderTimer);
            if (count > 1) {
                reviewSliderTimer = setInterval(() => {
                    currentReviewSlide = (currentReviewSlide + 1) % count;
                    updateReviewSlidePos();
                }, 5000);
            }
        };

        if (prevB) {
            prevB.onclick = () => {
                if (count <= 1) return;
                currentReviewSlide = (currentReviewSlide - 1 + count) % count;
                updateReviewSlidePos();
                restartReviewTimer();
            };
        }

        if (nextB) {
            nextB.onclick = () => {
                if (count <= 1) return;
                currentReviewSlide = (currentReviewSlide + 1) % count;
                updateReviewSlidePos();
                restartReviewTimer();
            };
        }

        restartReviewTimer();
    };

    // Format numbers as currency with commas: e.g. 21000 -> 21,000 LKR
    const formatLKR = (num) => {
        return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",") + " LKR";
    };

    // --- 4. Dynamic Live Calculator ---
    const updateCalculator = () => {
        const selectedKey = packageSelect.value;
        const groupSize = parseInt(groupSizeInput.value) || 1;
        
        if (!packagesData[selectedKey]) return;

        const packageData = packagesData[selectedKey];
        const basePrice = packageData.price;
        const subtotal = basePrice * groupSize;
        
        // Group discount logic (configurable from admin dashboard)
        let discount = 0;
        const discountSize = parseInt(calcSettings.groupDiscountSize) || 4;
        const discountPercent = parseFloat(calcSettings.groupDiscountPercent) || 10;
        
        if (groupSize >= discountSize) {
            discount = Math.round(subtotal * (discountPercent / 100));
        }

        const total = subtotal - discount;

        // Update text labels in DOM
        calcPackageName.textContent = packageData.name;
        calcRate.textContent = formatLKR(basePrice);
        calcQty.textContent = `${groupSize} Guest${groupSize > 1 ? 's' : ''}`;
        calcSubtotal.textContent = formatLKR(subtotal);
        calcDiscount.textContent = discount > 0 ? `-${formatLKR(discount)}` : "0 LKR";
        calcTotal.textContent = formatLKR(total);
    };

    if (packageSelect && groupSizeInput) {
        packageSelect.addEventListener('change', updateCalculator);
        groupSizeInput.addEventListener('input', updateCalculator);
        updateCalculator();
    }

    // --- 5. Form Validation & WhatsApp Booking Integration ---
    const showToast = (message) => {
        const toastText = toast.querySelector('.toast-text');
        toastText.textContent = message;
        toast.classList.add('show');
        
        setTimeout(() => {
            toast.classList.remove('show');
        }, 6000);
    };

    const validateField = (element, validationFn) => {
        const group = element.closest('.form-group');
        const isValid = validationFn(element.value.trim());
        
        if (isValid) {
            group.classList.remove('has-error');
        } else {
            group.classList.add('has-error');
        }
        return isValid;
    };

    if (bookingForm) {
        const nameField = document.getElementById('fullName');
        const emailField = document.getElementById('emailAddress');
        const phoneField = document.getElementById('phoneNumber');
        const dateField = document.getElementById('bookingDate');

        const validators = {
            name: (val) => val.trim().length >= 2,
            email: (val) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val.trim()),
            phone: (val) => val.replace(/[^0-9]/g, '').length >= 7,
            date: (val) => {
                if (!val) return false;
                const d = new Date(val + 'T00:00:00');
                return !isNaN(d.getTime());
            }
        };

        nameField.addEventListener('input', () => validateField(nameField, validators.name));
        emailField.addEventListener('input', () => validateField(emailField, validators.email));
        phoneField.addEventListener('input', () => validateField(phoneField, validators.phone));
        dateField.addEventListener('change', () => validateField(dateField, validators.date));

        nameField.addEventListener('blur', () => validateField(nameField, validators.name));
        emailField.addEventListener('blur', () => validateField(emailField, validators.email));
        phoneField.addEventListener('blur', () => validateField(phoneField, validators.phone));

        bookingForm.addEventListener('submit', (e) => {
            e.preventDefault();

            const isNameValid = validateField(nameField, validators.name);
            const isEmailValid = validateField(emailField, validators.email);
            const isPhoneValid = validateField(phoneField, validators.phone);
            const isDateValid = validateField(dateField, validators.date);

            if (isNameValid && isEmailValid && isPhoneValid && isDateValid) {
                const name = nameField.value.trim();
                const email = emailField.value.trim();
                const phone = phoneField.value.trim();
                const date = dateField.value;
                const size = groupSizeInput ? groupSizeInput.value : '1';
                const packageKey = packageSelect ? packageSelect.value : 'group';
                const pkgObj = (packagesData && packagesData[packageKey]) || PRICING[packageKey] || {};
                const packageName = pkgObj.name || (packageSelect && packageSelect.options[packageSelect.selectedIndex] ? packageSelect.options[packageSelect.selectedIndex].text : 'Surf Lesson');
                const notes = document.getElementById('specialNotes') ? document.getElementById('specialNotes').value.trim() : '';
                const total = calcTotal ? calcTotal.textContent : '5,000 LKR';

                // Capture booking to localStorage for admin panel
                try {
                    const bookings = JSON.parse(localStorage.getItem('hiri_surf_bookings') || '[]');
                    const newBooking = {
                        id: Date.now(),
                        name: name,
                        email: email,
                        phone: phone,
                        date: date,
                        size: size,
                        package: packageName,
                        total: parseInt(total.replace(/[^0-9]/g, '')) || 0,
                        notes: notes,
                        status: 'pending',
                        createdAt: new Date().toISOString()
                    };
                    bookings.unshift(newBooking);
                    localStorage.setItem('hiri_surf_bookings', JSON.stringify(bookings));
                } catch (err) {
                    console.error("Local storage error capturing booking:", err);
                }

                // Format WhatsApp text message
                const text = `Hi Hiri Surf School! 🏄‍♂️\n\nI'd like to book a surf session:\n\n👤 *Name:* ${name}\n📧 *Email:* ${email}\n📱 *WhatsApp:* ${phone}\n📅 *Date:* ${date}\n🏄 *Package:* ${packageName}\n👥 *Group Size:* ${size}\n💬 *Message/Notes:* ${notes || 'None'}\n\n💰 *Total Price Estimate:* ${total}\n\nLooking forward to catching waves! 🤙`;

                // WhatsApp redirection URL
                const targetWa = (siteSettings && siteSettings.contactWa ? siteSettings.contactWa : "+94 76 932 7173").replace(/[^0-9]/g, '');
                const whatsappUrl = `https://wa.me/${targetWa}?text=${encodeURIComponent(text)}`;

                // Update submit button
                const submitBtn = bookingForm.querySelector('button[type="submit"]');
                const originalText = submitBtn.textContent;
                submitBtn.disabled = true;
                submitBtn.textContent = 'Redirecting to WhatsApp... 🏄';

                showToast(`🏄 Booking request created! Opening WhatsApp...`);

                // Instant opening with popup-blocker fallback
                setTimeout(() => {
                    submitBtn.disabled = false;
                    submitBtn.textContent = originalText;
                    
                    const openedWin = window.open(whatsappUrl, '_blank');
                    if (!openedWin || openedWin.closed || typeof openedWin.closed === 'undefined') {
                        window.location.href = whatsappUrl;
                    }
                }, 400);

            } else {
                const firstError = bookingForm.querySelector('.has-error .form-control');
                if (firstError) firstError.focus();
                showToast('Please check the highlighted form fields and try again.');
            }
        });

        const today = new Date().toISOString().split('T')[0];
        if (dateField && !dateField.min) dateField.min = today;
    }



    // --- 6. Live Auto-Updating Swell Report Widget (Hiriketiya Coordinates: 5.9628, 80.7075) ---
    // --- 6. Live Auto-Updating Swell Report Widget & Advanced Analytics Dashboard ---
    const updateSwellReport = async () => {
        // Footer elements
        const swellEl = document.getElementById('swellHeight');
        const windEl = document.getElementById('windSpeed');
        const tideEl = document.getElementById('tideStatus');
        const conditionEl = document.getElementById('surfCondition');

        // Dashboard elements
        const dashSwellHeight = document.getElementById('dashSwellHeight');
        const dashSwellPeriod = document.getElementById('dashSwellPeriod');
        const dashSwellDir = document.getElementById('dashSwellDir');
        const dashWaveEnergy = document.getElementById('dashWaveEnergy');
        const dashWindSpeed = document.getElementById('dashWindSpeed');
        const dashWindDir = document.getElementById('dashWindDir');
        const dashWindStatus = document.getElementById('dashWindStatus');
        const dashSwellWrap = document.getElementById('dashSwellWrap');
        const dashWaterTemp = document.getElementById('dashWaterTemp');
        const dashAirTemp = document.getElementById('dashAirTemp');
        const dashWeatherState = document.getElementById('dashWeatherState');
        const dashTideStatus = document.getElementById('dashTideStatus');
        const dashRecSandbar = document.getElementById('dashRecSandbar');
        const dashRecReef = document.getElementById('dashRecReef');

        const getCardinalDirection = (angle) => {
            const directions = ['N', 'NNE', 'NE', 'ENE', 'E', 'ESE', 'SE', 'SSE', 'S', 'SSW', 'SW', 'WSW', 'W', 'WNW', 'NW', 'NNW'];
            const index = Math.round(((angle %= 360) < 0 ? angle + 360 : angle) / 22.5) % 16;
            return directions[index];
        };

        const getWeatherText = (code) => {
            const wmoCodes = {
                0: { text: "Sunny", emoji: "☀️" },
                1: { text: "mainly Clear", emoji: "🌤️" },
                2: { text: "Partly Cloudy", emoji: "⛅" },
                3: { text: "Overcast", emoji: "☁️" },
                45: { text: "Foggy", emoji: "🌫️" },
                48: { text: "Depositing Rime Fog", emoji: "🌫️" },
                51: { text: "Light Drizzle", emoji: "🌦️" },
                61: { text: "Light Rain", emoji: "🌧️" },
                80: { text: "Light Showers", emoji: "🌦️" },
                95: { text: "Thunderstorm", emoji: "⛈️" }
            };
            return wmoCodes[code] || { text: "Partly Cloudy", emoji: "⛅" };
        };

        try {
            // 1. Fetch Wave/Swell Data from Open-Meteo Marine API
            const marineResponse = await fetch('https://marine-api.open-meteo.com/v1/marine?latitude=5.9628&longitude=80.7075&hourly=wave_height,wave_period,wave_direction,sea_surface_temperature&timezone=auto');
            if (!marineResponse.ok) throw new Error("Marine API error");
            const marineData = await marineResponse.json();

            // 2. Fetch Wind/Weather Data from Open-Meteo Forecast API
            const weatherResponse = await fetch('https://api.open-meteo.com/v1/forecast?latitude=5.9628&longitude=80.7075&current=temperature_2m,weather_code,wind_speed_10m,wind_direction_10m');
            if (!weatherResponse.ok) throw new Error("Weather API error");
            const weatherData = await weatherResponse.json();

            // 3. Extract Wave Details for current hour
            const now = new Date();
            const currentHourUTC = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), now.getUTCHours())).toISOString().slice(0, 14) + "00";
            
            let timeIndex = marineData.hourly.time.indexOf(currentHourUTC);
            if (timeIndex === -1) {
                timeIndex = now.getHours();
            }

            const waveHeightMeters = marineData.hourly.wave_height[timeIndex] || 1.1;
            const wavePeriodSeconds = marineData.hourly.wave_period[timeIndex] || 11;
            const waveDirDegrees = marineData.hourly.wave_direction[timeIndex] || 205;
            const waterTempC = marineData.hourly.sea_surface_temperature[timeIndex] || 28.2;
            
            const waveHeightFeet = (waveHeightMeters * 3.28084).toFixed(1);
            const waveDirCardinal = getCardinalDirection(waveDirDegrees);

            // Calculate Wave Energy: E = 0.5 * H^2 * T * 100
            const waveEnergy = Math.round(0.5 * Math.pow(waveHeightMeters, 2) * wavePeriodSeconds * 100);

            // 4. Extract Wind Details
            const windSpeedKmH = weatherData.current.wind_speed_10m || 6;
            const windDirDegrees = weatherData.current.wind_direction_10m || 45;
            const windSpeedKnots = Math.round(windSpeedKmH * 0.539957);
            const windDirCardinal = getCardinalDirection(windDirDegrees);

            // Classify Wind (Hiriketiya is a south-facing bay; North winds are offshore)
            let windType = "Sideshore";
            if (windDirDegrees >= 315 || windDirDegrees <= 45) {
                windType = "Offshore"; // Blowing from North
            } else if (windDirDegrees >= 135 && windDirDegrees <= 225) {
                windType = "Onshore"; // Blowing from South
            }

            // 5. Calculate Tide status dynamically using standard 12.42h tidal cycle
            const cycleMs = 12.42 * 60 * 60 * 1000;
            const anchorTimeMs = new Date("2026-08-12T00:00:00Z").getTime();
            const elapsedMs = Date.now() - anchorTimeMs;
            const phase = (elapsedMs % cycleMs) / cycleMs;

            let tideText = "Mid-Tide";
            if (phase < 0.15 || phase > 0.85) {
                tideText = "High Tide";
            } else if (phase >= 0.15 && phase < 0.35) {
                tideText = "Outgoing (Falling)";
            } else if (phase >= 0.35 && phase < 0.65) {
                tideText = "Low Tide";
            } else {
                tideText = "Incoming (Rising)";
            }

            // 6. Classify Swell Surf Conditions
            let conditionText = "Perfect";
            let badgeColor = "#2f855a";

            if (waveHeightFeet < 2.0) {
                conditionText = "Gentle";
                badgeColor = "#319795";
            } else if (waveHeightFeet >= 2.0 && waveHeightFeet < 4.0) {
                conditionText = "Perfect";
                badgeColor = "#2f855a";
            } else if (waveHeightFeet >= 4.0 && waveHeightFeet < 6.0) {
                conditionText = "Active";
                badgeColor = "#dd6b20";
            } else {
                conditionText = "Heavy";
                badgeColor = "#e53e3e";
            }

            // 7. Spot recommendations & Safety guidelines based on metrics
            let sandbarRec = "Safe and calm. 1-2ft waves. Ideal for complete beginners, pop-ups, and kids lessons.";
            let reefRec = "Flat or small. Best to stick to the beach sandbar for lessons.";

            if (waveHeightFeet >= 2.0 && waveHeightFeet < 4.0) {
                sandbarRec = "Excellent beginner to intermediate conditions. 2-3ft lines breaking slowly over the sand. Perfect for practice.";
                reefRec = "Fun peeling left-hand walls. 3ft. Good for intermediate surfers. Watch tide depth.";
            } else if (waveHeightFeet >= 4.0 && waveHeightFeet < 6.0) {
                sandbarRec = "Challenging conditions. 3-4ft+ lines with active paddle-out currents. Intermediate level suggested.";
                reefRec = "Fast, clean peeling lefts. 4-5ft. Fun for intermediate/advanced. Coral reef shelf active.";
            } else if (waveHeightFeet >= 6.0) {
                sandbarRec = "Heavy wash and closed-out in sections. 5-6ft+. Highly challenging. Recommended for advanced paddlers only.";
                reefRec = "Powerful, hollow left walls. 6ft+. Advanced only. Flat reef shelf exposed at low tide, wear booties.";
            }

            // 8. Update UI (Footer Widget)
            if (swellEl) swellEl.textContent = `${waveHeightFeet} ft @ ${Math.round(wavePeriodSeconds)}s`;
            if (windEl) windEl.textContent = `${windSpeedKnots} knots (${windType})`;
            if (tideEl) tideEl.textContent = tideText;
            if (conditionEl) {
                conditionEl.textContent = conditionText;
                conditionEl.style.backgroundColor = badgeColor;
            }

            // 9. Update UI (Advanced Analytics Dashboard)
            if (dashSwellHeight) dashSwellHeight.textContent = `${waveHeightFeet} ft (${waveHeightMeters.toFixed(1)}m)`;
            if (dashSwellPeriod) dashSwellPeriod.textContent = `${Math.round(wavePeriodSeconds)} seconds`;
            if (dashSwellDir) dashSwellDir.textContent = `${waveDirDegrees}° ${waveDirCardinal}`;
            if (dashWaveEnergy) dashWaveEnergy.textContent = `${waveEnergy} kJ`;
            
            if (dashWindSpeed) dashWindSpeed.textContent = `${windSpeedKnots} knots (${Math.round(windSpeedKmH)} km/h)`;
            if (dashWindDir) dashWindDir.textContent = `${windDirDegrees}° ${windDirCardinal}`;
            if (dashWindStatus) {
                dashWindStatus.textContent = windType;
                dashWindStatus.style.color = windType === "Offshore" ? "#48bb78" : (windType === "Onshore" ? "#f56565" : "#ecc94b");
            }
            if (dashSwellWrap) {
                const isOptimal = waveDirDegrees >= 180 && waveDirDegrees <= 230;
                dashSwellWrap.textContent = isOptimal ? "Optimal wrapping (SSW) ✅" : "Standard wrapping";
            }

            const weather = getWeatherText(weatherData.current.weather_code);
            if (dashWaterTemp) dashWaterTemp.textContent = `${waterTempC.toFixed(1)} °C`;
            if (dashAirTemp) dashAirTemp.textContent = `${weatherData.current.temperature_2m.toFixed(1)} °C`;
            if (dashWeatherState) dashWeatherState.textContent = `${weather.emoji} ${weather.text}`;
            if (dashTideStatus) dashTideStatus.textContent = tideText;
            
            if (dashRecSandbar) dashRecSandbar.textContent = sandbarRec;
            if (dashRecReef) dashRecReef.textContent = reefRec;

        } catch (error) {
            console.error("Could not fetch live wave report, using local fallbacks:", error);
        }
    };

    // --- 7. Dynamic Packages Rendering Function ---
    const renderPackages = () => {
        const packagesGridContainer = document.getElementById('packagesGridContainer');
        const coursesGridContainer = document.getElementById('coursesGridContainer');
        
        if (!packagesGridContainer || !coursesGridContainer) return;
        
        const meta = {
            'group': { img: 'images/69546.jpg.jpeg', badge: 'Popular', desc: 'Have fun learning to surf together in a friendly, supportive small group environment.', features: ['Softboard & leash included', 'Local experienced coaches', 'UV Rashguard included', 'Beach theory & ocean safety'] },
            'semi-private': { img: 'images/69606.jpg.jpeg', badge: 'Best for Couples & Friends', desc: 'Designed specifically for couples or 2 friends who want dedicated coach focus together.', features: ['1 Coach for 2 students', 'Shared surf fun together', 'All surf gear included', 'Personalized wave selection'] },
            'private': { img: 'images/69535.jpg.jpeg', badge: '1-on-1 Focus', desc: 'Undivided attention from your senior coach. Perfect for complete beginners or fast progress.', features: ['Dedicated 1-on-1 coach', 'Maximum wave count', 'Tailored pop-up coaching', 'Immediate technical feedback'] },
            'kids': { img: 'images/20713.jpg.jpeg', badge: 'Ages 5-12', desc: 'Safe, gentle, 1-on-1 instruction in shallow waist-deep water for young adventurers.', features: ['1-on-1 dedicated instructor', 'Soft safety surfboard', 'Waist-deep safe zone', 'Patience & encouragement'] }
        };

        // Render Core Packages + Any Custom Added Packages
        let coreHtml = '';
        const coreKeys = ['group', 'semi-private', 'private', 'kids'];
        const courseKeys = ['oneday', 'threeday', 'fiveday'];
        const customKeys = Object.keys(packagesData).filter(k => !coreKeys.includes(k) && !courseKeys.includes(k));
        const allCardKeys = [...coreKeys, ...customKeys];

        allCardKeys.forEach(key => {
            const pkg = packagesData[key] || PRICING[key];
            if (!pkg) return;
            const m = meta[key] || {};

            const pkgImg = (pkg.img !== undefined && pkg.img !== null) ? pkg.img : (m.img || '');
            const pkgBadge = pkg.badge || m.badge || '';
            const pkgDesc = pkg.desc || m.desc || 'Comprehensive surf coaching with dedicated instructor, safety equipment, and board included.';
            const pkgFeatures = m.features || ['Softboard & leash included', 'Local experienced coaches', 'UV Rashguard included', 'Beach theory & ocean safety'];
            const cardStyle = '';
            const badgeStyle = pkgBadge ? '' : 'display: none;';
            const suffix = '/ guest';
            const hasImg = !!pkgImg;

            coreHtml += `
                <article class="package-card" style="${cardStyle}">
                    <div class="package-img-wrapper">
                        ${hasImg ? `
                        <img src="${pkgImg}" alt="${pkg.name}" class="package-img" onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';">
                        <div class="img-fallback" style="display: none; height: 100%;">
                            <span>${pkg.name}</span>
                        </div>` : `
                        <div class="img-fallback" style="height: 100%; min-height: 160px;">
                            <span>${pkg.name}</span>
                        </div>`}
                        <span class="package-badge" style="${badgeStyle}">${pkgBadge}</span>
                    </div>
                    <div class="package-content">
                        <h3 class="package-title">${pkg.name}</h3>
                        <div class="package-meta">
                            <div class="package-meta-item">⏱ ${pkg.duration || '1 Hour 15 Mins'}</div>
                            <div class="package-meta-item">🌊 ${key === 'kids' ? 'Ages 5-12' : 'All Levels'}</div>
                        </div>
                        <p class="package-description">${pkgDesc}</p>
                        <ul class="package-features">
                            ${pkgFeatures.map(f => `<li class="package-feature-item">${f}</li>`).join('')}
                        </ul>
                        <div class="package-footer">
                            <div class="package-price">
                                <span class="package-price-amount">${Number(pkg.price).toLocaleString()} LKR</span>
                                <span class="package-price-suffix">${suffix}</span>
                            </div>
                            <a href="#booking" class="btn btn-primary package-book-btn" onclick="document.getElementById('surfPackage').value='${key}'; document.getElementById('surfPackage').dispatchEvent(new Event('change'));">BOOK NOW</a>
                        </div>
                    </div>
                </article>
            `;
        });
        packagesGridContainer.innerHTML = coreHtml;

        // Render Multi-day courses
        let coursesHtml = '';
        const courseMeta = {
            'oneday': { img: 'images/20702.jpg.jpeg', badge: 'Fast-Track Pop-Up' },
            'threeday': { img: 'images/20681.jpg.jpeg', badge: 'Popular 3-Day Course' },
            'fiveday': { img: 'images/69528.jpg.jpeg', badge: 'Complete Surfer' }
        };

        courseKeys.forEach(key => {
            const pkg = packagesData[key] || PRICING[key];
            if (!pkg) return;
            const cMeta = courseMeta[key] || {};
            const pkgImg = (pkg.img !== undefined && pkg.img !== null) ? pkg.img : (cMeta.img || '');
            const pkgBadge = pkg.badge || cMeta.badge || '';
            const hasImg = !!pkgImg;

            let defaultDesc = '';
            if (key === 'oneday') defaultDesc = 'Both morning and afternoon sessions in one day. Focus on fast-tracking pop-up stability and safety.';
            else if (key === 'threeday') defaultDesc = 'One 1h 15m session per day for 3 days. Focus on standing up consistently, paddling out, and starting turns.';
            else defaultDesc = 'Daily 1h 15m coached session for 5 days. Learn advanced pop-up, wave selection, and independent surfing.';

            const desc = pkg.desc || defaultDesc;

            coursesHtml += `
                <article class="package-card" style="overflow: hidden; display: flex; flex-direction: column;">
                    <div class="package-img-wrapper">
                        ${hasImg ? `
                        <img src="${pkgImg}" alt="${pkg.name}" class="package-img" onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';">
                        <div class="img-fallback" style="display: none; height: 100%;">
                            <span>${pkg.name}</span>
                        </div>` : `
                        <div class="img-fallback" style="height: 100%; min-height: 180px;">
                            <span>${pkg.name}</span>
                        </div>`}
                        ${pkgBadge ? `<span class="package-badge" style="background: linear-gradient(135deg, #f4d03f 0%, #ee964b 100%); color: #031b33;">${pkgBadge}</span>` : ''}
                    </div>
                    <div class="package-content" style="display: flex; flex-direction: column; justify-content: space-between; flex: 1;">
                        <div>
                            <h3 class="package-title">${pkg.name}</h3>
                            <div class="package-meta" style="margin-bottom: 10px;">
                                <div class="package-meta-item">⏱ ${pkg.duration || (key === 'oneday' ? '2 Sessions' : (key === 'threeday' ? '3 Days' : '5 Days'))}</div>
                                <div class="package-meta-item">🌊 All Levels</div>
                            </div>
                            <p class="package-description" style="margin-bottom: var(--spacing-sm);">${desc}</p>
                        </div>
                        <div class="package-footer" style="margin-top: auto; padding-top: 14px; border-top: 1px solid rgba(0,0,0,0.06);">
                            <div class="package-price">
                                <span class="package-price-amount">${Number(pkg.price).toLocaleString()} LKR</span>
                                <span class="package-price-suffix">/ course</span>
                            </div>
                            <a href="#booking" class="btn btn-primary package-book-btn" data-package="${key}">BOOK COURSE</a>
                        </div>
                    </div>
                </article>
            `;
        });
        coursesGridContainer.innerHTML = coursesHtml;

        // Synchronize package dropdown select options
        if (packageSelect) {
            const currentVal = packageSelect.value;
            packageSelect.innerHTML = Object.entries(packagesData).map(([key, pkg]) => `
                <option value="${key}">${pkg.name} (${Number(pkg.price).toLocaleString()} LKR)</option>
            `).join('');
            if (packagesData[currentVal]) packageSelect.value = currentVal;
            else if (Object.keys(packagesData).length > 0) packageSelect.value = Object.keys(packagesData)[0];
        }

        // Re-attach select triggers on Book buttons inside the generated cards
        document.querySelectorAll('[data-package]').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const pKey = btn.getAttribute('data-package');
                packageSelect.value = pKey;
                packageSelect.dispatchEvent(new Event('change'));
            });
        });
    };

    // Render packages at start
    renderPackages();

    const getTaglineHTML = (taglineText) => {
        if (!taglineText) return '';
        const cleanText = taglineText.replace(/🇱🇰/g, '').replace(/\bLK\b/gi, '').trim();
        const flagSvg = `<svg class="flag-lk" viewBox="0 0 900 600" style="display: inline-block; vertical-align: middle; height: 14px; width: 21px; margin-left: 6px; border-radius: 2px; box-shadow: 0 1px 3px rgba(0,0,0,0.3);"><rect width="900" height="600" fill="#F7C948"/><rect x="30" y="30" width="168" height="540" fill="#EB7424"/><rect x="198" y="30" width="168" height="540" fill="#2D6B52"/><rect x="366" y="30" width="504" height="540" fill="#8D1B3D"/><circle cx="400" cy="65" r="15" fill="#F7C948"/><circle cx="835" cy="65" r="15" fill="#F7C948"/><circle cx="400" cy="535" r="15" fill="#F7C948"/><circle cx="835" cy="535" r="15" fill="#F7C948"/><path d="M520,380 L520,240 L660,240 L660,380 Z M610,240 L610,160 M610,160 L660,180" stroke="#F7C948" stroke-width="25" stroke-linecap="round" stroke-linejoin="round" fill="none"/></svg>`;
        return cleanText + ' ' + flagSvg;
    };

    const renderSiteSettings = () => {
        const dHeroTagline = document.getElementById('dynHeroTagline');
        const dHeroTitle = document.getElementById('dynHeroTitle');
        const dHeroSubtitle = document.getElementById('dynHeroSubtitle');
        const dHeroBg = document.getElementById('dynHeroBg');
        
        const dAboutTag = document.getElementById('dynAboutTag');
        const dAboutTitle = document.getElementById('dynAboutTitle');
        const dAboutDesc = document.getElementById('dynAboutDesc');
        
        const dMeetingLink = document.getElementById('dynMeetingLocationLink');
        const dMeetingText = document.getElementById('dynMeetingLocationText');
        const dFooterHours = document.getElementById('dynFooterHours');
        
        // Render texts
        if (dHeroTagline) dHeroTagline.innerHTML = getTaglineHTML(siteSettings.heroTagline);
        if (dHeroTitle) dHeroTitle.innerHTML = siteSettings.heroTitle;
        if (dHeroSubtitle) dHeroSubtitle.textContent = siteSettings.heroSubtitle;
        if (dHeroBg) dHeroBg.src = siteSettings.heroBg;
        
        if (dAboutTag) dAboutTag.textContent = siteSettings.aboutTag;
        if (dAboutTitle) dAboutTitle.textContent = siteSettings.aboutTitle;
        if (dAboutDesc) dAboutDesc.innerHTML = siteSettings.aboutDesc;
        
        if (dMeetingLink) dMeetingLink.href = siteSettings.meetingLink;
        if (dMeetingText) dMeetingText.textContent = siteSettings.meetingText;
        if (dFooterHours) dFooterHours.innerHTML = siteSettings.footerHours;
        
        // Update all standard WhatsApp links & display numbers
        const cleanWa = siteSettings.contactWa.replace(/[^0-9]/g, '');
        document.querySelectorAll('.dyn-wa-link').forEach(link => {
            link.href = `https://wa.me/${cleanWa}`;
        });
        document.querySelectorAll('.dyn-wa-text').forEach(el => {
            el.textContent = siteSettings.contactWa;
        });
        
        // Update all Email links & display addresses
        document.querySelectorAll('.dyn-email-link').forEach(link => {
            link.href = `mailto:${siteSettings.contactEmail}`;
        });
        document.querySelectorAll('.dyn-email-text').forEach(el => {
            el.textContent = siteSettings.contactEmail;
        });

        // Update all Social Media links
        if (siteSettings.socialFb) {
            document.querySelectorAll('.dyn-fb-link').forEach(el => el.href = siteSettings.socialFb);
        }
        if (siteSettings.socialInsta) {
            document.querySelectorAll('.dyn-insta-link').forEach(el => el.href = siteSettings.socialInsta);
        }
        if (siteSettings.socialTripAdvisor) {
            document.querySelectorAll('.dyn-tripadvisor-link').forEach(el => el.href = siteSettings.socialTripAdvisor);
        }
        if (siteSettings.socialGoogle || siteSettings.meetingLink) {
            document.querySelectorAll('.dyn-google-link').forEach(el => el.href = siteSettings.socialGoogle || siteSettings.meetingLink);
        }

        // Update Beach Landmark Directions & Advance Booking Note
        if (siteSettings.landmarkText) {
            document.querySelectorAll('.dyn-landmark-text').forEach(el => el.textContent = siteSettings.landmarkText);
        }
        if (siteSettings.bookingNote) {
            document.querySelectorAll('.dyn-booking-note').forEach(el => el.textContent = siteSettings.bookingNote);
        }

        // Update Trust Badges
        if (siteSettings.trustBadge1) {
            document.querySelectorAll('.dyn-trust-1').forEach(el => el.textContent = siteSettings.trustBadge1);
        }
        if (siteSettings.trustBadge2) {
            document.querySelectorAll('.dyn-trust-2').forEach(el => el.textContent = siteSettings.trustBadge2);
        }
        if (siteSettings.trustBadge3) {
            document.querySelectorAll('.dyn-trust-3').forEach(el => el.textContent = siteSettings.trustBadge3);
        }
        if (siteSettings.trustBadge4) {
            document.querySelectorAll('.dyn-trust-4').forEach(el => el.textContent = siteSettings.trustBadge4);
        }

        // Update brand description & copyright in footer
        if (siteSettings.footerBrand) {
            document.querySelectorAll('.dyn-footer-desc').forEach(el => el.textContent = siteSettings.footerBrand);
        }
        if (siteSettings.copyrightText) {
            document.querySelectorAll('.dyn-copyright').forEach(el => el.textContent = siteSettings.copyrightText);
        }

        const dFooterBrand = document.getElementById('dynFooterBrandText');
        if (dFooterBrand) {
            dFooterBrand.innerHTML = `${getTaglineHTML(siteSettings.heroTagline)} — ${siteSettings.footerBrand || 'Your local surf school for beginner, private, and semi-private surf lessons led by Kasun & team.'}`;
        }
    };

    renderSiteSettings();

    // --- 10. Render Instructors Section ---
    const renderInstructors = () => {
        const container = document.getElementById('instructorsContainer');
        if (!container) return;

        container.innerHTML = instructorsData.map(ins => `
            <article class="instructor-card">
                <div class="instructor-img-wrapper">
                    <img src="${ins.img}" alt="${ins.name}" class="instructor-img" onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';">
                    <div class="img-fallback" style="display: none; height: 100%;">
                        <span>${ins.name}</span>
                    </div>
                </div>
                <div class="instructor-info">
                    <h3 class="instructor-name">${ins.name}</h3>
                    <div class="instructor-role">${ins.role}</div>
                    <p class="instructor-bio">${ins.bio}</p>
                    <div class="instructor-badges">
                        ${ins.badges ? ins.badges.split(',').map(b => `<span class="instructor-badge">${b.trim()}</span>`).join('') : ''}
                    </div>
                </div>
            </article>
        `).join('');
    };

    // --- 11. Render Reviews Section ---
    const renderReviews = () => {
        const sliderEl = document.getElementById('reviewsSlider');
        if (!sliderEl) return;

        const allReviews = [...firestoreReviews, ...reviewsData].filter(rev => 
            rev && rev.name && rev.name !== 'David Marshall' && rev.name !== 'Sarah Lindemann' && rev.name !== 'Mike & Emma' && rev.name !== 'Jessica R.' && rev.name !== 'Alex & Sophie'
        );

        if (allReviews.length === 0) {
            sliderEl.innerHTML = `
                <div class="review-slide" style="min-width: 100%; text-align: center; padding: 20px;">
                    <div class="review-card" style="max-width: 600px; margin: 0 auto; padding: 32px 24px; text-align: center; background: rgba(15, 23, 42, 0.7); border: 1px solid rgba(244, 208, 63, 0.3);">
                        <div style="font-size: 2.5rem; margin-bottom: 8px;">🌟 ★★★★★</div>
                        <h3 style="color: #f4d03f; margin-bottom: 8px; font-size: 1.3rem;">350+ Verified 5-Star Reviews on Google</h3>
                        <p style="color: #cbd5e1; font-size: 0.95rem; margin-bottom: 20px; line-height: 1.6;">
                            Our students love learning to surf with Kasun & Team at Hiriketiya Beach. Read our verified Google Reviews or share your own experience!
                        </p>
                        <div style="display: flex; gap: 12px; justify-content: center; flex-wrap: wrap;">
                            <a href="https://maps.app.goo.gl/WQGCeh4apHywDrrx5?g_st=ac" target="_blank" class="btn btn-primary" style="padding: 10px 22px; font-size: 0.9rem;">⭐ Read Google Reviews (5.0 ★)</a>
                            <button type="button" class="btn btn-outline" onclick="document.getElementById('openReviewModalBtn')?.click()" style="border-color: #38bdf8; color: #38bdf8; padding: 10px 22px; font-size: 0.9rem;">✍️ Write a Review</button>
                        </div>
                    </div>
                </div>
            `;
            return;
        }

        sliderEl.innerHTML = allReviews.map(rev => {
            const hasCustomImg = rev.img && rev.img !== 'images/69678.jpg.jpeg' && (rev.img.startsWith('data:image') || rev.img.includes('instructor-') || rev.img.includes('696') || rev.img.startsWith('http'));
            const avatarHtml = hasCustomImg 
                ? `<img src="${rev.img}" alt="${rev.name}" class="review-author-img" onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';">
                   <div class="review-author-emoji-avatar" style="display: none; width: 44px; height: 44px; border-radius: 50%; background: #1e293b; border: 2px solid #f4d03f; align-items: center; justify-content: center; font-size: 1.4rem; flex-shrink: 0; box-shadow: 0 2px 6px rgba(0,0,0,0.2);">${rev.avatarEmoji || '🌊'}</div>`
                : `<div class="review-author-emoji-avatar" style="width: 44px; height: 44px; border-radius: 50%; background: #1e293b; border: 2px solid #f4d03f; display: flex; align-items: center; justify-content: center; font-size: 1.4rem; flex-shrink: 0; box-shadow: 0 2px 6px rgba(0,0,0,0.2);">${rev.avatarEmoji || '🌊'}</div>`;

            return `
                <div class="review-slide">
                    <div class="review-card">
                        <div class="review-stars">${rev.rating || '★★★★★'}</div>
                        <p class="review-text">"${rev.text}"</p>
                        <div class="review-author">
                            ${avatarHtml}
                            <div class="review-author-info" style="margin-left: 10px;">
                                <h4 class="review-author-name">${rev.name}</h4>
                                <span class="review-author-meta">${rev.meta || 'Verified Student'}</span>
                            </div>
                        </div>
                    </div>
                </div>
            `;
        }).join('');

        initReviewsSlider();
    };

    // --- On-Page User Review Modal Handling ---
    const userReviewModal = document.getElementById('userReviewModal');
    const openReviewModalBtn = document.getElementById('openReviewModalBtn');
    const closeReviewModalBtn = document.getElementById('closeReviewModalBtn');
    const userReviewForm = document.getElementById('userReviewForm');
    const revPhotoUpload = document.getElementById('revPhotoUpload');
    const avatarPreview = document.getElementById('avatarPreview');
    const defaultAvatars = document.getElementById('defaultAvatars');

    // Success Modal elements
    const reviewSuccessModal = document.getElementById('reviewSuccessModal');
    const closeSuccessModalBtn = document.getElementById('closeSuccessModalBtn');
    const successReviewText = document.getElementById('successReviewText');
    const copyReviewBtn = document.getElementById('copyReviewBtn');

    let selectedAvatar = '🌊';
    let uploadedAvatarBase64 = '';

    // Handle avatar preset buttons selection
    if (defaultAvatars) {
        defaultAvatars.addEventListener('click', (e) => {
            const btn = e.target.closest('.avatar-btn');
            if (!btn) return;
            
            // Remove active from all
            defaultAvatars.querySelectorAll('.avatar-btn').forEach(b => {
                b.style.borderColor = 'transparent';
                b.classList.remove('active');
            });
            
            // Set active
            btn.style.borderColor = '#f4d03f';
            btn.classList.add('active');
            
            selectedAvatar = btn.getAttribute('data-avatar');
            uploadedAvatarBase64 = ''; // Reset custom uploaded photo
            if (avatarPreview) avatarPreview.style.display = 'none';
        });
    }

    // Convert custom photo upload to Base64
    if (revPhotoUpload) {
        revPhotoUpload.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (file) {
                const reader = new FileReader();
                reader.onload = (evt) => {
                    uploadedAvatarBase64 = evt.target.result;
                    selectedAvatar = ''; // Clear preset selection
                    
                    // Highlight presets off
                    if (defaultAvatars) {
                        defaultAvatars.querySelectorAll('.avatar-btn').forEach(b => {
                            b.style.borderColor = 'transparent';
                            b.classList.remove('active');
                        });
                    }
                    
                    // Show custom preview
                    if (avatarPreview) {
                        avatarPreview.src = uploadedAvatarBase64;
                        avatarPreview.style.display = 'block';
                    }
                };
                reader.readAsDataURL(file);
            }
        });
    }

    const cancelReviewBtn = document.getElementById('cancelReviewBtn');
    const closeSuccessBottomBtn = document.getElementById('closeSuccessBottomBtn');

    const openModal = (modal) => {
        if (modal) {
            modal.style.display = 'flex';
            document.body.style.overflow = 'hidden';
        }
    };

    const closeModal = (modal) => {
        if (modal) {
            modal.style.display = 'none';
            document.body.style.overflow = '';
        }
    };

    if (openReviewModalBtn && userReviewModal) {
        openReviewModalBtn.addEventListener('click', (e) => {
            e.preventDefault();
            openModal(userReviewModal);
        });
    }

    if (closeReviewModalBtn && userReviewModal) {
        closeReviewModalBtn.addEventListener('click', () => closeModal(userReviewModal));
    }

    if (cancelReviewBtn && userReviewModal) {
        cancelReviewBtn.addEventListener('click', () => closeModal(userReviewModal));
    }

    if (closeSuccessModalBtn && reviewSuccessModal) {
        closeSuccessModalBtn.addEventListener('click', () => closeModal(reviewSuccessModal));
    }

    if (closeSuccessBottomBtn && reviewSuccessModal) {
        closeSuccessBottomBtn.addEventListener('click', () => closeModal(reviewSuccessModal));
    }

    // Close on backdrop tap / click outside the card
    if (userReviewModal) {
        userReviewModal.addEventListener('click', (e) => {
            if (e.target === userReviewModal) {
                closeModal(userReviewModal);
            }
        });
    }

    if (reviewSuccessModal) {
        reviewSuccessModal.addEventListener('click', (e) => {
            if (e.target === reviewSuccessModal) {
                closeModal(reviewSuccessModal);
            }
        });
    }

    // Close on ESC key
    window.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            closeModal(userReviewModal);
            closeModal(reviewSuccessModal);
        }
    });

    // Handle review text clipboard copy
    if (copyReviewBtn && successReviewText) {
        copyReviewBtn.addEventListener('click', () => {
            navigator.clipboard.writeText(successReviewText.textContent).then(() => {
                copyReviewBtn.textContent = '✅ Copied!';
                setTimeout(() => {
                    copyReviewBtn.textContent = '📋 Copy Review Text';
                }, 2000);
            });
        });
    }

    if (userReviewForm) {
        userReviewForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const nameInput = document.getElementById('revName');
            const metaInput = document.getElementById('revMeta');
            const ratingInput = document.getElementById('revRating');
            const textInput = document.getElementById('revText');

            const name = nameInput ? nameInput.value.trim() : '';
            const meta = metaInput ? metaInput.value.trim() : '';
            const rating = ratingInput ? ratingInput.value : '★★★★★';
            const text = textInput ? textInput.value.trim() : '';

            if (!name || !text) {
                alert('Please fill out your name and review.');
                return;
            }

            if (db) {
                if (!currentUser) {
                    alert('Please sign in (Google or Email link) to post your review!');
                    return;
                }
                
                let reviewerImg = currentUser.photoURL;
                let reviewerEmoji = '';
                if (!reviewerImg) {
                    reviewerImg = uploadedAvatarBase64 || 'images/69678.jpg.jpeg';
                    reviewerEmoji = selectedAvatar || '';
                }

                db.collection('reviews').add({
                    name: name,
                    meta: meta || 'Surfer • Hiriketiya Visitor',
                    rating: rating || '★★★★★',
                    text: text,
                    img: reviewerImg,
                    avatarEmoji: reviewerEmoji,
                    email: currentUser.email || '',
                    status: 'pending',
                    createdAt: firebase.firestore.FieldValue.serverTimestamp()
                }).then(() => {
                    if (userReviewModal) userReviewModal.style.display = 'none';
                    userReviewForm.reset();
                    const successModal = document.getElementById('reviewSuccessModal');
                    if (successModal) {
                        successModal.style.display = 'flex';
                    } else {
                        alert('Thank you! Your review has been submitted for approval.');
                    }
                }).catch(err => {
                    console.error("Error submitting review to Firebase:", err);
                    alert("Error submitting review: " + err.message);
                });
                return;
            }

            reviewsData.unshift({
                id: Date.now(),
                name: name,
                meta: meta || 'Surfer • Hiriketiya Visitor',
                rating: rating || '★★★★★',
                text: text,
                img: uploadedAvatarBase64 || 'images/69678.jpg.jpeg',
                avatarEmoji: selectedAvatar || ''
            });

            localStorage.setItem('hiri_reviews', JSON.stringify(reviewsData));
            renderReviews();
            
            if (userReviewModal) userReviewModal.style.display = 'none';
            userReviewForm.reset();
            
            if (avatarPreview) avatarPreview.style.display = 'none';
            if (defaultAvatars) {
                defaultAvatars.querySelectorAll('.avatar-btn').forEach((b, idx) => {
                    b.style.borderColor = idx === 0 ? '#f4d03f' : 'transparent';
                    if (idx === 0) b.classList.add('active');
                    else b.classList.remove('active');
                });
            }
            selectedAvatar = '🌊';
            uploadedAvatarBase64 = '';

            // Open success confirmation popup
            if (reviewSuccessModal) {
                if (successReviewText) {
                    successReviewText.textContent = text;
                }
                reviewSuccessModal.style.display = 'flex';
            }
        });
    }

    // --- 12. Render Photo Gallery Section (HD Slider Carousel) ---
    let galleryCurrentIndex = 0;
    let galleryAutoSlideTimer = null;

    const updateGallerySlider = () => {
        const container = document.getElementById('galleryContainer');
        const dotsContainer = document.getElementById('galleryDots');
        if (!container) return;

        if (!galleryData || galleryData.length === 0) return;
        if (galleryCurrentIndex >= galleryData.length) galleryCurrentIndex = 0;
        if (galleryCurrentIndex < 0) galleryCurrentIndex = galleryData.length - 1;

        container.style.transform = `translateX(-${galleryCurrentIndex * 100}%)`;

        if (dotsContainer) {
            const dots = dotsContainer.querySelectorAll('.gallery-dot');
            dots.forEach((dot, idx) => {
                dot.classList.toggle('active', idx === galleryCurrentIndex);
            });
        }
    };

    const resetGalleryTimer = () => {
        if (galleryAutoSlideTimer) clearInterval(galleryAutoSlideTimer);
        galleryAutoSlideTimer = setInterval(() => {
            if (!galleryData || galleryData.length === 0) return;
            galleryCurrentIndex = (galleryCurrentIndex + 1) % galleryData.length;
            updateGallerySlider();
        }, 3500);
    };

    window.goToGallerySlide = (idx) => {
        galleryCurrentIndex = idx;
        updateGallerySlider();
        resetGalleryTimer();
    };

    const renderGallery = () => {
        const container = document.getElementById('galleryContainer');
        const dotsContainer = document.getElementById('galleryDots');
        const prevBtn = document.getElementById('galleryPrevBtn');
        const nextBtn = document.getElementById('galleryNextBtn');
        if (!container) return;

        if (!galleryData || galleryData.length === 0) return;

        container.innerHTML = galleryData.map((item, i) => `
            <div class="gallery-slide" style="min-width: 100%; flex-shrink: 0; width: 100%; height: 100%; position: relative;">
                <img src="${item.img}" alt="Surf Gallery Image ${i + 1}" onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';">
                <div class="img-fallback" style="display: none; height: 100%;"><span>Surf Gallery Image ${i + 1}</span></div>
            </div>
        `).join('');

        // Render Dots
        if (dotsContainer) {
            dotsContainer.innerHTML = galleryData.map((_, i) => `
                <div class="gallery-dot ${i === 0 ? 'active' : ''}" onclick="goToGallerySlide(${i})"></div>
            `).join('');
        }

        if (prevBtn) {
            prevBtn.onclick = () => {
                galleryCurrentIndex = (galleryCurrentIndex - 1 + galleryData.length) % galleryData.length;
                updateGallerySlider();
                resetGalleryTimer();
            };
        }

        if (nextBtn) {
            nextBtn.onclick = () => {
                galleryCurrentIndex = (galleryCurrentIndex + 1) % galleryData.length;
                updateGallerySlider();
                resetGalleryTimer();
            };
        }

        updateGallerySlider();
        resetGalleryTimer();
    };

    // --- 13. Render FAQs Section ---
    const renderFaqs = () => {
        const container = document.getElementById('faqsContainer');
        if (!container) return;

        container.innerHTML = faqsData.map(faq => `
            <div class="faq-card">
                <h3 class="faq-question">${faq.question}</h3>
                <p class="faq-answer">${faq.answer}</p>
            </div>
        `).join('');
    };

    // Render all dynamic sections at start
    renderInstructors();
    renderReviews();
    renderGallery();
    renderFaqs();

    // --- 14. Interactive Inquiry Form for Surf Guide (Spots, Guided Trips) ---
    const inquiryForm = document.getElementById('inquiryForm');
    const inqTopicSelect = document.getElementById('inqTopic');

    // Handle clicks on topic buttons to auto-select option & scroll
    document.querySelectorAll('[data-topic]').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.preventDefault();
            const topic = btn.getAttribute('data-topic');
            if (inqTopicSelect) {
                inqTopicSelect.value = topic;
            }
            const targetEl = document.getElementById('inquiry');
            if (targetEl) {
                targetEl.scrollIntoView({ behavior: 'smooth' });
            }
        });
    });

    if (inquiryForm) {
        inquiryForm.addEventListener('submit', (e) => {
            e.preventDefault();

            const name = document.getElementById('inqName').value.trim();
            const phone = document.getElementById('inqPhone').value.trim();
            const email = document.getElementById('inqEmail').value.trim();
            const topicKey = inqTopicSelect ? inqTopicSelect.value : 'general';
            const date = document.getElementById('inqDate') ? document.getElementById('inqDate').value : '';
            const message = document.getElementById('inqMessage') ? document.getElementById('inqMessage').value.trim() : '';

            const topicLabels = {
                'guiding': '🗺️ Guided Coastal Surf Trips',
                'spots': '🌊 Surf Spot Guide Info',
                'general': '❓ General Inquiry'
            };
            const topicName = topicLabels[topicKey] || 'General Inquiry';

            // Capture inquiry request as a pending entry in localStorage
            try {
                const bookings = JSON.parse(localStorage.getItem('hiri_surf_bookings') || '[]');
                const newInquiry = {
                    id: Date.now(),
                    name: name,
                    phone: phone,
                    email: email,
                    package: `Inquiry: ${topicName}`,
                    date: date || 'N/A',
                    size: 1,
                    total: 0,
                    status: 'pending',
                    createdAt: new Date().toISOString()
                };
                bookings.unshift(newInquiry);
                localStorage.setItem('hiri_surf_bookings', JSON.stringify(bookings));
            } catch (err) {
                console.error("Local storage error capturing inquiry:", err);
            }

            // Format WhatsApp text
            const dateStr = date ? `\n📅 *Target Date:* ${date}` : '';
            const text = `Hi Hiri Surf School! 🏄‍♂️\n\nI have an inquiry regarding *${topicName}*:\n\n👤 *Name:* ${name}\n📧 *Email:* ${email}\n📱 *WhatsApp:* ${phone}${dateStr}\n💬 *Message/Details:* ${message}\n\nLooking forward to hearing from you! 🤙`;

            showToast('🏄 Inquiry submitted! Opening WhatsApp...');

            // Redirect URL
            const cleanWa = (siteSettings && siteSettings.contactWa ? siteSettings.contactWa : "+94 76 932 7173").replace(/[^0-9]/g, '');
            const whatsappUrl = `https://wa.me/${cleanWa}?text=${encodeURIComponent(text)}`;

            setTimeout(() => {
                const opened = window.open(whatsappUrl, '_blank');
                if (!opened || opened.closed || typeof opened.closed === 'undefined') {
                    window.location.href = whatsappUrl;
                }
                inquiryForm.reset();
            }, 300);
        });
    }

    // --- 13. Guide Hero Slideshow Background ---
    let currentGuideHeroSlide = 0;
    const guideHeroSlides = document.querySelectorAll('#guideHeroSlideshow .hero-slide');
    if (guideHeroSlides.length > 0) {
        setInterval(() => {
            guideHeroSlides[currentGuideHeroSlide].classList.remove('active');
            currentGuideHeroSlide = (currentGuideHeroSlide + 1) % guideHeroSlides.length;
            guideHeroSlides[currentGuideHeroSlide].classList.add('active');
        }, 5000);
    }

    // --- 14. Guided Trips Showcase Fade Slideshow ---
    let guidedSlideIdx = 0;
    const guidedSlides = document.querySelectorAll('#guidedShowcase .showcase-slide');
    if (guidedSlides.length > 0) {
        setInterval(() => {
            guidedSlides[guidedSlideIdx].style.opacity = 0;
            guidedSlideIdx = (guidedSlideIdx + 1) % guidedSlides.length;
            guidedSlides[guidedSlideIdx].style.opacity = 1;
        }, 4000);
    }

    // --- Firebase / Firestore Auth & Reviews Synchronization ---
    const initFirestoreReviewsListener = () => {
        if (!db) return;
        db.collection('reviews')
            .where('status', '==', 'approved')
            .orderBy('createdAt', 'desc')
            .onSnapshot(snapshot => {
                firestoreReviews = snapshot.docs.map(doc => {
                    const data = doc.data();
                    return {
                        id: doc.id,
                        name: data.name,
                        meta: data.meta || 'Google Customer',
                        rating: data.rating || '★★★★★',
                        text: data.text,
                        img: data.img || 'images/69678.jpg.jpeg',
                        avatarEmoji: ''
                    };
                });
                renderReviews();
            }, err => {
                console.error("Error listening to approved reviews:", err);
            });
    };

    const initAuthListener = () => {
        if (!auth) return;

        const authContainer = document.getElementById('googleAuthContainer');
        const loggedOutDiv = document.getElementById('googleLoggedOut');
        const loggedInDiv = document.getElementById('googleLoggedIn');
        const userPhoto = document.getElementById('googleUserPhoto');
        const userName = document.getElementById('googleUserName');
        const userEmail = document.getElementById('googleUserEmail');
        
        const revNameInput = document.getElementById('revName');
        const avatarManualContainer = document.getElementById('avatarManualContainer');

        if (authContainer) authContainer.style.display = 'block';

        auth.onAuthStateChanged(user => {
            currentUser = user;
            if (user) {
                if (loggedOutDiv) loggedOutDiv.style.display = 'none';
                if (loggedInDiv) loggedInDiv.style.display = 'flex';
                
                userPhoto.src = user.photoURL || 'images/69678.jpg.jpeg';
                userName.textContent = user.displayName || user.email.split('@')[0];
                userEmail.textContent = user.email || '';

                if (revNameInput) {
                    revNameInput.value = user.displayName || user.email.split('@')[0];
                    if (user.providerData && user.providerData.some(p => p.providerId === 'google.com')) {
                        revNameInput.readOnly = true;
                        revNameInput.style.opacity = '0.7';
                        if (avatarManualContainer) avatarManualContainer.style.display = 'none';
                    } else {
                        revNameInput.readOnly = false;
                        revNameInput.style.opacity = '1';
                        if (avatarManualContainer) avatarManualContainer.style.display = 'block';
                    }
                }
            } else {
                if (loggedOutDiv) loggedOutDiv.style.display = 'flex';
                if (loggedInDiv) loggedInDiv.style.display = 'none';

                if (revNameInput) {
                    revNameInput.value = '';
                    revNameInput.readOnly = false;
                    revNameInput.style.opacity = '1';
                }

                if (avatarManualContainer) avatarManualContainer.style.display = 'block';
            }
        });

        const loginBtn = document.getElementById('googleLoginBtn');
        if (loginBtn) {
            loginBtn.addEventListener('click', () => {
                auth.signInWithPopup(googleProvider).catch(err => {
                    console.error("Sign-in popup error:", err);
                    auth.signInWithRedirect(googleProvider);
                });
            });
        }

        const logoutBtn = document.getElementById('googleLogoutBtn');
        if (logoutBtn) {
            logoutBtn.addEventListener('click', () => {
                auth.signOut().catch(err => console.error("Sign-out error:", err));
            });
        }

        // --- Email Link Sign In Triggers ---
        const sendEmailLinkBtn = document.getElementById('authSendEmailLinkBtn');
        const emailInput = document.getElementById('authEmailInput');
        const emailStatusMsg = document.getElementById('authEmailStatusMsg');

        if (sendEmailLinkBtn && emailInput) {
            sendEmailLinkBtn.addEventListener('click', () => {
                const emailVal = emailInput.value.trim();
                if (!emailVal) {
                    alert("Please enter a valid email address.");
                    return;
                }

                const actionCodeSettings = {
                    url: window.location.origin + window.location.pathname,
                    handleCodeInApp: true
                };

                auth.sendSignInLinkToEmail(emailVal, actionCodeSettings)
                    .then(() => {
                        window.localStorage.setItem('emailForSignIn', emailVal);
                        if (emailStatusMsg) {
                            emailStatusMsg.textContent = "Sign-in link sent! Please check your email.";
                            emailStatusMsg.style.display = "block";
                        }
                    })
                    .catch(err => {
                        console.error("Error sending email sign in link:", err);
                        alert("Error sending link: " + err.message);
                    });
            });
        }
    };

    const checkEmailSignInLink = () => {
        if (!auth) return;
        if (auth.isSignInWithEmailLink(window.location.href)) {
            let email = window.localStorage.getItem('emailForSignIn');
            if (!email) {
                email = window.prompt('Please confirm your email to complete sign in:');
            }
            if (email) {
                auth.signInWithEmailLink(email, window.location.href)
                    .then((result) => {
                        window.localStorage.removeItem('emailForSignIn');
                        // Open the review modal automatically
                        const userReviewModal = document.getElementById('userReviewModal');
                        if (userReviewModal) userReviewModal.style.display = 'flex';
                    })
                    .catch((error) => {
                        console.error("Email link sign in error:", error);
                        alert("Sign in failed: " + error.message);
                    });
            }
        }
    };

    // --- Real-Time Cross-Tab Synchronization Listener ---
    const initCrossTabSyncListener = () => {
        window.addEventListener('storage', (e) => {
            if (!e.key || !e.key.startsWith('hiri_')) return;

            if (e.key === 'hiri_surf_packages') {
                try {
                    const updated = JSON.parse(e.newValue);
                    if (updated && typeof updated === 'object') {
                        packagesData = updated;
                        renderPackages();
                        if (typeof renderPricingCards === 'function') renderPricingCards();
                    }
                } catch (err) { console.error("Sync packages error:", err); }
            }

            if (e.key === 'hiri_site_settings') {
                try {
                    const updated = JSON.parse(e.newValue);
                    if (updated && typeof updated === 'object') {
                        siteSettings = updated;
                        renderSiteSettings();
                    }
                } catch (err) { console.error("Sync settings error:", err); }
            }

            if (e.key === 'hiri_instructors') {
                try {
                    const updated = JSON.parse(e.newValue);
                    if (Array.isArray(updated)) {
                        instructorsData = updated;
                        renderInstructors();
                    }
                } catch (err) { console.error("Sync instructors error:", err); }
            }

            if (e.key === 'hiri_reviews') {
                try {
                    const updated = JSON.parse(e.newValue);
                    if (Array.isArray(updated)) {
                        reviewsData = updated;
                        renderReviews();
                    }
                } catch (err) { console.error("Sync reviews error:", err); }
            }

            if (e.key === 'hiri_gallery') {
                try {
                    const updated = JSON.parse(e.newValue);
                    if (Array.isArray(updated)) {
                        galleryData = updated;
                        renderGallery();
                    }
                } catch (err) { console.error("Sync gallery error:", err); }
            }

            if (e.key === 'hiri_faqs') {
                try {
                    const updated = JSON.parse(e.newValue);
                    if (Array.isArray(updated)) {
                        faqsData = updated;
                        renderFaqs();
                    }
                } catch (err) { console.error("Sync faqs error:", err); }
            }

            if (e.key === 'hiri_calc_settings') {
                try {
                    const updated = JSON.parse(e.newValue);
                    if (updated && typeof updated === 'object') {
                        calcSettings = updated;
                    }
                } catch (err) { console.error("Sync calc settings error:", err); }
            }
        });
    };

    // --- Firestore Packages Real-Time Listener ---
    const initFirestorePackagesListener = () => {
        if (!db) db = window.db || (window.firebase && window.firebase.firestore ? window.firebase.firestore() : null);
        if (!db) return;
        db.collection('siteData').doc('packages').onSnapshot(doc => {
            if (doc && doc.exists && doc.data() && doc.data().data) {
                packagesData = doc.data().data;
                localStorage.setItem('hiri_surf_packages', JSON.stringify(packagesData));
                renderPackages();
            }
        }, err => {
            console.warn('Firestore packages listener notice:', err);
        });
    };

    // --- Firestore Instructors Real-Time Listener ---
    const initFirestoreInstructorsListener = () => {
        if (!db) db = window.db || (window.firebase && window.firebase.firestore ? window.firebase.firestore() : null);
        if (!db) return;
        db.collection('siteData').doc('instructors').onSnapshot(doc => {
            if (doc && doc.exists && doc.data() && doc.data().data) {
                instructorsData = doc.data().data;
                localStorage.setItem('hiri_instructors', JSON.stringify(instructorsData));
                renderInstructors();
            }
        }, err => {
            console.warn('Firestore instructors listener notice:', err);
        });
    };

    // --- Firestore Reviews Real-Time Listener (static reviews from admin) ---
    const initFirestoreStaticReviewsListener = () => {
        if (!db) db = window.db || (window.firebase && window.firebase.firestore ? window.firebase.firestore() : null);
        if (!db) return;
        db.collection('siteData').doc('reviews').onSnapshot(doc => {
            if (doc && doc.exists && doc.data() && doc.data().data) {
                reviewsData = doc.data().data;
                localStorage.setItem('hiri_reviews', JSON.stringify(reviewsData));
                renderReviews();
            }
        }, err => {
            console.warn('Firestore reviews listener notice:', err);
        });
    };

    // --- Firestore Site Settings Real-Time Listener ---
    const initFirestoreSettingsListener = () => {
        if (!db) db = window.db || (window.firebase && window.firebase.firestore ? window.firebase.firestore() : null);
        if (!db) return;
        db.collection('siteData').doc('settings').onSnapshot(doc => {
            if (doc && doc.exists && doc.data() && doc.data().data) {
                const s = doc.data().data;
                siteSettings = { ...DEFAULT_SETTINGS, ...s, firebaseConfig: DEFAULT_SETTINGS.firebaseConfig };
                localStorage.setItem('hiri_site_settings', JSON.stringify(siteSettings));
                if (typeof renderSiteSettings === 'function') renderSiteSettings();
            }
        }, err => {
            console.warn('Firestore settings listener notice:', err);
        });
    };

    // --- Firestore Gallery Real-Time Listener ---
    const initFirestoreGalleryListener = () => {
        if (!db) db = window.db || (window.firebase && window.firebase.firestore ? window.firebase.firestore() : null);
        if (!db) return;
        db.collection('siteData').doc('gallery').onSnapshot(doc => {
            if (doc && doc.exists && doc.data() && doc.data().data) {
                galleryData = doc.data().data;
                localStorage.setItem('hiri_gallery', JSON.stringify(galleryData));
                renderGallery();
            }
        }, err => {
            console.warn('Firestore gallery listener notice:', err);
        });
    };

    // --- Firestore FAQs Real-Time Listener ---
    const initFirestoreFaqsListener = () => {
        if (!db) db = window.db || (window.firebase && window.firebase.firestore ? window.firebase.firestore() : null);
        if (!db) return;
        db.collection('siteData').doc('faqs').onSnapshot(doc => {
            if (doc && doc.exists && doc.data() && doc.data().data) {
                faqsData = doc.data().data;
                localStorage.setItem('hiri_faqs', JSON.stringify(faqsData));
                renderFaqs();
            }
        }, err => {
            console.warn('Firestore faqs listener notice:', err);
        });
    };

    // --- Firestore Calculator Settings Real-Time Listener ---
    const initFirestoreCalcListener = () => {
        if (!db) db = window.db || (window.firebase && window.firebase.firestore ? window.firebase.firestore() : null);
        if (!db) return;
        db.collection('siteData').doc('calcSettings').onSnapshot(doc => {
            if (doc && doc.exists && doc.data() && doc.data().data) {
                calcSettings = doc.data().data;
                localStorage.setItem('hiri_calc_settings', JSON.stringify(calcSettings));
                if (typeof updateCalculator === 'function') updateCalculator();
            }
        }, err => {
            console.warn('Firestore calcSettings listener notice:', err);
        });
    };

    // --- Beginner Surf Guides & Techniques Auto-Swapping Carousel ---
    const initTechGuideSlider = () => {
        const track = document.getElementById('techTrack');
        const viewport = document.getElementById('techViewport');
        const prevBtn = document.getElementById('techPrevBtn');
        const nextBtn = document.getElementById('techNextBtn');
        const dotsContainer = document.getElementById('techDots');

        if (!track || !viewport) return;

        const cards = track.querySelectorAll('.tech-card');
        const totalCards = cards.length;
        if (totalCards === 0) return;

        let currentIndex = 0;
        let autoSlideTimer = null;

        const getCardsPerView = () => {
            const width = window.innerWidth;
            if (width > 1024) return 3;
            if (width > 640) return 2;
            return 1;
        };

        const getMaxIndex = () => {
            const perView = getCardsPerView();
            return Math.max(0, totalCards - perView);
        };

        const renderDots = () => {
            if (!dotsContainer) return;
            const maxIdx = getMaxIndex();
            dotsContainer.innerHTML = '';
            for (let i = 0; i <= maxIdx; i++) {
                const dot = document.createElement('button');
                dot.className = `tech-dot ${i === currentIndex ? 'active' : ''}`;
                dot.setAttribute('aria-label', `Go to slide ${i + 1}`);
                dot.addEventListener('click', () => {
                    currentIndex = i;
                    updateSlider();
                    resetTimer();
                });
                dotsContainer.appendChild(dot);
            }
        };

        const updateSlider = () => {
            const maxIdx = getMaxIndex();
            if (currentIndex > maxIdx) currentIndex = maxIdx;
            if (currentIndex < 0) currentIndex = 0;

            const card = cards[0];
            if (!card) return;
            const cardWidth = card.getBoundingClientRect().width;
            const gap = window.innerWidth <= 1024 ? 20 : 24;
            const offset = currentIndex * (cardWidth + gap);

            track.style.transform = `translateX(-${offset}px)`;

            if (dotsContainer) {
                const dots = dotsContainer.querySelectorAll('.tech-dot');
                dots.forEach((dot, idx) => {
                    dot.classList.toggle('active', idx === currentIndex);
                });
            }
        };

        const nextSlide = () => {
            const maxIdx = getMaxIndex();
            if (currentIndex >= maxIdx) {
                currentIndex = 0;
            } else {
                currentIndex++;
            }
            updateSlider();
        };

        const prevSlide = () => {
            const maxIdx = getMaxIndex();
            if (currentIndex <= 0) {
                currentIndex = maxIdx;
            } else {
                currentIndex--;
            }
            updateSlider();
        };

        const startTimer = () => {
            stopTimer();
            autoSlideTimer = setInterval(nextSlide, 3500);
        };

        const stopTimer = () => {
            if (autoSlideTimer) {
                clearInterval(autoSlideTimer);
                autoSlideTimer = null;
            }
        };

        const resetTimer = () => {
            stopTimer();
            startTimer();
        };

        if (nextBtn) {
            nextBtn.addEventListener('click', () => {
                nextSlide();
                resetTimer();
            });
        }

        if (prevBtn) {
            prevBtn.addEventListener('click', () => {
                prevSlide();
                resetTimer();
            });
        }

        const sliderWrap = document.querySelector('.tech-slider-container');
        if (sliderWrap) {
            sliderWrap.addEventListener('mouseenter', stopTimer);
            sliderWrap.addEventListener('mouseleave', startTimer);
            sliderWrap.addEventListener('touchstart', stopTimer, { passive: true });
            sliderWrap.addEventListener('touchend', startTimer, { passive: true });
        }

        let resizeTimer = null;
        window.addEventListener('resize', () => {
            clearTimeout(resizeTimer);
            resizeTimer = setTimeout(() => {
                renderDots();
                updateSlider();
            }, 100);
        });

        renderDots();
        updateSlider();
        startTimer();
    };

    initTechGuideSlider();
    initFirestorePackagesListener();
    initFirestoreInstructorsListener();
    initFirestoreStaticReviewsListener();
    initFirestoreSettingsListener();
    initFirestoreGalleryListener();
    initFirestoreFaqsListener();
    initFirestoreCalcListener();
    initFirestoreReviewsListener();
    initAuthListener();
    checkEmailSignInLink();
    initCrossTabSyncListener();

    updateSwellReport();
    // Refresh swell report every 15 minutes
    setInterval(updateSwellReport, 15 * 60 * 1000);

    // --- 14. Progressive Web App (PWA) & Android App-Install Experience ---
    if ('serviceWorker' in navigator) {
        window.addEventListener('load', () => {
            navigator.serviceWorker.register('./sw.js').then((reg) => {
                console.log('🏄 Hiri Surf PWA Service Worker Registered:', reg.scope);
            }).catch((err) => {
                console.warn('Service Worker registration skipped:', err);
            });
        });
    }

    // Android "Add to Home Screen" install promotion
    let deferredPrompt = null;
    window.addEventListener('beforeinstallprompt', (e) => {
        e.preventDefault();
        deferredPrompt = e;
        
        // Show lightweight custom install prompt banner on mobile devices
        if (window.innerWidth <= 768 && !localStorage.getItem('hiri_pwa_dismissed')) {
            const banner = document.createElement('div');
            banner.className = 'pwa-install-banner';
            banner.id = 'pwaInstallBanner';
            banner.innerHTML = `
                <img src="images/wave-logo.png" alt="Hiri Surf Icon">
                <div class="pwa-info">
                    <h4 class="pwa-title">Install Hiri Surf App</h4>
                    <p class="pwa-sub">1-Tap Bookings &amp; Offline Waves Report</p>
                </div>
                <div class="pwa-actions">
                    <button class="pwa-install-btn" id="pwaInstallAction">Install</button>
                    <button class="pwa-close-btn" id="pwaDismissAction">✕</button>
                </div>
            `;
            document.body.appendChild(banner);
            banner.style.display = 'flex';

            document.getElementById('pwaInstallAction')?.addEventListener('click', async () => {
                if (deferredPrompt) {
                    deferredPrompt.prompt();
                    const { outcome } = await deferredPrompt.userChoice;
                    console.log('PWA prompt user response:', outcome);
                    deferredPrompt = null;
                }
                banner.remove();
            });

            document.getElementById('pwaDismissAction')?.addEventListener('click', () => {
                banner.remove();
                localStorage.setItem('hiri_pwa_dismissed', 'true');
            });
        }
    });

    window.addEventListener('appinstalled', () => {
        console.log('🎉 Hiri Surf App successfully installed to device!');
        const banner = document.getElementById('pwaInstallBanner');
        if (banner) banner.remove();
    });

    // Smart Mobile Sticky Bar: Hidden on hero, slides in when reading content
    const stickyBar = document.querySelector('.mobile-sticky-bar');
    if (stickyBar) {
        const handleStickyScroll = () => {
            if (window.scrollY > 300) {
                stickyBar.classList.add('visible');
            } else {
                stickyBar.classList.remove('visible');
            }
        };
        window.addEventListener('scroll', handleStickyScroll, { passive: true });
        handleStickyScroll();
    }
});



// SEO Enhancement Script for ONSi Quranic Verses Box
// This script improves on-page SEO elements dynamically

(function() {
    'use strict';

    // SEO Configuration
    const SEO_CONFIG = {
        siteName: 'ONSi',
        baseUrl: 'https://onsi.shop',
        businessName: 'ONSi Quranic Verses Box',
        keywords: {
            en: 'quranic verses, islamic cards, quran quotes, islamic gifts, spiritual cards, quranic ayat, islamic inspiration, muslim gifts, quran verses, islamic art, religious cards, daily reflection, islamic decor',
            ar: 'آيات قرآنية, بطاقات إسلامية, اقتباسات قرآن, هدايا إسلامية, بطاقات روحية, آيات قرآنية, إلهام إسلامي, هدايا مسلمين, آيات قرآن, فن إسلامي, بطاقات دينية, تأمل يومي, ديكور إسلامي'
        }
    };

    // Initialize SEO enhancements when DOM is ready
    document.addEventListener('DOMContentLoaded', function() {
        initSEOEnhancements();
        setupImageOptimization();
        setupInternalLinking();
        setupSchemaEnhancements();
        trackUserEngagement();
    });

    function initSEOEnhancements() {
        // Add language-specific meta tags
        addLanguageAlternates();
        
        // Enhance existing images with SEO attributes
        optimizeImages();
        
        // Add breadcrumb schema if needed
        addBreadcrumbSchema();
        
        // Add FAQ schema for common questions
        addFAQSchema();
        
        console.log('✅ SEO enhancements initialized');
    }

    function addLanguageAlternates() {
        const currentLang = getCurrentLanguage();
        const head = document.head;
        
        // Add hreflang tags
        const languages = [
            { code: 'en', url: SEO_CONFIG.baseUrl + '/' },
            { code: 'ar', url: SEO_CONFIG.baseUrl + '/?lang=ar' }
        ];
        
        languages.forEach(lang => {
            const link = document.createElement('link');
            link.rel = 'alternate';
            link.hreflang = lang.code;
            link.href = lang.url;
            head.appendChild(link);
        });
        
        // Add x-default for international users
        const xDefault = document.createElement('link');
        xDefault.rel = 'alternate';
        xDefault.hreflang = 'x-default';
        xDefault.href = SEO_CONFIG.baseUrl + '/';
        head.appendChild(xDefault);
    }

    function optimizeImages() {
        // Add SEO-friendly alt texts and titles to images
        const images = document.querySelectorAll('img');
        
        images.forEach((img, index) => {
            if (!img.alt || img.alt.trim() === '') {
                const currentLang = getCurrentLanguage();
                
                if (img.src.includes('logo') || img.classList.contains('logo')) {
                    img.alt = currentLang === 'ar' ? 
                        'شعار أونسي - علبة آيات قرآنية' : 
                        'ONSi Logo - Quranic Verses Box';
                } else if (img.src.includes('product') || img.classList.contains('product')) {
                    img.alt = currentLang === 'ar' ? 
                        'علبة آيات قرآنية من أونسي - بطاقات إسلامية ملهمة' : 
                        'ONSi Quranic Verses Box - Islamic Inspiration Cards';
                } else {
                    img.alt = currentLang === 'ar' ? 
                        `صورة منتج أونسي ${index + 1}` : 
                        `ONSi Product Image ${index + 1}`;
                }
            }
            
            // Add loading optimization
            if (!img.loading) {
                img.loading = index < 2 ? 'eager' : 'lazy';
            }
            
            // Add decoding hint
            img.decoding = 'async';
        });
    }

    function addBreadcrumbSchema() {
        const breadcrumbSchema = {
            "@context": "https://schema.org",
            "@type": "BreadcrumbList",
            "itemListElement": [
                {
                    "@type": "ListItem",
                    "position": 1,
                    "name": "Home",
                    "item": SEO_CONFIG.baseUrl + "/"
                },
                {
                    "@type": "ListItem", 
                    "position": 2,
                    "name": "Quranic Verses Box",
                    "item": SEO_CONFIG.baseUrl + "/#product"
                }
            ]
        };
        
        addJsonLdScript(breadcrumbSchema);
    }

    function addFAQSchema() {
        const currentLang = getCurrentLanguage();
        
        const faqData = {
            en: [
                {
                    question: "What is included in the ONSi Quranic Verses Box?",
                    answer: "The ONSi Quranic Verses Box includes beautifully designed cards featuring uplifting Quranic verses in both Arabic and English, perfect for daily reflection and spiritual growth."
                },
                {
                    question: "Do you ship worldwide?",
                    answer: "Yes, we offer free worldwide shipping for the ONSi Quranic Verses Box to spread inspiration globally."
                },
                {
                    question: "What makes these cards special?",
                    answer: "Our cards are carefully crafted with meaningful Quranic ayat, designed to provide comfort, hope, and spiritual guidance in moments of need."
                },
                {
                    question: "Are the cards suitable as gifts?",
                    answer: "Absolutely! The ONSi Quranic Verses Box makes a perfect gift for Muslims seeking spiritual inspiration, family members, friends, or anyone interested in Islamic spirituality."
                }
            ],
            ar: [
                {
                    question: "ماذا تتضمن علبة آيات قرآنية من أونسي؟",
                    answer: "تتضمن علبة آيات قرآنية من أونسي بطاقات مصممة بجمال تحتوي على آيات قرآنية ملهمة باللغة العربية والإنجليزية، مثالية للتأمل اليومي والنمو الروحي."
                },
                {
                    question: "هل تشحنون عالمياً؟",
                    answer: "نعم، نقدم شحن مجاني عالمياً لعلبة آيات قرآنية من أونسي لنشر الإلهام عالمياً."
                },
                {
                    question: "ما الذي يجعل هذه البطاقات مميزة؟",
                    answer: "بطاقاتنا مصممة بعناية مع آيات قرآنية مؤثرة، مصممة لتوفير الراحة والأمل والإرشاد الروحي في أوقات الحاجة."
                },
                {
                    question: "هل البطاقات مناسبة كهدايا؟",
                    answer: "بالتأكيد! علبة آيات قرآنية من أونسي تصنع هدية مثالية للمسلمين الباحثين عن الإلهام الروحي، أفراد العائلة، الأصدقاء، أو أي شخص مهتم بالروحانية الإسلامية."
                }
            ]
        };

        const faqSchema = {
            "@context": "https://schema.org",
            "@type": "FAQPage",
            "mainEntity": faqData[currentLang].map(faq => ({
                "@type": "Question",
                "name": faq.question,
                "acceptedAnswer": {
                    "@type": "Answer",
                    "text": faq.answer
                }
            }))
        };
        
        addJsonLdScript(faqSchema);
    }

    function setupImageOptimization() {
        // Implement lazy loading for images below the fold
        if ('IntersectionObserver' in window) {
            const imageObserver = new IntersectionObserver((entries, observer) => {
                entries.forEach(entry => {
                    if (entry.isIntersecting) {
                        const img = entry.target;
                        if (img.dataset.src) {
                            img.src = img.dataset.src;
                            img.classList.remove('lazy');
                            observer.unobserve(img);
                        }
                    }
                });
            });

            document.querySelectorAll('img.lazy').forEach(img => {
                imageObserver.observe(img);
            });
        }
    }

    function setupInternalLinking() {
        // Add contextual internal links for better SEO
        const content = document.querySelector('main') || document.body;
        
        // Add skip links for accessibility and SEO
        if (!document.querySelector('.skip-links')) {
            const skipLinks = document.createElement('div');
            skipLinks.className = 'skip-links sr-only';
            skipLinks.innerHTML = `
                <a href="#main-content" class="skip-link">Skip to main content</a>
                <a href="#product-section" class="skip-link">Skip to product</a>
            `;
            document.body.insertBefore(skipLinks, document.body.firstChild);
        }
    }

    function setupSchemaEnhancements() {
        // Ensure logo meta tags are properly set
        ensureLogoMetas();
        
        // Add additional logo schema for better Google recognition
        const logoSchema = {
            "@context": "https://schema.org",
            "@type": "ImageObject",
            "url": "https://onsi.shop/assets/logo.png",
            "width": 512,
            "height": 512,
            "name": "ONSi Logo",
            "description": "Official logo of ONSi Quranic Verses Box - Islamic inspiration cards",
            "contentUrl": "https://onsi.shop/assets/logo.png"
        };
        
        addJsonLdScript(logoSchema);
    }
    
    function ensureLogoMetas() {
        const logoUrl = "https://onsi.shop/assets/logo.png";
        
        // Ensure favicon is set
        let favicon = document.querySelector('link[rel="icon"]') || document.querySelector('link[rel="shortcut icon"]');
        if (favicon && !favicon.href) {
            favicon.href = logoUrl;
        }
        
        // Add logo meta if missing
        if (!document.querySelector('meta[name="logo"]')) {
            const logoMeta = document.createElement('meta');
            logoMeta.name = 'logo';
            logoMeta.content = logoUrl;
            document.head.appendChild(logoMeta);
        }
        
        // Add Open Graph logo if missing
        if (!document.querySelector('meta[property="og:logo"]')) {
            const ogLogo = document.createElement('meta');
            ogLogo.setAttribute('property', 'og:logo');
            ogLogo.content = logoUrl;
            document.head.appendChild(ogLogo);
        }
    }

    function trackUserEngagement() {
        // Track user engagement signals for SEO
        let startTime = Date.now();
        let maxScroll = 0;
        
        // Track scroll depth
        window.addEventListener('scroll', throttle(() => {
            const scrollPercent = Math.round(
                (window.scrollY / (document.body.scrollHeight - window.innerHeight)) * 100
            );
            maxScroll = Math.max(maxScroll, scrollPercent);
        }, 100));
        
        // Track time on page when leaving
        window.addEventListener('beforeunload', () => {
            const timeOnPage = Math.round((Date.now() - startTime) / 1000);
            
            // Send engagement data (implement with your analytics)
            console.log('SEO Engagement:', {
                timeOnPage,
                maxScroll,
                language: getCurrentLanguage()
            });
        });
    }

    // Helper Functions
    function getCurrentLanguage() {
        return new URLSearchParams(window.location.search).get('lang') || 'en';
    }

    function addJsonLdScript(data) {
        const script = document.createElement('script');
        script.type = 'application/ld+json';
        script.textContent = JSON.stringify(data);
        document.head.appendChild(script);
    }

    function throttle(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    }

    // Expose functions for manual triggering if needed
    window.SEOEnhancer = {
        init: initSEOEnhancements,
        optimizeImages: optimizeImages,
        addFAQSchema: addFAQSchema
    };

})();
/* ===================================
   HOME PAGE SCRIPT
   
   Handles scroll-based animations and interactions
   for the landing page including:
   - Scroll reveal animations for sections
   - Parallax effects on hero section
   - Smooth scrolling for navigation
   =================================== */

// ===================================
// SCROLL REVEAL ANIMATIONS
// ===================================

// Configuration for when elements should animate in
const observerOptions = {
    threshold: 0.2, // Element must be 20% visible
    rootMargin: '0px 0px -100px 0px' // Trigger 100px before element enters viewport
};

// Intersection Observer watches for elements entering viewport
const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            // Add 'visible' class to trigger CSS animations
            entry.target.classList.add('visible');
        }
    });
}, observerOptions);

// Initialize observers when page loads
document.addEventListener('DOMContentLoaded', () => {
    // Find all sections with reveal animations
    const revealSections = document.querySelectorAll('.reveal-section');
    revealSections.forEach(section => {
        observer.observe(section);
    });
});

// ===================================
// SMOOTH SCROLL FOR SCROLL INDICATOR
// ===================================

// Scroll indicator arrow button that takes user to next section
const scrollIndicator = document.querySelector('.scroll-indicator');
if (scrollIndicator) {
    scrollIndicator.addEventListener('click', () => {
        // Smooth scroll to the start section
        document.querySelector('#start-section').scrollIntoView({
            behavior: 'smooth'
        });
    });
}

// ===================================
// PARALLAX EFFECT ON HERO SECTION
// ===================================

// Creates depth effect by moving hero at different speed than scroll
window.addEventListener('scroll', () => {
    const scrolled = window.pageYOffset;
    const hero = document.querySelector('#hero-section');
    
    // Only apply parallax while hero is visible
    if (hero && scrolled < window.innerHeight) {
        // Move hero at 50% of scroll speed for parallax effect
        hero.style.opacity = 1 - (scrolled / window.innerHeight);
        hero.style.transform = `translateY(${scrolled * 0.5}px)`;
    }
});

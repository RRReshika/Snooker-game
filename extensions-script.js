/* ===================================
   EXTENSIONS PAGE SCRIPT
   
   Creates interactive animations and effects for the
   documentation page including:
   - Scroll-triggered section reveals
   - 3D tilt effects on hover
   - Parallax header animation
   - Smooth scrolling navigation
   =================================== */

// ===================================
// SCROLL REVEAL ANIMATIONS
// ===================================

// Configuration for Intersection Observer
const observerOptions = {
    threshold: 0.15, // Trigger when 15% of element is visible
    rootMargin: '0px 0px -50px 0px' // Start animation 50px before element enters
};

// Observer watches for elements entering the viewport
const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry, index) => {
        if (entry.isIntersecting) {
            // Stagger animations: each section appears 100ms after previous
            setTimeout(() => {
                entry.target.classList.add('visible');
            }, index * 100);
        }
    });
}, observerOptions);

// Initialize all interactive features when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    // ===================================
    // OBSERVE EXTENSION SECTIONS
    // ===================================
    
    // Watch all extension sections for scroll reveals
    const extensionSections = document.querySelectorAll('.extension-section');
    extensionSections.forEach(section => {
        observer.observe(section);
    });

    // ===================================
    // PARALLAX HEADER EFFECT
    // ===================================
    
    // Header moves slower than scroll for depth effect
    const pageHeader = document.querySelector('.page-header');
    if (pageHeader) {
        window.addEventListener('scroll', () => {
            const scrolled = window.pageYOffset;
            // Only apply parallax in first 500px of scroll
            if (scrolled < 500) {
                // Move at 30% of scroll speed
                pageHeader.style.transform = `translateY(${scrolled * 0.3}px)`;
                // Fade out as user scrolls
                pageHeader.style.opacity = 1 - (scrolled / 500);
            }
        });
    }

    // ===================================
    // SMOOTH SCROLL NAVIGATION
    // ===================================
    
    // Enable smooth scrolling for anchor links
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function (e) {
            e.preventDefault();
            const target = document.querySelector(this.getAttribute('href'));
            if (target) {
                target.scrollIntoView({
                    behavior: 'smooth',
                    block: 'start'
                });
            }
        });
    });

    // ===================================
    // 3D TILT HOVER EFFECTS
    // ===================================
    
    // Each extension section tilts in 3D based on mouse position
    extensionSections.forEach(section => {
        // Set smooth transition on mouse enter
        section.addEventListener('mouseenter', function() {
            this.style.transition = 'all 0.6s cubic-bezier(0.4, 0, 0.2, 1)';
        });

        // Calculate tilt angles based on cursor position
        section.addEventListener('mousemove', function(e) {
            const rect = this.getBoundingClientRect();
            const x = e.clientX - rect.left; // Mouse X relative to element
            const y = e.clientY - rect.top;  // Mouse Y relative to element
            
            const centerX = rect.width / 2;
            const centerY = rect.height / 2;
            
            // Convert to normalized values (-1 to 1)
            const deltaX = (x - centerX) / centerX;
            const deltaY = (y - centerY) / centerY;
            
            // Apply 3D transform (max 2° rotation)
            this.style.transform = `
                translateY(-5px) 
                rotateX(${deltaY * 2}deg) 
                rotateY(${deltaX * 2}deg)
            `;
        });

        // Reset transform when mouse leaves
        section.addEventListener('mouseleave', function() {
            this.style.transform = 'translateY(0) rotateX(0) rotateY(0)';
        });
    });
});

// ===================================
// PAGE LOAD FADE-IN ANIMATION
// ===================================

// Smooth fade-in effect when page first loads
window.addEventListener('load', () => {
    document.body.style.opacity = '0';
    // Brief delay before fade-in starts
    setTimeout(() => {
        document.body.style.transition = 'opacity 0.8s ease-out';
        document.body.style.opacity = '1';
    }, 100);
});

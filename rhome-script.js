// Scroll animations for home page

const observerOptions = {
    threshold: 0.2,
    rootMargin: '0px 0px -100px 0px'
};

const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            entry.target.classList.add('visible');
        }
    });
}, observerOptions);

document.addEventListener('DOMContentLoaded', () => {
    const revealSections = document.querySelectorAll('.reveal-section');
    revealSections.forEach(section => {
        observer.observe(section);
    });
});

const scrollIndicator = document.querySelector('.scroll-indicator');
if (scrollIndicator) {
    scrollIndicator.addEventListener('click', () => {
        document.querySelector('#start-section').scrollIntoView({
            behavior: 'smooth'
        });
    });
}

// parallax on hero section
window.addEventListener('scroll', () => {
    const scrolled = window.pageYOffset;
    const hero = document.querySelector('#hero-section');
    
    if (hero && scrolled < window.innerHeight) {
        hero.style.opacity = 1 - (scrolled / window.innerHeight);
        hero.style.transform = `translateY(${scrolled * 0.5}px)`;
    }
});

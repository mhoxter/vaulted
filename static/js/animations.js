document.addEventListener('DOMContentLoaded', () => {
    // Add hover animations to cards
    const cards = document.querySelectorAll('.card');
    cards.forEach(card => {
        card.addEventListener('mouseenter', () => {
            card.style.transform = 'translateY(-5px)';
            card.style.transition = 'transform 0.3s ease';
        });
        
        card.addEventListener('mouseleave', () => {
            card.style.transform = 'translateY(0)';
        });
    });

    // Add click animations to buttons
    const buttons = document.querySelectorAll('.btn');
    buttons.forEach(button => {
        button.addEventListener('click', function(e) {
            let ripple = document.createElement('span');
            ripple.classList.add('ripple');
            this.appendChild(ripple);
            
            let x = e.clientX - this.offsetLeft;
            let y = e.clientY - this.offsetTop;
            
            ripple.style.left = `${x}px`;
            ripple.style.top = `${y}px`;
            
            setTimeout(() => {
                ripple.remove();
            }, 300);
        });
    });

    // Smooth scroll animation for schedule updates
    function smoothScrollTo(element) {
        element.scrollIntoView({
            behavior: 'smooth',
            block: 'nearest'
        });
    }

    // Animate session blocks on creation
    const scheduleGrid = document.getElementById('scheduleGrid');
    const observer = new MutationObserver((mutations) => {
        mutations.forEach((mutation) => {
            if (mutation.addedNodes.length) {
                mutation.addedNodes.forEach((node) => {
                    if (node.classList && node.classList.contains('session-block')) {
                        node.style.animation = 'fadeIn 0.3s ease-in';
                    }
                });
            }
        });
    });

    observer.observe(scheduleGrid, {
        childList: true,
        subtree: true
    });
});

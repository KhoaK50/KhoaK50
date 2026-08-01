document.addEventListener("DOMContentLoaded", () => {
    const resizer = document.getElementById('resizer');
    const controls = document.getElementById('controls');
    const appContainer = document.getElementById('app');
    
    if (!resizer || !controls || !appContainer) return;

    let isResizing = false;
    let willSnapClose = false;

    // Default sizes for resetting after snap-close
    const DEFAULT_DESKTOP_WIDTH = 380;
    const DEFAULT_MOBILE_HEIGHT = '45vh';

    const onPointerDown = (e) => {
        isResizing = true;
        willSnapClose = false;
        
        const isDesktop = window.innerWidth > 768;
        
        document.body.style.cursor = isDesktop ? 'col-resize' : 'row-resize';
        document.body.style.userSelect = 'none';
        
        // Disable transitions during resize for zero-lag instant responsiveness
        document.body.classList.add('is-resizing');
        
        document.addEventListener('mousemove', onPointerMove);
        document.addEventListener('touchmove', onPointerMove, { passive: false });
        document.addEventListener('mouseup', onPointerUp);
        document.addEventListener('touchend', onPointerUp);
    };

    const onPointerMove = (e) => {
        if (!isResizing) return;
        
        if (e.type === 'touchmove') e.preventDefault();

        const currentX = e.clientX || (e.touches && e.touches[0].clientX);
        const currentY = e.clientY || (e.touches && e.touches[0].clientY);
        const isDesktop = window.innerWidth > 768;

        if (isDesktop) {
            let newWidth = currentX;
            
            // Snap to close threshold: if dragged < 150px
            if (newWidth < 150) {
                if (newWidth < 70) newWidth = 70; // Don't let it overlap tabs visually during drag
                willSnapClose = true;
                controls.style.opacity = '0.5'; // Visual feedback for closing
            } else {
                willSnapClose = false;
                controls.style.opacity = '1';
                if (newWidth > window.innerWidth * 0.6) newWidth = window.innerWidth * 0.6;
            }

            
            document.documentElement.style.setProperty('--sidebar-width', `${newWidth}px`);
        } else {
            let newHeight = window.innerHeight - currentY;
            
            // Snap to close threshold: if dragged < 80px
            if (newHeight < 80) {
                newHeight = 80;
                willSnapClose = true;
                controls.style.opacity = '0.5';
            } else {
                willSnapClose = false;
                controls.style.opacity = '1';
                if (newHeight > window.innerHeight * 0.8) newHeight = window.innerHeight * 0.8;
            }
            
            appContainer.style.setProperty('--panel-height', `${newHeight}px`);
            
            // Auto open if dragged larger
            if (!willSnapClose && window.isPanelCollapsed) {
                window.isPanelCollapsed = false;
                const btnToggle = document.getElementById("btnTogglePanel");
                if (btnToggle) btnToggle.innerHTML = '<i class="fa-solid fa-chevron-down"></i>';
            }
        }
    };

    const onPointerUp = () => {
        isResizing = false;
        document.body.style.cursor = '';
        document.body.style.userSelect = '';
        document.body.classList.remove('is-resizing');
        controls.style.opacity = '1';

        document.removeEventListener('mousemove', onPointerMove);
        document.removeEventListener('touchmove', onPointerMove);
        document.removeEventListener('mouseup', onPointerUp);
        document.removeEventListener('touchend', onPointerUp);

        const isDesktop = window.innerWidth > 768;

        if (willSnapClose) {
            if (isDesktop) {
                // Desktop Snap Close
                const btnSidebar = document.getElementById('hamburger');
                if (btnSidebar) btnSidebar.click(); // Trigger close logic
                // Reset width to default so it looks normal when opened next time
                setTimeout(() => {
                    document.documentElement.style.setProperty('--sidebar-width', `${DEFAULT_DESKTOP_WIDTH}px`);
                }, 300); // Wait for transition
            } else {
                // Mobile Snap Close
                window.isPanelCollapsed = true;
                appContainer.style.setProperty('--panel-height', '0px');
                const btnToggle = document.getElementById("btnTogglePanel");
                if (btnToggle) btnToggle.innerHTML = '<i class="fa-solid fa-chevron-up"></i>';
                
                // We don't reset --panel-height here because the CSS relies on it being 0px to stay closed.
                // It will be reset to 45vh next time they click the chevron button in calculation.html
            }
        }
    };

    resizer.addEventListener('mousedown', onPointerDown);
    resizer.addEventListener('touchstart', onPointerDown, { passive: false });
});

// This script handles smooth scrolling for non-React elements
document.addEventListener('DOMContentLoaded', function() {
  // Only apply to non-React navigation links (links outside our main React components)
  const nonReactNavLinks = document.querySelectorAll('a[href^="/#"]:not([data-react-link="true"])');
  
  nonReactNavLinks.forEach(link => {
    link.addEventListener('click', function(e) {
      const href = this.getAttribute('href');
      
      // Only process links with hash
      if (!href || !href.includes('#')) return;
      
      // Get the target ID
      const hashIndex = href.indexOf('#');
      const targetId = href.substring(hashIndex + 1);
      
      // If we're on the homepage, prevent default and handle smooth scrolling
      if (window.location.pathname === '/' || window.location.pathname === '') {
        e.preventDefault();
        
        // Update URL without triggering the browser's scroll
        const scrollPosition = window.pageYOffset;
        history.pushState(null, '', `/#${targetId}`);
        window.scrollTo(window.pageXOffset, scrollPosition);
        
        // Smooth scroll to the target
        scrollToSection(targetId);
      }
      // If not on homepage, let the default navigation happen
    });
  });
  
  // Function to smoothly scroll to an element
  function scrollToSection(sectionId) {
    const element = document.getElementById(sectionId);
    if (element) {
      // Get header height for proper offset
      const header = document.querySelector('header');
      const headerHeight = header ? header.offsetHeight : 0;
      
      // Calculate position with offset
      const elementPosition = element.getBoundingClientRect().top;
      const offsetPosition = elementPosition + window.pageYOffset - headerHeight - 20;
      
      // Perform smooth scroll
      window.scrollTo({
        top: offsetPosition,
        behavior: 'smooth'
      });
    }
  }
}); 
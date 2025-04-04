// This script handles smooth scrolling for non-React elements
document.addEventListener('DOMContentLoaded', function() {
  // Only apply to non-React navigation links (links outside our main React components)
  const nonReactNavLinks = document.querySelectorAll('a[href^="/#"]:not([data-react-link="true"])');
  
  nonReactNavLinks.forEach(link => {
    link.addEventListener('click', function(e) {
      const href = this.getAttribute('href');
      
      // Only process links with hash
      if (!href || !href.includes('#')) return;
      
      // Only if we're on the homepage
      if (window.location.pathname === '/' || window.location.pathname === '') {
          e.preventDefault();
          
        // Get the target ID
        const hashIndex = href.indexOf('#');
        const targetId = href.substring(hashIndex + 1);
          
        // Update URL hash
        window.location.hash = '#' + targetId;
          
        // The React component will handle scrolling via useEffect
      }
    });
  });
  
  // No need to handle initial load - React component will handle it
}); 
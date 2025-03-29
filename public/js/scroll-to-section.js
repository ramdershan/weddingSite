document.addEventListener('DOMContentLoaded', function() {
  // Get all navigation links
  const navLinks = document.querySelectorAll('a[href^="/#"], a[data-nav-link="true"]');
  
  navLinks.forEach(link => {
    link.addEventListener('click', function(e) {
      const href = this.getAttribute('href');
      
      // Only process links with hash
      if (!href || !href.includes('#')) return;
      
      // Get the target ID
      const hashIndex = href.indexOf('#');
      const targetId = href.substring(hashIndex + 1);
      
      // Only if we're on the homepage
      if (window.location.pathname === '/' || window.location.pathname === '') {
        const targetElement = document.getElementById(targetId);
        
        if (targetElement) {
          e.preventDefault();
          
          // Get header height
          const header = document.querySelector('header');
          const headerHeight = header ? header.offsetHeight : 0;
          
          // Calculate position with offset
          const elementPosition = targetElement.getBoundingClientRect().top;
          const offsetPosition = elementPosition + window.pageYOffset - headerHeight - 20;
          
          // Scroll to element
          window.scrollTo({
            top: offsetPosition,
            behavior: 'smooth'
          });
          
          // Update URL without page refresh
          history.pushState(null, '', '#' + targetId);
        }
      }
    });
  });
  
  // Handle initial page load with hash
  window.addEventListener('load', function() {
    if (window.location.hash) {
      setTimeout(function() {
        const targetId = window.location.hash.substring(1);
        const targetElement = document.getElementById(targetId);
        
        if (targetElement) {
          // Get header height
          const header = document.querySelector('header');
          const headerHeight = header ? header.offsetHeight : 0;
          
          // Calculate position with offset
          const elementPosition = targetElement.getBoundingClientRect().top;
          const offsetPosition = elementPosition + window.pageYOffset - headerHeight - 20;
          
          // Scroll to element
          window.scrollTo({
            top: offsetPosition,
            behavior: 'smooth'
          });
        }
      }, 100);
    }
  });
}); 
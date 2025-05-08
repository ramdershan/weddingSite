"use client"

import React, { useEffect } from 'react';

export function createLogoutOverlay() {
  // Create the container element
  const overlayContainer = document.createElement('div');
  
  // Add a data attribute to identify this as a logout overlay
  overlayContainer.setAttribute('data-logout-overlay', 'true');
  
  // Apply styles for the overlay
  overlayContainer.style.position = 'fixed';
  overlayContainer.style.top = '0';
  overlayContainer.style.left = '0';
  overlayContainer.style.width = '100vw';
  overlayContainer.style.height = '100vh';
  overlayContainer.style.backgroundColor = 'rgba(0, 0, 0, 0)';
  overlayContainer.style.zIndex = '9999';
  overlayContainer.style.display = 'flex';
  overlayContainer.style.justifyContent = 'center';
  overlayContainer.style.alignItems = 'center';
  overlayContainer.style.transition = 'background-color 0.6s ease';
  
  // Create a wrapper for spinner and text
  const wrapper = document.createElement('div');
  wrapper.style.display = 'flex';
  wrapper.style.flexDirection = 'column';
  wrapper.style.alignItems = 'center';
  wrapper.style.justifyContent = 'center';
  wrapper.style.gap = '20px';
  wrapper.style.padding = '40px 50px';
  wrapper.style.background = 'linear-gradient(to bottom, rgba(0, 0, 0, 0.7), rgba(0, 0, 0, 0.8))';
  wrapper.style.borderRadius = '16px';
  wrapper.style.boxShadow = '0 0 30px rgba(0, 0, 0, 0.5)';
  wrapper.style.border = '1px solid rgba(255, 255, 255, 0.1)';
  wrapper.style.transform = 'scale(0.95)';
  wrapper.style.transition = 'transform 0.5s ease';
  
  // Create loading spinner element
  const spinner = document.createElement('div');
  spinner.innerHTML = `
    <div style="
      width: 60px;
      height: 60px;
      border: 4px solid rgba(255, 255, 255, 0.3);
      border-radius: 50%;
      border-top-color: #fff;
      opacity: 0;
      transition: opacity 0.3s ease 0.2s;
      animation: spin 1s ease-in-out infinite, pulse 2s ease-in-out infinite;
      box-shadow: 0 0 15px rgba(255, 255, 255, 0.5);
    "></div>
  `;
  
  // Create main text element
  const text = document.createElement('div');
  text.textContent = 'Signing Out...';
  text.style.color = 'white';
  text.style.fontFamily = 'var(--font-inter)';
  text.style.fontSize = '28px';
  text.style.fontWeight = '700';
  text.style.letterSpacing = '0.5px';
  text.style.opacity = '0';
  text.style.transition = 'opacity 0.3s ease 0.3s, transform 0.5s ease';
  text.style.textShadow = '0 0 10px rgba(255, 255, 255, 0.5)';
  text.style.textAlign = 'center';
  text.style.marginTop = '20px';
  text.style.animation = 'fadeTextPulse 2s ease-in-out infinite';
  
  // Create secondary text element
  const subText = document.createElement('div');
  subText.textContent = 'Redirecting to home page...';
  subText.style.color = 'rgba(255, 255, 255, 0.7)';
  subText.style.fontFamily = 'var(--font-inter)';
  subText.style.fontSize = '16px';
  subText.style.fontWeight = '400';
  subText.style.opacity = '0';
  subText.style.transition = 'opacity 0.3s ease 0.5s';
  subText.style.textAlign = 'center';
  subText.style.marginTop = '8px';
  
  // Add keyframes for animations
  const style = document.createElement('style');
  style.innerHTML = `
    @keyframes spin {
      to { transform: rotate(360deg); }
    }
    @keyframes pulse {
      0% { transform: scale(1); }
      50% { transform: scale(1.1); }
      100% { transform: scale(1); }
    }
    @keyframes fadeTextPulse {
      0% { opacity: 0.8; }
      50% { opacity: 1; }
      100% { opacity: 0.8; }
    }
  `;
  document.head.appendChild(style);
  
  // Add elements to the DOM
  wrapper.appendChild(spinner.firstElementChild as Node);
  wrapper.appendChild(text);
  wrapper.appendChild(subText);
  overlayContainer.appendChild(wrapper);
  document.body.appendChild(overlayContainer);
  
  // Trigger fade-in animation
  setTimeout(() => {
    overlayContainer.style.backgroundColor = 'rgba(0, 0, 0, 0.7)';
    (spinner.firstElementChild as HTMLElement).style.opacity = '1';
    text.style.opacity = '1';
    subText.style.opacity = '1';
    wrapper.style.transform = 'scale(1)';
  }, 10);
  
  return overlayContainer;
} 
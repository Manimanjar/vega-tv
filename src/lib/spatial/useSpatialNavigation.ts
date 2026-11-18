import { useEffect, useRef, useCallback } from 'react';

interface SpatialNavOptions {
  active?: boolean;
  trapSection?: string;
  onBack?: () => void;
  defaultFocusSelector?: string;
}

export function useSpatialNavigation({
  active = true,
  trapSection,
  onBack,
  defaultFocusSelector,
}: SpatialNavOptions = {}) {
  const currentFocusedRef = useRef<HTMLElement | null>(null);

  // Find all focusable elements within current scope
  const getFocusableElements = useCallback((): HTMLElement[] => {
    let selector = '[data-focusable="true"]:not([disabled]):not([aria-hidden="true"])';
    if (trapSection) {
      selector = `[data-nav-section="${trapSection}"] ${selector}, [data-nav-section="${trapSection}"][data-focusable="true"]`;
    }

    const elements = Array.from(document.querySelectorAll<HTMLElement>(selector));
    return elements.filter((el) => {
      const rect = el.getBoundingClientRect();
      const style = window.getComputedStyle(el);
      return (
        style.display !== 'none' &&
        style.visibility !== 'hidden' &&
        style.opacity !== '0' &&
        (rect.width > 0 || rect.height > 0)
      );
    });
  }, [trapSection]);

  // Apply visual focus to an element
  const focusElement = useCallback((element: HTMLElement | null, scroll = true) => {
    if (!element) return;

    // Remove focus state from previous element
    if (currentFocusedRef.current && currentFocusedRef.current !== element) {
      currentFocusedRef.current.removeAttribute('data-focused');
      currentFocusedRef.current.blur();
    }

    currentFocusedRef.current = element;
    element.setAttribute('data-focused', 'true');
    element.focus({ preventScroll: true });

    if (scroll) {
      // Find parent scroll container if available
      const scrollParent = element.closest('[data-scroll-container="true"]') as HTMLElement | null;
      if (scrollParent) {
        const parentRect = scrollParent.getBoundingClientRect();
        const elRect = element.getBoundingClientRect();

        // Horizontal scrolling within carousel
        if (elRect.left < parentRect.left) {
          scrollParent.scrollBy({ left: elRect.left - parentRect.left - 40, behavior: 'smooth' });
        } else if (elRect.right > parentRect.right) {
          scrollParent.scrollBy({ left: elRect.right - parentRect.right + 40, behavior: 'smooth' });
        }
      }

      // Vertical viewport scrolling
      element.scrollIntoView({
        behavior: 'smooth',
        block: 'nearest',
        inline: 'nearest',
      });
    }
  }, []);

  // Spatial distance metric between two rects in a given direction
  const calculateDistance = (
    currentRect: DOMRect,
    targetRect: DOMRect,
    direction: 'up' | 'down' | 'left' | 'right'
  ): number => {
    const curCenter = {
      x: currentRect.left + currentRect.width / 2,
      y: currentRect.top + currentRect.height / 2,
    };
    const targetCenter = {
      x: targetRect.left + targetRect.width / 2,
      y: targetRect.top + targetRect.height / 2,
    };

    const dx = targetCenter.x - curCenter.x;
    const dy = targetCenter.y - curCenter.y;

    switch (direction) {
      case 'left':
        if (dx >= -5) return Infinity; // must be to the left
        // Primary weight on horizontal distance, secondary penalty on vertical deviation
        return Math.abs(dx) + Math.abs(dy) * 2.5;

      case 'right':
        if (dx <= 5) return Infinity; // must be to the right
        return Math.abs(dx) + Math.abs(dy) * 2.5;

      case 'up':
        if (dy >= -5) return Infinity; // must be above
        return Math.abs(dy) + Math.abs(dx) * 2.0;

      case 'down':
        if (dy <= 5) return Infinity; // must be below
        return Math.abs(dy) + Math.abs(dx) * 2.0;
    }
  };

  // Find nearest candidate element in direction
  const findNextElement = (
    current: HTMLElement,
    direction: 'up' | 'down' | 'left' | 'right'
  ): HTMLElement | null => {
    const focusables = getFocusableElements();
    const curRect = current.getBoundingClientRect();

    let bestElement: HTMLElement | null = null;
    let minDistance = Infinity;

    for (const el of focusables) {
      if (el === current) continue;
      const targetRect = el.getBoundingClientRect();
      const dist = calculateDistance(curRect, targetRect, direction);

      if (dist < minDistance) {
        minDistance = dist;
        bestElement = el;
      }
    }

    return bestElement;
  };

  // Setup keyboard event listener
  useEffect(() => {
    if (!active) return;

    // Initialize initial focus
    const initTimer = setTimeout(() => {
      const focusables = getFocusableElements();
      if (focusables.length === 0) return;

      let target: HTMLElement | null = null;
      if (defaultFocusSelector) {
        target = document.querySelector<HTMLElement>(defaultFocusSelector);
      }
      if (!target || !focusables.includes(target)) {
        target = focusables[0];
      }
      focusElement(target, false);
    }, 100);

    const handleKeyDown = (e: KeyboardEvent) => {
      const activeEl = document.activeElement;
      // If user is actively typing in a text input or textarea, let arrows work naturally unless Escape
      const isInput =
        activeEl instanceof HTMLInputElement || activeEl instanceof HTMLTextAreaElement;

      if (e.key === 'Escape' || e.key === 'BrowserBack' || e.key === 'Backspace') {
        if (isInput && e.key === 'Backspace') {
          return; // Let backspace delete text in inputs
        }
        if (onBack) {
          e.preventDefault();
          onBack();
          return;
        }
      }

      if (isInput && (e.key === 'ArrowLeft' || e.key === 'ArrowRight')) {
        return; // Allow moving cursor inside text field
      }

      let direction: 'up' | 'down' | 'left' | 'right' | null = null;

      switch (e.key) {
        case 'ArrowUp':
          direction = 'up';
          break;
        case 'ArrowDown':
          direction = 'down';
          break;
        case 'ArrowLeft':
          direction = 'left';
          break;
        case 'ArrowRight':
          direction = 'right';
          break;
        case 'Enter':
        case ' ': // Space key
          if (currentFocusedRef.current && !isInput) {
            e.preventDefault();
            currentFocusedRef.current.click();
          }
          return;
        default:
          return;
      }

      if (!direction) return;

      e.preventDefault();

      const current = currentFocusedRef.current;
      const focusables = getFocusableElements();

      if (!current || !document.body.contains(current)) {
        if (focusables.length > 0) {
          focusElement(focusables[0]);
        }
        return;
      }

      const next = findNextElement(current, direction);
      if (next) {
        focusElement(next);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      clearTimeout(initTimer);
      window.removeEventListener('keydown', handleKeyDown);
      if (currentFocusedRef.current) {
        currentFocusedRef.current.removeAttribute('data-focused');
      }
    };
  }, [active, trapSection, onBack, defaultFocusSelector, focusElement, getFocusableElements]);

  return {
    focusElement,
    getFocusableElements,
  };
}

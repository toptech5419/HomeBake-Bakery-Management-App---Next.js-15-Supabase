/**
 * Screen Reader Accessibility Utilities
 * Provides announcements and ARIA live regions for dynamic content
 */

class ScreenReaderAnnouncer {
  private politeRegion: HTMLElement | null = null;
  private assertiveRegion: HTMLElement | null = null;

  constructor() {
    this.createLiveRegions();
  }

  /**
   * Create ARIA live regions for screen reader announcements
   */
  private createLiveRegions(): void {
    if (typeof window === 'undefined') return;

    // Polite announcements (aria-live="polite")
    this.politeRegion = document.createElement('div');
    this.politeRegion.setAttribute('aria-live', 'polite');
    this.politeRegion.setAttribute('aria-label', 'Screen reader announcements');
    this.politeRegion.className = 'sr-only';
    this.politeRegion.style.position = 'absolute';
    this.politeRegion.style.left = '-10000px';
    this.politeRegion.style.width = '1px';
    this.politeRegion.style.height = '1px';
    this.politeRegion.style.overflow = 'hidden';
    document.body.appendChild(this.politeRegion);

    // Assertive announcements (aria-live="assertive")
    this.assertiveRegion = document.createElement('div');
    this.assertiveRegion.setAttribute('aria-live', 'assertive');
    this.assertiveRegion.setAttribute('aria-label', 'Important screen reader announcements');
    this.assertiveRegion.className = 'sr-only';
    this.assertiveRegion.style.position = 'absolute';
    this.assertiveRegion.style.left = '-10000px';
    this.assertiveRegion.style.width = '1px';
    this.assertiveRegion.style.height = '1px';
    this.assertiveRegion.style.overflow = 'hidden';
    document.body.appendChild(this.assertiveRegion);
  }

  /**
   * Announce a message politely (won't interrupt current speech)
   */
  announcePolitely(message: string): void {
    if (!this.politeRegion) return;

    // Clear previous message
    this.politeRegion.textContent = '';
    
    // Set new message after a brief delay to ensure it's announced
    setTimeout(() => {
      if (this.politeRegion) {
        this.politeRegion.textContent = message;
      }
    }, 100);
  }

  /**
   * Announce a message assertively (will interrupt current speech)
   */
  announceAssertively(message: string): void {
    if (!this.assertiveRegion) return;

    // Clear previous message
    this.assertiveRegion.textContent = '';
    
    // Set new message after a brief delay to ensure it's announced
    setTimeout(() => {
      if (this.assertiveRegion) {
        this.assertiveRegion.textContent = message;
      }
    }, 100);
  }

  /**
   * Announce form validation errors
   */
  announceValidationError(fieldName: string, error: string): void {
    this.announceAssertively(`${fieldName} error: ${error}`);
  }

  /**
   * Announce successful operations
   */
  announceSuccess(message: string): void {
    this.announcePolitely(`Success: ${message}`);
  }

  /**
   * Announce loading states
   */
  announceLoading(operation: string): void {
    this.announcePolitely(`Loading ${operation}...`);
  }

  /**
   * Announce when data is loaded
   */
  announceDataLoaded(description: string): void {
    this.announcePolitely(`${description} loaded`);
  }

  /**
   * Announce navigation changes
   */
  announceNavigation(pageName: string): void {
    this.announcePolitely(`Navigated to ${pageName}`);
  }

  /**
   * Announce modal open/close
   */
  announceModal(action: 'opened' | 'closed', modalTitle?: string): void {
    const message = modalTitle 
      ? `${modalTitle} modal ${action}`
      : `Modal ${action}`;
    this.announcePolitely(message);
  }

  /**
   * Clear all announcements
   */
  clear(): void {
    if (this.politeRegion) {
      this.politeRegion.textContent = '';
    }
    if (this.assertiveRegion) {
      this.assertiveRegion.textContent = '';
    }
  }
}

// Singleton instance
export const screenReader = new ScreenReaderAnnouncer();

// React Hook for easy usage in components
export function useScreenReader() {
  return {
    announcePolitely: screenReader.announcePolitely.bind(screenReader),
    announceAssertively: screenReader.announceAssertively.bind(screenReader),
    announceValidationError: screenReader.announceValidationError.bind(screenReader),
    announceSuccess: screenReader.announceSuccess.bind(screenReader),
    announceLoading: screenReader.announceLoading.bind(screenReader),
    announceDataLoaded: screenReader.announceDataLoaded.bind(screenReader),
    announceNavigation: screenReader.announceNavigation.bind(screenReader),
    announceModal: screenReader.announceModal.bind(screenReader),
    clear: screenReader.clear.bind(screenReader)
  };
}

export default screenReader;
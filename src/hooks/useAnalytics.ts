import { useEffect } from 'react';

interface AnalyticsEvent {
  event: string;
  properties?: Record<string, unknown>;
}

interface PageViewEvent {
  page: string;
  title?: string;
  url?: string;
}

// Analytics hook placeholder - disabled by default
export const useAnalytics = () => {
  const isEnabled = process.env.NEXT_PUBLIC_ANALYTICS_ENABLED === 'true';

  const trackEvent = (event: AnalyticsEvent) => {
    if (!isEnabled) return;
    
    // Placeholder for analytics tracking
    // console.log('Analytics Event:', event);
    
    // Future implementation could include:
    // - Google Analytics
    // - Mixpanel
    // - Custom analytics service
  };

  const trackPageView = (pageView: PageViewEvent) => {
    if (!isEnabled) return;
    
    // Placeholder for page view tracking
    // console.log('Page View:', pageView);
  };

  return {
    trackEvent,
    trackPageView,
    isEnabled
  };
};

// Hook for automatic page view tracking
export const usePageView = (page: string, title?: string) => {
  const { trackPageView } = useAnalytics();

  useEffect(() => {
    trackPageView({
      page,
      title: title || document.title,
      url: window.location.href
    });
  }, [page, title, trackPageView]);
};

import React from 'react';
import { cn } from '@/lib/utils';

export interface FooterProps {
  className?: string;
}

const Footer: React.FC<FooterProps> = ({ className }) => {
  return (
    <footer className={cn('bg-stone-800 text-white py-12', className)} role="contentinfo">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Company Info */}
          <div className="col-span-1 md:col-span-2">
            <div className="flex flex-col mb-4">
              <span className="text-2xl font-bold text-white">GLOBAL</span>
              <span className="text-sm font-light text-stone-300 -mt-1">INTERNATIONAL</span>
            </div>
            <p className="text-stone-300 text-sm leading-relaxed max-w-md">
              Elevating hospitality through care and consistency. We provide premium quality 
              products and services for the hospitality industry worldwide.
            </p>
          </div>

          {/* Quick Links */}
          <div>
            <h3 className="text-lg font-semibold mb-4">Quick Links</h3>
            <ul className="space-y-2">
              <li>
                <a 
                  href="#" 
                  className="text-stone-300 hover:text-white transition-colors duration-200 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 focus:ring-offset-2 focus:ring-offset-stone-800 rounded-md px-1 py-1"
                >
                  Products
                </a>
              </li>
              <li>
                <a 
                  href="#" 
                  className="text-stone-300 hover:text-white transition-colors duration-200 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 focus:ring-offset-2 focus:ring-offset-stone-800 rounded-md px-1 py-1"
                >
                  About Us
                </a>
              </li>
              <li>
                <a 
                  href="#" 
                  className="text-stone-300 hover:text-white transition-colors duration-200 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 focus:ring-offset-2 focus:ring-offset-stone-800 rounded-md px-1 py-1"
                >
                  Contact
                </a>
              </li>
              <li>
                <a 
                  href="#" 
                  className="text-stone-300 hover:text-white transition-colors duration-200 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 focus:ring-offset-2 focus:ring-offset-stone-800 rounded-md px-1 py-1"
                >
                  Sustainability
                </a>
              </li>
            </ul>
          </div>

          {/* Contact Info */}
          <div>
            <h3 className="text-lg font-semibold mb-4">Contact</h3>
            <div className="space-y-2 text-sm text-stone-300">
              <p>Email: info@globalinternational.com</p>
              <p>Phone: +1 (555) 123-4567</p>
              <p>Address: 123 Business St, City, State 12345</p>
            </div>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="border-t border-stone-700 mt-8 pt-8 flex flex-col md:flex-row justify-between items-center">
          <p className="text-stone-400 text-sm">
            © 2024 Global International. All rights reserved.
          </p>
          <div className="flex space-x-6 mt-4 md:mt-0">
            <a 
              href="#" 
              className="text-stone-400 hover:text-white transition-colors duration-200 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 focus:ring-offset-2 focus:ring-offset-stone-800 rounded-md px-1 py-1"
            >
              Privacy Policy
            </a>
            <a 
              href="#" 
              className="text-stone-400 hover:text-white transition-colors duration-200 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 focus:ring-offset-2 focus:ring-offset-stone-800 rounded-md px-1 py-1"
            >
              Terms of Service
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
};

export { Footer };

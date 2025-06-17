import Image from 'next/image';

export function RMSSection() {
  return (
    <section id="rms" className="py-16 bg-gray-50">
      <div className="container mx-auto px-4">
        <div className="flex flex-col md:flex-row items-center justify-between gap-12">
          <div className="flex-1 max-w-xl">
            <h2 className="text-3xl font-bold text-gray-900 mb-6">Result Management System (RMS)</h2>
            <p className="text-lg text-gray-600 mb-8">
              Streamline your academic result processing and management with our comprehensive RMS solution. 
              Designed specifically for educational institutions, our system ensures accurate, efficient, and 
              secure handling of student results.
            </p>
            <ul className="space-y-4">
              <li className="flex items-start">
                <svg className="w-6 h-6 text-green-500 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                <span className="text-gray-700">Automated result calculation and grade processing</span>
              </li>
              <li className="flex items-start">
                <svg className="w-6 h-6 text-green-500 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                <span className="text-gray-700">Customizable result templates and reporting formats</span>
              </li>
              <li className="flex items-start">
                <svg className="w-6 h-6 text-green-500 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                <span className="text-gray-700">Secure result publication and student portal access</span>
              </li>
            </ul>
          </div>
          <div className="flex-1 relative w-full max-w-lg aspect-video">
            <Image
              src="/media/rms-dashboard.png"
              alt="RMS Dashboard"
              fill
              className="object-cover rounded-lg shadow-xl"
              priority
            />
          </div>
        </div>
      </div>
    </section>
  );
}
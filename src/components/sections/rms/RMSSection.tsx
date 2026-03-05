import Image from 'next/image';

export function RMSSection() {
  return (
    <section id="rms" className="py-16 bg-gray-50">
      <div className="container mx-auto px-4">
        <div className="flex flex-col md:flex-row items-center justify-between gap-12">
          <div className="flex-1 max-w-xl">
                        <div className="flex items-center gap-4 mb-6">
              <h2 className="text-3xl font-bold text-gray-900">Realtime Student Management (RSM)</h2>
              <span className="inline-block bg-blue-100 text-blue-800 text-sm font-semibold px-3 py-1 rounded-full">Coming Soon</span>
            </div>
            <p className="text-lg text-gray-600 mb-8">
              An attendance system that allows students to sign in and out, sends notifications to parents to keep them in the loop, and tracks spending by replacing physical cash with a voucher system.
            </p>
            <ul className="space-y-4">
              <li className="flex items-start">
                <svg className="w-6 h-6 text-green-500 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                <span className="text-gray-700">Student sign-in/out and parent notifications</span>
              </li>
              <li className="flex items-start">
                <svg className="w-6 h-6 text-green-500 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                <span className="text-gray-700">Cashless voucher system for spending tracking</span>
              </li>
              <li className="flex items-start">
                <svg className="w-6 h-6 text-green-500 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                <span className="text-gray-700">Real-time visibility and seamless oversight</span>
              </li>
            </ul>
          </div>
          <div className="flex-1 relative w-full max-w-lg aspect-video">
            <Image
              src="/media/attd.png"
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